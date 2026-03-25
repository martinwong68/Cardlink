"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BellRing, ShoppingCart, AlertTriangle, Bot, Info, DollarSign, Calendar, Handshake, FileWarning } from "lucide-react";

type NotificationPreference = {
  type: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: typeof BellRing;
  color: string;
};

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { type: "new_order", label: "New Orders", description: "Get notified when a new POS order is placed", enabled: true, icon: ShoppingCart, color: "text-green-500" },
  { type: "low_stock", label: "Low Stock Alerts", description: "Receive warnings when inventory reaches reorder level", enabled: true, icon: AlertTriangle, color: "text-orange-500" },
  { type: "new_connection", label: "New Connections", description: "Get notified about new business connection requests", enabled: true, icon: Handshake, color: "text-indigo-500" },
  { type: "invoice_overdue", label: "Invoice Overdue", description: "Alerts when invoices pass their due date", enabled: true, icon: FileWarning, color: "text-red-500" },
  { type: "payment_received", label: "Payments Received", description: "Get notified when payments are received", enabled: true, icon: DollarSign, color: "text-emerald-500" },
  { type: "booking_new", label: "New Bookings", description: "Alerts for new booking appointments", enabled: true, icon: Calendar, color: "text-teal-500" },
  { type: "ai_suggestion", label: "AI Suggestions", description: "Get notified when AI action cards are ready for review", enabled: true, icon: Bot, color: "text-purple-500" },
  { type: "system", label: "System Notifications", description: "Important system updates and announcements", enabled: true, icon: Info, color: "text-gray-500" },
];

export default function NotificationSettingsPage() {
  const t = useTranslations("businessSettingsOverview");
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cardlink_notification_prefs");
      if (saved) {
        const parsed = JSON.parse(saved) as { type: string; enabled: boolean }[];
        setPreferences((prev) =>
          prev.map((p) => {
            const found = parsed.find((s) => s.type === p.type);
            return found ? { ...p, enabled: found.enabled } : p;
          })
        );
      }
      const globalSaved = localStorage.getItem("cardlink_notifications_global");
      if (globalSaved !== null) setGlobalEnabled(globalSaved === "true");
    } catch { /* silent */ }
  }, []);

  const savePreferences = useCallback((prefs: NotificationPreference[], global: boolean) => {
    try {
      localStorage.setItem(
        "cardlink_notification_prefs",
        JSON.stringify(prefs.map((p) => ({ type: p.type, enabled: p.enabled })))
      );
      localStorage.setItem("cardlink_notifications_global", String(global));
    } catch { /* silent */ }
  }, []);

  const togglePreference = (type: string) => {
    const updated = preferences.map((p) =>
      p.type === type ? { ...p, enabled: !p.enabled } : p
    );
    setPreferences(updated);
    savePreferences(updated, globalEnabled);
  };

  const toggleGlobal = () => {
    const newGlobal = !globalEnabled;
    setGlobalEnabled(newGlobal);
    savePreferences(preferences, newGlobal);
  };

  const enableAll = () => {
    const updated = preferences.map((p) => ({ ...p, enabled: true }));
    setPreferences(updated);
    savePreferences(updated, globalEnabled);
  };

  const disableAll = () => {
    const updated = preferences.map((p) => ({ ...p, enabled: false }));
    setPreferences(updated);
    savePreferences(updated, globalEnabled);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="app-kicker">{t("title")}</p>
        <h1 className="app-title mt-2 text-2xl font-semibold">{t("cards.notificationSettings.title")}</h1>
        <p className="app-subtitle mt-2 text-sm">{t("cards.notificationSettings.desc")}</p>
      </div>

      {/* Global toggle */}
      <div className="app-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <BellRing className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">All Notifications</p>
              <p className="text-xs text-gray-400">Master switch for all notification types</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={globalEnabled}
            onClick={toggleGlobal}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
              globalEnabled ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
              globalEnabled ? "translate-x-7" : "translate-x-1"
            }`} />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button onClick={enableAll} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition">
          Enable All
        </button>
        <button onClick={disableAll} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition">
          Disable All
        </button>
      </div>

      {/* Individual notification types */}
      <div className="space-y-2">
        {preferences.map((pref) => {
          const Icon = pref.icon;
          return (
            <div key={pref.type} className={`app-card p-4 transition ${!globalEnabled ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${pref.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{pref.label}</p>
                    <p className="text-xs text-gray-400">{pref.description}</p>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={pref.enabled}
                  aria-label={`Toggle ${pref.label}`}
                  onClick={() => togglePreference(pref.type)}
                  disabled={!globalEnabled}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out disabled:cursor-not-allowed ${
                    pref.enabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                    pref.enabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
