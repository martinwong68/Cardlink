"use client";

import { useEffect, useState, useCallback } from "react";

type SecuritySettings = { enforce_2fa: boolean; strong_password: boolean; session_timeout: boolean; ip_whitelist: boolean; login_alerts: boolean; audit_logging: boolean };

const DEFAULT: SecuritySettings = { enforce_2fa: false, strong_password: false, session_timeout: false, ip_whitelist: false, login_alerts: false, audit_logging: true };

const SETTING_METAS: { key: keyof SecuritySettings; label: string; description: string }[] = [
  { key: "enforce_2fa", label: "Enforce Two-Factor Auth", description: "Require all users to enable 2FA before accessing the system." },
  { key: "strong_password", label: "Strong Password Policy", description: "Minimum 12 characters with uppercase, number, and symbol." },
  { key: "session_timeout", label: "Auto Session Timeout", description: "Automatically log out inactive sessions after 30 minutes." },
  { key: "ip_whitelist", label: "IP Whitelisting", description: "Restrict admin access to pre-approved IP addresses only." },
  { key: "login_alerts", label: "Login Alerts", description: "Send email alerts on login from new devices or locations." },
  { key: "audit_logging", label: "Audit Logging", description: "Record all user actions for compliance and review." },
];

export default function OwnerSecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/security", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setSettings({ ...DEFAULT, ...(d.settings ?? {}) }); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (key: keyof SecuritySettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    try {
      await fetch("/api/owner/security", { method: "PUT", headers, body: JSON.stringify({ settings: updated }) });
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const enabledCount = SETTING_METAS.filter((s) => settings[s.key]).length;

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading security settings…</p></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Security Settings</h1>
        <p className="text-xs text-neutral-500">{enabledCount} of {SETTING_METAS.length} controls active</p>
      </div>

      <div className="space-y-3">
        {SETTING_METAS.map((s) => (
          <div key={s.key} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-neutral-900">{s.label}</p>
              <p className="mt-0.5 text-xs text-neutral-500">{s.description}</p>
            </div>
            <button onClick={() => toggle(s.key)} disabled={saving} className={`relative h-6 w-11 rounded-full transition ${settings[s.key] ? "bg-purple-600" : "bg-neutral-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[s.key] ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Security Score */}
      <div className="rounded-xl border border-neutral-100 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">Security Score</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${(enabledCount / SETTING_METAS.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-neutral-500">{Math.round((enabledCount / SETTING_METAS.length) * 100)}% — {enabledCount >= 5 ? "Strong" : enabledCount >= 3 ? "Moderate" : "Weak"}</p>
      </div>
    </div>
  );
}
