# Salzmann Restwaren – B2B Angebotskatalog

A production-ready MVP for a web-based B2B offer catalog. Built with Next.js App Router, TypeScript, Supabase, and Tailwind CSS.

## Features

- **Public catalog** via tokenized share links (no login required)
- **Manager dashboard** with inquiries, share link management
- **Admin panel** with offer import (WhatsApp text parsing), CRUD, categories, users
- **Inquiry cart** with WhatsApp message generation
- **Multi-language** support (DE, EN, RU)
- **Mobile-first** responsive design
- **Role-based access** (admin, manager, public customer)

## Tech Stack

- **Next.js 15+** (App Router)
- **TypeScript**
- **Supabase** (Postgres, Auth, Storage, RLS)
- **Tailwind CSS v4**
- **Lucide React** (icons)

## Local Setup

### 1. Install dependencies

```bash
cd b2b-catalog
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL files in order in the SQL Editor:
   - `supabase/schema.sql` — tables, indexes, triggers
   - `supabase/policies.sql` — row level security
   - `supabase/seed.sql` — sample categories
3. Create a Storage bucket named `offer-images` (public)

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project URL and anon key.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Mode

The app includes sample data and works without a Supabase connection for UI exploration:

- **Home**: [/](http://localhost:3000) — landing page
- **Demo Catalog**: [/catalog/demo](http://localhost:3000/catalog/demo) — public catalog view
- **Login**: [/login](http://localhost:3000/login) — use `admin@...` for admin, anything else for manager
- **Manager**: [/manager](http://localhost:3000/manager) — dashboard, inquiries, share links
- **Admin**: [/admin](http://localhost:3000/admin) — dashboard, import, offers, archive, categories, users

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin pages (import, offers, archive, categories, users)
│   ├── catalog/[token]/    # Public catalog (offers, detail, cart, success)
│   ├── login/              # Authentication
│   └── manager/            # Manager pages (inquiries, share links)
├── components/
│   ├── admin/              # ImportForm, OfferManager
│   ├── catalog/            # CatalogView, OfferCard, OfferDetail, CartView
│   ├── layout/             # Header
│   ├── manager/            # InquiryList, ShareLinkManager
│   └── ui/                 # Chip, FilterBar
├── i18n/                   # Translations (de, en, ru) and context
├── lib/                    # Supabase clients, cart context, sample data, parsers
└── types/                  # TypeScript type definitions
supabase/
├── schema.sql              # Database schema
├── policies.sql            # RLS policies
└── seed.sql                # Seed data (categories)
```

## Key Concepts

### Share Links
Each share link has a unique token, belongs to a manager, and can have preset filters (categories, conditions, language). Customers access the catalog via `/catalog/[token]`.

### WhatsApp Import
Admins paste WhatsApp text into the import form. The parser uses deterministic regex patterns to extract offer fields (title, brand, price, quantity, article numbers, etc.). A review/edit form is shown before saving.

### Inquiry Flow
Customers add offers to an inquiry cart, fill in contact details, and submit. The inquiry is stored in the database and generates a WhatsApp-ready message to the assigned manager.

### Stock Management
Stock movements are tracked via the `stock_movements` table. A database trigger automatically updates `quantity_available` and transitions offer status (active → partially_sold → sold_out).

## Design System

- Primary yellow header: `#F6B306`
- White cards with light gray borders
- Dark text on light backgrounds
- Rounded filter pills
- Colored chips for category (blue), condition (green), unit (purple), export (orange)
- Mobile-first: 1 column on small screens, 2 columns on sm+
