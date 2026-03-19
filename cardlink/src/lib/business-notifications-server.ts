import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationType =
  | "new_order"
  | "low_stock"
  | "new_connection"
  | "invoice_overdue"
  | "payment_received"
  | "booking_new"
  | "ai_suggestion"
  | "system";

type Priority = "urgent" | "normal" | "info";

export async function createBusinessNotificationServer(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  options: {
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
    priority?: Priority;
    related_module?: string;
    related_entity_id?: string;
  }
) {
  return supabase.from("business_notifications").insert({
    company_id: companyId,
    user_id: userId,
    type: options.type,
    title: options.title,
    body: options.body ?? null,
    metadata: options.metadata ?? {},
    priority: options.priority ?? "normal",
    related_module: options.related_module ?? null,
    related_entity_id: options.related_entity_id ?? null,
  });
}

export function notifyLowStockServer(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  productId: string,
  productName: string,
  currentStock: number
) {
  return createBusinessNotificationServer(supabase, companyId, userId, {
    type: "low_stock",
    title: `${productName} stock is low (${currentStock} left)`,
    priority: "urgent",
    related_module: "inventory",
    related_entity_id: productId,
  });
}

export function notifyNewOrderServer(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  orderId: string,
  orderTotal: number
) {
  return createBusinessNotificationServer(supabase, companyId, userId, {
    type: "new_order",
    title: `New order received — $${orderTotal.toFixed(2)}`,
    priority: "normal",
    related_module: "pos",
    related_entity_id: orderId,
  });
}

export function notifyInvoiceOverdueServer(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  invoiceId: string,
  invoiceNumber: string,
  daysOverdue: number
) {
  return createBusinessNotificationServer(supabase, companyId, userId, {
    type: "invoice_overdue",
    title: `Invoice ${invoiceNumber} is ${daysOverdue} days overdue`,
    priority: "urgent",
    related_module: "accounting",
    related_entity_id: invoiceId,
  });
}

export function notifySystemServer(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  title: string,
  body?: string
) {
  return createBusinessNotificationServer(supabase, companyId, userId, {
    type: "system",
    title,
    body,
    priority: "info",
  });
}
