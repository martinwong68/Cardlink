# UI/UX Rebuild Plan — 5 Phases

**Date:** 2026-03-17  
**Objective:** Align the Cardlink client app with the official design token spec (`Reference`).

---

## Audit Summary

| Area | Reference Spec | Current State | Gap |
|------|---------------|---------------|-----|
| **Colors** | Full primary (50–900), secondary (50–700), neutral (0–900), semantic (success/warning/error/info) | 7 CSS vars, hard-coded hex scattered across components | **Major** |
| **Typography** | Inter + JetBrains Mono, 10 size tokens, 4 weights, 4 line-heights, 3 letter-spacings | Inter only, ad-hoc Tailwind classes | **Medium** |
| **Spacing** | Named scale 0–24 (0px–96px) | Tailwind defaults | **Low** |
| **Radius** | 7 named tokens (none–full) | Mixed values (0.5rem, 0.75rem, 1rem, 1.5rem) | **Medium** |
| **Shadows** | 5 named tokens (xs–xl) | Mixed inline & CSS values | **Medium** |
| **Motion** | 4 durations, 4 easings | Only 2 transitions in globals.css | **Medium** |
| **Theme meta** | Primary-600 = `#4F46E5` | `#7c3aed` (wrong purple) | **Low** |

---

## Phase 1 — Design Foundation ✅

**Scope:** Tailwind config + CSS variables + root layout alignment.

**Deliverables:**
1. `tailwind.config.ts` — Register all Reference tokens (colors, fonts, spacing, radius, shadows, motion).
2. `globals.css` — Update `:root` variables to match Reference; map `@theme` block; add semantic color vars for success/warning/error/info.
3. `layout.tsx` — Fix `theme-color` meta to `#4F46E5`, update body classes to use new token system.

**Acceptance:**
- `npx tailwindcss --help` confirms valid config  
- All Reference colors available as `bg-primary-500`, `text-neutral-700`, etc.
- Shadow, radius, motion tokens available  
- Build compiles clean (`next build` or `next dev`)

---

## Phase 2 — Core Layout & Navigation

**Scope:** Root shell, header, sidebar, bottom nav, back button.

**Deliverables:**
1. `.app-shell`, `.app-page`, `.app-glass`, `.app-card`, `.app-card-soft` → use token vars.
2. `LoggedInTopHeader` → Reference colors & shadows.
3. `BusinessNav` → Reference palette for sidebar/mobile nav, correct radius & shadow tokens.
4. `HeaderBackButton` → Reference tokens.
5. `dashboard/layout.tsx`, `business/layout.tsx` → consistent token usage.

**Acceptance:**
- No hardcoded hex outside globals.css  
- All nav elements use token-based classes  
- Responsive behavior preserved  

---

## Phase 3 — Forms & Auth Pages

**Scope:** Login, Signup, Reset Password, Register screens + form primitives.

**Deliverables:**
1. `.app-input`, `.app-primary-btn`, `.app-secondary-btn`, `.app-pill` → rebuild with token vars.
2. Add `.app-select`, `.app-checkbox`, `.app-label` primitives.
3. `LoginClient`, `SignupClient`, `reset-password/page` → use new primitives + token typography.
4. `register/[uid]/page` → consistent card-preview styling.

**Acceptance:**
- All form elements follow Reference radius (md = 8px for inputs, full for buttons).
- Focus states use primary-500 at correct opacity.
- Typography scale matches Reference heading/body sizes.

---

## Phase 4 — Cards, Panels & Data Display

**Scope:** All panel components + public card view + data display.

**Deliverables:**
1. `PublicCardView`, `NfcCardsPanel`, `ContactsPanel` → token colors + shadows.
2. `CompanyCardsManagementPanel`, `CompanyManagementPanel` → token alignment.
3. `ExplorePanel`, `DiscountRedeemPanel`, `MembershipRedemptionsPanel` → status badges use semantic color tokens.
4. `AccountingShell`, `StatCardsRow` → token-based stat cards.

**Acceptance:**
- No hardcoded `bg-emerald-50`, `bg-rose-50`, etc. — all via semantic tokens.
- Card radius = `lg` (12px), stat card radius = `2xl` (20px).
- Consistent padding via spacing tokens.

---

## Phase 5 — Modals, Micro-interactions & Polish

**Scope:** Modals, notification bell, template selector, language switcher, motion, final sweep.

**Deliverables:**
1. `QRCodeModal`, `RedemptionQRCodeModal` → token shadows + radius.
2. `NotificationBell` → token palette.
3. `TemplateSelector` → token border + selection state colors.
4. `LanguageSwitcher` → token styling.
5. Motion: apply `--duration-*` and `--ease-*` tokens to all transitions.
6. Final sweep: grep for remaining hardcoded hex values; fix any misses.

**Acceptance:**
- Zero hardcoded color hex values in component files (all via Tailwind tokens or CSS vars).
- All transitions use motion tokens.
- Lighthouse accessibility score ≥ 90.
- `next build` succeeds with no type or lint errors.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tailwind v4 `@theme` API differences | Verify against Tailwind v4 docs before Phase 1 commit |
| Dark mode breakage | Phase 1 includes dark-mode token mapping; test toggle |
| Component-level overrides bypass tokens | Phase 6 grep sweep catches strays |
| Card pattern gradients use `color-mix` | Preserve existing `@supports` block; don't break patterns |

---

## Out of Scope

- Backend/API changes  
- New component creation  
- Business logic changes  
- i18n text changes  
- Deployment pipeline  
