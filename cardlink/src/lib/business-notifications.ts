import { createClient } from "@/src/lib/supabase/client";

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

export async function createBusinessNotification(
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
  const supabase = createClient();
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

export function notifyNewOrder(
  companyId: string,
  userId: string,
  orderId: string,
  orderTotal: number
) {
  return createBusinessNotification(companyId, userId, {
    type: "new_order",
    title: `New order received — $${orderTotal.toFixed(2)}`,
    priority: "normal",
    related_module: "pos",
    related_entity_id: orderId,
  });
}

export function notifyLowStock(
  companyId: string,
  userId: string,
  productId: string,
  productName: string,
  currentStock: number
) {
  return createBusinessNotification(companyId, userId, {
    type: "low_stock",
    title: `${productName} stock is low (${currentStock} left)`,
    priority: "urgent",
    related_module: "inventory",
    related_entity_id: productId,
  });
}

export function notifyInvoiceOverdue(
  companyId: string,
  userId: string,
  invoiceId: string,
  invoiceNumber: string,
  daysOverdue: number
) {
  return createBusinessNotification(companyId, userId, {
    type: "invoice_overdue",
    title: `Invoice ${invoiceNumber} is ${daysOverdue} days overdue`,
    priority: "urgent",
    related_module: "accounting",
    related_entity_id: invoiceId,
  });
}

export function notifyPaymentReceived(
  companyId: string,
  userId: string,
  paymentId: string,
  amount: number,
  customerName: string
) {
  return createBusinessNotification(companyId, userId, {
    type: "payment_received",
    title: `Payment of $${amount.toFixed(2)} received from ${customerName}`,
    priority: "info",
    related_module: "accounting",
    related_entity_id: paymentId,
  });
}

export function notifyNewBooking(
  companyId: string,
  userId: string,
  bookingId: string,
  customerName: string,
  serviceName: string,
  dateTime: string
) {
  return createBusinessNotification(companyId, userId, {
    type: "booking_new",
    title: `New booking: ${customerName} — ${serviceName}`,
    body: dateTime,
    priority: "normal",
    related_module: "booking",
    related_entity_id: bookingId,
  });
}

export function notifyAiSuggestion(
  companyId: string,
  userId: string,
  suggestionTitle: string,
  cardCount: number
) {
  return createBusinessNotification(companyId, userId, {
    type: "ai_suggestion",
    title: suggestionTitle,
    body: `${cardCount} action card(s) ready for review`,
    priority: "normal",
    related_module: "ai",
  });
}

export function notifySystem(
  companyId: string,
  userId: string,
  title: string,
  body?: string
) {
  return createBusinessNotification(companyId, userId, {
    type: "system",
    title,
    body,
    priority: "info",
  });
}
