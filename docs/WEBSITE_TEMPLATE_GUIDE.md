# Cardlink Website Template — Setup Guide

> A ready-to-deploy customer-facing website that connects to **Cardlink Business Dashboard** for content management.

---

## Overview

This guide describes how to create a **separate Git project** that serves as the public website for your business. All content (pages, settings, navigation, media) is managed from the **Cardlink Business Dashboard** (`/business/settings/website`) and fetched at runtime via Cardlink's public API.

### Architecture

```
┌─────────────────────────┐     Public API      ┌────────────────────────┐
│  Customer Website        │ ◄──────────────────► │  Cardlink Backend      │
│  (separate Next.js app)  │  GET /api/public/    │  (Supabase + Next.js)  │
│  Deploy: Vercel/Netlify  │  website?company_id= │  CMS: /business/       │
└─────────────────────────┘                      │  settings/website       │
                                                  └────────────────────────┘
```

---

## 1. Create the Website Project

```bash
npx create-next-app@latest my-business-website --typescript --tailwind --app
cd my-business-website
```

### Required Environment Variables

Create `.env.local`:

```env
# Your Cardlink instance URL (where the API is hosted)
NEXT_PUBLIC_CARDLINK_API_URL=https://your-cardlink-instance.vercel.app

# Your company ID from Cardlink (find in Dashboard → Settings → Company)
NEXT_PUBLIC_COMPANY_ID=your-company-uuid-here
```

---

## 2. API Client

Create `lib/cardlink.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_CARDLINK_API_URL!;
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID!;

export interface SiteSettings {
  site_title: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_linkedin: string;
  social_youtube: string;
  footer_text: string;
  meta_title: string;
  meta_description: string;
  meta_og_image: string;
  custom_css: string;
  custom_head_html: string;
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  content: {
    sections: Array<{
      type: 'hero' | 'text' | 'image' | 'gallery' | 'cta' | 'features' | 'testimonials' | 'faq' | 'form';
      data: Record<string, unknown>;
    }>;
  };
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  show_in_nav: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  url: string;
  parent_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
}

export interface SiteData {
  settings: SiteSettings | null;
  pages: PageData[];
  navigation: NavItem[];
}

/** Fetch full site data (settings + all pages + navigation) */
export async function getSiteData(): Promise<SiteData> {
  const res = await fetch(
    `${API_URL}/api/public/website?company_id=${COMPANY_ID}`,
    { next: { revalidate: 60 } } // ISR: revalidate every 60 seconds
  );
  if (!res.ok) throw new Error('Failed to fetch site data');
  return res.json();
}

/** Fetch a single page by slug */
export async function getPage(slug: string): Promise<PageData | null> {
  const res = await fetch(
    `${API_URL}/api/public/website?company_id=${COMPANY_ID}&page=${slug}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.page ?? null;
}

/** Submit a contact/inquiry form */
export async function submitForm(formType: string, data: Record<string, string>): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/public/website`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: COMPANY_ID,
      form_type: formType,
      data,
    }),
  });
  return res.ok;
}
```

---

## 3. Layout Template

Create `app/layout.tsx`:

```tsx
import { getSiteData } from '@/lib/cardlink';
import './globals.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteData();
  const s = site.settings;

  return (
    <html lang="en">
      <head>
        {s?.meta_title && <title>{s.meta_title}</title>}
        {s?.meta_description && <meta name="description" content={s.meta_description} />}
        {s?.favicon_url && <link rel="icon" href={s.favicon_url} />}
        {s?.custom_head_html && <div dangerouslySetInnerHTML={{ __html: s.custom_head_html }} />}
        {s?.custom_css && <style>{s.custom_css}</style>}
        <style>{`:root { --color-primary: ${s?.primary_color ?? '#4f46e5'}; --color-secondary: ${s?.secondary_color ?? '#06b6d4'}; }`}</style>
      </head>
      <body>
        {/* HEADER / NAV */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {s?.logo_url && <img src={s.logo_url} alt={s.site_title} className="h-8" />}
              <span className="font-bold text-lg">{s?.site_title}</span>
            </div>
            <nav className="flex gap-6">
              {site.navigation.filter(n => !n.parent_id).map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target={item.open_in_new_tab ? '_blank' : undefined}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main>{children}</main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-2">{s?.site_title}</h3>
              <p className="text-sm text-gray-400">{s?.tagline}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Contact</h4>
              {s?.contact_email && <p className="text-sm text-gray-400">{s.contact_email}</p>}
              {s?.contact_phone && <p className="text-sm text-gray-400">{s.contact_phone}</p>}
              {s?.contact_address && <p className="text-sm text-gray-400">{s.contact_address}</p>}
            </div>
            <div>
              <h4 className="font-medium mb-2">Follow Us</h4>
              <div className="flex gap-3">
                {s?.social_facebook && <a href={s.social_facebook} className="text-sm text-gray-400 hover:text-white">Facebook</a>}
                {s?.social_instagram && <a href={s.social_instagram} className="text-sm text-gray-400 hover:text-white">Instagram</a>}
              </div>
            </div>
          </div>
          {s?.footer_text && <p className="text-center text-xs text-gray-500 mt-8">{s.footer_text}</p>}
        </footer>
      </body>
    </html>
  );
}
```

