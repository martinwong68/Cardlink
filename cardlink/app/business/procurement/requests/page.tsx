"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Search, ChevronDown, ChevronUp, Plus, CheckCircle2,
  XCircle, Pencil, Trash2, FileText, Clock, Inbox, Loader2, ArrowRight,
} from "lucide-react";

/* ── Types ── */
type PurchaseRequest = {
  id: string; pr_number: string; title: string; status: string;
  priority: string; total_estimated: number; requested_by: string | null;
  description?: string | null; notes?: string | null; created_at: string;
  items?: { name: string; qty: number; unit_price: number }[];
};

/* ── Constants ── */
const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-600", normal: "bg-gray-100 text-gray-600",
  high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};
const STATUS_OPTIONS = ["all", "draft", "pending", "approved", "rejected"] as const;

/* ── Tiny action-button helper ── */
const Btn = ({ onClick, disabled, cls, icon: Icon, label }: {
  onClick: () => void; disabled?: boolean; cls: string;
  icon: React.ComponentType<{ className?: string }>; label: string;
}) => (
  <button onClick={onClick} disabled={disabled}
    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cls}`}>
    <Icon className="h-3.5 w-3.5" />{label}
  </button>
);

/* ── Page ── */
export default function ProcurementRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [estimated, setEstimated] = useState("0");

  /* ── Load ── */
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/procurement/requests", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setRequests(d.requests ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived data ── */
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !`${r.title} ${r.pr_number} ${r.requested_by ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [requests, statusFilter, search]);

  /* ── Form helpers ── */
  const resetForm = () => {
    setTitle(""); setDescription(""); setPriority("normal"); setEstimated("0");
    setEditId(null); setShowForm(false);
  };
  const openEdit = (r: PurchaseRequest) => {
    setEditId(r.id); setTitle(r.title); setDescription(r.description ?? "");
    setPriority(r.priority); setEstimated(String(r.total_estimated ?? 0)); setShowForm(true);
  };

  /* ── Submit (create / update) ── */
  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch("/api/procurement/requests", { method: "PATCH", headers: JSON_HEADERS,
          body: JSON.stringify({ id: editId, title: title.trim(), description: description.trim() || null, priority, total_estimated: Number(estimated) || 0 }) });
      } else {
        const prNumber = `PR-${Date.now().toString(36).toUpperCase()}`;
        await fetch("/api/procurement/requests", { method: "POST", headers: JSON_HEADERS,
          body: JSON.stringify({ pr_number: prNumber, title: title.trim(), description: description.trim() || null, priority, total_estimated: Number(estimated) || 0, status: "draft" }) });
      }
      resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  /* ── Status / delete ── */
  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/procurement/requests", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id, status }) });
    await load();
  };
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/procurement/requests", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id, status: "cancelled" }) });
      await load();
    } catch { /* silent */ } finally { setDeletingId(null); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      <span className="ml-2 text-sm text-gray-500">Loading requests…</span>
    </div>
  );

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-xs text-gray-500">Manage and track procurement requests</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
          <Plus className="h-4 w-4" />New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-emerald-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-600" },
        ] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + status filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by title, PR number, requester…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm capitalize text-gray-700 outline-none">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>
          ))}
        </select>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <FileText className="h-4 w-4 text-indigo-500" />
            {editId ? "Edit Draft Request" : "New Purchase Request"}
          </h2>
          <input type="text" placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300" />
          <textarea placeholder="Description / notes" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="low">Low</option><option value="normal">Normal</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <input type="number" placeholder="Estimated total" value={estimated}
              onChange={(e) => setEstimated(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving || !title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Request list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <Inbox className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">No purchase requests found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first request to get started"}
            </p>
          </div>
        )}

        {filtered.map((r) => {
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white transition hover:shadow-sm">
              {/* Row header */}
              <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                className="flex w-full items-start justify-between p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {r.pr_number}{r.requested_by ? ` · ${r.requested_by}` : ""}{" · "}
                    <span className="font-medium">${Number(r.total_estimated).toLocaleString()}</span>
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_COLORS[r.priority] ?? "bg-gray-100 text-gray-600"}`}>{r.priority}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                  {(r.description || r.notes) && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700">{r.description || r.notes || "—"}</p>
                    </div>
                  )}
                  {r.items && r.items.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Items</p>
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {r.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="text-gray-500">{item.qty} × ${item.unit_price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.requested_by && <span>Requester: {r.requested_by}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.status === "draft" && (<>
                      <Btn onClick={() => updateStatus(r.id, "pending")} icon={ArrowRight} label="Submit for Approval" cls="bg-amber-100 text-amber-700 hover:bg-amber-200" />
                      <Btn onClick={() => openEdit(r)} icon={Pencil} label="Edit" cls="bg-gray-100 text-gray-600 hover:bg-gray-200" />
                      <Btn onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} icon={Trash2}
                        label={deletingId === r.id ? "Deleting…" : "Delete"} cls="bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50" />
                    </>)}
                    {r.status === "pending" && (<>
                      <Btn onClick={() => updateStatus(r.id, "approved")} icon={CheckCircle2} label="Approve" cls="bg-emerald-100 text-emerald-700 hover:bg-emerald-200" />
                      <Btn onClick={() => updateStatus(r.id, "rejected")} icon={XCircle} label="Reject" cls="bg-red-100 text-red-700 hover:bg-red-200" />
                    </>)}
                    {r.status === "approved" && (
                      <Btn onClick={() => router.push(`/business/procurement/orders?from_pr=${r.id}`)}
                        icon={ClipboardList} label="Convert to PO" cls="bg-indigo-100 text-indigo-700 hover:bg-indigo-200" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
