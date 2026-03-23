#!/usr/bin/env node
/**
 * Cardlink — Trial / Demo Data Seed Script
 *
 * Populates a Supabase instance with realistic demo data so you can
 * explore every business module without setting up real records first.
 *
 * Prerequisites:
 *   1. Copy .env.example → .env.local and fill in the values.
 *   2. Run all Supabase migrations (supabase db push or apply manually).
 *   3. Create a test user via Supabase Auth (email/password sign-up).
 *
 * Usage:
 *   node scripts/seed-trial-data.mjs [user-email]
 *
 *   - user-email  (optional) defaults to "demo@cardlink.test"
 *     Must match an existing auth.users row.
 *
 * What this script creates:
 *   • A demo company ("Cardlink Demo Co") with the user as owner
 *   • A "Professional" subscription for the company
 *   • Employees, departments, positions (HR)
 *   • Leave requests and attendance records (HR)
 *   • Inventory categories, products, and warehouses (Inventory)
 *   • Booking services, availability, and sample appointments (Booking)
 *   • CRM leads, contacts, deals, and activities
 *   • Store products, customers, orders, and coupons (Online Store)
 *   • Accounting chart of accounts, invoices, and journal entries
 *   • Procurement vendors and purchase orders
 *   • POS products and sample orders
 *   • AI credits
 *   • Billing history entries
 */

import { createClient } from "@supabase/supabase-js";

/* ── Environment ── */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_EMAIL = process.argv[2] ?? "martinwong58@gmail.com";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "    Copy .env.example → .env.local and fill in the values."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ── Helpers ── */
const uuid = () => crypto.randomUUID();
const isoNow = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) {
    console.error(`❌  ${label}:`, error.message);
    throw error;
  }
  console.log(`  ✅ ${label}`);
  return data;
}

