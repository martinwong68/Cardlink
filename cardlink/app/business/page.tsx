"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Handshake,
  ClipboardList,
  CreditCard,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const modules = [
  { key: "accounting" as const, icon: BookOpen, color: "bg-blue-50 text-blue-600", route: "/business/accounting", exists: true },
  { key: "hr" as const, icon: Users, color: "bg-purple-50 text-purple-600", route: "/business/hr", exists: false },
  { key: "booking" as const, icon: Calendar, color: "bg-teal-50 text-teal-600", route: "/business/booking", exists: false },
  { key: "inventory" as const, icon: Package, color: "bg-orange-50 text-orange-600", route: "/business/inventory", exists: true },
  { key: "pos" as const, icon: ShoppingCart, color: "bg-green-50 text-green-600", route: "/business/pos", exists: true },
  { key: "crm" as const, icon: Handshake, color: "bg-indigo-50 text-indigo-600", route: "/business/crm", exists: true },
  { key: "procurement" as const, icon: ClipboardList, color: "bg-amber-50 text-amber-600", route: "/business/procurement", exists: true },
  { key: "companyCards" as const, icon: CreditCard, color: "bg-slate-100 text-slate-600", route: "/business/company-cards", exists: true },
];

export default function BusinessHandlePage() {
  const t = useTranslations("businessHandle");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="app-kicker">{t("brand")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("subtitle")}</p>
      </div>

      {/* AI Action Queue */}
      <div className="app-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("aiSuggestions.title")}</h2>
        </div>
        <div className="flex items-center justify-center rounded-xl bg-gray-50 py-8 px-4 text-center">
          <p className="text-xs text-gray-400">{t("aiSuggestions.empty")}</p>
        </div>
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("modules")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const href = mod.exists ? mod.route : `/business/${mod.key}`;
            return (
              <Link
                key={mod.key}
                href={href}
                className="app-card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {t(`moduleNames.${mod.key}`)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 transition" />
                </div>
                {!mod.exists && (
                  <span className="inline-flex self-start rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {t("comingSoon")}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
