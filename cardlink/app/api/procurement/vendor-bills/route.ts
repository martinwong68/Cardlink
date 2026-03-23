import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";

type BillDraft = {
  company_id?: string;
  companyId?: string;
  supplier_id?: string;
  po_id?: string | null;
  receipt_id?: string | null;
  bill_number?: string;
  bill_date?: string;
  due_date?: string | null;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  payment_terms?: string | null;
  notes?: string | null;
  items?: { product_id?: string | null; description?: string; qty: number; unit_cost: number; amount: number }[];
};

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();

  const { data: bills, error } = await supabase
    .from("proc_vendor_bills")
    .select("id, company_id, supplier_id, po_id, receipt_id, bill_number, status, bill_date, due_date, subtotal, tax_amount, total_amount, payment_terms, notes, created_at, updated_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const billIds = (bills ?? []).map((b) => b.id);
  const { data: items } = billIds.length
    ? await supabase
        .from("proc_vendor_bill_items")
        .select("id, bill_id, product_id, description, qty, unit_cost, amount")
        .in("bill_id", billIds)
    : { data: [] };

  const itemMap = new Map<string, unknown[]>();
  (items ?? []).forEach((item) => {
    const list = itemMap.get(item.bill_id) ?? [];
    list.push(item);
    itemMap.set(item.bill_id, list);
  });

  const enriched = (bills ?? []).map((b) => ({
    ...b,
    items: itemMap.get(b.id) ?? [],
  }));

  return NextResponse.json({
    contract: "procurement.vendor_bills.v1",
    status: "ok",
    company_id: guard.context.activeCompanyId,
    bills: enriched,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as BillDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) return guard.response;

  if (!body.supplier_id || !body.bill_number?.trim()) {
    return NextResponse.json(
      { error: "supplier_id and bill_number are required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: billRow, error: billError } = await supabase
    .from("proc_vendor_bills")
    .insert({
      company_id: guard.context.activeCompanyId,
      supplier_id: body.supplier_id,
      po_id: body.po_id || null,
      receipt_id: body.receipt_id || null,
      bill_number: body.bill_number.trim(),
      status: "draft",
      bill_date: body.bill_date || new Date().toISOString().slice(0, 10),
      due_date: body.due_date || null,
      subtotal: Number(body.subtotal) || 0,
      tax_amount: Number(body.tax_amount) || 0,
      total_amount: Number(body.total_amount) || 0,
      payment_terms: body.payment_terms || null,
      notes: body.notes?.trim() || null,
      created_by: guard.context.user.id,
    })
    .select("id")
    .single();

  if (billError || !billRow) {
    const conflict = billError?.code === "23505";
    return NextResponse.json(
      { error: billError?.message ?? "Bill creation failed." },
      { status: conflict ? 409 : 400 },
    );
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    const itemPayload = body.items.map((item) => ({
      bill_id: billRow.id,
      company_id: guard.context.activeCompanyId,
      product_id: item.product_id || null,
      description: item.description || null,
      qty: item.qty,
      unit_cost: item.unit_cost,
      amount: item.amount,
    }));

    const { error: itemError } = await supabase.from("proc_vendor_bill_items").insert(itemPayload);
    if (itemError) {
      await supabase.from("proc_vendor_bills").delete().eq("id", billRow.id);
      return NextResponse.json({ error: itemError.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    {
      contract: "procurement.vendor_bills.v1",
      status: "created",
      company_id: guard.context.activeCompanyId,
      bill_id: billRow.id,
      emitted_events: ["procurement.bill.created"],
    },
    { status: 201 },
  );
}