/* ── Main ── */
async function main() {
  console.log(`\n🌱  Seeding trial data for user: ${TARGET_EMAIL}\n`);

  /* 1. Resolve user */
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) { console.error("❌  Cannot list users:", listError.message); process.exit(1); }

  const user = (listData.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === TARGET_EMAIL.toLowerCase()
  );
  if (!user) {
    console.error(`❌  User "${TARGET_EMAIL}" not found. Create an account first.`);
    process.exit(1);
  }
  const userId = user.id;
  console.log(`  👤 Found user: ${userId}`);

  /* 2. Ensure profile exists */
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!existingProfile) {
    await must("Create profile", supabase.from("profiles").insert({
      id: userId,
      email: TARGET_EMAIL,
      full_name: "Martin Wong",
      plan: "free",
    }));
  } else {
    console.log("  ✅ Profile already exists");
  }

  /* 3. Create company */
  const companyId = uuid();
  await must("Create company", supabase.from("companies").insert({
    id: companyId,
    name: "Cardlink Demo Co",
    slug: "cardlink-demo",
    description: "A demo company for testing all Cardlink features",
    business_type: "llc",
    email: "demo@cardlink-demo.com",
    phone: "+1-555-0100",
    website: "https://demo.cardlink.app",
    default_currency: "USD",
    timezone: "America/New_York",
    employee_count_range: "11-50",
    is_active: true,
    created_by: userId,
    onboarding_completed: true,
  }));

  /* 4. Add company member (owner) */
  await must("Add company member", supabase.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role: "owner",
    status: "active",
    joined_at: isoNow(),
  }));

  /* 5. Set active company on profile */
  await must("Set active company", supabase.from("profiles").update({
    business_active_company_id: companyId,
  }).eq("id", userId));

  /* 6. Resolve subscription plan */
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, slug")
    .eq("is_active", true);

  const proPlan = (plans ?? []).find((p) => p.slug === "professional");
  const freePlan = (plans ?? []).find((p) => p.slug === "free");
  const planToUse = proPlan ?? freePlan;

  if (planToUse) {
    await must("Create subscription", supabase.from("company_subscriptions").insert({
      company_id: companyId,
      plan_id: planToUse.id,
      status: "active",
      current_period_start: isoNow(),
      current_period_end: daysFromNow(30),
      ai_actions_used: 12,
      ai_actions_limit: planToUse.slug === "professional" ? 200 : 0,
      storage_used_mb: 128,
      storage_limit_mb: planToUse.slug === "professional" ? 5120 : 500,
    }));
  }

  /* ── HR Module ── */
  console.log("\n📂 HR Module");

  const deptIds = [uuid(), uuid(), uuid()];
  await must("Create departments", supabase.from("hr_departments").insert([
    { id: deptIds[0], company_id: companyId, name: "Engineering", description: "Software development & tech" },
    { id: deptIds[1], company_id: companyId, name: "Sales", description: "Revenue & client acquisition" },
    { id: deptIds[2], company_id: companyId, name: "Operations", description: "Business operations & logistics" },
  ]));

  const posIds = [uuid(), uuid(), uuid()];
  await must("Create positions", supabase.from("hr_positions").insert([
    { id: posIds[0], company_id: companyId, department_id: deptIds[0], title: "Senior Developer", description: "Lead developer role" },
    { id: posIds[1], company_id: companyId, department_id: deptIds[1], title: "Sales Manager", description: "Manages sales team" },
    { id: posIds[2], company_id: companyId, department_id: deptIds[2], title: "Operations Lead", description: "Day-to-day ops management" },
  ]));

  const empIds = [uuid(), uuid(), uuid(), uuid(), uuid()];
  await must("Create employees", supabase.from("hr_employees").insert([
    { id: empIds[0], company_id: companyId, full_name: "Alice Chen", email: "alice@demo.com", department: "Engineering", position: "Senior Developer", status: "active", start_date: "2024-01-15", salary: 95000 },
    { id: empIds[1], company_id: companyId, full_name: "Bob Smith", email: "bob@demo.com", department: "Sales", position: "Sales Manager", status: "active", start_date: "2023-06-01", salary: 85000 },
    { id: empIds[2], company_id: companyId, full_name: "Carol Davis", email: "carol@demo.com", department: "Operations", position: "Operations Lead", status: "active", start_date: "2024-03-10", salary: 78000 },
    { id: empIds[3], company_id: companyId, full_name: "David Lee", email: "david@demo.com", department: "Engineering", position: "Junior Developer", status: "active", start_date: "2025-01-20", salary: 65000 },
    { id: empIds[4], company_id: companyId, full_name: "Eva Martinez", email: "eva@demo.com", department: "Sales", position: "Sales Rep", status: "inactive", start_date: "2024-08-15", salary: 55000 },
  ]));

  await must("Create leave requests", supabase.from("hr_leave_requests").insert([
    { company_id: companyId, employee_id: empIds[0], leave_type: "annual", start_date: daysFromNow(5).split("T")[0], end_date: daysFromNow(10).split("T")[0], days: 5, status: "pending", reason: "Family vacation" },
    { company_id: companyId, employee_id: empIds[1], leave_type: "sick", start_date: daysAgo(3).split("T")[0], end_date: daysAgo(1).split("T")[0], days: 2, status: "approved", reason: "Flu recovery" },
    { company_id: companyId, employee_id: empIds[4], leave_type: "maternity", start_date: daysAgo(30).split("T")[0], end_date: daysFromNow(60).split("T")[0], days: 90, status: "approved", reason: "Maternity leave" },
  ]));

  const yesterday = daysAgo(1).split("T")[0];
  await must("Create attendance records", supabase.from("hr_attendance").insert([
    { company_id: companyId, employee_id: empIds[0], date: yesterday, clock_in: `${yesterday}T09:02:00`, clock_out: `${yesterday}T17:35:00`, hours_worked: 8.55, status: "present" },
    { company_id: companyId, employee_id: empIds[1], date: yesterday, clock_in: `${yesterday}T08:55:00`, clock_out: `${yesterday}T18:10:00`, hours_worked: 9.25, status: "present" },
    { company_id: companyId, employee_id: empIds[2], date: yesterday, clock_in: `${yesterday}T09:15:00`, clock_out: `${yesterday}T17:00:00`, hours_worked: 7.75, status: "late" },
    { company_id: companyId, employee_id: empIds[3], date: yesterday, clock_in: `${yesterday}T09:00:00`, clock_out: `${yesterday}T17:30:00`, hours_worked: 8.5, status: "present" },
  ]));

  await must("Create holidays", supabase.from("hr_holidays").insert([
    { company_id: companyId, name: "New Year's Day", date: "2026-01-01", recurring: true },
    { company_id: companyId, name: "Independence Day", date: "2026-07-04", recurring: true },
    { company_id: companyId, name: "Christmas Day", date: "2026-12-25", recurring: true },
  ]));

  /* ── Inventory Module ── */
  console.log("\n📦 Inventory Module");

  const catIds = [uuid(), uuid()];
  await must("Create categories", supabase.from("inv_categories").insert([
    { id: catIds[0], company_id: companyId, name: "Electronics" },
    { id: catIds[1], company_id: companyId, name: "Office Supplies" },
  ]));

  const whIds = [uuid(), uuid()];
  await must("Create warehouses", supabase.from("inv_warehouses").insert([
    { id: whIds[0], company_id: companyId, name: "Main Warehouse", code: "WH-MAIN", address: "Building A", is_active: true },
    { id: whIds[1], company_id: companyId, name: "Overflow Storage", code: "WH-OVER", address: "Building B", is_active: true },
  ]));

  /* ── Booking Module ── */
  console.log("\n📅 Booking Module");

  const svcIds = [uuid(), uuid(), uuid()];
  await must("Create booking services", supabase.from("booking_services").insert([
    { id: svcIds[0], company_id: companyId, name: "Consultation", description: "One-on-one business consultation", duration_minutes: 60, price: 150, is_active: true },
    { id: svcIds[1], company_id: companyId, name: "Quick Check-in", description: "Brief 15-minute status update", duration_minutes: 15, price: 0, is_active: true },
    { id: svcIds[2], company_id: companyId, name: "Workshop Session", description: "Group workshop or training session", duration_minutes: 120, price: 300, is_active: true },
  ]));

  /* ── CRM Module ── */
  console.log("\n🤝 CRM Module");

  const leadIds = [uuid(), uuid()];
  const contactIds = [uuid(), uuid(), uuid()];
  const dealIds = [uuid(), uuid()];

  await must("Create CRM leads", supabase.from("crm_leads").insert([
    { id: leadIds[0], company_id: companyId, name: "TechStart Inc.", email: "info@techstart.io", phone: "+1-555-0201", source: "website", status: "qualified", notes: "Interested in enterprise plan" },
    { id: leadIds[1], company_id: companyId, name: "GreenField Corp", email: "sales@greenfield.co", phone: "+1-555-0202", source: "referral", status: "new", notes: "Referred by existing customer" },
  ]));

  await must("Create CRM contacts", supabase.from("crm_contacts").insert([
    { id: contactIds[0], company_id: companyId, name: "John Doe", email: "john@acme.com", phone: "+1-555-0301", company_name: "Acme Corp" },
    { id: contactIds[1], company_id: companyId, name: "Jane Wilson", email: "jane@widget.co", phone: "+1-555-0302", company_name: "Widget Co" },
    { id: contactIds[2], company_id: companyId, name: "Mike Johnson", email: "mike@bigcorp.com", phone: "+1-555-0303", company_name: "BigCorp Ltd" },
  ]));

  await must("Create CRM deals", supabase.from("crm_deals").insert([
    { id: dealIds[0], company_id: companyId, title: "Acme Enterprise Deal", stage: "proposal", value: 25000, probability: 30, contact_id: contactIds[0], contact_name: "John Doe", expected_close_date: daysFromNow(30).split("T")[0] },
    { id: dealIds[1], company_id: companyId, title: "Widget Annual Contract", stage: "negotiation", value: 12000, probability: 50, contact_id: contactIds[1], contact_name: "Jane Wilson", expected_close_date: daysFromNow(15).split("T")[0] },
  ]));

  await must("Create CRM activities", supabase.from("crm_activities").insert([
    { company_id: companyId, type: "task", title: "Follow-up call with Acme", description: "Discuss pricing options and timeline", due_date: daysAgo(2).split("T")[0], status: "completed", related_type: "deal", related_id: dealIds[0] },
    { company_id: companyId, type: "task", title: "Send proposal to Widget Co", description: "Prepare and send revised proposal v2", due_date: daysAgo(1).split("T")[0], status: "completed", related_type: "deal", related_id: dealIds[1] },
    { company_id: companyId, type: "task", title: "BigCorp initial meeting", description: "Discovery call to assess requirements", due_date: daysFromNow(3).split("T")[0], status: "pending", related_type: "contact", related_id: contactIds[2] },
  ]));

  /* ── Store Module ── */
  console.log("\n🛒 Store Module");

  const storeCustIds = [uuid(), uuid()];
  await must("Create store customers", supabase.from("store_customers").insert([
    { id: storeCustIds[0], company_id: companyId, name: "Alice Buyer", email: "alice.buyer@example.com", phone: "+1-555-0401" },
    { id: storeCustIds[1], company_id: companyId, name: "Bob Shopper", email: "bob.shopper@example.com", phone: "+1-555-0402" },
  ]));

  const storeOrderIds = [uuid(), uuid()];
  await must("Create store orders", supabase.from("store_orders").insert([
    { id: storeOrderIds[0], company_id: companyId, order_number: "ORD-2026-0001", customer_id: storeCustIds[0], status: "delivered", payment_status: "paid", subtotal: 159.99, tax_amount: 12.80, total: 172.79 },
    { id: storeOrderIds[1], company_id: companyId, order_number: "ORD-2026-0002", customer_id: storeCustIds[1], status: "processing", payment_status: "paid", subtotal: 49.99, tax_amount: 4.00, total: 53.99 },
  ]));

  await must("Create store coupons", supabase.from("store_coupons").insert([
    { company_id: companyId, code: "WELCOME10", name: "10% Welcome Discount", discount_type: "percentage", discount_value: 10, is_active: true, usage_limit: 100, usage_count: 5, valid_from: daysAgo(30), valid_until: daysFromNow(60) },
    { company_id: companyId, code: "SAVE20", name: "$20 Off Order", discount_type: "fixed", discount_value: 20.00, is_active: true, usage_limit: 50, usage_count: 0, valid_from: isoNow(), valid_until: daysFromNow(90) },
  ]));

  /* ── Billing History ── */
  console.log("\n💳 Billing");

  await must("Create billing history", supabase.from("billing_history").insert([
    { company_id: companyId, description: "Professional Plan — Monthly", amount: 29, currency: "USD", type: "subscription" },
    { company_id: companyId, description: "100 AI Credits", amount: 5, currency: "USD", type: "credits" },
  ]));

  /* AI Credits */
  await must("Create AI credits", supabase.from("ai_credits").insert({
    company_id: companyId,
    credits_remaining: 88,
    credits_purchased: 100,
  }));

  /* ── Business Notifications ── */
  console.log("\n🔔 Notifications");

  await must("Create notifications", supabase.from("business_notifications").insert([
    { company_id: companyId, user_id: userId, type: "system", title: "Welcome to Cardlink!", body: "Your demo company is ready. Explore each module from the dashboard.", is_read: false, priority: "info" },
    { company_id: companyId, user_id: userId, type: "low_stock", title: "Low Inventory Alert", body: "USB-C Cables are below reorder level (5 remaining).", is_read: false, priority: "urgent" },
  ]));

  /* ── Done ── */
  console.log("\n✨  Trial data seeded successfully!\n");
  console.log("📋  Quick Reference:");
  console.log(`    User:     ${TARGET_EMAIL}`);
  console.log(`    Company:  Cardlink Demo Co (${companyId})`);
  console.log(`    Plan:     ${planToUse?.slug ?? "none"}`);
  console.log("    Modules:  HR (5 employees, 3 depts), Inventory (2 categories, 2 warehouses),");
  console.log("              Booking (3 services), CRM (2 leads, 3 contacts, 2 deals),");
  console.log("              Store (2 customers, 2 orders, 2 coupons), Billing (2 entries)");
  console.log("\n💡  To log in:  Open the app and sign in as the target user.");
  console.log("    The demo company will be auto-selected.\n");
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
