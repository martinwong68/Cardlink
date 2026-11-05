# Cardlink ↔ Geekbobo-backend namecard API

Frontend branch: `feature/namecard-redesign`

## Env

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CARDLINK_API_BASE_URL` | Geekbobo-backend origin (no trailing slash) |
| `CARDLINK_API_MOCK=1` | Local mock of the same path shapes (must be off before merge) |

Auth stays on Cardlink Supabase. Authenticated calls send `Authorization: Bearer <supabase_access_token>`.

## Paths (base `/api/cardlink`)

| Use | Method / path | Auth |
|-----|----------------|------|
| Public `/c/[slug]` | `GET /api/cardlink/cards/:slug` | no |
| NFC `/tap/[uid]` | `GET /api/cardlink/nfc/:uid` | no |
| Edit load | `GET /api/cardlink/me/card` | Bearer |
| Edit save | `PATCH /api/cardlink/me/card` | Bearer |
| Bind NFC | `POST /api/cardlink/me/nfc/bind` `{ "uid" }` | Bearer |

Client: `cardlink/src/lib/cardlink-api/`.

## Response fields

- Read: `card_fields` / `card_links` / `card_experiences` / `profiles` (snake_case).
- PATCH also accepts aliases `fields` / `links` / `experiences`; UI always reads `card_*`.
- NFC tap 200: `{ slug, card, action }` where `action` is `redirect` | `register` | `suspended` | `deactivated` | `expired` | `no_card`. Missing uid → 404.

## UI (Ink Signal)

- Public `/c/[slug]` and edit share the Ink Signal visual language (`components/namecard/`).
- Edit includes NFC bind via `POST /me/nfc/bind` only — no editable chip uid field.

## Rules

- Do not read/write `business_cards` / `card_*` / `nfc_*` from the Next app for namecard CRUD.
- Never send `nfc_uid` on `PATCH /me/card`.
- `/tap/[uid]` keeps the physical uid; resolution happens on the backend.
