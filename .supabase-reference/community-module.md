# Community & Social Module

> Auto-generated from Supabase database on 2025-07-21
> Updated 2026-03-25 with company-scope and visibility columns
> Updated 2026-03-31 with 3 global boards, 9 sub-boards, and admin seed posts
> 6 tables | All verified ✅ in live DB

---

## Table of Contents

- [boards](#boards) — 5 rows
- [sub_boards](#sub_boards) — 22 rows
- [forum_posts](#forum_posts) — 6 rows
- [forum_replies](#forum_replies) — 2 rows
- [posts](#posts) — 2 rows
- [connections](#connections) — 1 row

---

## boards

**Status:** ✅ Exists (3+ global boards seeded)
**Description:** Top-level forum categories. Supports company-scoped communities.

### Seeded Global Boards

| Name | Slug | Icon | Sub-boards |
|------|------|------|------------|
| Announcements | `announcements` | 📢 | Platform Updates · Feature Releases |
| User Guide | `user-guide` | 📖 | Getting Started · Business Modules Guide · NFC & Digital Cards · Billing & Subscription |
| General Discussion | `general-discussion` | 💬 | Tips & Tricks · Feature Requests · Showcase |

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| name | text | | |
| slug | text | | Unique URL identifier |
| description | text | | |
| icon | text | | |
| sort_order | int | | |
| company_id | uuid | NULL | FK → companies.id (NULL = global/public board) |
| logo_url | text | | Company community logo |
| member_count | int | | Cached member count |
| is_public | boolean | | Legacy public flag |
| visibility | text | 'public' | `public`, `all_users`, or `members_only` |
| created_at | timestamptz | now() | |

### Company Scope

- `company_id = NULL` → global/public board (visible to all)
- `company_id = <uuid>` → company-scoped board (visibility controlled by `visibility` column)

### Visibility Values

| Value | Who Can See |
|-------|-------------|
| `public` | Anyone (no login required) |
| `all_users` | Any logged-in user |
| `members_only` | Only company members |

### Referenced By

| Table | Column |
|-------|--------|
| sub_boards | board_id |

---

## sub_boards

**Status:** ✅ Exists (9 global sub-boards seeded)
**FK:** board_id → boards.id

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| board_id | uuid | | FK → boards.id |
| name | text | | |
| slug | text | | |
| description | text | | |
| sort_order | int | | |
| created_at | timestamptz | now() | |

### Constraints

- `UNIQUE(board_id, slug)`

### Referenced By

| Table | Column |
|-------|--------|
| forum_posts | sub_board_id |

---

## forum_posts

**Status:** ✅ Exists (8 admin-authored user-guide posts seeded)
**FKs:** sub_board_id → sub_boards.id, author_id → auth.users

### Columns (14)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| sub_board_id | uuid | | FK → sub_boards.id |
| author_id | uuid | | FK → auth.users |
| title | text | | |
| body | text | | |
| is_pinned | boolean | | |
| reply_count | int | | Denormalized count |
| last_activity_at | timestamptz | | |
| is_banned | boolean | | |
| banned_at | timestamptz | | |
| banned_by | uuid | | |
| banned_reason | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| forum_replies | post_id |

---

## forum_replies

**Status:** ✅ Exists (2 rows)
**FKs:** post_id → forum_posts.id, author_id → auth.users

### Columns (6)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| post_id | uuid | | FK → forum_posts.id |
| author_id | uuid | | FK → auth.users |
| body | text | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## posts

**Status:** ✅ Exists (2 rows)
**FK:** user_id → auth.users
**Description:** Social feed posts (separate from forum).

### Columns (9)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| user_id | uuid | | FK → auth.users |
| content | text | | |
| visibility | text | 'public' | public, private, connections_only |
| is_banned | boolean | | |
| banned_at | timestamptz | | |
| banned_by | uuid | | |
| banned_reason | text | | |
| created_at | timestamptz | now() | |

---

## connections

**Status:** ✅ Exists (1 row)
**FKs:** requester_id → auth.users, receiver_id → auth.users
**Description:** User-to-user connection requests (like adding contacts).

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| requester_id | uuid | | FK → auth.users |
| receiver_id | uuid | | FK → auth.users |
| status | text | 'pending' | pending, accepted, rejected |
| met_at_event | text | | |
| met_at_location | text | | |
| connected_at | timestamptz | | Set when accepted |
| created_at | timestamptz | now() | |

### Cross-Module Linkage

- `connections` links users who exchange business cards (namecard module)
- `notifications` may reference `related_connection_id` for connection request alerts
- `card_shares` records when card exchange triggers a connection
