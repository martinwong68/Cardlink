"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveCompany } from "@/components/business/useActiveCompany";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  X,
  FileText,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

/* ── types ─────────────────────────────────────────────────────── */

type LeavePolicy = {
  id: string;
  company_id: string;
  name: string;
  leave_type: string;
  days_per_year: number;
  accrual_method: string;
  max_carry_forward: number;
  max_accumulation: number;
  requires_approval: boolean;
  is_paid: boolean;
  is_active: boolean;
};

type FormData = Omit<LeavePolicy, "id" | "company_id">;

const LEAVE_TYPES = [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "unpaid",
  "compassionate",
] as const;

const ACCRUAL_METHODS = ["annual", "monthly", "bi_weekly"] as const;

const leaveTypeColors: Record<string, string> = {
  annual: "bg-blue-100 text-blue-700",
  sick: "bg-red-100 text-red-700",
  maternity: "bg-pink-100 text-pink-700",
  paternity: "bg-teal-100 text-teal-700",
  unpaid: "bg-gray-100 text-gray-700",
  compassionate: "bg-amber-100 text-amber-700",
};

const accrualColors: Record<string, string> = {
  annual: "bg-indigo-100 text-indigo-700",
  monthly: "bg-emerald-100 text-emerald-700",
  bi_weekly: "bg-violet-100 text-violet-700",
};

const emptyForm: FormData = {
  name: "",
  leave_type: "annual",
  days_per_year: 21,
  accrual_method: "annual",
  max_carry_forward: 5,
  max_accumulation: 30,
  requires_approval: true,
  is_paid: true,
  is_active: true,
};

/* ── page ──────────────────────────────────────────────────────── */

export default function LeavePoliciesPage() {
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });

  /* ── data ───────────────────────────────────────────────────── */

  const loadPolicies = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("hr_leave_policies")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    setPolicies((data as LeavePolicy[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadPolicies();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadPolicies]);

  /* ── actions ────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (p: LeavePolicy) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      leave_type: p.leave_type,
      days_per_year: p.days_per_year,
      accrual_method: p.accrual_method,
      max_carry_forward: p.max_carry_forward,
      max_accumulation: p.max_accumulation,
      requires_approval: p.requires_approval,
      is_paid: p.is_paid,
      is_active: p.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      await supabase
        .from("hr_leave_policies")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("company_id", companyId);
    } else {
      await supabase
        .from("hr_leave_policies")
        .insert({ ...form, company_id: companyId });
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    await loadPolicies();
  };

  const handleDelete = async () => {
    if (!deleteId || !companyId) return;
    await supabase
      .from("hr_leave_policies")
      .delete()
      .eq("id", deleteId)
      .eq("company_id", companyId);
    setDeleteId(null);
    await loadPolicies();
  };

  const toggleActive = async (p: LeavePolicy) => {
    if (!companyId) return;
    await supabase
      .from("hr_leave_policies")
      .update({ is_active: !p.is_active, updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("company_id", companyId);
    await loadPolicies();
  };

  /* ── derived ────────────────────────────────────────────────── */

  const activeCount = policies.filter((p) => p.is_active).length;

  /* ── spinner ────────────────────────────────────────────────── */

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ── helpers ────────────────────────────────────────────────── */

  const field = (
    label: string,
    children: React.ReactNode,
  ) => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );

  const inputCls = "app-input w-full rounded-lg border px-3 py-2 text-sm";

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* header + stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Leave Policies</h1>
          <p className="text-sm text-gray-500">
            {policies.length} {policies.length === 1 ? "policy" : "policies"} · {activeCount} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Add Policy
        </button>
      </div>

      {/* delete confirmation */}
      {deleteId && (
        <div className="app-card flex items-center justify-between p-4">
          <span className="text-sm text-red-600 font-medium">Delete this policy?</span>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setDeleteId(null)}
              className="app-secondary-btn rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* form */}
      {showForm && (
        <div className="app-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {editingId ? "Edit Policy" : "New Policy"}
            </h2>
            <button onClick={() => setShowForm(false)}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field("Policy Name",
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Standard Annual Leave"
              />,
            )}
            {field("Leave Type",
              <select
                className={inputCls}
                value={form.leave_type}
                onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>,
            )}
            {field("Days Per Year",
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.days_per_year}
                onChange={(e) => setForm({ ...form, days_per_year: +e.target.value })}
              />,
            )}
            {field("Accrual Method",
              <select
                className={inputCls}
                value={form.accrual_method}
                onChange={(e) => setForm({ ...form, accrual_method: e.target.value })}
              >
                {ACCRUAL_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", "-")}</option>
                ))}
              </select>,
            )}
            {field("Max Carry Forward",
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.max_carry_forward}
                onChange={(e) => setForm({ ...form, max_carry_forward: +e.target.value })}
              />,
            )}
            {field("Max Accumulation",
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.max_accumulation}
                onChange={(e) => setForm({ ...form, max_accumulation: +e.target.value })}
              />,
            )}
          </div>

          {/* toggles */}
          <div className="flex flex-wrap gap-6 pt-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requires_approval}
                onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
              />
              <ShieldCheck className="h-4 w-4 text-gray-500" /> Requires Approval
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_paid}
                onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
              />
              Paid Leave
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? "Saving…" : editingId ? "Update Policy" : "Create Policy"}
          </button>
        </div>
      )}

      {/* empty state */}
      {policies.length === 0 && !showForm && (
        <div className="app-card flex flex-col items-center justify-center py-12 px-6 text-center">
          <FileText className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No leave policies yet. Add one to get started.</p>
        </div>
      )}

      {/* list */}
      <div className="space-y-3">
        {policies.map((p) => (
          <div
            key={p.id}
            className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${leaveTypeColors[p.leave_type] ?? "bg-gray-100 text-gray-700"}`}>
                  {p.leave_type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accrualColors[p.accrual_method] ?? "bg-gray-100 text-gray-700"}`}>
                  {p.accrual_method.replace("_", "-")}
                </span>
                {!p.is_active && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">inactive</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {p.days_per_year} days/yr · carry {p.max_carry_forward} · max {p.max_accumulation}
                {p.requires_approval ? " · approval required" : ""}
                {p.is_paid ? " · paid" : " · unpaid"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(p)}
                title={p.is_active ? "Deactivate" : "Activate"}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                {p.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
              </button>
              <button
                onClick={() => openEdit(p)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteId(p.id)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
