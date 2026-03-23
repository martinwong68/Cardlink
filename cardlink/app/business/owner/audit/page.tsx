"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Loader2, ChevronDown, ChevronRight, Filter } from "lucide-react";

type AuditEntry = {
  id: string;
  timestamp: string;
  user_id: string | null;
  module: string | null;
  table_name: string | null;
  action: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  status_change: "bg-amber-100 text-amber-700",
};

const MODULE_COLORS: Record<string, string> = {
  store: "bg-indigo-100 text-indigo-700",
  inventory: "bg-teal-100 text-teal-700",
  accounting: "bg-purple-100 text-purple-700",
  crm: "bg-blue-100 text-blue-700",
  hr: "bg-amber-100 text-amber-700",
  owner: "bg-gray-100 text-gray-700",
};

const ACTIONS = ["all", "create", "update", "delete", "status_change"] as const;
const MODULES = ["all", "store", "inventory", "accounting", "crm", "hr", "owner"] as const;

export default function OwnerAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(`/api/audit?${params}`, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setEntries(d.entries ?? []); }
      else setError("Failed to load audit log");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }, [moduleFilter, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-xs text-gray-500">{entries.length} events recorded</p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="appearance-none rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs">
          {MODULES.map((m) => <option key={m} value={m}>{m === "all" ? "All Modules" : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="appearance-none rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs">
          {ACTIONS.map((a) => <option key={a} value={a}>{a === "all" ? "All Actions" : a.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">No audit events</p>
          <p className="text-xs text-gray-400">System activity will be recorded here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <button onClick={() => toggle(e.id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedId === e.id ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{e.table_name ?? "—"}</p>
                        <span className="text-[10px] text-gray-400">{e.record_id?.slice(0, 8) ?? ""}</span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        {e.user_id ? `User ${e.user_id.slice(0, 8)}…` : "System"} · {new Date(e.timestamp || e.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {e.module && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${MODULE_COLORS[e.module] ?? "bg-gray-100 text-gray-600"}`}>{e.module}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${ACTION_COLORS[e.action] ?? "bg-gray-100 text-gray-600"}`}>{e.action.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </button>

              {expandedId === e.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {e.old_values && Object.keys(e.old_values).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">Old Values</p>
                      <pre className="rounded-lg bg-gray-50 p-2 text-[10px] text-gray-600 overflow-x-auto">{JSON.stringify(e.old_values, null, 2)}</pre>
                    </div>
                  )}
                  {e.new_values && Object.keys(e.new_values).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">New Values</p>
                      <pre className="rounded-lg bg-indigo-50 p-2 text-[10px] text-indigo-700 overflow-x-auto">{JSON.stringify(e.new_values, null, 2)}</pre>
                    </div>
                  )}
                  {e.ip_address && <p className="text-[10px] text-gray-400">IP: {e.ip_address}</p>}
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">Metadata</p>
                      <pre className="rounded-lg bg-gray-50 p-2 text-[10px] text-gray-600 overflow-x-auto">{JSON.stringify(e.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
