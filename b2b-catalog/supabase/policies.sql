-- Salzmann Restwaren B2B Catalog - Row Level Security Policies
-- Run this AFTER schema.sql

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.manager_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.offers enable row level security;
alter table public.offer_translations enable row level security;
alter table public.offer_article_numbers enable row level security;
alter table public.offer_images enable row level security;
alter table public.share_links enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;
alter table public.stock_movements enable row level security;

-- Helper function to get user role
create or replace function public.get_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- ============================================================
-- CATEGORIES: readable by everyone, writable by admin
-- ============================================================
create policy "categories_select" on public.categories for select using (true);
create policy "categories_admin_all" on public.categories for all using (public.get_user_role() = 'admin');

-- ============================================================
-- OFFERS: public can see public+active, managers/admins see all
-- ============================================================
create policy "offers_public_select" on public.offers
  for select using (
    (public_visible = true and status in ('active', 'partially_sold'))
    or public.get_user_role() in ('admin', 'manager')
  );

create policy "offers_admin_insert" on public.offers
  for insert with check (public.get_user_role() = 'admin');

create policy "offers_admin_update" on public.offers
  for update using (public.get_user_role() = 'admin');

create policy "offers_admin_delete" on public.offers
  for delete using (public.get_user_role() = 'admin');

-- ============================================================
-- OFFER TRANSLATIONS: follow offer visibility
-- ============================================================
create policy "translations_select" on public.offer_translations
  for select using (
    exists (
      select 1 from public.offers o where o.id = offer_id
      and (
        (o.public_visible = true and o.status in ('active', 'partially_sold'))
        or public.get_user_role() in ('admin', 'manager')
      )
    )
  );

create policy "translations_admin_all" on public.offer_translations
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- OFFER ARTICLE NUMBERS: follow offer visibility
-- ============================================================
create policy "article_numbers_select" on public.offer_article_numbers
  for select using (
    exists (
      select 1 from public.offers o where o.id = offer_id
      and (
        (o.public_visible = true and o.status in ('active', 'partially_sold'))
        or public.get_user_role() in ('admin', 'manager')
      )
    )
  );

create policy "article_numbers_admin_all" on public.offer_article_numbers
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- OFFER IMAGES: follow offer visibility
-- ============================================================
create policy "images_select" on public.offer_images
  for select using (
    exists (
      select 1 from public.offers o where o.id = offer_id
      and (
        (o.public_visible = true and o.status in ('active', 'partially_sold'))
        or public.get_user_role() in ('admin', 'manager')
      )
    )
  );

create policy "images_admin_all" on public.offer_images
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- SHARE LINKS: managers see own, admins see all
-- ============================================================
create policy "share_links_public_select" on public.share_links
  for select using (active = true);

create policy "share_links_manager_own" on public.share_links
  for all using (
    manager_id = auth.uid() and public.get_user_role() in ('admin', 'manager')
  );

create policy "share_links_admin_all" on public.share_links
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- INQUIRIES: public can insert, managers see own, admins see all
-- ============================================================
create policy "inquiries_public_insert" on public.inquiries
  for insert with check (true);

create policy "inquiries_manager_select" on public.inquiries
  for select using (
    manager_id = auth.uid() or public.get_user_role() = 'admin'
  );

create policy "inquiries_manager_update" on public.inquiries
  for update using (
    manager_id = auth.uid() or public.get_user_role() = 'admin'
  );

-- ============================================================
-- INQUIRY ITEMS: follow inquiry access
-- ============================================================
create policy "inquiry_items_public_insert" on public.inquiry_items
  for insert with check (true);

create policy "inquiry_items_select" on public.inquiry_items
  for select using (
    exists (
      select 1 from public.inquiries i where i.id = inquiry_id
      and (i.manager_id = auth.uid() or public.get_user_role() = 'admin')
    )
  );

-- ============================================================
-- STOCK MOVEMENTS: admin only
-- ============================================================
create policy "stock_movements_admin" on public.stock_movements
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- USERS: own profile or admin
-- ============================================================
create policy "users_own_select" on public.users
  for select using (id = auth.uid() or public.get_user_role() = 'admin');

create policy "users_admin_all" on public.users
  for all using (public.get_user_role() = 'admin');

-- ============================================================
-- MANAGER PROFILES: own or admin
-- ============================================================
create policy "manager_profiles_own" on public.manager_profiles
  for select using (user_id = auth.uid() or public.get_user_role() in ('admin', 'manager'));

create policy "manager_profiles_admin" on public.manager_profiles
  for all using (public.get_user_role() = 'admin');
