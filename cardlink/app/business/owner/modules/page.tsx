"use client";

import { useEffect, useState, useCallback } from "react";

type ModuleRecord = { id: string; module_name: string; is_enabled: boolean; settings: Record<string, unknown> | null };

const ALL_MODULES = [
  { name: "accounting", icon: "📊", label: "Accounting" },
  { name: "pos", icon: "🛒", label: "POS" },
  { name: "procurement", icon: "🚛", label: "Procurement" },
  { name: "crm", icon: "🤝", label: "CRM" },
  { name: "inventory", icon: "📦", label: "Inventory" },
  { name: "hr", icon: "👥", label: "HR" },
  { name: "booking", icon: "📅", label: "Booking" },
  { name: "store", icon: "🛍️", label: "Store" },
  { name: "cards", icon: "💳", label: "Name Cards" },
  { name: "client", icon: "🏪", label: "Client App" },
];

export default function OwnerModulesPage() {
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/modules", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setModules(d.modules ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enabledMap = new Map(modules.map((m) => [m.module_name, m]));

  const handleToggle = async (moduleName: string) => {
    setToggling(moduleName);
    const existing = enabledMap.get(moduleName);
    try {
      await fetch("/api/owner/modules", { method: "POST", headers, body: JSON.stringify({ module: moduleName, is_enabled: existing ? !existing.is_enabled : true }) });
      await load();
    } catch { /* silent */ } finally { setToggling(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading modules…</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Module Access</h1>
        <p className="text-xs text-gray-500">Enable or disable platform modules for your organization.</p>
      </div>

      <div className="space-y-3">
        {ALL_MODULES.map((mod) => {
          const record = enabledMap.get(mod.name);
          const enabled = record?.is_enabled ?? false;
          const isToggling = toggling === mod.name;
          return (
            <div key={mod.name} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{mod.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{mod.label}</p>
                    <p className="text-[10px] text-gray-500">{mod.name}</p>
                  </div>
                </div>
                {/* Apple-style toggle switch */}
                <button
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${mod.label}`}
                  onClick={() => handleToggle(mod.name)}
                  disabled={isToggling}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    enabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                      enabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                  {isToggling && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  )}
                </button>
              </div>
              {record && (
                <div className="mt-2 flex gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{enabled ? "Active" : "Disabled"}</span>
                  {record.settings?.integration && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Integrated</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
