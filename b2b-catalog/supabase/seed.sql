-- Salzmann Restwaren B2B Catalog - Seed Data
-- Run this AFTER schema.sql and policies.sql

-- ============================================================
-- CATEGORIES
-- ============================================================
insert into public.categories (id, name_de, name_en, name_ru, slug, sort_order) values
  (uuid_generate_v4(), 'Lebensmittel', 'Food', 'Продукты', 'food', 1),
  (uuid_generate_v4(), 'Getränke', 'Beverages', 'Напитки', 'beverages', 2),
  (uuid_generate_v4(), 'Süßwaren', 'Confectionery', 'Кондитерские изделия', 'confectionery', 3),
  (uuid_generate_v4(), 'Drogerie', 'Drugstore', 'Бытовая химия', 'drugstore', 4),
  (uuid_generate_v4(), 'Haushalt', 'Household', 'Товары для дома', 'household', 5),
  (uuid_generate_v4(), 'Tierbedarf', 'Pet Supplies', 'Товары для животных', 'pet-supplies', 6),
  (uuid_generate_v4(), 'Non-Food', 'Non-Food', 'Непродовольственные товары', 'non-food', 7);

-- Note: To seed offers and share links, first create users via Supabase Auth,
-- then reference their UUIDs in the offers.created_by and share_links.manager_id columns.
-- Example:
--
-- insert into public.offers (title, brand, short_description, quantity_total, quantity_available, unit, price_per_unit, currency, condition_code, category_id, public_visible, status, created_by)
-- select 'Barilla Spaghetti No.5 500g', 'Barilla', 'Klassische italienische Spaghetti, MHD 06/2025', 5000, 5000, 'Stück', 0.89, 'EUR', 'A', c.id, true, 'active', '<admin-user-uuid>'
-- from public.categories c where c.slug = 'food';
