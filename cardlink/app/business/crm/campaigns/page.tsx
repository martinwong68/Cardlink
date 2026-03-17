"use client";

import { useEffect, useState, useCallback } from "react";

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const STATUSES = ["all", "draft", "active", "paused", "completed", "cancelled"] as const;

export default function CrmCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState("email");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("0");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/campaigns", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setCampaigns(data.campaigns ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const resetForm = () => { setName(""); setCampaignType("email"); setStartDate(""); setEndDate(""); setBudget("0"); setDescription(""); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (c: Campaign) => {
    setName(c.name); setCampaignType(c.type ?? "email"); setStartDate(c.start_date ?? ""); setEndDate(c.end_date ?? "");
    setBudget(String(c.budget ?? 0)); setDescription(c.description ?? ""); setEditId(c.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const payload = { name: name.trim(), type: campaignType, start_date: startDate || null, end_date: endDate || null, budget: Number(budget) || 0, description: description.trim() || null, ...(editId ? {} : { status: "draft" }) };
    try {
      if (editId) { await fetch(`/api/crm/campaigns/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/crm/campaigns", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await loadCampaigns();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleActivate = async (id: string) => {
    await fetch(`/api/crm/campaigns/${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "active" }) });
    await loadCampaigns();
  };

  const filtered = campaigns.filter((c) => statusFilter === "all" || c.status === statusFilter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading campaigns…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Campaigns</h1>
        <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Campaign</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{s}</button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-neutral-900">{editId ? "Edit Campaign" : "New Campaign"}</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Type</label>
              <div className="flex gap-2">{(["email", "sms", "social", "event"] as const).map((t) => (
                <button key={t} onClick={() => setCampaignType(t)} className={`flex-1 rounded-lg py-2 text-center text-xs font-medium capitalize ${campaignType === t ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>{t}</button>
              ))}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">Start Date</label><input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">End Date</label><input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Budget</label><input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-neutral-100 py-2.5 text-sm font-medium text-neutral-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !name.trim()} className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No campaigns</p>
          <p className="text-xs text-neutral-400">Create your first marketing campaign.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => openEdit(c)} className="w-full rounded-xl border border-neutral-100 bg-white p-4 text-left transition hover:bg-neutral-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900">{c.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? "bg-neutral-100 text-neutral-600"}`}>{c.status}</span>
              </div>
              <p className="text-xs capitalize text-neutral-500">{c.type} campaign</p>
              {c.description && <p className="mt-1 text-xs text-neutral-500">{c.description}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">Budget: ${Number(c.budget ?? 0).toFixed(0)}</span>
                <div className="flex gap-3">
                  <div className="text-center"><span className="block text-xs font-bold text-neutral-900">{c.sent_count ?? 0}</span><span className="text-[10px] text-neutral-500">Sent</span></div>
                  <div className="text-center"><span className="block text-xs font-bold text-neutral-900">{c.open_count ?? 0}</span><span className="text-[10px] text-neutral-500">Opened</span></div>
                  <div className="text-center"><span className="block text-xs font-bold text-neutral-900">{c.click_count ?? 0}</span><span className="text-[10px] text-neutral-500">Clicked</span></div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-neutral-400">{c.start_date ?? "—"} → {c.end_date ?? "—"}</span>
                {c.status === "draft" && (
                  <button onClick={(e) => { e.stopPropagation(); handleActivate(c.id); }} className="rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">Activate</button>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
