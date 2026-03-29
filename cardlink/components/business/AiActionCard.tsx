"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bot,
  BookOpen,
  FileText,
  Package,
  Receipt,
  Navigation,
  BarChart3,
  Info,
  Check,
  X,
  Pencil,
  CreditCard,
  ArrowRightLeft,
  ShoppingCart,
  ClipboardList,
  Users,
  Contact,
  FileStack,
} from "lucide-react";

/* ── Types ── */
export type AiActionCardData = {
  id: string;
  card_type:
    | "journal_entry" | "invoice" | "inventory_update" | "expense"
    | "navigation" | "report" | "general"
    | "payment" | "stock_adjustment" | "product" | "purchase_order"
    | "sale" | "lead" | "contact" | "bulk_import";
  title: string;
  description: string | null;
  suggested_data: Record<string, unknown>;
  status: "pending" | "approved" | "amended" | "rejected";
  confidence_score: number | null;
  source_module: string | null;
};

export type AiActionCardProps = {
  card: AiActionCardData;
  onApprove: (cardId: string) => Promise<void>;
  onReject: (cardId: string, reason?: string) => Promise<void>;
  onAmend: (cardId: string, amendedData: Record<string, unknown>) => Promise<void>;
  compact?: boolean;
};

/* ── Card type badge config ── */
const TYPE_CONFIG: Record<
  AiActionCardData["card_type"],
  { icon: typeof BookOpen; label: string; color: string }
