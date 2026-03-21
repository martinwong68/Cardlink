import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";
import { createClient } from "@/src/lib/supabase/server";
import { createReceiptJournalEntry } from "@/src/lib/cross-module-integration";

type ReceiptItemDraft = {
  po_item_id?: string;
  product_id?: string;
  qty?: number;
};

type ReceiptDraft = {
  company_id?: string;
  companyId?: string;
  po_id?: string;
  items?: ReceiptItemDraft[];
  note?: string;
  operation_id?: string;
  correlation_id?: string;
  occurred_at?: string;
  received_by?: string;
  idempotency_key?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ReceiptDraft;
  const expectedCompanyId = body.company_id?.trim() ?? body.companyId?.trim();

  const guard = await requireBusinessActiveCompanyContext({ request, expectedCompanyId });
  if (!guard.ok) {
    return guard.response;
  }

  if (!body.po_id) {
    return NextResponse.json(
      { error: "po_id is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items are required." }, { status: 400 });
  }

  const invalidItem = body.items.some(
    (item) =>
      !item.po_item_id ||
      !item.product_id ||
      typeof item.qty !== "number" ||
      item.qty <= 0
  );

  if (invalidItem) {
    return NextResponse.json(
      { error: "Each item requires po_item_id, product_id, qty > 0." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("process_procurement_receipt", {
    p_company_id: guard.context.activeCompanyId,
    p_po_id: body.po_id,
    p_received_by: body.received_by?.trim() || guard.context.user.id,
    p_note: body.note?.trim() || null,
    p_idempotency_key: body.idempotency_key?.trim() || null,
    p_operation_id: body.operation_id?.trim() || null,
    p_correlation_id: body.correlation_id?.trim() || null,
    p_occurred_at: body.occurred_at?.trim() || null,
    p_items: body.items,
  });

  if (error) {
    if (error.message.includes("po_not_found")) {
      return NextResponse.json({ error: "po not found." }, { status: 404 });
    }

    if (error.message.includes("po_scope_mismatch")) {
      return NextResponse.json({ error: "po is outside active company scope." }, { status: 403 });
    }

    if (error.message.includes("over_receive_not_allowed")) {
      return NextResponse.json({ error: "receipt would over-receive ordered quantity." }, { status: 409 });
    }

    if (error.message.includes("po_status_not_receivable")) {
      return NextResponse.json({ error: "po status is not receivable." }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json({ error: "receipt processing failed." }, { status: 500 });
  }

  /* Cross-module: create accounting journal entry for goods received */
  if (result.status !== "idempotent_replay") {
    /* Calculate total from PO items */
    const { data: poItems } = await supabase
      .from("proc_purchase_order_items")
      .select("qty, unit_cost")
      .eq("po_id", body.po_id);
    const totalCost = (poItems ?? []).reduce(
      (sum, item) => sum + (Number(item.qty) * Number(item.unit_cost)),
      0,
    );
    if (totalCost > 0) {
      void createReceiptJournalEntry(
        supabase,
        guard.context.activeCompanyId,
        guard.context.user.id,
        result.receipt_id,
        totalCost,
        `PO receipt ${body.po_id?.slice(0, 8)}`,
      );
    }
  }

  return NextResponse.json(
    {
      contract: "procurement.receipts.v1",
      status: result.status,
      company_id: guard.context.activeCompanyId,
      receipt_id: result.receipt_id,
      movement_count: result.movement_count,
      emitted_events: ["procurement.po.received", "inventory.stock.moved"],
    },
    { status: result.status === "idempotent_replay" ? 200 : 201 }
  );
}
