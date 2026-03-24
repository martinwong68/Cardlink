import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

/**
 * POST /api/owner/integrations/test — Test an integration connection.
 * Body: { integration_key: string }
 *
 * This performs a lightweight connectivity check for each platform.
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { integration_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const integrationKey = body.integration_key?.trim();
  if (!integrationKey) {
    return NextResponse.json({ error: "integration_key is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  /* Fetch saved config */
  const { data: integration } = await supabase
    .from("company_integrations")
    .select("config, is_active")
    .eq("company_id", companyId)
    .eq("integration_key", integrationKey)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Integration not configured.", message: "Please save your configuration first." }, { status: 404 });
  }

  const config = (integration.config ?? {}) as Record<string, string>;

  try {
    switch (integrationKey) {
      case "wordpress": {
        const siteUrl = config.field_0?.replace(/\/+$/, "");
        if (!siteUrl) return NextResponse.json({ message: "Site URL is required." }, { status: 400 });
        const res = await fetch(`${siteUrl}/wp-json/wp/v2/types`, {
          headers: { "User-Agent": "Cardlink/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return NextResponse.json({ message: "WordPress connection successful! Site is reachable." });
        }
        return NextResponse.json({ message: `WordPress returned status ${res.status}.` }, { status: 400 });
      }

      case "woocommerce": {
        const storeUrl = config.field_0?.replace(/\/+$/, "");
        const ck = config.field_1;
        const cs = config.field_2;
        if (!storeUrl || !ck || !cs) {
          return NextResponse.json({ message: "Store URL, Consumer Key, and Consumer Secret are required." }, { status: 400 });
        }
        const res = await fetch(`${storeUrl}/wp-json/wc/v3/system_status?consumer_key=${encodeURIComponent(ck)}&consumer_secret=${encodeURIComponent(cs)}`, {
          headers: { "User-Agent": "Cardlink/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return NextResponse.json({ message: "WooCommerce connection successful!" });
        }
        return NextResponse.json({ message: `WooCommerce returned status ${res.status}.` }, { status: 400 });
      }

      case "shopify": {
        const shopDomain = config.field_0?.replace(/\/+$/, "").replace(/^https?:\/\//, "");
        const accessToken = config.field_1;
        if (!shopDomain || !accessToken) {
          return NextResponse.json({ message: "Shop domain and access token are required." }, { status: 400 });
        }
        const res = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
          headers: { "X-Shopify-Access-Token": accessToken, "User-Agent": "Cardlink/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return NextResponse.json({ message: "Shopify connection successful!" });
        }
        return NextResponse.json({ message: `Shopify returned status ${res.status}.` }, { status: 400 });
      }

      default:
        return NextResponse.json({ message: `Connection test for ${integrationKey} is not yet implemented. Configuration saved.` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message: `Connection failed: ${message}` }, { status: 500 });
  }
}
