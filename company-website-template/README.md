# Cardlink Company Website Template

A standalone Next.js website template that connects to the **Cardlink** platform.
Each company gets their own copy of this template deployed as an independent website.

## How It Works

This template is a **separate website project** that connects to your Cardlink business dashboard via public REST APIs. It reads your website content, store products, and booking services from Cardlink, and writes orders, bookings, and form submissions back — all visible in your Cardlink dashboard.

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

### Option A: Automated Setup (recommended)

```bash
# 1. Copy the template for your company
cp -r company-website-template my-company-website
cd my-company-website

# 2. Run the setup wizard
./setup.sh
```

The setup wizard will:
- Ask for your Cardlink URL and Company ID
- Create `.env.local` with the correct values
- Install dependencies
- Test the connection to your Cardlink instance

### Option B: Manual Setup

#### 1. Copy the template

```bash
cp -r company-website-template my-company-website
cd my-company-website
```

#### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_COMPANY_ID=<your-company-uuid>
NEXT_PUBLIC_CARDLINK_API_URL=https://your-cardlink-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

#### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Where to Find Your Credentials

| Value | Where to Find It |
|-------|-------------------|
| **Company ID** | Cardlink dashboard → Settings → Company Profile (UUID) |
| **Cardlink API URL** | The URL where your Cardlink app is deployed (e.g. `https://myapp.vercel.app`) |
| **Supabase URL** | Same as your Cardlink app's `.env` file (`NEXT_PUBLIC_SUPABASE_URL`) |
| **Supabase Anon Key** | Same as your Cardlink app's `.env` file (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) |

### Verify Your Connection

After setup, check the health endpoint to verify everything is connected:

```bash
# If running locally:
curl http://localhost:3000/api/health | python3 -m json.tool

# Or open in browser:
# http://localhost:3000/api/health
```

Expected healthy response:
```json
{
  "status": "ok",
  "company_id": "your-company-uuid",
  "cardlink_api": "https://your-cardlink-app.vercel.app",
  "checks": {
    "website": { "status": "ok", "message": "Site: My Company" },
    "store": { "status": "ok", "message": "Store: My Store — 5 products" },
    "booking": { "status": "ok", "message": "2 booking services available" },
    "supabase": { "status": "configured" }
  }
}
```

### How the App Knows Which Company This Website Belongs To

The connection between this website and a Cardlink company is established through:

1. **Environment variable (`NEXT_PUBLIC_COMPANY_ID`)** — set during setup, this UUID is sent with every API call to scope all data to your company
2. **Heartbeat** — a built-in `Heartbeat` component in the root layout automatically pings the Cardlink app on each page load (throttled to once per hour). This tells the Cardlink dashboard:
   - **Which URL** this website is running on (`linked_website_url`)
   - **When it last checked in** (`last_heartbeat_at`)
3. **Dashboard status** — in Cardlink Dashboard → Settings → Website, the "Connected Website" card shows:
   - ✅ **Green "Connected"** — heartbeat received within the last 24 hours
   - 🟡 **Amber "Stale"** — heartbeat is older than 24 hours
   - ⚪ **"No website connected"** — no heartbeat ever received

```
Website (page load) → POST /api/public/website/heartbeat
                       { company_id, website_url }
                       ↓
Cardlink DB           → website_settings.linked_website_url = "https://..."
                       → website_settings.last_heartbeat_at = now()
                       ↓
Dashboard             → Shows "Connected" with URL and timestamp
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

| Direction | What Happens | API Used |
|-----------|-------------|----------|
| **Read** website content | Fetches settings, pages, navigation | `GET /api/public/website` |
| **Read** store products | Fetches products, categories | `GET /api/public/store/products` |
| **Read** booking services | Fetches services, time slots | `GET /api/public/booking/services` |
| **Write** store order | Cart checkout creates order | `POST /api/public/store/checkout` |
| **Write** booking | Appointment form creates booking | `POST /api/public/booking/book` |
| **Write** form submission | Contact form submits data | `POST /api/public/website` |

### API Endpoints

All endpoints require `company_id` as a query/body parameter. **No authentication tokens needed.**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/public/website?company_id=X` | Full site data (settings, pages, nav) |
| GET | `/api/public/website?company_id=X&page=slug` | Single published page |
| POST | `/api/public/website` | Submit form (contact, etc.) |
| GET | `/api/public/store/products?company_id=X` | Store products & categories |
| POST | `/api/public/store/checkout` | Create order (cart checkout) |
| GET | `/api/public/booking/services?company_id=X` | Booking services list |
| GET | `/api/public/booking/slots?company_id=X&service_id=Y&date=YYYY-MM-DD` | Available time slots |
| POST | `/api/public/booking/book` | Create booking appointment |

