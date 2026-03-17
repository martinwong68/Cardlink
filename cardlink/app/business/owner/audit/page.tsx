"use client";

import { useEffect, useState, useCallback } from "react";

type AuditEntry = { id: string; action: string; resource_type: string | null; resource_id: string | null; ip_address: string | null; metadata: Record<string, any> | null; created_at: string };

function actionBadge(action: string) {
  if (action?.includes("delete")) return "bg-amber-100 text-amber-700";
  if (action?.includes("create")) return "bg-emerald-100 text-emerald-700";
  return "bg-neutral-100 text-neutral-600";
}

function actionLabel(action: string) {
  if (action?.includes("delete")) return "Destructive";
  if (action?.includes("create")) return "Create";
  return "Update";
}

export default function OwnerAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/audit", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setEntries(d.entries ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? entries.filter((e) => e.action?.toLowerCase().includes(search.toLowerCase()) || e.resource_type?.toLowerCase().includes(search.toLowerCase()))
    : entries;

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading audit log…</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Audit Log</h1>
        <p className="text-xs text-neutral-500">{filtered.length} events recorded</p>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions or resources…" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No audit events</p>
          <p className="text-xs text-neutral-400">System activity will be recorded here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl border border-neutral-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{e.action}</p>
                  <p className="text-[10px] text-neutral-500">{e.resource_type}{e.resource_id ? ` · ${e.resource_id.slice(0, 8)}` : ""}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge(e.action)}`}>{actionLabel(e.action)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-neutral-500">IP: {e.ip_address ?? "—"}</p>
                <p className="text-[10px] text-neutral-500">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              {e.metadata && Object.keys(e.metadata).length > 0 && (
                <p className="mt-1 text-[10px] text-neutral-400">Details: {JSON.stringify(e.metadata).slice(0, 80)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
