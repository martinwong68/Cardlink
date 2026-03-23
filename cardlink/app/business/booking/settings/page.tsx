"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type BookingSettings = {
  auto_confirm: boolean;
  timezone: string;
  slot_interval_mins: number;
  cancellation_notice_hours: number;
  cancellation_policy: string | null;
  booking_page_title: string | null;
  booking_page_description: string | null;
  require_phone: boolean;
  require_email: boolean;
};

const TIMEZONE_OPTIONS = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function BookingSettingsPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading } = useActiveCompany();

  const [settings, setSettings] = useState<BookingSettings>({
    auto_confirm: false,
    timezone: "Asia/Kuala_Lumpur",
    slot_interval_mins: 30,
    cancellation_notice_hours: 0,
    cancellation_policy: null,
    booking_page_title: null,
    booking_page_description: null,
    require_phone: false,
    require_email: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business/booking/settings`);
      const json = await res.json();
      if (json.settings) setSettings(json.settings);
    } catch { /* ignore */ }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadSettings();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/business/booking/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/booking" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("settings.title")}</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* Booking Behavior */}
        <div className="app-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{t("settings.behavior")}</h2>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.auto_confirm}
              onChange={(e) => { setSettings({ ...settings, auto_confirm: e.target.checked }); setSaved(false); }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">{t("settings.autoConfirm")}</p>
              <p className="text-xs text-gray-500">{t("settings.autoConfirmDesc")}</p>
            </div>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.timezone")}</label>
            <select
              value={settings.timezone}
              onChange={(e) => { setSettings({ ...settings, timezone: e.target.value }); setSaved(false); }}
              className="app-input w-full rounded-lg border px-3 py-2 text-sm"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.slotInterval")}</label>
              <select
                value={settings.slot_interval_mins}
                onChange={(e) => { setSettings({ ...settings, slot_interval_mins: Number(e.target.value) }); setSaved(false); }}
                className="app-input w-full rounded-lg border px-3 py-2 text-sm"
              >
                {[10, 15, 20, 30, 45, 60].map((v) => (
                  <option key={v} value={v}>{v} {t("services.mins")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.cancellationNotice")}</label>
              <select
                value={settings.cancellation_notice_hours}
                onChange={(e) => { setSettings({ ...settings, cancellation_notice_hours: Number(e.target.value) }); setSaved(false); }}
                className="app-input w-full rounded-lg border px-3 py-2 text-sm"
              >
                {[0, 1, 2, 4, 6, 12, 24, 48].map((v) => (
                  <option key={v} value={v}>{v === 0 ? t("settings.noLimit") : `${v}h`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Required Fields */}
        <div className="app-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{t("settings.requiredFields")}</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.require_email}
              onChange={(e) => { setSettings({ ...settings, require_email: e.target.checked }); setSaved(false); }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{t("settings.requireEmail")}</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.require_phone}
              onChange={(e) => { setSettings({ ...settings, require_phone: e.target.checked }); setSaved(false); }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{t("settings.requirePhone")}</span>
          </label>
        </div>

        {/* Booking Page */}
        <div className="app-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{t("settings.bookingPage")}</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.pageTitle")}</label>
            <input
              value={settings.booking_page_title ?? ""}
              onChange={(e) => { setSettings({ ...settings, booking_page_title: e.target.value || null }); setSaved(false); }}
              className="app-input w-full rounded-lg border px-3 py-2 text-sm"
              placeholder={t("settings.pageTitlePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.pageDescription")}</label>
            <textarea
              value={settings.booking_page_description ?? ""}
              onChange={(e) => { setSettings({ ...settings, booking_page_description: e.target.value || null }); setSaved(false); }}
              rows={3}
              className="app-input w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("settings.cancellationPolicy")}</label>
            <textarea
              value={settings.cancellation_policy ?? ""}
              onChange={(e) => { setSettings({ ...settings, cancellation_policy: e.target.value || null }); setSaved(false); }}
              rows={2}
              className="app-input w-full rounded-lg border px-3 py-2 text-sm"
              placeholder={t("settings.cancellationPolicyPlaceholder")}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="app-primary-btn w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.save")}
      </button>
    </div>
  );
}
