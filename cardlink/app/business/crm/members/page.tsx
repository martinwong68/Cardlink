"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Shield, User } from "lucide-react";

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const HEADERS = { "x-cardlink-app-scope": "business" };

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  admin: "bg-red-100 text-red-700",
  manager: "bg-indigo-100 text-indigo-700",
  member: "bg-teal-100 text-teal-700",
  staff: "bg-gray-100 text-gray-600",
};

export default function CrmMembersPage() {
  const t = useTranslations("crmMembers");
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/members", { headers: HEADERS, cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/business/crm")}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="app-card rounded-2xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-gray-900">{members.length}</p>
          <p className="text-[10px] text-gray-500">{t("totalMembers")}</p>
        </div>
        <div className="app-card rounded-2xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            {members.filter((m) => m.role === "owner" || m.role === "admin").length}
          </p>
          <p className="text-[10px] text-gray-500">{t("admins")}</p>
        </div>
        <div className="app-card rounded-2xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-gray-900">
            {members.filter((m) => m.role === "staff" || m.role === "member").length}
          </p>
          <p className="text-[10px] text-gray-500">{t("staff")}</p>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="app-card rounded-2xl p-6 text-center">
            <User className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">{t("empty")}</p>
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.user_id}
              className="app-card flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {m.full_name || m.email || t("unknownMember")}
                </p>
                {m.email && m.full_name && (
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {t("joinedAt", { date: new Date(m.joined_at).toLocaleDateString() })}
                </p>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[m.role] ?? ROLE_COLORS.member}`}
                >
                  {m.role}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
