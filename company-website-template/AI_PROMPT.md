# AI Website Builder Prompt

Use this prompt when asking an AI to customize this template for a specific company.
Copy the full prompt below and paste it into your AI tool (Claude, ChatGPT, Cursor, etc.).

---

## System Prompt

You are building a company website using the Cardlink Company Website Template. This is a standalone Next.js project that connects to the Cardlink platform via REST APIs and a shared Supabase database.

### Architecture

- **Framework**: Next.js 15+ with App Router, React 19, TypeScript, TailwindCSS 4
- **Data Source**: Cardlink public APIs (no authentication required)
- **Database**: Supabase (read-only via anon key with RLS policies)
- **Deployment**: Vercel, Netlify, or any Node.js host

### Project Structure

```
company-website-template/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with metadata
│   │   ├── page.tsx            # Homepage
│   │   ├── page/[slug]/page.tsx # Dynamic CMS pages
│   │   ├── store/page.tsx      # Store with product grid & cart
│   │   ├── booking/page.tsx    # Appointment booking
│   │   ├── contact/page.tsx    # Contact form
│   │   └── blog/page.tsx       # Blog listing
│   ├── components/
│   │   ├── SiteLayout.tsx      # Header, nav, footer wrapper
│   │   ├── ShoppingCart.tsx     # Slide-out cart with checkout
│   │   ├── ContactForm.tsx     # Form that submits to Cardlink
│   │   └── BookingWidget.tsx   # Service selection, date/time picker
│   └── lib/
│       ├── cardlink-api.ts     # All API calls to Cardlink
│       └── supabase.ts         # Direct Supabase client (optional)
├── .env.example                # Environment variables template
├── package.json
└── AI_PROMPT.md                # This file
```

### API Endpoints (from Cardlink App)

All endpoints require `company_id` as a query/body parameter. No auth tokens needed.

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

### Data Models

**Website Settings** (from `/api/public/website`):
```typescript
type SiteSettings = {
  site_title, tagline, logo_url, favicon_url,
  primary_color, secondary_color, font_family,
  custom_css, custom_head_html,
  contact_email, contact_phone, contact_address,
  social_facebook, social_instagram, social_twitter, social_linkedin, social_youtube,
  footer_text, meta_title, meta_description, meta_og_image
}
```

**Page** (CMS content):
```typescript
type SitePage = {
  id, slug, title, page_type, content,
  meta_title, meta_description, sort_order, show_in_nav
}
// page_type: "home" | "about" | "services" | "contact" | "blog" | "custom" | "faq" | "gallery" | "testimonials"
```

**Store Product**:
```typescript
type StoreProduct = {
  id, name, slug, description, price, compare_at_price,
  product_type, images: string[], category_id, sku, stock_quantity
}
// product_type: "physical" | "service" | "digital"
```

**Checkout Payload**:
```typescript
{
  company_id, line_items: [{ product_id, qty }],
  customer_name, customer_email, customer_phone,
  coupon_code?, tax_rate?, shipping_amount?, payment_method?, notes?
}
```

**Booking Service**:
```typescript
type BookingService = {
  id, name, description, duration_minutes, price, category, image_url
}
```

### Database Tables (Direct Supabase Access)

The Supabase anon key provides read-only access to public data via RLS policies:

| Table | Public Access | Description |
|-------|-------------|-------------|
| `companies` | Read (active) | Company info, slug, logo |
| `website_settings` | Read (published) | Site configuration |
| `website_pages` | Read (published) | CMS page content |
| `website_nav_items` | Read (visible) | Navigation structure |
| `store_settings` | Read (published) | Store configuration |
| `store_products` | Read (active) | Product catalog |
| `store_categories` | Read (active) | Product categories |
| `booking_services` | Read (active) | Bookable services |

Write operations go through the Cardlink API endpoints listed above.

### Customization Instructions

When customizing this template, you should:

1. **Styling**: Modify TailwindCSS classes in components. The `primary_color` from settings is used throughout — keep this pattern.

2. **Layout**: Customize `SiteLayout.tsx` for header/footer design. The nav is built from either `website_nav_items` or pages with `show_in_nav: true`.

3. **Store**: The `ShoppingCart.tsx` component handles cart state and checkout. `StoreGrid.tsx` renders products with "Add to Cart" buttons that call `window.__cartAddItem`.

4. **Booking**: `BookingWidget.tsx` handles the full flow: service → date → time → customer info → confirm.

5. **Contact**: `ContactForm.tsx` submits to `POST /api/public/website` which stores in `website_form_submissions`.

6. **New Pages**: Add routes under `src/app/`. Use `fetchSiteData()` for settings and `SiteLayout` for consistent chrome.

7. **SEO**: Each page route can export `generateMetadata()` using page meta_title/meta_description.

8. **Content Rendering**: CMS page `content` is JSON or string. Use `renderContent()` helper to display it safely (text-only, no raw HTML).

### Environment Variables

```
NEXT_PUBLIC_COMPANY_ID=<uuid>           # Your company ID from Cardlink
NEXT_PUBLIC_CARDLINK_API_URL=<url>      # Cardlink app URL
NEXT_PUBLIC_SUPABASE_URL=<url>          # Same Supabase project
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>     # Same anon key
```

### Key Principles

- All data flows from Cardlink → this website (read) and this website → Cardlink (write via API)
- Store orders, bookings, and form submissions created here appear in the Cardlink business dashboard
- Inventory is automatically deducted on checkout
- Booking conflict checking is handled server-side
- The website is statically generated where possible (ISR with 60s revalidation)
- No user authentication is needed — this is a public customer-facing website

---

## Example Customization Request

> "Make this website for a bakery called Sweet Delights. Use warm colors (amber/orange theme).
> Add a hero section with a full-width image. Show featured products on the homepage.
> The store should have a 3-column grid with large product images.
> Add a booking page for cake tasting appointments.
> Style the footer with a newsletter-style layout."