## Project Structure

```
src/
├── app/                         # Next.js pages
│   ├── layout.tsx               # Root layout (meta, fonts, Heartbeat)
│   ├── page.tsx                 # Homepage
│   ├── page/[slug]/page.tsx     # Dynamic CMS pages
│   ├── store/                   # Online store
│   │   ├── page.tsx             # Product listing
│   │   └── StoreGrid.tsx        # Product grid (client component)
│   ├── booking/page.tsx         # Appointment booking
│   ├── contact/page.tsx         # Contact form
│   ├── blog/page.tsx            # Blog listing
│   └── api/health/route.ts     # Connection health check
├── components/
│   ├── SiteLayout.tsx           # Header + navigation + footer
│   ├── ShoppingCart.tsx         # Cart sidebar with checkout
│   ├── ContactForm.tsx          # Contact form component
│   ├── BookingWidget.tsx        # Full booking flow
│   └── Heartbeat.tsx            # Connection heartbeat (auto-pings Cardlink)
└── lib/
    ├── cardlink-api.ts          # Cardlink API client (typed)
    ├── cart-context.tsx         # React Context for cart state
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

## Deployment

Deploy as a standalone Next.js app to Vercel, Netlify, or any host:

```bash
npm run build
npm start
```

### Vercel (recommended)
```bash
npx vercel --prod
```

Set these environment variables in your Vercel project settings:
- `NEXT_PUBLIC_COMPANY_ID`
- `NEXT_PUBLIC_CARDLINK_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Deployment Checklist

#### Before Deploying
- [ ] Copy template to a new repo for the company
- [ ] Run `./setup.sh` or manually configure `.env.local`
- [ ] Run `npm run dev` and verify site loads at `http://localhost:3000`
- [ ] Check `/api/health` returns `"status": "ok"` locally
- [ ] Publish website content in Cardlink Dashboard → Settings → Website
- [ ] Add products to store in Cardlink Dashboard (if using store)
- [ ] Set up booking services in Cardlink Dashboard (if using booking)
- [ ] Customize branding/theme using AI or manual edits

#### Deploy
- [ ] Deploy to Vercel/Netlify with all environment variables set
- [ ] Point custom domain to deployment (optional)

#### After Deploying — Verify Everything
- [ ] Open `/api/health` on your production URL — all checks should be `"ok"`
- [ ] Open the website home page in a browser (triggers heartbeat)
- [ ] Go to **Cardlink Dashboard → Settings → Website** — confirm **"Connected"** badge shows with correct URL
- [ ] Navigate through published pages and verify content renders
- [ ] Test store: browse products, add to cart, complete test checkout
- [ ] Test booking: select service, pick date/time, submit test booking
- [ ] Submit a test contact form → verify it appears in Dashboard → Website → Submissions tab
- [ ] Check that orders and bookings appear in the Cardlink Dashboard

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Store is not available" | Enable and publish your store in Cardlink → Store Settings |
| "Page not found" | Make sure pages are **published** in Cardlink → Settings → Website |
| CORS errors in browser | CORS headers are configured in `cardlink/next.config.ts` for `/api/public/*` |
| "Failed to fetch site data" | Check `NEXT_PUBLIC_CARDLINK_API_URL` is correct and reachable |
| Empty homepage | Create a page with `page_type: "home"` in Cardlink CMS |
| No booking slots showing | Set up business hours in Cardlink → Booking → Settings |
| Dashboard shows "No website connected" | Open your deployed website in a browser to trigger the first heartbeat |
| Dashboard shows "Stale" | The website hasn't been visited in 24+ hours; open it to refresh the heartbeat |
| `/api/health` returns `"status": "error"` | Check that `NEXT_PUBLIC_CARDLINK_API_URL` and `NEXT_PUBLIC_COMPANY_ID` are set correctly |
| `/api/health` returns `"status": "degraded"` | One or more API checks failed; review the `checks` object for details |

## License

This template is part of the Cardlink platform. Use it to create websites for your Cardlink-managed businesses.
