-- Salzmann Restwaren B2B Catalog - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'customer' check (role in ('admin', 'manager', 'customer')),
  full_name text not null default '',
  phone text,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MANAGER PROFILES
-- ============================================================
create table public.manager_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  display_name text not null,
  whatsapp_number text not null,
  default_language text not null default 'de' check (default_language in ('de', 'en', 'ru')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name_de text not null,
  name_en text not null default '',
  name_ru text not null default '',
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- OFFERS
-- ============================================================
create table public.offers (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  brand text not null default '',
  short_description text not null default '',
  long_description text not null default '',
  quantity_total numeric not null default 0,
  quantity_available numeric not null default 0,
  unit text not null default 'Stück' check (unit in ('kg', 'Stück', 'Palette', 'Posten', 'Set')),
  volume_text text not null default '',
  price_per_unit numeric(12,2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'USD')),
  condition_code text not null default 'B' check (condition_code in ('A', 'B', 'C', 'D')),
  category_id uuid references public.categories(id) on delete set null,
  export_only boolean not null default false,
  public_visible boolean not null default false,
  min_price_internal numeric(12,2) not null default 0,
  in_stock boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'active', 'partially_sold', 'sold_out', 'archived')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_offers_status on public.offers(status);
create index idx_offers_category on public.offers(category_id);
create index idx_offers_public on public.offers(public_visible, status);

-- ============================================================
-- OFFER TRANSLATIONS
-- ============================================================
create table public.offer_translations (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  language text not null check (language in ('de', 'en', 'ru')),
  title text not null default '',
  short_description text not null default '',
  long_description text not null default '',
  unique(offer_id, language)
);

-- ============================================================
-- OFFER ARTICLE NUMBERS
-- ============================================================
create table public.offer_article_numbers (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  article_number text not null
);

create index idx_article_numbers_offer on public.offer_article_numbers(offer_id);
create index idx_article_numbers_number on public.offer_article_numbers(article_number);

-- ============================================================
-- OFFER IMAGES
-- ============================================================
create table public.offer_images (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SHARE LINKS
-- ============================================================
create table public.share_links (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  manager_id uuid not null references public.users(id),
  label text not null default '',
  filters jsonb not null default '{}',
  default_language text not null default 'de' check (default_language in ('de', 'en', 'ru')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index idx_share_links_token on public.share_links(token);

-- ============================================================
-- INQUIRIES
-- ============================================================
create table public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  share_link_id uuid references public.share_links(id),
  manager_id uuid not null references public.users(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  customer_company text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index idx_inquiries_manager on public.inquiries(manager_id);
create index idx_inquiries_status on public.inquiries(status);

-- ============================================================
-- INQUIRY ITEMS
-- ============================================================
create table public.inquiry_items (
  id uuid primary key default uuid_generate_v4(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  offer_id uuid not null references public.offers(id),
  requested_quantity numeric not null,
  unit text not null default 'Stück',
  price_per_unit numeric(12,2) not null
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  quantity_change numeric not null,
  reason text not null default '',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_stock_movements_offer on public.stock_movements(offer_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger offers_updated_at
  before update on public.offers
  for each row execute function update_updated_at();

-- ============================================================
-- STOCK MOVEMENT TRIGGER (auto-update quantity_available)
-- ============================================================
create or replace function apply_stock_movement()
returns trigger as $$
begin
  update public.offers
  set quantity_available = quantity_available + new.quantity_change,
      status = case
        when quantity_available + new.quantity_change <= 0 then 'sold_out'
        when quantity_available + new.quantity_change < quantity_total then 'partially_sold'
        else status
      end
  where id = new.offer_id;
  return new;
end;
$$ language plpgsql;

create trigger stock_movement_apply
  after insert on public.stock_movements
  for each row execute function apply_stock_movement();
