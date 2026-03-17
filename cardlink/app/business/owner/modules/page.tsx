"use client";

import { useEffect, useState, useCallback } from "react";

type ModuleRecord = { id: string; module: string; is_enabled: boolean; settings: Record<string, any> | null };

const ALL_MODULES = [
  { name: "accounting", icon: "📊", label: "Accounting" },
  { name: "pos", icon: "🛒", label: "POS" },
  { name: "procurement", icon: "🚛", label: "Procurement" },
  { name: "crm", icon: "🤝", label: "CRM" },
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

  const enabledMap = new Map(modules.map((m) => [m.module, m]));

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
                <button onClick={() => handleToggle(mod.name)} disabled={toggling === mod.name} className={`rounded-full px-4 py-1.5 text-xs font-bold text-white transition ${enabled ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gray-300 hover:bg-gray-400"}`}>
                  {toggling === mod.name ? "…" : enabled ? "ON" : "OFF"}
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
