"use client";

import { useEffect, useState, useCallback } from "react";

type Lead = {
  id: string;
  title: string;
  source: string | null;
  status: string;
  temperature: string;
  score: number;
  value: number;
  notes: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-emerald-100 text-emerald-700",
  unqualified: "bg-rose-100 text-rose-700",
  converted: "bg-green-100 text-green-700",
};

const TEMP_COLORS: Record<string, string> = {
  hot: "bg-rose-100 text-rose-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-sky-100 text-sky-700",
};

const STATUSES = ["all", "new", "contacted", "qualified", "unqualified", "converted"] as const;

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [score, setScore] = useState("0");
  const [temperature, setTemperature] = useState<"hot" | "warm" | "cold">("warm");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/leads", {
        headers: { "x-cardlink-app-scope": "business" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const resetForm = () => {
    setTitle("");
    setSource("");
    setScore("0");
    setTemperature("warm");
    setNotes("");
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (l: Lead) => {
    setTitle(l.title);
    setSource(l.source ?? "");
    setScore(String(l.score ?? 0));
    setTemperature((l.temperature as "hot" | "warm" | "cold") ?? "warm");
    setNotes(l.notes ?? "");
    setEditId(l.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      source: source.trim() || null,
      score: Math.min(100, Math.max(0, Number(score) || 0)),
      temperature,
      notes: notes.trim(),
      status: editId ? undefined : "new",
    };

    try {
      if (editId) {
        await fetch(`/api/crm/leads/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/crm/leads", { method: "POST", headers, body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      await loadLeads();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const filtered = leads.filter((l) => statusFilter === "all" || l.status === statusFilter);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading leads…</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Leads</h1>
        <button onClick={openCreate} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">
          + New Lead
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
              statusFilter === s ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{editId ? "Edit Lead" : "New Lead"}</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="Lead title" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Source</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="e.g. website, referral" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Score (0–100)</label>
              <input value={score} onChange={(e) => setScore(e.target.value)} type="number" min="0" max="100" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Temperature</label>
              <div className="flex gap-2">
                {(["hot", "warm", "cold"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTemperature(t)}
                    className={`flex-1 rounded-lg py-2 text-center text-xs font-medium capitalize transition ${
                      temperature === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-gray-100 py-2.5 text-sm font-medium text-gray-600">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving || !title.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">
                {saving ? "Saving…" : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No leads found</p>
          <p className="text-xs text-gray-400">Add your first lead to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <button key={l.id} onClick={() => openEdit(l)} className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">{l.title}</span>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TEMP_COLORS[l.temperature] ?? "bg-gray-100 text-gray-600"}`}>
                    {l.temperature}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {l.status}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">{l.source ?? "—"}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Value: ${Number(l.value ?? 0).toFixed(0)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  (l.score ?? 0) >= 70 ? "bg-emerald-100 text-emerald-700" :
                  (l.score ?? 0) >= 40 ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  Score: {l.score ?? 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
