import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

/**
 * Public Store Products API — no auth required.
 * GET /api/public/store/products?company_id=xxx
 * Returns published products, categories, and payment info for a company's public store.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");

  if (!companyId) {
    return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify store is published and load payment settings
  const { data: settings } = await supabase
    .from("store_settings")
    .select("store_name, description, banner_url, theme_color, is_published, payment_methods")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!settings?.is_published) {
    return NextResponse.json({ error: "Store is not published." }, { status: 404 });
  }

  // Check if company has Stripe Connect enabled (use admin client to read companies table)
  const supabaseAdmin = createAdminClient();
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", companyId)
    .single();

  const stripeEnabled = !!(company?.stripe_connect_account_id && company?.stripe_connect_charges_enabled);

  // Load categories and products in parallel
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("store_categories")
      .select("id, name, slug, description, icon, sort_order")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("store_products")
      .select("id, name, slug, description, price, compare_at_price, product_type, images, category_id, sku, stock_quantity")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  // Parse payment methods from settings
  const paymentMethods = (settings.payment_methods ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    store: {
      name: settings.store_name,
      description: settings.description,
      banner_url: settings.banner_url,
      theme_color: settings.theme_color,
    },
    categories: categoriesRes.data ?? [],
    products: productsRes.data ?? [],
    payment_config: {
      stripe_enabled: stripeEnabled && (paymentMethods.online === true),
      cash_enabled: paymentMethods.cash === true,
      bank_transfer_enabled: paymentMethods.bank_transfer === true,
      qr_codes: Array.isArray(paymentMethods.qr_codes) ? paymentMethods.qr_codes : [],
    },
  });
}
