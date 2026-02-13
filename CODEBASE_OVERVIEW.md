# Codebase Overview

## 1. Overview
- CardLink is a Next.js app for digital business cards, NFC tap flows, a community forum, and a lightweight CRM for contacts.
- The app has a public marketing/community surface and an authenticated dashboard with cards, contacts, and settings.
- Supabase is the primary backend for auth, data storage, RPCs, and real-time notifications.
- Stripe is used for subscription billing and plan updates.

## 2. Tech Stack
- Framework: Next.js 16.1.6 (App Router).
- Runtime: React 19.2.3, TypeScript 5.9.3.
- Styling: Tailwind CSS v4 via @tailwindcss/postcss and globals.css.
- Backend: Supabase (ssr and supabase-js).
- Billing: Stripe (checkout + webhook).
- UI libs: lucide-react, recharts, qrcode.react, date-fns.
- State: Zustand is present as a dependency but not used in the current code.

## 3. Repository Layout
```
.
├── README.md
├── package-lock.json
└── cardlink
		├── .gitignore
		├── README.md
		├── eslint.config.mjs
		├── next.config.ts
		├── package-lock.json
		├── package.json
		├── postcss.config.mjs
		├── tsconfig.json
		├── app
		│   ├── globals.css
		│   ├── layout.tsx
		│   ├── page.tsx
		│   ├── favicon.ico
		│   ├── api
		│   │   └── stripe
		│   │       ├── checkout
		│   │       │   └── route.ts
		│   │       └── webhook
		│   │           └── route.ts
		│   ├── auth
		│   │   ├── page.tsx
		│   │   └── callback
		│   │       └── route.ts
		│   ├── c
		│   │   └── [slug]
		│   │       └── page.tsx
		│   ├── community
		│   │   ├── page.tsx
		│   │   └── [boardSlug]
		│   │       ├── page.tsx
		│   │       └── [subBoardSlug]
		│   │           ├── page.tsx
		│   │           └── [postId]
		│   │               └── page.tsx
		│   ├── dashboard
		│   │   ├── dashboard-nav.tsx
		│   │   ├── layout.tsx
		│   │   ├── page.tsx
		│   │   ├── card
		│   │   │   ├── page.tsx
		│   │   │   └── edit
		│   │   │       └── page.tsx
		│   │   ├── cards
		│   │   │   ├── page.tsx
		│   │   │   └── [cardId]
		│   │   │       └── edit
		│   │   │           └── page.tsx
		│   │   ├── community
		│   │   │   ├── page.tsx
		│   │   │   └── [boardSlug]
		│   │   │       ├── page.tsx
		│   │   │       └── [subBoardSlug]
		│   │   │           ├── page.tsx
		│   │   │           └── [postId]
		│   │   │               └── page.tsx
		│   │   ├── contacts
		│   │   │   ├── page.tsx
		│   │   │   └── [id]
		│   │   │       └── page.tsx
		│   │   ├── discover
		│   │   │   └── page.tsx
		│   │   ├── feed
		│   │   │   └── page.tsx
		│   │   ├── nfc
		│   │   │   └── page.tsx
		│   │   ├── notifications
		│   │   │   └── page.tsx
		│   │   ├── scan
		│   │   │   └── page.tsx
		│   │   └── settings
		│   │       ├── page.tsx
		│   │       ├── privacy
		│   │       │   └── page.tsx
		│   │       ├── profile
		│   │       │   └── page.tsx
		│   │       └── upgrade
		│   │           ├── page.tsx
		│   │           └── success
		│   │               └── page.tsx
		│   ├── login
		│   │   └── page.tsx
		│   ├── register
		│   │   └── [uid]
		│   │       └── page.tsx
		│   ├── signup
		│   │   └── page.tsx
		│   └── tap
		│       ├── StatusLayout.tsx
		│       ├── [uid]
		│       │   └── route.ts
		│       ├── deactivated
		│       │   └── page.tsx
		│       ├── error
		│       │   └── page.tsx
		│       ├── expired
		│       │   └── page.tsx
		│       ├── no-card
		│       │   └── page.tsx
		│       └── suspended
		│           └── page.tsx
		├── components
		│   ├── ContactsPanel.tsx
		│   ├── LanguageSwitcher.tsx
		│   ├── NfcCardsPanel.tsx
		│   ├── NotificationBell.tsx
		│   ├── PublicCardConnectionSection.tsx
		│   ├── PublicCardView.tsx
		│   ├── QRCodeModal.tsx
		│   ├── RelativeTime.tsx
		│   └── ServiceWorkerRegister.tsx
		├── public
		│   ├── file.svg
		│   ├── globe.svg
		│   ├── manifest.json
		│   ├── next.svg
		│   ├── sw.js
		│   ├── vercel.svg
		│   └── window.svg
		├── messages
		│   ├── en.json
		│   ├── zh-CN.json
		│   ├── zh-HK.json
		│   └── zh-TW.json
		└── src
				├── middleware.ts
				└── lib
						├── connections.ts
						├── visibility.ts
						└── supabase
								├── client.ts
								├── server.ts
								└── middleware.ts
```

## 4. Configuration and Tooling
- Next config sets Turbopack root to the app folder: cardlink/next.config.ts.
- ESLint config uses Next core-web-vitals and TypeScript presets: cardlink/eslint.config.mjs.
- Tailwind v4 is wired through PostCSS: cardlink/postcss.config.mjs and cardlink/app/globals.css.
- TypeScript is strict and uses bundler module resolution: cardlink/tsconfig.json.
- Root package-lock.json is empty (no packages at repo root).

