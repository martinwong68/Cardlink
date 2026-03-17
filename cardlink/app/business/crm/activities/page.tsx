"use client";

import { useEffect, useState, useCallback } from "react";

type Activity = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = { call: "📞", email: "📧", meeting: "🤝", task: "✅", note: "📝" };
const TYPES = ["all", "call", "email", "meeting", "task", "note"] as const;

export default function CrmActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [type, setType] = useState<string>("call");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const loadActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/activities", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setActivities(data.activities ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const resetForm = () => { setType("call"); setTitle(""); setDescription(""); setDueDate(""); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (a: Activity) => {
    setType(a.type); setTitle(a.title); setDescription(a.description ?? ""); setDueDate(a.due_date ?? "");
    setEditId(a.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const payload = { type, title: title.trim(), description: description.trim() || null, due_date: dueDate || null, is_completed: false };
    try {
      if (editId) { await fetch(`/api/crm/activities/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/crm/activities", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await loadActivities();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const toggleComplete = async (a: Activity) => {
    await fetch(`/api/crm/activities/${a.id}`, { method: "PATCH", headers, body: JSON.stringify({ is_completed: !a.is_completed }) });
    await loadActivities();
  };

  const filtered = activities.filter((a) => typeFilter === "all" || a.type === typeFilter);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading activities…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Activities</h1>
        <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ Log Activity</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${typeFilter === t ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
            {t === "all" ? "All" : `${TYPE_ICONS[t] ?? ""} ${t}`}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-neutral-900">{editId ? "Edit Activity" : "Log Activity"}</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Type</label>
              <div className="flex gap-2">
                {(["call", "email", "meeting", "task", "note"] as const).map((t) => (
                  <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg py-2 text-center text-xs font-medium capitalize ${type === t ? "bg-purple-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                    {TYPE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Due Date</label><input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-neutral-100 py-2.5 text-sm font-medium text-neutral-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !title.trim()} className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No activities</p>
          <p className="text-xs text-neutral-400">Log your first activity.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white p-4">
              <button onClick={() => toggleComplete(a)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${a.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-200"}`}>
                {a.is_completed && <span className="text-xs">✓</span>}
              </button>
              <button onClick={() => openEdit(a)} className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${a.is_completed ? "text-neutral-400 line-through" : "text-neutral-900"}`}>{a.title}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{TYPE_ICONS[a.type] ?? ""} {a.type}</span>
                </div>
                {a.description && <p className="mt-1 text-xs text-neutral-500">{a.description}</p>}
                <div className="mt-1 flex gap-3">
                  {a.due_date && <span className="text-xs text-neutral-400">Due: {a.due_date}</span>}
                  <span className="text-xs text-neutral-400">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
