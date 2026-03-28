"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, Plus, Trash2, Star, Settings2 } from "lucide-react";
import Link from "next/link";

type TaxConfig = {
  id: string;
  name: string;
  rate: number;
  region: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
};

const HEADERS = { "x-cardlink-app-scope": "business" };

export default function PosSettingsPage() {
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTaxConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/tax-config", { headers: HEADERS, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTaxConfigs(data.tax_configs ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTaxConfigs(); }, [loadTaxConfigs]);

  const handleCreate = async () => {
    setError(null);
    const name = formName.trim();
    const ratePercent = Number(formRate);
    if (!name) { setError("Name is required."); return; }
    if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) { setError("Rate must be 0–100%."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/pos/tax-config", {
        method: "POST",
        headers: { "content-type": "application/json", ...HEADERS },
        body: JSON.stringify({
          name,
          rate: ratePercent / 100,
          region: formRegion.trim() || null,
          is_default: formDefault,
        }),
      });
      if (res.ok) {
        setFormName(""); setFormRate(""); setFormRegion(""); setFormDefault(false);
        setShowForm(false);
        void loadTaxConfigs();
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create tax config.");
      }
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tax configuration?")) return;
    try {
      await fetch(`/api/pos/tax-config?id=${id}`, { method: "DELETE", headers: HEADERS });
      void loadTaxConfigs();
    } catch { /* silent */ }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch("/api/pos/tax-config/default", {
        method: "POST",
        headers: { "content-type": "application/json", ...HEADERS },
        body: JSON.stringify({ id }),
      });
      void loadTaxConfigs();
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading POS Settings…</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/business/pos" className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition">
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-800">POS Settings</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Configure tax rates and POS-specific settings</p>
        </div>
      </div>

      {/* Tax Configuration */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Tax Rates</h2>
          <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Add Tax Rate
          </button>
        </div>

        {/* Existing Tax Configs */}
        {taxConfigs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No tax rates configured. The default 8% tax rate will be used.</p>
        ) : (
          <div className="space-y-2">
            {taxConfigs.map((tc) => (
              <div key={tc.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  {tc.is_default && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tc.name}</p>
                    <p className="text-xs text-gray-500">
                      {(Number(tc.rate) * 100).toFixed(2)}%
                      {tc.region && ` · ${tc.region}`}
                      {tc.is_default && " · Default"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!tc.is_default && (
                    <button onClick={() => void handleSetDefault(tc.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Set Default
                    </button>
                  )}
                  <button onClick={() => void handleDelete(tc.id)} className="rounded-lg p-1.5 hover:bg-red-50" title="Delete">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700">New Tax Rate</h3>
            <div className="grid gap-2 md:grid-cols-3">
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Tax Name (e.g. Sales Tax)"
                className="app-input px-3 py-2 text-sm"
              />
              <input
                value={formRate}
                onChange={(e) => setFormRate(e.target.value)}
                placeholder="Rate % (e.g. 8)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="app-input px-3 py-2 text-sm"
              />
              <input
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                placeholder="Region (optional)"
                className="app-input px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formDefault} onChange={(e) => setFormDefault(e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Set as default tax rate</span>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => void handleCreate()} disabled={saving} className="app-primary-btn px-4 py-2 text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Create"}
              </button>
              <button onClick={() => { setShowForm(false); setError(null); }} className="app-secondary-btn px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="app-card rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-2">How Tax Rates Work</h2>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• The <strong>default</strong> tax rate is automatically applied at the POS terminal.</li>
          <li>• Cashiers can override the tax rate during checkout if multiple rates are configured.</li>
          <li>• Tax is calculated <strong>after</strong> any discounts are applied.</li>
          <li>• If no tax rate is configured, a default 8% rate is used.</li>
        </ul>
      </div>
    </div>
  );
}
