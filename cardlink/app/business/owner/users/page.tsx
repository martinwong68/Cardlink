"use client";

import { useEffect, useState, useCallback } from "react";

type TeamMember = { id: string; user_id: string; role: string; status: string; invited_at: string | null };
type RolePermission = { id: string; role_name: string; module_name: string | null };

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600",
  staff: "bg-green-100 text-green-700",
  team_member: "bg-gray-100 text-gray-600",
};

const ASSIGNABLE_ROLES = ["admin", "manager", "member", "staff"];

export default function OwnerUsersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /* Invite form state */
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  /* Role editing */
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const headers: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  /* ── Role update handler ── */
  const handleUpdateRole = async (memberId: string) => {
    if (!editRole) return;
    setUpdatingRole(true);
    setRoleError(null);
    try {
      const res = await fetch("/api/owner/users", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ memberId, role: editRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingMember(null);
        setEditRole("");
        await load();
      } else {
        setRoleError(data.error ?? "Failed to update role.");
      }
    } catch {
      setRoleError("Network error. Please try again.");
    } finally {
      setUpdatingRole(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [memRes, roleRes] = await Promise.all([
        fetch("/api/owner/users", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
        fetch("/api/owner/roles", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" }),
      ]);
      if (memRes.ok) { const d = await memRes.json(); setMembers(d.members ?? d.team_members ?? []); }
      if (roleRes.ok) { const d = await roleRes.json(); setRoles(d.roles ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? members.filter((m) =>
        (m.role ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.user_id ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : members;

  /* ── Invite handler ── */
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/owner/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Successfully added ${inviteEmail} as ${inviteRole}.`);
        setInviteEmail("");
        setInviteRole("member");
        await load();
      } else {
        setInviteError(data.error ?? "Failed to invite user.");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  /* ── Role update handler is defined above ── */

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading users…</p></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Users & Roles</h1>

      {/* ── Invite Team Member ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Invite Team Member</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="team@example.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? "Adding…" : "Add Member"}
          </button>
        </div>
        {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-emerald-600">{inviteSuccess}</p>}
      </div>

      {/* ── Search ── */}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by role or user ID…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />

      {/* ── Roles Overview ── */}
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

      {/* ── Member List ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No team members</p>
          <p className="text-xs text-gray-400">Use the form above to invite team members.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{m.user_id?.slice(0, 8) ?? "—"}</p>
                  <p className="text-xs text-gray-500">Role: {m.role ?? "member"}</p>
                  <p className="text-[10px] text-gray-400">
                    {m.status === "active" ? "Active" : m.status} · Invited {m.invited_at ? new Date(m.invited_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {m.role === "owner" ? "Owner" : m.role === "admin" ? "Admin" : m.role === "manager" ? "Manager" : m.role === "staff" ? "Staff" : "Member"}
                  </span>
                  {m.role !== "owner" && (
                    <button
                      onClick={() => { setEditingMember(m.id); setEditRole(m.role); }}
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Inline role editor */}
              {editingMember === m.id && (
                <div className="mt-3 border-t border-gray-50 pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleUpdateRole(m.id)}
                      disabled={updatingRole}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {updatingRole ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditingMember(null); setRoleError(null); }}
                      className="rounded-lg px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                  {roleError && editingMember === m.id && (
                    <p className="text-xs text-red-600">{roleError}</p>
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