Expected environment variables by code:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL (used for share URLs and checkout return URLs)
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_PREMIUM_MONTHLY_PRICE_ID
- STRIPE_PREMIUM_YEARLY_PRICE_ID
- NEXT_PUBLIC_NFC_CARD_PRICE_ID (NFC card checkout price)
- NEXT_PUBLIC_NFC_CARD_PRICE_DISPLAY (NFC card display price)
- STRIPE_WEBHOOK_SECRET

## 5. App Shell and Layout
- Root layout defines fonts, manifest, viewport, theme-color, and registers a service worker: cardlink/app/layout.tsx.
- Global styling and CardLink pattern utilities live in cardlink/app/globals.css.
- Locale detection and message loading are configured via next-intl in cardlink/i18n.ts and cardlink/i18n/request.ts.
- Locale settings live in cardlink/next-intl.config.ts and are applied in cardlink/src/middleware.ts.

## 6. Public Routes
- Home page with forum previews and redirect to dashboard when authenticated: cardlink/app/page.tsx.
- Auth landing, login, and signup forms: cardlink/app/auth/page.tsx, cardlink/app/login/page.tsx, cardlink/app/signup/page.tsx.
- Supabase OAuth callback exchange: cardlink/app/auth/callback/route.ts.
- Public community browsing: cardlink/app/community/page.tsx and board/sub-board/post detail routes under cardlink/app/community.
- Public card view: cardlink/app/c/[slug]/page.tsx.

## 7. Dashboard Routes (Authenticated)
- Dashboard layout enforces auth and includes navigation + notifications: cardlink/app/dashboard/layout.tsx.
- Primary sections:
	- Cards list with Contacts + NFC tabs: cardlink/app/dashboard/cards/page.tsx
	- Card editor: cardlink/app/dashboard/cards/[cardId]/edit/page.tsx
	- Contacts detail and CRM: cardlink/app/dashboard/contacts/[id]/page.tsx
	- Community (authenticated posting; no edit/delete in UI): cardlink/app/dashboard/community
	- Discover people: cardlink/app/dashboard/discover/page.tsx
	- Notifications summary: cardlink/app/dashboard/notifications/page.tsx
	- NFC “Get a Card” page with Stripe checkout: cardlink/app/dashboard/nfc/page.tsx
	- Settings and upgrade: cardlink/app/dashboard/settings

## 8. API Routes and Server Endpoints
- Stripe checkout session creation: cardlink/app/api/stripe/checkout/route.ts.
- Stripe webhook listener (subscription updates): cardlink/app/api/stripe/webhook/route.ts.
- NFC tap handler (server route): cardlink/app/tap/[uid]/route.ts.

## 9. Shared Components
- Contacts list UI and actions: cardlink/components/ContactsPanel.tsx.
- Notification bell with real-time Supabase subscription: cardlink/components/NotificationBell.tsx.
- Public card view and connection UI: cardlink/components/PublicCardView.tsx, cardlink/components/PublicCardConnectionSection.tsx.
- QR modal and time display: cardlink/components/QRCodeModal.tsx, cardlink/components/RelativeTime.tsx.
- Service worker registration: cardlink/components/ServiceWorkerRegister.tsx.

## 10. Supabase Clients and Middleware
- Browser client: cardlink/src/lib/supabase/client.ts.
- Server client for RSC: cardlink/src/lib/supabase/server.ts.
- Session refresh middleware: cardlink/src/lib/supabase/middleware.ts, wired in cardlink/src/middleware.ts.

## 11. Supabase Data Model Usage
Tables referenced in code:
- profiles
- business_cards
- card_fields
- card_links
- card_experiences
- connections
- notifications
- boards
- sub_boards
- forum_posts
- forum_replies
- card_shares
- crm_notes
- nfc_cards
- nfc_tap_logs

## 12. Supabase RPCs, Storage, and Realtime
- RPCs: register_nfc_card, handle_nfc_tap, change_nfc_linked_card.
- Storage: avatars bucket used for profile photo uploads in the card editor.
- Realtime: notifications table subscription in NotificationBell.

## 13. Auth and Session Handling
- Auth flows: signUp, signInWithPassword, signOut, exchangeCodeForSession.
- Dashboard layout redirects unauthenticated users to /login.
- Middleware refreshes Supabase session cookies on each request.

## 14. Billing and Stripe
- Checkout uses subscription mode with monthly or yearly price IDs.
- Webhook updates profiles.plan to premium or free based on subscription state.
- Premium indicator is profiles.plan ('free' | 'premium'); UI gates on this value.
- Success and cancel routes are under dashboard settings upgrade pages.

## 15. NFC Tap and Card Linking
- Tap handler calls handle_nfc_tap RPC, then redirects to /c/[slug] or status pages.
- NFC registration page links a physical card to a business card via register_nfc_card RPC.
- NFC dashboard UI lives under the Cards page tab and uses change_nfc_linked_card RPC for updates.

## 16. Community Forum Features
- Public browsing for boards, sub-boards, and posts in /community.
- Authenticated dashboard community allows creating posts and replies (edit/delete disabled in UI).
- Posts are sorted by last activity and display author profiles.

## 17. Contacts and CRM Features
- Connections helper functions handle requests, acceptance, rejection, and removal.
- Contacts list and details support CRM notes, tags, reminders, and interaction history.
- Field visibility logic in cardlink/src/lib/visibility.ts gates access based on plan and connection status.
- Contacts list/detail show a premium-styled external link indicator when plan is premium.

## 18. PWA, Assets, and Notes
- PWA manifest and service worker: cardlink/public/manifest.json, cardlink/public/sw.js.
- Manifest references /icons/* assets, but an icons directory is not present in the repo.
- favicon.ico is a binary asset under app and was not readable as text.
- Public SVGs are the default Next.js starter assets in cardlink/public.
