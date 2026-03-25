import { NextResponse } from "next/server";

/**
 * GET /api/health — Connection health check.
 *
 * Tests connectivity to the Cardlink API and returns the status of
 * each service (website, store, booking). Use this to verify your
 * environment variables are configured correctly.
 */
export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_CARDLINK_API_URL ?? "";
  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const checks: Record<string, { status: string; message?: string; data?: unknown }> = {};

  // Check environment variables
  if (!apiBase) {
    return NextResponse.json({
      status: "error",
      message: "NEXT_PUBLIC_CARDLINK_API_URL is not configured. Run setup.sh or create .env.local",
      checks: {},
    }, { status: 500 });
  }
  if (!companyId) {
    return NextResponse.json({
      status: "error",
      message: "NEXT_PUBLIC_COMPANY_ID is not configured. Run setup.sh or create .env.local",
      checks: {},
    }, { status: 500 });
  }

  // Test Website API
  try {
    const res = await fetch(`${apiBase}/api/public/website?company_id=${companyId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      checks.website = {
        status: "ok",
        message: `Site: ${data.settings?.site_title ?? "(no title)"}`,
        data: {
          site_title: data.settings?.site_title ?? null,
          pages_count: data.pages?.length ?? 0,
          nav_items_count: data.navigation?.length ?? 0,
        },
      };
    } else {
      checks.website = {
        status: "error",
        message: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (e) {
    checks.website = {
      status: "error",
      message: `Cannot reach ${apiBase}: ${(e as Error).message}`,
    };
  }

  // Test Store API
  try {
    const res = await fetch(`${apiBase}/api/public/store/products?company_id=${companyId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      checks.store = {
        status: "ok",
        message: `Store: ${data.store?.name ?? "(no name)"} — ${data.products?.length ?? 0} products`,
        data: {
          store_name: data.store?.name ?? null,
          products_count: data.products?.length ?? 0,
          categories_count: data.categories?.length ?? 0,
        },
      };
    } else if (res.status === 404) {
      checks.store = {
        status: "not_published",
        message: "Store not published yet. Enable in Cardlink → Store Settings",
      };
    } else {
      checks.store = {
        status: "error",
        message: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (e) {
    checks.store = {
      status: "error",
      message: `Cannot reach store API: ${(e as Error).message}`,
    };
  }

  // Test Booking API
  try {
    const res = await fetch(`${apiBase}/api/public/booking/services?company_id=${companyId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      checks.booking = {
        status: "ok",
        message: `${data.services?.length ?? 0} booking services available`,
        data: {
          services_count: data.services?.length ?? 0,
          timezone: data.settings?.timezone ?? null,
        },
      };
    } else {
      checks.booking = {
        status: "error",
        message: `HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (e) {
    checks.booking = {
      status: "error",
      message: `Cannot reach booking API: ${(e as Error).message}`,
    };
  }

  // Test Supabase direct access
  if (supabaseUrl) {
    checks.supabase = {
      status: "configured",
      message: `Supabase URL: ${supabaseUrl.replace(/https?:\/\//, "").split(".")[0]}...`,
    };
  } else {
    checks.supabase = {
      status: "not_configured",
      message: "NEXT_PUBLIC_SUPABASE_URL not set (optional — only needed for direct DB access)",
    };
  }

  const allOk = Object.values(checks).every(
    (c) => c.status === "ok" || c.status === "configured" || c.status === "not_published" || c.status === "not_configured"
  );

  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    company_id: companyId,
    cardlink_api: apiBase,
    checks,
    timestamp: new Date().toISOString(),
  });
}
