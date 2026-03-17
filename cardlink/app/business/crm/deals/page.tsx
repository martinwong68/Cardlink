"use client";

import { useEffect, useState, useCallback } from "react";

type Deal = {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
};

const STAGE_COLORS: Record<string, string> = {
  qualification: "border-blue-400",
  proposal: "border-purple-400",
  negotiation: "border-amber-400",
  closing: "border-emerald-400",
  won: "border-green-400",
  lost: "border-rose-400",
};

const BADGE_COLORS: Record<string, string> = {
  qualification: "bg-blue-100 text-blue-700",
  proposal: "bg-purple-100 text-purple-700",
  negotiation: "bg-amber-100 text-amber-700",
  closing: "bg-emerald-100 text-emerald-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-rose-100 text-rose-700",
};

const STAGES = ["qualification", "proposal", "negotiation", "closing", "won", "lost"];

export default function CrmDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("0");
  const [stage, setStage] = useState("qualification");
  const [probability, setProbability] = useState("10");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const loadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/deals", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setDeals(data.deals ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const resetForm = () => { setTitle(""); setValue("0"); setStage("qualification"); setProbability("10"); setExpectedCloseDate(""); setNotes(""); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (d: Deal) => {
    setTitle(d.title); setValue(String(d.value ?? 0)); setStage(d.stage); setProbability(String(d.probability ?? 0));
    setExpectedCloseDate(d.expected_close_date ?? ""); setNotes(d.notes ?? ""); setEditId(d.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = { title: title.trim(), value: Number(value) || 0, stage, probability: Math.min(100, Number(probability) || 0), expected_close_date: expectedCloseDate || null, notes: notes.trim() };
    try {
      if (editId) { await fetch(`/api/crm/deals/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/crm/deals", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await loadDeals();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const moveStage = async (dealId: string, newStage: string) => {
    await fetch(`/api/crm/deals/${dealId}`, { method: "PATCH", headers, body: JSON.stringify({ stage: newStage }) });
    await loadDeals();
  };

  const filtered = deals.filter((d) => stageFilter === "all" || d.stage === stageFilter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading deals…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Deals</h1>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-gray-100">
            <button onClick={() => setViewMode("kanban")} className={`px-3 py-1.5 text-xs font-medium ${viewMode === "kanban" ? "bg-purple-600 text-white" : "text-gray-600"}`}>Kanban</button>
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-xs font-medium ${viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-600"}`}>List</button>
          </div>
          <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ New Deal</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{editId ? "Edit Deal" : "New Deal"}</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Value</label><input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Probability %</label><input value={probability} onChange={(e) => setProbability(e.target.value)} type="number" max="100" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Expected Close Date</label><input value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} type="date" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Stage</label>
              <div className="flex flex-wrap gap-2">{STAGES.map((s) => (
                <button key={s} onClick={() => setStage(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${stage === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
              ))}</div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-gray-100 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !title.trim()} className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stg) => {
            const stageDeals = deals.filter((d) => d.stage === stg);
            const stageValue = stageDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
            return (
              <div key={stg} className={`min-w-[240px] flex-shrink-0 rounded-xl border-t-4 ${STAGE_COLORS[stg] ?? "border-gray-200"} bg-gray-50 p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold capitalize text-gray-700">{stg}</span>
                  <span className="text-xs text-gray-500">{stageDeals.length} · ${stageValue.toFixed(0)}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((d) => (
                    <button key={d.id} onClick={() => openEdit(d)} className="w-full rounded-lg border border-gray-100 bg-white p-3 text-left">
                      <p className="text-xs font-semibold text-gray-900">{d.title}</p>
                      <p className="mt-1 text-base font-bold text-gray-900">${Number(d.value ?? 0).toFixed(0)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{d.probability ?? 0}%</span>
                        {stg !== "won" && stg !== "lost" && (
                          <div className="flex gap-1">
                            {stg !== "closing" && (
                              <button onClick={(e) => { e.stopPropagation(); moveStage(d.id, STAGES[STAGES.indexOf(stg) + 1]); }} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">→</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); moveStage(d.id, "won"); }} className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-600">Won</button>
                            <button onClick={(e) => { e.stopPropagation(); moveStage(d.id, "lost"); }} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-600">Lost</button>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto">
            {["all", ...STAGES].map((s) => (
              <button key={s} onClick={() => setStageFilter(s)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize ${stageFilter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>{s}</button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center"><p className="text-sm text-gray-500">No deals found.</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => (
                <button key={d.id} onClick={() => openEdit(d)} className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{d.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${BADGE_COLORS[d.stage] ?? "bg-gray-100 text-gray-600"}`}>{d.stage}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">${Number(d.value ?? 0).toFixed(0)}</span>
                    <span className="text-xs text-gray-500">{d.probability ?? 0}% · {d.expected_close_date ?? "No date"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
