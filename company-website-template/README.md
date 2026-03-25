# Cardlink Company Website Template

A standalone Next.js website template that connects to the **Cardlink** platform.
Each company gets their own copy of this template deployed as an independent website.

## What This Template Does

| Feature | How It Works |
|---------|-------------|
| **CMS Pages** | Fetches published pages from Cardlink CMS → renders as routes |
| **Online Store** | Shows products from Cardlink store → cart & checkout create orders |
| **Appointment Booking** | Lists services → date/time picker → creates bookings |
| **Contact Forms** | Submits to Cardlink → viewable in business dashboard |
| **Blog** | Renders blog-type CMS pages as a listing |
| **SEO** | Auto-generates meta tags from CMS settings |

All data written through this website (orders, bookings, form submissions) is **automatically visible** in the Cardlink business dashboard for management.

## Quick Start

### 1. Clone this template

```bash
# For a new company website
cp -r company-website-template my-company-website
cd my-company-website
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_COMPANY_ID=<your-company-uuid>
NEXT_PUBLIC_CARDLINK_API_URL=https://your-cardlink-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Get these values from:
- **Company ID**: Cardlink dashboard → Settings → Company Profile
- **Cardlink API URL**: The URL where your Cardlink app is deployed
- **Supabase credentials**: Same as your Cardlink app's `.env` file

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy

Deploy as a standalone Next.js app to Vercel, Netlify, or any host:

```bash
npm run build
npm start
```

## Architecture

```
┌─────────────────────┐     REST API calls      ┌─────────────────────┐
│                     │ ──────────────────────► │                     │
│   Company Website   │                         │   Cardlink App      │
│   (this template)   │ ◄────────────────────── │   (dashboard)       │
│                     │     JSON responses       │                     │
└─────────┬───────────┘                         └─────────┬───────────┘
          │                                               │
          │  Supabase (read-only)                         │  Supabase (full access)
          │                                               │
          └──────────────────┬────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │   PostgreSQL    │
                    │   (shared DB)   │
                    └─────────────────┘
```

### Data Flow

1. **Website → Display**: Fetches settings, pages, products, services via Cardlink public APIs
2. **Customer → Order**: Checkout creates order via `POST /api/public/store/checkout`
3. **Customer → Booking**: Booking form creates appointment via `POST /api/public/booking/book`
4. **Customer → Contact**: Contact form submits via `POST /api/public/website`
5. **Dashboard → Manage**: Business owner sees all data in Cardlink dashboard

## Project Structure

```
src/
├── app/                         # Next.js pages
│   ├── layout.tsx               # Root layout (meta, fonts)
│   ├── page.tsx                 # Homepage
│   ├── page/[slug]/page.tsx     # Dynamic CMS pages
│   ├── store/                   # Online store
│   │   ├── page.tsx             # Product listing
│   │   └── StoreGrid.tsx        # Product grid (client component)
│   ├── booking/page.tsx         # Appointment booking
│   ├── contact/page.tsx         # Contact form
│   └── blog/page.tsx            # Blog listing
├── components/
│   ├── SiteLayout.tsx           # Header + navigation + footer
│   ├── ShoppingCart.tsx         # Cart sidebar with checkout
│   ├── ContactForm.tsx          # Contact form component
│   └── BookingWidget.tsx        # Full booking flow
└── lib/
    ├── cardlink-api.ts          # Cardlink API client (typed)
    └── supabase.ts              # Direct Supabase client
```

## Customization with AI

See **[AI_PROMPT.md](./AI_PROMPT.md)** for a comprehensive prompt you can give to any AI coding tool (Claude, ChatGPT, Cursor, etc.) to customize this template.

The prompt includes:
- Complete API documentation
- Data model definitions
- Database table schemas
- Customization guidelines
- Example requests

## Managing Content

All content is managed through the **Cardlink business dashboard**:

| What | Where in Cardlink |
|------|-------------------|
| Website pages & content | Settings → Website |
| Store products & categories | Store module |
| Booking services & schedule | Booking module |
| Form submissions | Settings → Website → Submissions tab |
| Orders | Store → Orders |
| Appointments | Booking → Calendar |

## Technology Stack

- **Next.js 15+** — React framework with App Router
- **React 19** — UI library
- **TypeScript** — Type safety
- **TailwindCSS 4** — Utility-first CSS
- **Supabase JS** — Database client (read-only access)

## Deployment Checklist

- [ ] Copy template to new repo for the company
- [ ] Set environment variables (company ID, API URL, Supabase keys)
- [ ] Customize branding/theme using AI or manual edits
- [ ] Publish website content in Cardlink dashboard
- [ ] Add products to store in Cardlink dashboard
- [ ] Set up booking services if needed
- [ ] Deploy to Vercel/Netlify
- [ ] Point custom domain to deployment

## License

This template is part of the Cardlink platform. Use it to create websites for your Cardlink-managed businesses.
