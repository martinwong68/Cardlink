"use client";

import { useEffect, useState, useCallback } from "react";

type TeamMember = { id: string; user_id: string; role: string; invited_at: string | null };
type RolePermission = { id: string; role_name: string; module_name: string | null };

const ROLE_COLORS: Record<string, string> = { owner: "bg-amber-100 text-amber-700", admin: "bg-purple-100 text-purple-700", team_member: "bg-gray-100 text-gray-600" };

export default function OwnerUsersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const headers = { "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const [memRes, roleRes] = await Promise.all([
        fetch("/api/owner/users", { headers, cache: "no-store" }),
        fetch("/api/owner/roles", { headers, cache: "no-store" }),
      ]);
      if (memRes.ok) { const d = await memRes.json(); setMembers(d.members ?? d.team_members ?? []); }
      if (roleRes.ok) { const d = await roleRes.json(); setRoles(d.roles ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search ? members.filter((m) => (m.role ?? "").toLowerCase().includes(search.toLowerCase())) : members;

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading users…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Users & Roles</h1>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by role…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />

      {roles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2">
              <p className="text-xs font-bold text-gray-900">{r.role_name}</p>
              <p className="text-[10px] text-gray-500">{r.module_name ?? "all"}</p>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No team members</p>
          <p className="text-xs text-gray-400">Invite users from the Company Settings screen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{m.user_id?.slice(0, 8) ?? "—"}</p>
                <p className="text-xs text-gray-500">Role: {m.role ?? "team_member"}</p>
                <p className="text-[10px] text-gray-400">Invited {m.invited_at ? new Date(m.invited_at).toLocaleDateString() : "—"}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
