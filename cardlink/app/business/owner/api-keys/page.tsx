"use client";

import { useEffect, useState, useCallback } from "react";

type ApiKey = { id: string; name: string; key_prefix: string | null; key_hash: string | null; scopes: string[]; is_active: boolean; expires_at: string | null; created_at: string };

export default function OwnerApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/api-keys", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setKeys(d.api_keys ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    const name = `api-key-${Date.now().toString(36)}`;
    const keyPrefix = `cl_${Math.random().toString(36).slice(2, 10)}`;
    const keyHash = `hash_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    try {
      await fetch("/api/owner/api-keys", { method: "POST", headers, body: JSON.stringify({ name, key_prefix: keyPrefix, key_hash: keyHash, scopes: ["read", "write"] }) });
      await load();
    } catch { /* silent */ } finally { setCreating(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this key? This cannot be undone.")) return;
    try {
      await fetch(`/api/owner/api-keys/${id}`, { method: "DELETE", headers });
      await load();
    } catch { /* silent */ }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading API keys…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">API Keys</h1>
          <p className="text-xs text-gray-500">{keys.length} key{keys.length !== 1 ? "s" : ""} issued</p>
        </div>
        <button onClick={handleCreate} disabled={creating} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
          {creating ? "Creating…" : "+ New Key"}
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No API keys</p>
          <p className="text-xs text-gray-400">Create an API key to integrate with external systems.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const masked = k.key_hash ? `${k.key_hash.slice(0, 8)}••••••••` : "••••••••";
            const isActive = k.is_active && (!k.expires_at || new Date(k.expires_at) > new Date());
            return (
              <div key={k.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{k.name ?? "Unnamed"}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-500">{masked}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isActive ? "Active" : "Revoked"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-gray-500">Scopes: {(k.scopes ?? []).join(", ") || "none"}</p>
                  <p className="text-[10px] text-gray-500">Created {new Date(k.created_at).toLocaleDateString()}</p>
                </div>
                {isActive && (
                  <button onClick={() => handleRevoke(k.id)} className="mt-2 text-xs font-medium text-rose-500 hover:text-rose-600">Revoke</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
