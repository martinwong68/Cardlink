"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Users,
  Puzzle,
  CreditCard,
  ShieldCheck,
  ClipboardList,
  Key,
  ChevronRight,
} from "lucide-react";

const ownerLinks = [
  { href: "/business/owner/users", label: "Users & Roles", icon: Users, desc: "Manage team members and permissions", color: "bg-blue-50 text-blue-600" },
  { href: "/business/owner/modules", label: "Modules", icon: Puzzle, desc: "Enable/disable platform modules", color: "bg-teal-50 text-teal-600" },
  { href: "/business/owner/billing", label: "Billing", icon: CreditCard, desc: "Subscription and usage", color: "bg-emerald-50 text-emerald-600" },
  { href: "/business/owner/security", label: "Security", icon: ShieldCheck, desc: "Password policy, 2FA, sessions", color: "bg-red-50 text-red-600" },
  { href: "/business/owner/audit", label: "Audit Log", icon: ClipboardList, desc: "View all system activity", color: "bg-amber-50 text-amber-600" },
  { href: "/business/owner/api-keys", label: "API Keys", icon: Key, desc: "Manage API access tokens", color: "bg-indigo-50 text-indigo-600" },
];

export default function SettingsOwnerPage() {
  const t = useTranslations("businessSettingsOverview");

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.ownerPanel.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.ownerPanel.desc")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ownerLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="app-card group flex items-center gap-4 px-4 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 truncate">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-indigo-400 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
