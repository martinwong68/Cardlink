import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";
import { requireAccountingContext } from "@/src/lib/accounting/context";
import { writeAccountingAuditLog } from "@/src/lib/accounting/audit";
import {
  createPaymentReceivedJournalEntry,
  createVendorBillPaidJournalEntry,
} from "@/src/lib/cross-module-integration";

type PaymentDraft = {
  org_id?: string;
  payment_number?: string;
  payment_type?: "received" | "made";
  related_type?: "invoice" | "vendor_bill";
  related_id?: string;
  contact_id?: string;
  amount?: number;
  payment_method?: string;
  payment_date?: string;
  reference?: string;
  notes?: string;
  currency?: string;
  exchange_rate?: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const guard = await requireAccountingContext({ request });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const relatedType = url.searchParams.get("related_type");
  const relatedId = url.searchParams.get("related_id");

  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("id, org_id, payment_number, payment_type, related_type, related_id, contact_id, amount, payment_method, payment_date, reference, notes, currency, exchange_rate, transaction_id, created_at")
    .eq("org_id", guard.context.organizationId)
    .order("payment_date", { ascending: false })
    .limit(100);

  if (relatedType) query = query.eq("related_type", relatedType);
  if (relatedId) query = query.eq("related_id", relatedId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contract: "accounting.payments.v1",
    status: "ok",
    organization_id: guard.context.organizationId,
    payments: data ?? [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as PaymentDraft;
  const guard = await requireAccountingContext({
    request,
    expectedOrganizationId: body.org_id?.trim() ?? null,
    write: true,
  });
  if (!guard.ok) return guard.response;

  const paymentNumber = body.payment_number?.trim();
  const paymentType = body.payment_type;
  const relatedType = body.related_type;
  const relatedId = body.related_id?.trim();
  const amount = Number(body.amount ?? 0);

  if (!paymentNumber || !paymentType || !relatedType || !relatedId || amount <= 0) {
    return NextResponse.json(
      { error: "payment_number, payment_type, related_type, related_id, and amount > 0 are required." },
      { status: 400 }
    );
  }

  if (!["received", "made"].includes(paymentType)) {
    return NextResponse.json({ error: "payment_type must be received or made." }, { status: 400 });
  }
  if (!["invoice", "vendor_bill"].includes(relatedType)) {
    return NextResponse.json({ error: "related_type must be invoice or vendor_bill." }, { status: 400 });
  }

  const supabase = await createClient();

  /* Validate that the related document exists and check balance */
  let documentNumber = "";
  if (relatedType === "invoice") {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, total, amount_paid, balance_due, invoice_number")
      .eq("id", relatedId)
      .eq("org_id", guard.context.organizationId)
      .maybeSingle();

    if (!inv) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

    const balanceDue = Number(inv.balance_due) || (Number(inv.total) - Number(inv.amount_paid));
    if (amount > round2(balanceDue + 0.01)) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds balance due (${round2(balanceDue)}).` },
        { status: 400 }
      );
    }
    documentNumber = inv.invoice_number;
  } else {
    const { data: bill } = await supabase
      .from("vendor_bills")
      .select("id, total, amount_paid, balance_due, bill_number")
      .eq("id", relatedId)
      .eq("org_id", guard.context.organizationId)
      .maybeSingle();

    if (!bill) return NextResponse.json({ error: "Vendor bill not found." }, { status: 404 });

    const balanceDue = Number(bill.balance_due) || (Number(bill.total) - Number(bill.amount_paid));
    if (amount > round2(balanceDue + 0.01)) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds balance due (${round2(balanceDue)}).` },
        { status: 400 }
      );
    }
    documentNumber = bill.bill_number;
  }

  /* Insert the payment record */
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      org_id: guard.context.organizationId,
      payment_number: paymentNumber,
      payment_type: paymentType,
      related_type: relatedType,
      related_id: relatedId,
      contact_id: body.contact_id?.trim() || null,
      amount: round2(amount),
      payment_method: body.payment_method ?? "bank_transfer",
      payment_date: body.payment_date ?? new Date().toISOString().slice(0, 10),
      reference: body.reference?.trim() || null,
      notes: body.notes?.trim() || null,
      currency: body.currency?.trim() || "USD",
      exchange_rate: Number(body.exchange_rate ?? 1),
      created_by: guard.context.userId,
    })
    .select("id, payment_number, amount, payment_type, related_type, related_id")
    .single();

  if (paymentError || !payment) {
    const conflict = paymentError?.code === "23505";
    return NextResponse.json(
      { error: paymentError?.message ?? "Payment create failed." },
      { status: conflict ? 409 : 400 }
    );
  }

  /* Update the related document's amount_paid and balance_due */
  if (relatedType === "invoice") {
    const { data: inv } = await supabase
      .from("invoices")
      .select("total, amount_paid")
      .eq("id", relatedId)
      .single();

    if (inv) {
      const newAmountPaid = round2(Number(inv.amount_paid) + amount);
      const newBalanceDue = round2(Number(inv.total) - newAmountPaid);
      const newStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

      await supabase.from("invoices").update({
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", relatedId);
    }
  } else {
    const { data: bill } = await supabase
      .from("vendor_bills")
      .select("total, amount_paid")
      .eq("id", relatedId)
      .single();

    if (bill) {
      const newAmountPaid = round2(Number(bill.amount_paid) + amount);
      const newBalanceDue = round2(Number(bill.total) - newAmountPaid);
      const newStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

      await supabase.from("vendor_bills").update({
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", relatedId);
    }
  }

  /* Create accounting journal entry */
  let txId: string | null = null;
  if (relatedType === "invoice") {
    txId = await createPaymentReceivedJournalEntry(
      supabase, guard.context.organizationId, guard.context.userId,
      payment.id, round2(amount), documentNumber,
    );
  } else {
    txId = await createVendorBillPaidJournalEntry(
      supabase, guard.context.organizationId, guard.context.userId,
      relatedId, round2(amount), documentNumber,
    );
  }

  /* Link journal entry to payment */
  if (txId) {
    await supabase.from("payments").update({ transaction_id: txId }).eq("id", payment.id);
  }

  await writeAccountingAuditLog({
    supabase,
    organizationId: guard.context.organizationId,
    userId: guard.context.userId,
    action: "payment.recorded",
    tableName: "payments",
    recordId: payment.id,
    newValues: payment,
  });

  return NextResponse.json(
    {
      contract: "accounting.payments.v1",
      status: "created",
      organization_id: guard.context.organizationId,
      payment_id: payment.id,
      amount: round2(amount),
      transaction_id: txId,
      emitted_events: ["accounting.payment.recorded"],
    },
    { status: 201 }
  );
}
