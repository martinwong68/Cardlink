"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";

type Task = {
  id: string;
  employee_id: string;
  task_name: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  skipped: "bg-gray-100 text-gray-500",
};

export default function OnboardingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const url = filterEmployee
        ? `/api/business/hr/onboarding?employee_id=${filterEmployee}`
        : "/api/business/hr/onboarding";
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setTasks(data.tasks ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filterEmployee]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const resetForm = () => { setEmployeeId(""); setTaskName(""); setDescription(""); setDueDate(""); };

  const handleSubmit = async () => {
    if (!employeeId.trim() || !taskName.trim()) return;
    setSaving(true);
    const payload = {
      employee_id: employeeId.trim(),
      task_name: taskName.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
    };
    try {
      await fetch("/api/business/hr/onboarding", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadTasks();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const markComplete = async (id: string) => {
    await fetch("/api/business/hr/onboarding", {
      method: "PATCH", headers: HEADERS, body: JSON.stringify({ id, status: "completed" }),
    });
    await loadTasks();
  };

  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.employee_id;
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Onboarding Tasks</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Task</button>
      </div>

      <input value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} placeholder="Filter by employee ID…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Onboarding Task</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Employee ID</label><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Task Name</label><input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Due Date</label><input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !employeeId.trim() || !taskName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No onboarding tasks</p>
          <p className="text-xs text-gray-400">Create a task to get started.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([empId, empTasks]) => (
          <div key={empId} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Employee: {empId}</h3>
            {empTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{t.task_name}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    {t.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.due_date}</span>}
                    {t.assigned_to && <span>→ {t.assigned_to}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>{t.status.replace("_", " ")}</span>
                {t.status !== "completed" && t.status !== "skipped" && (
                  <button onClick={() => markComplete(t.id)} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100" title="Mark complete">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
