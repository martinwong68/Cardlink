import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";
import type { ParsedSetupData } from "@/src/lib/ai/data-transformer";

/**
 * POST /api/business/ai/setup/apply
 *
 * Apply the AI-parsed setup data to the actual database tables.
 * Called after the user has reviewed and confirmed the preview.
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  const body = (await request.json()) as {
    parsedData: ParsedSetupData;
    uploadId?: string;
  };

  if (!body.parsedData) {
    return NextResponse.json({ error: "parsedData is required" }, { status: 400 });
  }

  const { targetModule, documentType, fullData } = body.parsedData;

  if (!fullData || fullData.length === 0) {
    return NextResponse.json({ error: "No data to import" }, { status: 400 });
  }

  try {
    let inserted = 0;
    let tableName = "";

    switch (targetModule) {
      case "inventory": {
        tableName = "inventory_products";
        const rows = fullData.map((row) => ({
          company_id: companyId,
          name: String(row.name ?? row.product_name ?? row.item_name ?? ""),
          sku: String(row.sku ?? row.code ?? row.item_code ?? ""),
          description: String(row.description ?? row.desc ?? ""),
          unit_price: Number(row.unit_price ?? row.price ?? row.selling_price ?? 0),
          cost_price: Number(row.cost_price ?? row.cost ?? row.buying_price ?? 0),
          category: String(row.category ?? row.type ?? ""),
          unit_of_measure: String(row.unit ?? row.uom ?? row.unit_of_measure ?? "pcs"),
          is_active: true,
        }));
        const { data, error } = await supabase
          .from(tableName)
          .insert(rows)
          .select("id");
        if (error) throw error;
        inserted = data?.length ?? 0;
        break;
      }

      case "accounting": {
        if (documentType === "accounting_accounts") {
          tableName = "accounts";
          const rows = fullData.map((row) => ({
            company_id: companyId,
            code: String(row.code ?? row.account_code ?? row.account_number ?? ""),
            name: String(row.name ?? row.account_name ?? ""),
            type: String(row.type ?? row.account_type ?? "expense"),
            description: String(row.description ?? row.desc ?? ""),
            is_active: true,
          }));
          const { data, error } = await supabase
            .from(tableName)
            .insert(rows)
            .select("id");
          if (error) throw error;
          inserted = data?.length ?? 0;
        }
        break;
      }

      case "hr": {
        tableName = "employees";
        const rows = fullData.map((row) => ({
          company_id: companyId,
          first_name: String(row.first_name ?? row.name?.toString().split(" ")[0] ?? ""),
          last_name: String(row.last_name ?? row.name?.toString().split(" ").slice(1).join(" ") ?? ""),
          email: String(row.email ?? ""),
          phone: String(row.phone ?? row.mobile ?? ""),
          position: String(row.position ?? row.title ?? row.job_title ?? ""),
          department: String(row.department ?? row.dept ?? ""),
          status: "active",
        }));
        const { data, error } = await supabase
          .from(tableName)
          .insert(rows)
          .select("id");
        if (error) throw error;
        inserted = data?.length ?? 0;
        break;
      }

      case "crm": {
        tableName = "crm_contacts";
        const rows = fullData.map((row) => ({
          company_id: companyId,
          first_name: String(row.first_name ?? row.name?.toString().split(" ")[0] ?? ""),
          last_name: String(row.last_name ?? row.name?.toString().split(" ").slice(1).join(" ") ?? ""),
          email: String(row.email ?? ""),
          phone: String(row.phone ?? row.mobile ?? ""),
          company: String(row.company ?? row.organization ?? ""),
          source: "import",
        }));
        const { data, error } = await supabase
          .from(tableName)
          .insert(rows)
          .select("id");
        if (error) throw error;
        inserted = data?.length ?? 0;
        break;
      }

      case "pos": {
        tableName = "pos_products";
        const rows = fullData.map((row) => ({
          company_id: companyId,
          name: String(row.name ?? row.product_name ?? ""),
          price: Number(row.price ?? row.selling_price ?? 0),
          sku: String(row.sku ?? row.code ?? ""),
          category: String(row.category ?? ""),
          is_active: true,
        }));
        const { data, error } = await supabase
          .from(tableName)
          .insert(rows)
          .select("id");
        if (error) throw error;
        inserted = data?.length ?? 0;
        break;
      }

      case "company": {
        tableName = "companies";
        // For company profile, update existing record
        const profile = fullData[0] ?? {};
        const updateData: Record<string, unknown> = {};
        if (profile.name) updateData.name = String(profile.name);
        if (profile.address) updateData.address = String(profile.address);
        if (profile.phone) updateData.phone = String(profile.phone);
        if (profile.email) updateData.email = String(profile.email);
        if (profile.website) updateData.website = String(profile.website);
        if (profile.registration_number) updateData.registration_number = String(profile.registration_number);

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from(tableName)
            .update(updateData)
            .eq("id", companyId);
          if (error) throw error;
          inserted = 1;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unsupported target module: ${targetModule}` },
          { status: 400 },
        );
    }

    // Update upload status if tracking
    if (body.uploadId) {
      await supabase
        .from("ai_setup_uploads")
        .update({ status: "applied", applied_count: inserted })
        .eq("id", body.uploadId);
    }

    return NextResponse.json({
      status: "ok",
      inserted,
      tableName,
      targetModule,
    });
  } catch (err) {
    console.error("[AI Setup Apply] Error:", err);

    // Update upload status to failed
    if (body.uploadId) {
      await supabase
        .from("ai_setup_uploads")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", body.uploadId);
    }

    return NextResponse.json(
      { error: "Failed to apply setup data. Please try again." },
      { status: 500 },
    );
  }
}
