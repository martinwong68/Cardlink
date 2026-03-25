# Cardlink — UAT (User Acceptance Testing) Checklist

> **Version:** 1.0
> **Date:** 2026-03-25
> **Purpose:** Verify every feature works correctly before production release.
> **How to use:** Walk through each section. Mark ✅ when passing, ❌ when failing.
> Add the tester name and date beside each result.

---

## Table of Contents

1. [Pre-Requisites](#1-pre-requisites)
2. [Authentication & User Management](#2-authentication--user-management)
3. [Dashboard (Personal)](#3-dashboard-personal)
4. [NFC / Card Tap](#4-nfc--card-tap)
5. [Business Dashboard](#5-business-dashboard)
6. [Accounting Module](#6-accounting-module)
7. [HR Module](#7-hr-module)
8. [Inventory Module](#8-inventory-module)
9. [POS Module](#9-pos-module)
10. [CRM Module](#10-crm-module)
11. [Booking Module](#11-booking-module)
12. [Procurement Module](#12-procurement-module)
13. [Online Store Module](#13-online-store-module)
14. [AI Module](#14-ai-module)
15. [Owner / Admin Panel](#15-owner--admin-panel)
16. [Settings](#16-settings)
17. [Billing & Stripe](#17-billing--stripe)
18. [Community](#18-community)
19. [Internationalization (i18n)](#19-internationalization-i18n)
20. [Public APIs & Pages](#20-public-apis--pages)
21. [Cross-Module Integration](#21-cross-module-integration)
22. [Edge Cases & Error Handling](#22-edge-cases--error-handling)

---

## 1. Pre-Requisites

Before starting UAT, confirm the following environment is ready:

| # | Check | Status |
|---|-------|--------|
| 1.1 | Node.js installed and `npm install` completed in `cardlink/` | ☐ |
| 1.2 | `.env.local` configured with valid Supabase URL and keys | ☐ |
| 1.3 | All Supabase migrations applied (56 migration files in order) | ☐ |
| 1.4 | Subscription plans seeded (`20260318_005_seed_subscription_plans.sql`) | ☐ |
| 1.5 | Stripe keys configured (test mode OK for UAT) | ☐ |
| 1.6 | AI provider key configured (`AI_POE_API_KEY` or `AI_OPENAI_API_KEY`) | ☐ |
| 1.7 | Dev server starts without errors (`npm run dev`) | ☐ |
| 1.8 | Demo data seeded (optional: `node scripts/seed-trial-data.mjs demo@cardlink.test`) | ☐ |

---

## 2. Authentication & User Management

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1 | Sign up | Go to `/signup`, fill form, submit | Account created, redirected to dashboard | ☐ |
| 2.2 | Login | Go to `/auth`, enter credentials | Logged in, redirected to dashboard | ☐ |
| 2.3 | Logout | Click logout from dashboard | Redirected to home page | ☐ |
| 2.4 | Password reset | Go to `/reset-password`, enter email | Reset email sent | ☐ |
| 2.5 | Profile update | Dashboard → Settings → Profile | Name, avatar, bio updated | ☐ |
| 2.6 | Privacy settings | Dashboard → Settings → Privacy | Privacy preferences saved | ☐ |
| 2.7 | Password change | Dashboard → Settings → Password | Password changed successfully | ☐ |
| 2.8 | Banned user | Admin bans user → user tries to login | Redirect to `/banned` page | ☐ |

---

## 3. Dashboard (Personal)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | Dashboard loads | Navigate to `/dashboard` | Dashboard page renders with nav | ☐ |
| 3.2 | Personal cards | Go to `/dashboard/cards` | Card list displays | ☐ |
| 3.3 | Create card | `/dashboard/cards` → Create new | Card created successfully | ☐ |
| 3.4 | Edit card | `/dashboard/cards/[id]/edit` | Card updated | ☐ |
| 3.5 | QR code | Open QR modal on any card | QR code renders correctly | ☐ |
| 3.6 | Contacts | Go to `/dashboard/contacts` | Contact list displays | ☐ |
| 3.7 | Contact detail | `/dashboard/contacts/[id]` | Contact detail loads | ☐ |
| 3.8 | NFC cards | `/dashboard/nfc` | NFC card management page loads | ☐ |
| 3.9 | Scan page | `/dashboard/scan` | QR/NFC scanner initializes | ☐ |
| 3.10 | Membership | `/dashboard/membership` | Membership page loads | ☐ |
| 3.11 | Discounts | `/dashboard/discount` | Available discounts display | ☐ |
| 3.12 | Discount history | `/dashboard/discount/history` | Redemption history shows | ☐ |
| 3.13 | Notifications | `/dashboard/notifications` | Notifications list loads | ☐ |
| 3.14 | Feed | `/dashboard/feed` | Activity feed renders | ☐ |
| 3.15 | Explore | `/dashboard/explore` | Explore page loads | ☐ |
| 3.16 | Discover | `/dashboard/discover` | Discover page loads | ☐ |
| 3.17 | Upgrade | `/dashboard/settings/upgrade` | Upgrade options display | ☐ |
| 3.18 | Support | `/dashboard/settings/support` | Support page loads | ☐ |

---

## 4. NFC / Card Tap

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | Valid tap | Access `/tap/[valid-uid]` | Redirects to card owner's public profile | ☐ |
| 4.2 | No card | Access `/tap/no-card` | "No card" message displayed | ☐ |
| 4.3 | Expired card | Access `/tap/expired` | "Card expired" message displayed | ☐ |
| 4.4 | Suspended card | Access `/tap/suspended` | "Card suspended" message displayed | ☐ |
| 4.5 | Deactivated card | Access `/tap/deactivated` | "Card deactivated" message displayed | ☐ |
| 4.6 | Error tap | Access `/tap/error` | Error page displayed | ☐ |
| 4.7 | Public card view | Access `/c/[slug]` | Public card renders with correct template | ☐ |

---

## 5. Business Dashboard

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | Register company | `/business/register-company` | Company created, redirected to dashboard | ☐ |
| 5.2 | Business dashboard | Navigate to `/business` | Module cards displayed with stats | ☐ |
| 5.3 | Switch company | Use company switcher (if multiple) | Active company changes | ☐ |
| 5.4 | Company cards | `/business/company-cards` | Company cards listed | ☐ |
| 5.5 | Company management | `/business/company-management` | Management page loads | ☐ |
| 5.6 | Action cards | `/business/action-cards` | AI action cards display | ☐ |
| 5.7 | Business notifications | `/business/notifications` | Notifications listed | ☐ |
| 5.8 | Store management | `/business/store-management` | Store management page loads | ☐ |
| 5.9 | Business nav | Check bottom nav on mobile | All nav items visible and clickable | ☐ |

---

## 6. Accounting Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | Module loads | Navigate to `/business/accounting` | Accounting function tiles display | ☐ |
| 6.2 | Dashboard | `/business/accounting/dashboard` | Financial overview with charts | ☐ |
| 6.3 | Chart of accounts | `/business/accounting/accounts` | Account list CRUD works | ☐ |
| 6.4 | Create account | Accounts → Add new | Account created, appears in list | ☐ |
| 6.5 | Transactions | `/business/accounting/transactions` | Transaction list displays | ☐ |
| 6.6 | New transaction | `/business/accounting/transactions/new` | Transaction form works | ☐ |
| 6.7 | Create invoice | `/business/accounting/invoices/new` | Invoice created with line items | ☐ |
| 6.8 | Invoice list | `/business/accounting/invoices` | Invoices listed with status | ☐ |
| 6.9 | Invoice detail | `/business/accounting/invoices/[id]` | Invoice detail renders | ☐ |
| 6.10 | Update invoice status | Change invoice to paid/sent | Status updates correctly | ☐ |
| 6.11 | Bills | `/business/accounting/bills` | Bills listed | ☐ |
| 6.12 | New bill | `/business/accounting/bills/new` | Bill created | ☐ |
| 6.13 | Payments | `/business/accounting/payments` | Payment records display | ☐ |
| 6.14 | Bank accounts | `/business/accounting/bank-accounts` | Bank account list | ☐ |
| 6.15 | Banking | `/business/accounting/banking` | Banking transactions | ☐ |
| 6.16 | Contacts | `/business/accounting/contacts` | Accounting contacts CRUD | ☐ |
| 6.17 | Documents | `/business/accounting/documents` | Document upload/list | ☐ |
| 6.18 | Estimates | `/business/accounting/estimates` | Estimate creation | ☐ |
| 6.19 | Credit notes | `/business/accounting/credit-notes` | Credit note management | ☐ |
| 6.20 | Payroll journal | `/business/accounting/payroll` | Payroll integration | ☐ |
| 6.21 | Inventory items | `/business/accounting/inventory` | Inventory items linked | ☐ |
| 6.22 | Recurring invoices | `/business/accounting/recurring` | Recurring invoice setup | ☐ |
| 6.23 | Fiscal periods | `/business/accounting/periods` | Fiscal period management | ☐ |
| 6.24 | Settings | `/business/accounting/settings` | Tax rates, currencies configurable | ☐ |
| 6.25 | Reports — P&L | `/business/accounting/reports` → P&L | Profit & Loss generated | ☐ |
| 6.26 | Reports — Balance Sheet | Reports → Balance Sheet | Balance Sheet generated | ☐ |
| 6.27 | Reports — Trial Balance | Reports → Trial Balance | Trial Balance generated | ☐ |

---

## 7. HR Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | Module loads | Navigate to `/business/hr` | HR function tiles display | ☐ |
| 7.2 | Employees | `/business/hr/employees` | Employee list with search/filter | ☐ |
| 7.3 | Add employee | Employees → Add new | Employee created | ☐ |
| 7.4 | Employee detail | Click employee → view detail | Full employee info displays | ☐ |
| 7.5 | Edit employee | Employee → Edit | Employee updated | ☐ |
| 7.6 | Departments | `/business/hr/departments` | Department CRUD | ☐ |
| 7.7 | Positions | Go to Positions page | Position management works | ☐ |
| 7.8 | Leave requests | `/business/hr/leave` | Leave request list | ☐ |
| 7.9 | Submit leave | Leave → Create request | Leave request submitted | ☐ |
| 7.10 | Approve/reject leave | Manager approves/rejects request | Status updated | ☐ |
| 7.11 | Leave balances | `/business/hr/leave-policies` | Leave balance tracking | ☐ |
| 7.12 | Leave policies | Leave policies page | Policy rules display | ☐ |
| 7.13 | Attendance | `/business/hr/attendance` | Clock in/out works | ☐ |
| 7.14 | Payroll | `/business/hr/payroll` | Payroll records display | ☐ |
| 7.15 | Generate payslip | Payroll → Generate | Payslip generated | ☐ |
| 7.16 | Holidays | `/business/hr/holidays` | Company holiday calendar | ☐ |
| 7.17 | Public holidays | `/business/hr/public-holidays` | Public holiday list | ☐ |
| 7.18 | Documents | `/business/hr/documents` | Document management | ☐ |
| 7.19 | Employee documents | `/business/hr/employee-documents` | Employee-specific docs | ☐ |
| 7.20 | Onboarding | `/business/hr/onboarding` | Onboarding workflow | ☐ |
| 7.21 | Tax config | `/business/hr/tax-config` | Tax bracket setup | ☐ |
| 7.22 | HR Reports | `/business/hr/reports` | HR analytics displayed | ☐ |

---

## 8. Inventory Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | Module loads | Navigate to `/business/inventory` | Inventory function tiles display | ☐ |
| 8.2 | Products | `/business/inventory/products` | Product list with stock levels | ☐ |
| 8.3 | Create product | Products → Add new | Product created | ☐ |
| 8.4 | Edit product | Product → Edit | Product updated | ☐ |
| 8.5 | Delete product | Product → Delete | Product removed | ☐ |
| 8.6 | Categories | `/business/inventory/categories` | Category management | ☐ |
| 8.7 | Warehouses | `/business/inventory/warehouses` | Multi-warehouse CRUD | ☐ |
| 8.8 | Stock movements | `/business/inventory/movements` | Stock in/out/transfer | ☐ |
| 8.9 | Record stock in | Movements → Stock In | Stock increased | ☐ |
| 8.10 | Record stock out | Movements → Stock Out | Stock decreased | ☐ |
| 8.11 | Stock transfer | Movements → Transfer between warehouses | Balances updated | ☐ |
| 8.12 | Stock takes | `/business/inventory/stock-takes` | Physical count CRUD | ☐ |
| 8.13 | Complete stock take | Stock take → Complete | Stock balances adjusted | ☐ |
| 8.14 | Balances | `/business/inventory/balances` | Stock level overview | ☐ |
| 8.15 | Variants | `/business/inventory/variants` | Product variant management | ☐ |
| 8.16 | UoM | `/business/inventory/uom` | Unit of measure CRUD | ☐ |
| 8.17 | Reports | `/business/inventory/reports` | Inventory reports generated | ☐ |
| 8.18 | Low stock alert | Create product with stock below reorder level | Low stock notification appears | ☐ |

---

## 9. POS Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | Module loads | Navigate to `/business/pos` | POS function tiles display | ☐ |
| 9.2 | Terminal | `/business/pos/terminal` | POS checkout interface loads | ☐ |
| 9.3 | Add items | Terminal → Add products to cart | Items added, total updates | ☐ |
| 9.4 | Apply discount | Terminal → Apply discount | Discount applied to order | ☐ |
| 9.5 | Complete sale | Terminal → Process payment | Order created, receipt shown | ☐ |
| 9.6 | Split payment | Terminal → Split payment | Multiple payment methods recorded | ☐ |
| 9.7 | Orders | `/business/pos/orders` | Order history listed | ☐ |
| 9.8 | Order detail | Orders → Click order | Order detail with line items | ☐ |
| 9.9 | Refund | Order → Process refund | Refund recorded | ☐ |
| 9.10 | Products | `/business/pos/products` | POS product catalog | ☐ |
| 9.11 | Shifts | `/business/pos/shifts` | Shift management (open/close) | ☐ |
| 9.12 | Open shift | Shifts → Open new | Shift started with float amount | ☐ |
| 9.13 | Close shift | Shifts → Close current | Shift closed, summary generated | ☐ |
| 9.14 | Daily summary | `/business/pos/daily-summary` | Daily sales summary report | ☐ |
| 9.15 | POS Reports | `/business/pos/reports` | Sales reports generated | ☐ |

---

## 10. CRM Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10.1 | Module loads | Navigate to `/business/crm` | CRM function tiles display | ☐ |
| 10.2 | Leads | `/business/crm/leads` | Lead list displayed | ☐ |
| 10.3 | Create lead | Leads → Add new | Lead created | ☐ |
| 10.4 | Edit lead | Lead → Edit | Lead updated | ☐ |
| 10.5 | Convert lead | Lead → Convert to deal/contact | Lead converted successfully | ☐ |
| 10.6 | Contacts | `/business/crm/contacts` | Contact list displayed | ☐ |
| 10.7 | Import contacts | Contacts → Import CSV | Contacts imported | ☐ |
| 10.8 | Deals | `/business/crm/deals` | Deal pipeline displayed | ☐ |
| 10.9 | Create deal | Deals → Add new | Deal created with stage | ☐ |
| 10.10 | Move deal stage | Drag/change deal stage | Deal stage updated | ☐ |
| 10.11 | Activities | `/business/crm/activities` | Activity log displayed | ☐ |
| 10.12 | Create activity | Activities → Add new | Activity recorded | ☐ |
| 10.13 | Campaigns | `/business/crm/campaigns` | Campaign list displayed | ☐ |
| 10.14 | Create campaign | Campaigns → Add new | Campaign created | ☐ |
| 10.15 | Accounts | `/business/crm/accounts` | Account list | ☐ |
| 10.16 | Members | `/business/crm/members` | Member list displayed | ☐ |
| 10.17 | Community settings | `/business/crm/community-settings` | Community visibility settings | ☐ |
| 10.18 | CRM Reports | `/business/crm/reports` | Pipeline and conversion reports | ☐ |

---

## 11. Booking Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11.1 | Module loads | Navigate to `/business/booking` | Booking function tiles display | ☐ |
| 11.2 | Services | `/business/booking/services` | Service catalog listed | ☐ |
| 11.3 | Create service | Services → Add new | Service created with pricing | ☐ |
| 11.4 | Availability | `/business/booking/availability` | Availability slots management | ☐ |
| 11.5 | Set availability | Availability → Add slot | Slot created | ☐ |
| 11.6 | Exceptions | `/business/booking/exceptions` | Exception dates management | ☐ |
| 11.7 | Appointments | `/business/booking/appointments` | Appointment list | ☐ |
| 11.8 | Create appointment | Appointments → Add new | Appointment booked | ☐ |
| 11.9 | Update appointment | Appointment → Change status | Status updated (confirm/cancel) | ☐ |
| 11.10 | Calendar view | `/business/booking/calendar` | Calendar shows appointments | ☐ |
| 11.11 | Customers | `/business/booking/customers` | Booking customer records | ☐ |
| 11.12 | Staff | `/business/booking/staff` | Staff management | ☐ |
| 11.13 | Settings | `/business/booking/settings` | Booking configuration | ☐ |
| 11.14 | Reports | `/business/booking/reports` | Booking analytics | ☐ |
| 11.15 | Public booking | Access public booking URL | Customer can book without login | ☐ |

---

## 12. Procurement Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 12.1 | Module loads | Navigate to `/business/procurement` | Procurement function tiles display | ☐ |
| 12.2 | Vendors | `/business/procurement/vendors` | Vendor list | ☐ |
| 12.3 | Create vendor | Vendors → Add new | Vendor created | ☐ |
| 12.4 | Purchase requests | `/business/procurement/requests` | Request list | ☐ |
| 12.5 | Create request | Requests → Add new | Request submitted | ☐ |
| 12.6 | Convert to PO | Request → Convert to PO | PO created from request | ☐ |
| 12.7 | Purchase orders | `/business/procurement/purchase-orders` | PO list | ☐ |
| 12.8 | Create PO | Purchase Orders → Add new | PO created | ☐ |
| 12.9 | PO status update | PO → Change status | Status updated | ☐ |
| 12.10 | Contracts | `/business/procurement/contracts` | Contract list | ☐ |
| 12.11 | Create contract | Contracts → Add new | Contract created | ☐ |
| 12.12 | Goods receipt | `/business/procurement/goods-receipt` | Receiving records | ☐ |
| 12.13 | Record receipt | Goods Receipt → Receive items | Inventory updated | ☐ |
| 12.14 | Vendor bills | `/business/procurement/vendor-bills` | Bill list | ☐ |
| 12.15 | Create vendor bill | Vendor Bills → Add new | Bill created | ☐ |

---

## 13. Online Store Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 13.1 | Module loads | Navigate to `/business/store` | Store function tiles display | ☐ |
| 13.2 | Store setup | `/business/store/setup` | Store setup wizard | ☐ |
| 13.3 | Products | `/business/store/products` | Product catalog management | ☐ |
| 13.4 | Create product | Products → Add new | Product created | ☐ |
| 13.5 | Edit product | Product → Edit | Product updated | ☐ |
| 13.6 | Categories | `/business/store/categories` | Category management | ☐ |
| 13.7 | Orders | `/business/store/orders` | Order management | ☐ |
| 13.8 | Order detail | Orders → Click order | Order detail with status | ☐ |
| 13.9 | Update order status | Order → Change status | Status workflow progresses | ☐ |
| 13.10 | Customers | `/business/store/customers` | Customer records | ☐ |
| 13.11 | Customer accounts | `/business/store/customer-accounts` | Customer account management | ☐ |
| 13.12 | Coupons | `/business/store/coupons` | Coupon management | ☐ |
| 13.13 | Create coupon | Coupons → Add new | Coupon created | ☐ |
| 13.14 | Discounts | `/business/store/discounts` | Discount rules | ☐ |
| 13.15 | Shipments | `/business/store/shipments` | Shipment tracking | ☐ |
| 13.16 | Settings | `/business/store/settings` | Store configuration | ☐ |
| 13.17 | Store reports | Go to store reports | Sales data displayed | ☐ |
| 13.18 | Public checkout | `POST /api/public/store/checkout` | Checkout works without auth | ☐ |

---

## 14. AI Module

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 14.1 | Module loads | Navigate to `/business/ai` | AI preset buttons display | ☐ |
| 14.2 | Record expense | Click "Record Expense" preset | Questions appear, then executes | ☐ |
| 14.3 | Generate report | Click "Generate Report" preset | Report generated | ☐ |
| 14.4 | Check inventory | Click "Check Inventory" preset | Inventory summary returned | ☐ |
| 14.5 | Create invoice | Click "Create Invoice" preset | Invoice created via AI | ☐ |
| 14.6 | Record sale | Click "Record Sale" preset | Sale recorded | ☐ |
| 14.7 | Upload data | Click "Upload Data" → upload file | Data parsed and imported | ☐ |
| 14.8 | CRM add lead | Click "CRM Add Lead" preset | Lead created | ☐ |
| 14.9 | Daily review | Click "Daily Review" preset | Daily business review generated | ☐ |
| 14.10 | Monthly audit | Click "Monthly Audit" preset | Monthly audit report generated | ☐ |
| 14.11 | AI action cards | Check action card rendering | Interactive cards with choices | ☐ |
| 14.12 | AI execution | Confirm AI action card → Execute | Actions executed, summary shown | ☐ |
| 14.13 | AI history | `/business/ai/history` | Past conversations listed | ☐ |
| 14.14 | AI credit limit | Use AI beyond monthly limit | Limit prompt appears | ☐ |

---

## 15. Owner / Admin Panel

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 15.1 | Panel loads | Navigate to `/business/owner` | Owner dashboard loads | ☐ |
| 15.2 | Billing | `/business/owner/billing` | Subscription + payment history | ☐ |
| 15.3 | Users | `/business/owner/users` | Team member management | ☐ |
| 15.4 | Add user | Users → Invite new member | Invitation sent | ☐ |
| 15.5 | Remove user | Users → Remove member | Member removed | ☐ |
| 15.6 | API keys | `/business/owner/api-keys` | API key CRUD | ☐ |
| 15.7 | Create API key | API Keys → Generate new | Key generated | ☐ |
| 15.8 | Audit log | `/business/owner/audit` | Audit events listed | ☐ |
| 15.9 | Security | `/business/owner/security` | Security settings | ☐ |
| 15.10 | Modules | `/business/owner/modules` | Module enable/disable | ☐ |
| 15.11 | Toggle module | Modules → Toggle a module | Module status changes | ☐ |

---

## 16. Settings

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 16.1 | Settings loads | Navigate to `/business/settings` | Settings page loads | ☐ |
| 16.2 | Company profile | `/business/settings/company` | Company info editable | ☐ |
| 16.3 | Update company | Change company name → Save | Company name updated | ☐ |
| 16.4 | Plan & billing | `/business/settings/plan` | Plan comparison displayed | ☐ |
| 16.5 | Upgrade plan | Plan → Upgrade | Redirects to Stripe Checkout | ☐ |
| 16.6 | Language | `/business/settings/language` | Language switcher works | ☐ |
| 16.7 | Switch language | Change language to zh-HK | UI switches to Chinese (HK) | ☐ |
| 16.8 | Notifications | `/business/settings/notifications` | Notification preferences | ☐ |
| 16.9 | AI settings | `/business/settings/ai` | AI provider configuration | ☐ |
| 16.10 | Integrations | `/business/settings/integrations` | Integration management | ☐ |
| 16.11 | Main account | `/business/settings/main-account` | User account settings | ☐ |
| 16.12 | Stripe Connect | `/business/settings/stripe-connect` | Stripe Connect onboarding | ☐ |
| 16.13 | Website settings | `/business/settings/website` | Website CMS settings | ☐ |
| 16.14 | Owner settings | `/business/settings/owner` | Owner-specific settings | ☐ |

---

## 17. Billing & Stripe

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 17.1 | Stripe checkout | Upgrade → Stripe Checkout | Checkout page opens | ☐ |
| 17.2 | Payment success | Complete test payment | Profile updated to premium | ☐ |
| 17.3 | Webhook — checkout | `checkout.session.completed` fires | Payment event logged | ☐ |
| 17.4 | Webhook — invoice | `invoice.paid` fires | Subscription extended | ☐ |
| 17.5 | Webhook — subscription created | `customer.subscription.created` | Subscription record created | ☐ |
| 17.6 | Webhook — subscription updated | `customer.subscription.updated` | Subscription status updated | ☐ |
| 17.7 | Webhook — subscription deleted | `customer.subscription.deleted` | Plan downgraded to free | ☐ |
| 17.8 | Billing history | Owner → Billing | Payment events displayed | ☐ |
| 17.9 | Customer portal | Billing → Manage subscription | Stripe Customer Portal opens | ☐ |
| 17.10 | Stripe Connect onboard | Settings → Stripe Connect → Onboard | Express account created | ☐ |
| 17.11 | Connect status | After onboarding → Check status | Connect account status displays | ☐ |
| 17.12 | Connect dashboard | Stripe Connect → Dashboard | Express dashboard opens | ☐ |
| 17.13 | Connect checkout | Customer buys via connected account | Payment split with platform fee | ☐ |

---

## 18. Community

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 18.1 | Community hub | `/community` | Community boards listed | ☐ |
| 18.2 | Board page | `/community/[boardSlug]` | Board with sub-boards/posts | ☐ |
| 18.3 | Sub-board | `/community/[boardSlug]/[subBoardSlug]` | Sub-board posts listed | ☐ |
| 18.4 | Post detail | `/community/.../[postId]` | Post detail with comments | ☐ |
| 18.5 | Dashboard community | `/dashboard/community` | User's community view | ☐ |
| 18.6 | Company community | CRM → Community Settings | Community enabled/disabled | ☐ |
| 18.7 | Visibility — public | Set visibility to "public" | Anyone can see content | ☐ |
| 18.8 | Visibility — all users | Set to "all_users" | Only logged-in users see content | ☐ |
| 18.9 | Visibility — members only | Set to "members_only" | Only company members see content | ☐ |

---

## 19. Internationalization (i18n)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 19.1 | English (default) | Set language to EN | All UI text in English | ☐ |
| 19.2 | Simplified Chinese | Switch to zh-CN | UI switches to 简体中文 | ☐ |
| 19.3 | Traditional Chinese (TW) | Switch to zh-TW | UI switches to 繁體中文 (台灣) | ☐ |
| 19.4 | Traditional Chinese (HK) | Switch to zh-HK | UI switches to 繁體中文 (香港) | ☐ |
| 19.5 | Korean | Switch to ko | UI switches to 한국어 | ☐ |
| 19.6 | Japanese | Switch to ja | UI switches to 日本語 | ☐ |
| 19.7 | Missing keys | Check for untranslated keys | No raw key strings visible in UI | ☐ |
| 19.8 | Language persistence | Switch language → reload page | Language preference persisted | ☐ |

---

## 20. Public APIs & Pages

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 20.1 | Public booking services | `GET /api/public/booking/services?company_id=X` | Services returned (no auth) | ☐ |
| 20.2 | Public booking slots | `GET /api/public/booking/slots?company_id=X&service_id=Y&date=Z` | Available slots returned | ☐ |
| 20.3 | Public booking create | `POST /api/public/booking/book` with valid payload | Appointment booked | ☐ |
| 20.4 | Public store checkout | `POST /api/public/store/checkout` with valid payload | Checkout processed | ☐ |
| 20.5 | Public website | `GET /api/public/website?company_id=X` | Website data returned | ☐ |
| 20.6 | Eligibility check | `GET /api/interface/eligibility` | Eligibility data returned | ☐ |
| 20.7 | Public card page | Access `/c/[slug]` | Public card renders correctly | ☐ |

---

## 21. Cross-Module Integration

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 21.1 | POS → Accounting | Complete POS sale | Journal entry created in accounting | ☐ |
| 21.2 | POS → Inventory | Complete POS sale | Stock levels decreased | ☐ |
| 21.3 | Procurement → Inventory | Receive goods | Inventory stock increased | ☐ |
| 21.4 | Procurement → Accounting | Create vendor bill | AP journal entry created | ☐ |
| 21.5 | HR → Accounting | Run payroll | Payroll journal entry created | ☐ |
| 21.6 | Invoice → Accounting | Create invoice | AR journal entry created | ☐ |
| 21.7 | Store → Inventory | Store order fulfilled | Stock levels updated | ☐ |
| 21.8 | CRM → Store | Lead/contact links to store customer | Customer data consistent | ☐ |
| 21.9 | AI → All modules | AI creates transaction/invoice/etc. | Records created in correct modules | ☐ |
| 21.10 | Booking → Accounting | Booking payment received | Revenue journal entry created | ☐ |

---

## 22. Edge Cases & Error Handling

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 22.1 | Unauthorized access | Access `/business` without login | Redirected to login | ☐ |
| 22.2 | No company | Login without company → access module | Prompted to create/join company | ☐ |
| 22.3 | Plan limits | Exceed module limits (free plan) | Upgrade prompt displayed | ☐ |
| 22.4 | Empty states | Access module with no data | Empty state message shown | ☐ |
| 22.5 | API error | Send invalid data to API | Proper error response (4xx) | ☐ |
| 22.6 | RLS enforcement | Try to access other company's data via API | 403/empty result returned | ☐ |
| 22.7 | Concurrent edit | Two users edit same record | Last write wins, no crash | ☐ |
| 22.8 | Large dataset | Load module with 100+ records | Pagination works, no timeout | ☐ |
| 22.9 | Mobile responsive | Open each module on mobile viewport | Layout adapts correctly | ☐ |
| 22.10 | Offline/slow network | Throttle network → use app | Loading states shown, no crash | ☐ |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

## Notes

> Record any bugs, issues, or observations here during testing:
>
> 1.
> 2.
> 3.
