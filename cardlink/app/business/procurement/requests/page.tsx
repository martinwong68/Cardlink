"use client";

import { useEffect, useState, useCallback } from "react";

type PurchaseRequest = { id: string; pr_number: string; title: string; status: string; priority: string; total_estimated: number; requested_by: string | null; created_at: string };

const statusColors: Record<string, string> = { draft: "bg-gray-100 text-gray-600", pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", cancelled: "bg-gray-200 text-gray-500" };
const priorityColors: Record<string, string> = { low: "bg-blue-100 text-blue-600", normal: "bg-gray-100 text-gray-600", high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700" };

export default function ProcurementRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [estimated, setEstimated] = useState("0");
  const [description, setDescription] = useState("");

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/procurement/requests", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setRequests(d.requests ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const prNumber = `PR-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/procurement/requests", { method: "POST", headers, body: JSON.stringify({ pr_number: prNumber, title: title.trim(), description: description.trim() || null, priority, total_estimated: Number(estimated) || 0, status: "draft" }) });
      setShowForm(false); setTitle(""); setDescription(""); setPriority("normal"); setEstimated("0"); await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/procurement/requests/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status }) });
    await load();
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading requests…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-xs text-gray-500">{requests.length} request(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Request</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "draft", "pending", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">New Purchase Request</h2>
          <input type="text" placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <input type="number" placeholder="Estimated total" value={estimated} onChange={(e) => setEstimated(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No purchase requests</p>}
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500">{r.pr_number} · Est. ${Number(r.total_estimated).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityColors[r.priority] ?? "bg-gray-100 text-gray-600"}`}>{r.priority}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span>
              </div>
            </div>
            {r.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(r.id, "pending")} className="rounded-lg bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">Submit</button>
                <button onClick={() => updateStatus(r.id, "cancelled")} className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">Cancel</button>
              </div>
            )}
            {r.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => updateStatus(r.id, "approved")} className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Approve</button>
                <button onClick={() => updateStatus(r.id, "rejected")} className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
