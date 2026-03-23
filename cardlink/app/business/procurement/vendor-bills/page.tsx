"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search, Plus, FileText, DollarSign, AlertTriangle, CheckCircle,
  CreditCard, Pencil, Trash2, X, Clock,
} from "lucide-react";

type Bill = {
  id: string;
  supplier_id: string;
  bill_number: string;
  po_id: string | null;
  amount: number;
  tax: number;
  total: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};
type Supplier = { id: string; name: string };

const HEADERS = { "x-cardlink-app-scope": "business" };
const JSON_HEADERS = { "content-type": "application/json", ...HEADERS };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};
const STATUSES = ["all", "draft", "pending", "approved", "paid", "overdue"] as const;

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const isOverdue = (b: Bill) => b.due_date && b.status !== "paid" && new Date(b.due_date) < new Date(new Date().toDateString());

export default function ProcurementVendorBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("0");
  const [tax, setTax] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        fetch("/api/procurement/vendor-bills", { headers: HEADERS, cache: "no-store" }),
        fetch("/api/procurement/suppliers", { headers: HEADERS, cache: "no-store" }),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBills(d.vendor_bills ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setSuppliers(d.suppliers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  /* ---------- stats ---------- */
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let outstanding = 0, overdueAmt = 0, paidMonth = 0;
    for (const b of bills) {
      if (["pending", "approved"].includes(b.status)) outstanding += b.total;
      if (isOverdue(b)) overdueAmt += b.total;
      if (b.status === "paid" && new Date(b.created_at) >= monthStart) paidMonth += b.total;
    }
    return { outstanding, overdueAmt, paidMonth };
  }, [bills]);

  /* ---------- derived display status & filtering ---------- */
  const displayStatus = (b: Bill) => (isOverdue(b) ? "overdue" : b.status);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bills.filter((b) => {
      const ds = displayStatus(b);
      if (filter !== "all" && ds !== filter) return false;
      if (q && !b.bill_number.toLowerCase().includes(q) && !(supplierMap[b.supplier_id] ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bills, filter, search, supplierMap]);

  /* ---------- form helpers ---------- */
  const resetForm = () => { setSupplierId(""); setAmount("0"); setTax("0"); setDueDate(""); setNotes(""); setEditId(null); setShowForm(false); };

  const openEdit = (b: Bill) => {
    setEditId(b.id); setSupplierId(b.supplier_id); setAmount(String(b.amount)); setTax(String(b.tax));
    setDueDate(b.due_date?.slice(0, 10) ?? ""); setNotes(b.notes ?? ""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!supplierId) return;
    setSaving(true);
    const amt = Number(amount) || 0;
    const txAmt = Number(tax) || 0;
    const body = { supplier_id: supplierId, amount: amt, tax: txAmt, total: amt + txAmt, due_date: dueDate || null, notes: notes.trim() || null };
    try {
      if (editId) {
        await fetch("/api/procurement/vendor-bills", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id: editId, ...body }) });
      } else {
        const billNumber = `BILL-${Date.now().toString(36).toUpperCase()}`;
        await fetch("/api/procurement/vendor-bills", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ ...body, bill_number: billNumber }) });
      }
      resetForm(); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/procurement/vendor-bills", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id, status }) });
    await load();
  };

  const deleteBill = async (id: string) => {
    await fetch("/api/procurement/vendor-bills", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ id, status: "deleted" }) });
    await load();
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-purple-500" />
        <p className="text-sm text-gray-500">Loading vendor bills…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendor Bills</h1>
          <p className="text-xs text-gray-500">{bills.length} bill(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
          <Plus size={14} /> New Bill
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <DollarSign size={18} className="text-amber-500" />
          <div><p className="text-lg font-bold text-gray-900">{fmt(stats.outstanding)}</p><p className="text-[11px] text-gray-500">Outstanding</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <AlertTriangle size={18} className="text-red-500" />
          <div><p className="text-lg font-bold text-gray-900">{fmt(stats.overdueAmt)}</p><p className="text-[11px] text-gray-500">Overdue</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <CheckCircle size={18} className="text-emerald-500" />
          <div><p className="text-lg font-bold text-gray-900">{fmt(stats.paidMonth)}</p><p className="text-[11px] text-gray-500">Paid This Month</p></div>
        </div>
      </div>

      {/* search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by bill # or supplier…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-purple-400 focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
        ))}
      </div>

      {/* form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{editId ? "Edit Draft Bill" : "New Vendor Bill"}</h2>
            <button onClick={resetForm}><X size={16} className="text-gray-400" /></button>
          </div>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">Select supplier *</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Tax</label>
              <input type="number" value={tax} onChange={(e) => setTax(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !supplierId} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
              {saving ? "Saving…" : editId ? "Update Bill" : "Create Bill"}
            </button>
            <button onClick={resetForm} className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <FileText size={28} className="text-gray-300" />
            <p className="text-sm text-gray-400">No vendor bills found</p>
          </div>
        )}
        {filtered.map((b) => {
          const ds = displayStatus(b);
          return (
            <div key={b.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.bill_number}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[ds] ?? STATUS_COLORS.draft}`}>{ds}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{supplierMap[b.supplier_id] ?? "Unknown Supplier"}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-700">{fmt(b.total)}</span>
                    {b.amount !== b.total && <span>{fmt(b.amount)} + {fmt(b.tax)} tax</span>}
                    {b.due_date && (
                      <span className={`flex items-center gap-1 ${ds === "overdue" ? "text-red-500 font-medium" : ""}`}>
                        <Clock size={11} /> {fmtDate(b.due_date)}
                      </span>
                    )}
                  </div>
                  {b.notes && <p className="mt-1 text-[11px] text-gray-400 truncate">{b.notes}</p>}
                </div>
              </div>

              {/* actions */}
              {ds === "draft" && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => updateStatus(b.id, "pending")} className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Submit</button>
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1 text-xs text-gray-600"><Pencil size={11} /> Edit</button>
                  <button onClick={() => deleteBill(b.id)} className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1 text-xs text-red-500"><Trash2 size={11} /> Delete</button>
                </div>
              )}
              {ds === "pending" && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => updateStatus(b.id, "approved")} className="rounded-xl bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Approve</button>
                </div>
              )}
              {(ds === "approved" || ds === "overdue") && (
                <button onClick={() => updateStatus(b.id, "paid")} className="mt-2 flex items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CreditCard size={12} /> Mark Paid
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
