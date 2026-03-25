"use client";

import { useEffect, useState, useCallback } from "react";

type ApprovalSetting = {
  id: string;
  module: string;
  auto_approve: boolean;
  approval_threshold: number;
  approver_role: string;
  require_notes: boolean;
};

const MODULES = [
  { name: "procurement", icon: "🚛", label: "Procurement", desc: "Purchase orders and vendor requests" },
  { name: "hr", icon: "👥", label: "HR", desc: "Leave requests and employee changes" },
  { name: "accounting", icon: "📊", label: "Accounting", desc: "Journal entries and payment approvals" },
  { name: "inventory", icon: "📦", label: "Inventory", desc: "Stock adjustments and write-offs" },
];

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
];

export default function ApprovalSettingsPage() {
  const [settings, setSettings] = useState<ApprovalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/approval-settings", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings ?? []);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const settingsMap = new Map(settings.map((s) => [s.module, s]));

  const updateSetting = async (moduleName: string, updates: Partial<ApprovalSetting>) => {
    setSaving(moduleName);
    const current = settingsMap.get(moduleName);
    try {
      await fetch("/api/owner/approval-settings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          module: moduleName,
          auto_approve: updates.auto_approve ?? current?.auto_approve ?? false,
          approval_threshold: updates.approval_threshold ?? current?.approval_threshold ?? 0,
          approver_role: updates.approver_role ?? current?.approver_role ?? "owner",
          require_notes: updates.require_notes ?? current?.require_notes ?? false,
        }),
      });
      await load();
    } catch { /* silent */ } finally { setSaving(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading approval settings…</p></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Approval Settings</h1>
        <p className="text-xs text-gray-500">Configure approval workflows for each module. By default, the owner can approve all requests.</p>
      </div>

      <div className="space-y-3">
        {MODULES.map((mod) => {
          const setting = settingsMap.get(mod.name);
          const autoApprove = setting?.auto_approve ?? false;
          const approverRole = setting?.approver_role ?? "owner";
          const threshold = setting?.approval_threshold ?? 0;
          const requireNotes = setting?.require_notes ?? false;
          const isSaving = saving === mod.name;

          return (
            <div key={mod.name} className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{mod.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{mod.label}</p>
                    <p className="text-[10px] text-gray-500">{mod.desc}</p>
                  </div>
                </div>
                {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {/* Auto-approve toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Auto-approve</label>
                  <button
                    role="switch"
                    aria-checked={autoApprove}
                    onClick={() => updateSetting(mod.name, { auto_approve: !autoApprove })}
                    disabled={isSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                      autoApprove ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                      autoApprove ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>

                {/* Approver role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Approver</label>
                  <select
                    value={approverRole}
                    onChange={(e) => updateSetting(mod.name, { approver_role: e.target.value })}
                    disabled={isSaving || autoApprove}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Threshold */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Threshold ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={threshold}
                    onChange={(e) => updateSetting(mod.name, { approval_threshold: Number(e.target.value) })}
                    disabled={isSaving || autoApprove}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs disabled:opacity-50"
                  />
                </div>

                {/* Require notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Require notes</label>
                  <button
                    role="switch"
                    aria-checked={requireNotes}
                    onClick={() => updateSetting(mod.name, { require_notes: !requireNotes })}
                    disabled={isSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                      requireNotes ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                      requireNotes ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