> = {
  journal_entry: { icon: BookOpen, label: "Journal Entry", color: "bg-blue-50 text-blue-600" },
  invoice: { icon: FileText, label: "Invoice", color: "bg-green-50 text-green-600" },
  inventory_update: { icon: Package, label: "Inventory", color: "bg-orange-50 text-orange-600" },
  expense: { icon: Receipt, label: "Expense", color: "bg-red-50 text-red-600" },
  navigation: { icon: Navigation, label: "Navigation", color: "bg-purple-50 text-purple-600" },
  report: { icon: BarChart3, label: "Report", color: "bg-teal-50 text-teal-600" },
  general: { icon: Info, label: "General", color: "bg-gray-50 text-gray-600" },
  payment: { icon: CreditCard, label: "Payment", color: "bg-emerald-50 text-emerald-600" },
  stock_adjustment: { icon: ArrowRightLeft, label: "Stock Adjustment", color: "bg-amber-50 text-amber-600" },
  product: { icon: Package, label: "Product", color: "bg-cyan-50 text-cyan-600" },
  purchase_order: { icon: ClipboardList, label: "Purchase Order", color: "bg-violet-50 text-violet-600" },
  sale: { icon: ShoppingCart, label: "Sale", color: "bg-lime-50 text-lime-600" },
  lead: { icon: Users, label: "Lead", color: "bg-pink-50 text-pink-600" },
  contact: { icon: Contact, label: "Contact", color: "bg-sky-50 text-sky-600" },
  bulk_import: { icon: FileStack, label: "Bulk Import", color: "bg-indigo-50 text-indigo-600" },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  approved: { label: "Approved", color: "bg-green-50 text-green-700 border-green-200" },
  amended: { label: "Amended", color: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
};

const REJECTION_REASONS = [
  "Incorrect amount",
  "Wrong account",
  "Not applicable",
  "Duplicate",
  "Other",
] as const;

/* ── Type-specific renderers ── */
function JournalEntryRenderer({ data, editing, editData, setEditData }: RendererProps) {
  const entries = (data.entries ?? []) as Array<{ account: string; debit: number; credit: number }>;
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  if (editing) {
    const editEntries = ((editData?.entries ?? data.entries ?? []) as Array<{ account: string; debit: number; credit: number }>);
    return (
      <div className="space-y-2">
        {editEntries.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={entry.account}
              onChange={(e) => {
                const updated = [...editEntries];
                updated[i] = { ...updated[i], account: e.target.value };
                setEditData({ ...editData, entries: updated });
              }}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
            />
            <input
              type="number"
              value={entry.debit}
              onChange={(e) => {
                const updated = [...editEntries];
                updated[i] = { ...updated[i], debit: Number(e.target.value) };
                setEditData({ ...editData, entries: updated });
              }}
              className="w-20 text-xs border border-gray-200 rounded px-2 py-1"
              placeholder="Debit"
            />
            <input
              type="number"
              value={entry.credit}
              onChange={(e) => {
                const updated = [...editEntries];
                updated[i] = { ...updated[i], credit: Number(e.target.value) };
                setEditData({ ...editData, entries: updated });
              }}
              className="w-20 text-xs border border-gray-200 rounded px-2 py-1"
              placeholder="Credit"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-1 font-medium text-gray-500">Account</th>
          <th className="text-right py-1 font-medium text-gray-500">Debit</th>
          <th className="text-right py-1 font-medium text-gray-500">Credit</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          <tr key={i} className="border-b border-gray-50">
            <td className="py-1 text-gray-700">{entry.account}</td>
            <td className="py-1 text-right text-gray-700">{entry.debit ? `$${entry.debit.toLocaleString()}` : "—"}</td>
            <td className="py-1 text-right text-gray-700">{entry.credit ? `$${entry.credit.toLocaleString()}` : "—"}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="py-1 text-gray-800">Total</td>
          <td className="py-1 text-right text-gray-800">${totalDebit.toLocaleString()}</td>
          <td className="py-1 text-right text-gray-800">${totalCredit.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  );
}

function InvoiceRenderer({ data, editing, editData, setEditData }: RendererProps) {
  const items = (data.items ?? []) as Array<{ name: string; qty: number; price: number }>;
  if (editing) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Customer:</span>
          <input
            value={String(editData?.customer ?? data.customer ?? "")}
            onChange={(e) => setEditData({ ...editData, customer: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Total:</span>
          <input
            type="number"
            value={Number(editData?.total ?? data.total ?? 0)}
            onChange={(e) => setEditData({ ...editData, total: Number(e.target.value) })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Due date:</span>
          <input
            type="date"
            value={String(editData?.due_date ?? data.due_date ?? "")}
            onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-gray-700"><span className="text-gray-500">Customer:</span> {String(data.customer ?? "—")}</p>
      {items.map((item, i) => (
        <p key={i} className="text-gray-700 pl-2">• {item.name} × {item.qty} @ ${item.price}</p>
      ))}
      <p className="text-gray-700 font-semibold">Total: ${Number(data.total ?? 0).toLocaleString()}</p>
      <p className="text-gray-500">Due: {String(data.due_date ?? "—")}</p>
    </div>
  );
}

function InventoryRenderer({ data, editing, editData, setEditData }: RendererProps) {
  const currentStock = Number(data.current_stock ?? 0);
  if (editing) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-24">Product:</span>
          <input
            value={String(editData?.product ?? data.product ?? "")}
            onChange={(e) => setEditData({ ...editData, product: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-24">Suggested qty:</span>
          <input
            type="number"
            value={Number(editData?.suggested_quantity ?? data.suggested_quantity ?? 0)}
            onChange={(e) => setEditData({ ...editData, suggested_quantity: Number(e.target.value) })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-gray-700"><span className="text-gray-500">Product:</span> {String(data.product ?? "—")}</p>
      <p className="text-gray-700">
        <span className="text-gray-500">Stock:</span>{" "}
        <span className={currentStock <= 5 ? "text-orange-600 font-semibold" : ""}>{currentStock}</span>
      </p>
      <p className="text-gray-700"><span className="text-gray-500">Action:</span> {String(data.action ?? "—")}</p>
      <p className="text-gray-700"><span className="text-gray-500">Suggested qty:</span> {String(data.suggested_quantity ?? "—")}</p>
    </div>
  );
}

function ExpenseRenderer({ data, editing, editData, setEditData }: RendererProps) {
  if (editing) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Vendor:</span>
          <input
            value={String(editData?.vendor ?? data.vendor ?? "")}
            onChange={(e) => setEditData({ ...editData, vendor: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Amount:</span>
          <input
            type="number"
            value={Number(editData?.amount ?? data.amount ?? 0)}
            onChange={(e) => setEditData({ ...editData, amount: Number(e.target.value) })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Category:</span>
          <input
            value={String(editData?.category ?? data.category ?? "")}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-500 w-16">Date:</span>
          <input
            type="date"
            value={String(editData?.date ?? data.date ?? "")}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="flex-1 border border-gray-200 rounded px-2 py-1"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-gray-700"><span className="text-gray-500">Vendor:</span> {String(data.vendor ?? "—")}</p>
      <p className="text-gray-700 font-semibold">${Number(data.amount ?? 0).toLocaleString()}</p>
      <p className="text-gray-700"><span className="text-gray-500">Category:</span> {String(data.category ?? "—")}</p>
      <p className="text-gray-500">{String(data.date ?? "—")}</p>
    </div>
  );
}

function NavigationRenderer({ data }: { data: Record<string, unknown> }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(String(data.target_page ?? "/business"))}
      className="app-primary-btn px-4 py-2 text-xs font-medium"
    >
      {String(data.label ?? "Go")}
    </button>
  );
}

function GeneralRenderer({ description }: { description: string | null }) {
  return <p className="text-xs text-gray-600">{description ?? "—"}</p>;
}

/* ── Renderer props type ── */
type RendererProps = {
  data: Record<string, unknown>;
  editing: boolean;
  editData: Record<string, unknown>;
  setEditData: (d: Record<string, unknown>) => void;
};

/* ── Main Component ── */
export default function AiActionCard({ card, onApprove, onReject, onAmend, compact }: AiActionCardProps) {
  const t = useTranslations("aiActionCard");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({ ...card.suggested_data });
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const typeConfig = TYPE_CONFIG[card.card_type];
  const TypeIcon = typeConfig.icon;
  const statusBadge = STATUS_BADGES[card.status];
  const isPending = card.status === "pending";

  const handleApprove = async () => {
    if (!confirm(t("confirmApprove"))) return;
    setLoading(true);
    await onApprove(card.id);
    setLoading(false);
  };

  const handleReject = async () => {
    const reason = rejectReason === "Other" ? customRejectReason : rejectReason;
    setLoading(true);
    await onReject(card.id, reason || undefined);
    setRejectMode(false);
    setRejectReason("");
    setCustomRejectReason("");
    setLoading(false);
  };

  const handleSaveAmend = async () => {
    setLoading(true);
    await onAmend(card.id, editData);
    setEditing(false);
    setLoading(false);
  };

  /* ── Compact view for dashboard queue ── */
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50 transition"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeConfig.color}`}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{card.title}</p>
        </div>
        {card.confidence_score != null && (
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
            {Math.round(card.confidence_score * 100)}%
          </span>
        )}
        {isPending && (
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); void handleApprove(); }}
              className="p-1 rounded hover:bg-green-50"
              title={t("approve")}
            >
              <Check className="h-3.5 w-3.5 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void onReject(card.id);
              }}
              className="p-1 rounded hover:bg-red-50"
              title={t("reject")}
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="app-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600">{t("aiSuggestion")}</span>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
              {t(`status.${card.status}`)}
            </span>
          )}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-100" />

      {/* Module */}
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
        {t("module")}: {card.source_module ?? t("general")}
      </p>

      {/* Title + description */}
      <div>
        <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
        {card.description && (
          <p className="text-sm text-gray-600 mt-0.5">{card.description}</p>
        )}
      </div>

      {/* Suggested data */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {t("suggestedData")}
        </p>
        {card.card_type === "journal_entry" && (
          <JournalEntryRenderer data={card.suggested_data} editing={editing} editData={editData} setEditData={setEditData} />
        )}
        {card.card_type === "invoice" && (
          <InvoiceRenderer data={card.suggested_data} editing={editing} editData={editData} setEditData={setEditData} />
        )}
        {card.card_type === "inventory_update" && (
          <InventoryRenderer data={card.suggested_data} editing={editing} editData={editData} setEditData={setEditData} />
        )}
        {card.card_type === "expense" && (
          <ExpenseRenderer data={card.suggested_data} editing={editing} editData={editData} setEditData={setEditData} />
        )}
        {card.card_type === "navigation" && <NavigationRenderer data={card.suggested_data} />}
        {(card.card_type === "report" || card.card_type === "general") && (
          <GeneralRenderer description={card.description} />
        )}
      </div>

      {/* Confidence bar */}
      {card.confidence_score != null && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{t("confidence")}:</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.round(card.confidence_score * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-gray-600">
            {Math.round(card.confidence_score * 100)}%
          </span>
        </div>
      )}

      {/* Separator */}
      {isPending && <div className="border-t border-gray-100" />}

      {/* Actions */}
      {isPending && !editing && !rejectMode && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition disabled:opacity-50"
          >
            <Pencil className="h-3 w-3" />
            {t("amend")}
          </button>
          <button
            onClick={() => setRejectMode(true)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            {t("reject")}
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            {t("approve")}
          </button>
        </div>
      )}

      {/* Reject mode */}
      {rejectMode && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">{t("rejectReason")}</label>
          <div className="flex flex-wrap gap-1.5">
            {REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setRejectReason(reason)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition ${
                  rejectReason === reason
                    ? "border-red-400 bg-red-50 text-red-700 font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t(`rejectionReasons.${reason}`)}
              </button>
            ))}
          </div>
          {rejectReason === "Other" && (
            <input
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
              placeholder={t("rejectReasonPlaceholder")}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-300"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setRejectMode(false); setRejectReason(""); setCustomRejectReason(""); }}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleReject}
              disabled={loading || !rejectReason}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t("confirmReject")}
            </button>
          </div>
        </div>
      )}

      {/* Amend mode */}
      {editing && (
        <div className="flex gap-2">
          <button
            onClick={() => { setEditing(false); setEditData({ ...card.suggested_data }); }}
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSaveAmend}
            disabled={loading}
            className="flex-1 text-xs px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {t("saveAndApprove")}
          </button>
        </div>
      )}

      {/* Collapse button for compact mode */}
      {compact && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-center text-[10px] text-gray-400 hover:text-gray-600 py-1"
        >
          {t("collapse")}
        </button>
      )}
    </div>
  );
}