---

## 4. Dynamic Page Rendering

Create `app/[slug]/page.tsx`:

```tsx
import { getSiteData, getPage } from '@/lib/cardlink';
import { notFound } from 'next/navigation';
import ContactForm from '@/components/ContactForm';

// Generate static paths for all published pages
export async function generateStaticParams() {
  const site = await getSiteData();
  return site.pages.map(p => ({ slug: p.slug }));
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">{page.title}</h1>

      {/* Render sections from CMS content */}
      {page.content?.sections?.map((section, i) => (
        <div key={i} className="mb-12">
          {section.type === 'hero' && (
            <div className="text-center py-20 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white rounded-2xl">
              <h2 className="text-5xl font-bold">{String(section.data.heading ?? '')}</h2>
              <p className="mt-4 text-xl opacity-90">{String(section.data.subheading ?? '')}</p>
              {section.data.cta_url && (
                <a href={String(section.data.cta_url)} className="mt-6 inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-medium">
                  {String(section.data.cta_text ?? 'Learn More')}
                </a>
              )}
            </div>
          )}

          {section.type === 'text' && (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: String(section.data.html ?? '') }} />
          )}

          {section.type === 'image' && (
            <figure>
              <img src={String(section.data.url ?? '')} alt={String(section.data.alt ?? '')} className="rounded-xl w-full" />
              {section.data.caption && <figcaption className="text-center text-sm text-gray-500 mt-2">{String(section.data.caption)}</figcaption>}
            </figure>
          )}

          {section.type === 'features' && (
            <div className="grid grid-cols-3 gap-8">
              {(section.data.items as Array<{ title: string; description: string; icon?: string }>)?.map((feat, j) => (
                <div key={j} className="text-center p-6 border rounded-xl">
                  {feat.icon && <span className="text-3xl">{feat.icon}</span>}
                  <h3 className="font-bold mt-2">{feat.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{feat.description}</p>
                </div>
              ))}
            </div>
          )}

          {section.type === 'testimonials' && (
            <div className="grid grid-cols-2 gap-6">
              {(section.data.items as Array<{ quote: string; name: string; role?: string }>)?.map((t, j) => (
                <blockquote key={j} className="border-l-4 border-[var(--color-primary)] pl-4 py-2">
                  <p className="italic text-gray-600">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-2 font-medium">{t.name}{t.role && <span className="text-gray-400"> — {t.role}</span>}</footer>
                </blockquote>
              ))}
            </div>
          )}

          {section.type === 'faq' && (
            <div className="space-y-4">
              {(section.data.items as Array<{ question: string; answer: string }>)?.map((faq, j) => (
                <details key={j} className="border rounded-lg p-4">
                  <summary className="font-medium cursor-pointer">{faq.question}</summary>
                  <p className="mt-2 text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          )}

          {section.type === 'cta' && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <h2 className="text-3xl font-bold">{String(section.data.heading ?? '')}</h2>
              <p className="mt-2 text-gray-500">{String(section.data.description ?? '')}</p>
              <a href={String(section.data.url ?? '#')} className="mt-4 inline-block bg-[var(--color-primary)] text-white px-8 py-3 rounded-lg">
                {String(section.data.button_text ?? 'Get Started')}
              </a>
            </div>
          )}

          {section.type === 'form' && <ContactForm />}

          {section.type === 'gallery' && (
            <div className="grid grid-cols-3 gap-4">
              {(section.data.images as Array<{ url: string; alt?: string }>)?.map((img, j) => (
                <img key={j} src={img.url} alt={img.alt ?? ''} className="rounded-lg w-full h-48 object-cover" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Contact Form Component

Create `components/ContactForm.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { submitForm } from '@/lib/cardlink';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const ok = await submitForm('contact', { name, email, message });
    setSending(false);
    if (ok) { setSent(true); setName(''); setEmail(''); setMessage(''); }
  };

  if (sent) return <div className="text-center py-8 text-green-600 font-medium">Thank you! We'll be in touch.</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <input required placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
        className="w-full border rounded-lg px-4 py-3" />
      <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full border rounded-lg px-4 py-3" />
      <textarea required placeholder="Message" rows={4} value={message} onChange={e => setMessage(e.target.value)}
        className="w-full border rounded-lg px-4 py-3" />
      <button type="submit" disabled={sending}
        className="w-full bg-[var(--color-primary)] text-white py-3 rounded-lg font-medium disabled:opacity-50">
        {sending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
```

---

## 6. Home Page

Create `app/page.tsx`:

```tsx
import { getSiteData } from '@/lib/cardlink';
import Link from 'next/link';

export default async function HomePage() {
  const site = await getSiteData();
  const homePage = site.pages.find(p => p.page_type === 'home');

  // If a home page exists in CMS, render it the same way as dynamic pages
  // Otherwise show a default landing

  return (
    <div>
      {/* Hero */}
      <section className="py-20 text-center bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white">
        <h1 className="text-5xl font-bold">{site.settings?.site_title ?? 'Welcome'}</h1>
        <p className="mt-4 text-xl opacity-90">{site.settings?.tagline}</p>
      </section>

      {/* Page links */}
      <section className="max-w-5xl mx-auto px-4 py-16 grid grid-cols-3 gap-8">
        {site.pages.filter(p => p.show_in_nav && p.page_type !== 'home').map(page => (
          <Link key={page.id} href={`/${page.slug}`}
            className="border rounded-xl p-6 hover:shadow-lg transition">
            <h3 className="font-bold text-lg">{page.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{page.page_type}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
```

---

## 7. Content JSON Structure

When creating pages in the Cardlink CMS, use this JSON content structure:

```json
{
  "sections": [
    {
      "type": "hero",
      "data": {
        "heading": "Welcome to Our Business",
        "subheading": "Professional services you can trust",
        "cta_text": "Contact Us",
        "cta_url": "/contact"
      }
    },
    {
      "type": "features",
      "data": {
        "items": [
          { "icon": "🚀", "title": "Fast", "description": "Lightning quick delivery" },
          { "icon": "🛡️", "title": "Secure", "description": "Enterprise-grade security" },
          { "icon": "💡", "title": "Smart", "description": "AI-powered insights" }
        ]
      }
    },
    {
      "type": "text",
      "data": { "html": "<p>Rich text content here...</p>" }
    },
    {
      "type": "testimonials",
      "data": {
        "items": [
          { "quote": "Excellent service!", "name": "John Doe", "role": "CEO" }
        ]
      }
    },
    {
      "type": "form",
      "data": {}
    }
  ]
}
```

---

## 8. Deployment

### Vercel (recommended)
```bash
npx vercel --prod
```

### Netlify
```bash
npx netlify deploy --prod
```

### Environment variables to set:
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CARDLINK_API_URL` | Your Cardlink instance URL |
| `NEXT_PUBLIC_COMPANY_ID` | Your company UUID from Cardlink |

---

## 9. CORS Configuration

If your website is on a different domain, add CORS headers to the Cardlink API. In `cardlink/next.config.ts`, ensure the public API allows cross-origin requests:

```typescript
async headers() {
  return [{
    source: '/api/public/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
    ],
  }];
}
```

---

## 10. Ownership Control Audit

### ✅ Owner Has Full Control Over:

| Area | Control Level | Where |
|------|-------------|-------|
| **Modules** | Toggle enable/disable per module | `/business/owner/modules` |
| **Team / Users** | Invite, assign roles (admin/manager/member/staff), remove | `/business/owner/users` |
| **Roles** | Define role-to-module mapping | `/api/owner/roles` |
| **Billing** | Manage subscription, upgrade/downgrade plans | `/business/owner/billing` |
| **API Keys** | Create/revoke API keys | `/business/owner/api-keys` |
| **Audit Log** | View all system activity | `/business/owner/audit` |
| **Security** | Password policies, session management | `/business/owner/security` |
| **Integrations** | Connect/disconnect third-party services | `/business/settings/integrations` |
| **Website CMS** | Full CRUD on website pages, settings, media, navigation | `/business/settings/website` |
| **Company Settings** | Company profile, logo, contact info | `/business/settings/company` |
| **All Business Modules** | Full read/write access to all modules (HR, POS, Inventory, CRM, Accounting, Procurement, Booking, Store, AI) | `/business/*` |

### Role Hierarchy

| Role | Scope |
|------|-------|
| **Owner** | Everything — cannot be changed or removed |
| **Admin** | All modules, cannot manage billing |
| **Manager** | CRM, POS, Inventory — operational modules |
| **Member** | Read access, basic operations |
| **Staff** | POS only — front-desk operations |

---

## Summary

Your website template needs:
1. **A new Next.js project** (separate Git repo) — or use the **ready-made template** in `company-website-template/`
2. **Environment variables**: `NEXT_PUBLIC_CARDLINK_API_URL`, `NEXT_PUBLIC_COMPANY_ID` (+ optional Supabase keys)
3. **API client** (`lib/cardlink-api.ts`) that calls the public API
4. **Dynamic page rendering** based on CMS content
5. **Contact form** that submits to Cardlink
6. **Store** with cart (React Context), product grid, and checkout
7. **Booking** with service selection, date/time picker, and appointment creation

All content is managed from **Cardlink Business Dashboard → Settings → Website**.

### Using the Pre-Built Template

Instead of building from scratch, you can use the pre-built template:

```bash
cp -r company-website-template my-company-website
cd my-company-website
./setup.sh     # Interactive setup wizard
npm run dev    # Start development server
```

The template includes:
- Homepage with CMS content, store preview, and booking preview
- Dynamic CMS page routes (`/page/[slug]`)
- Full online store with cart (React Context), checkout, and order confirmation
- Appointment booking with service → date → time slot → customer info → confirm flow
- Contact form
- Blog listing
- Mobile-responsive layout
- SEO metadata
- AI customization prompt (`AI_PROMPT.md`)
- Health check endpoint (`/api/health`)

See `company-website-template/README.md` for complete documentation.
