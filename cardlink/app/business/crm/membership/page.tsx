"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Crown, User, Star } from "lucide-react";

type MemberAccount = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  tier_name: string | null;
  points_balance: number;
  total_spend_amount: number;
  lifetime_points: number;
  joined_at: string;
  expires_at: string | null;
};

const HEADERS = { "x-cardlink-app-scope": "business" };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

export default function CrmMembershipPage() {
  const t = useTranslations("crmMembership");
  const router = useRouter();
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/membership-accounts", { headers: HEADERS, cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setAccounts(json.accounts ?? []);
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

  const activeCount = accounts.filter((a) => a.status === "active").length;
  const totalPoints = accounts.reduce((s, a) => s + a.points_balance, 0);
  const totalSpend = accounts.reduce((s, a) => s + a.total_spend_amount, 0);

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
          <p className="text-lg font-bold text-gray-900">{activeCount}</p>
          <p className="text-[10px] text-gray-500">{t("activeMembers")}</p>
        </div>
        <div className="app-card rounded-2xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-indigo-700">{totalPoints}</p>
          <p className="text-[10px] text-gray-500">{t("totalPoints")}</p>
        </div>
        <div className="app-card rounded-2xl px-3 py-3 text-center">
          <p className="text-lg font-bold text-emerald-700">${totalSpend.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">{t("totalSpend")}</p>
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <div className="app-card rounded-2xl p-6 text-center">
            <User className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">{t("empty")}</p>
          </div>
        ) : (
          accounts.map((a) => (
            <div
              key={a.id}
              className="app-card flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                {a.avatar_url ? (
                  <img
                    src={a.avatar_url}
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
                  {a.full_name || a.email || t("unknownMember")}
                </p>
                {a.email && a.full_name && (
                  <p className="text-xs text-gray-500 truncate">{a.email}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] text-gray-500">
                    {a.points_balance} {t("pointUnit")} · ${a.total_spend_amount.toFixed(0)} {t("spent")}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {t("joinedAt", { date: new Date(a.joined_at).toLocaleDateString() })}
                </p>
              </div>

              {/* Status + Tier */}
              <div className="flex flex-col items-end gap-1">
                {a.tier_name && (
                  <div className="flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold text-amber-700">{a.tier_name}</span>
                  </div>
                )}
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status] ?? STATUS_COLORS.active}`}
                >
                  {a.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
