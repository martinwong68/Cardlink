"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, Plus, Trash2, Star, Settings2, Upload, QrCode, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type TaxConfig = {
  id: string;
  name: string;
  rate: number;
  region: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
};

type QrCodeEntry = { label: string; image_url: string };

const HEADERS = { "x-cardlink-app-scope": "business" };

export default function PosSettingsPage() {
  const { companyId, supabase } = useActiveCompany();
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

  // QR code payment state
  const [qrCodes, setQrCodes] = useState<QrCodeEntry[]>([]);
  const [newQrLabel, setNewQrLabel] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrMessage, setQrMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

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

  // Load QR codes from store_settings (company-level payment QR codes)
  const loadQrCodes = useCallback(async () => {
    if (!companyId || !supabase) return;
    const { data } = await supabase
      .from("store_settings")
      .select("payment_methods")
      .eq("company_id", companyId)
      .maybeSingle();
    if (data?.payment_methods) {
      const pm = data.payment_methods as Record<string, unknown>;
      setQrCodes(Array.isArray(pm.qr_codes) ? (pm.qr_codes as QrCodeEntry[]) : []);
    }
  }, [companyId, supabase]);

  useEffect(() => { void loadTaxConfigs(); void loadQrCodes(); }, [loadTaxConfigs, loadQrCodes]);

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

  const handleQrUpload = async (file: File) => {
    if (!companyId || !supabase) return;
    setUploadingQr(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${companyId}/qr-codes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
    if (uploadErr) {
      setQrMessage({ type: "error", text: "Failed to upload QR code." });
      setUploadingQr(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
    setQrCodes((prev) => [...prev, { label: newQrLabel.trim() || "QR Payment", image_url: urlData.publicUrl }]);
    setNewQrLabel("");
    setUploadingQr(false);
  };

  const removeQrCode = (index: number) => {
    setQrCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const saveQrCodes = async () => {
    if (!companyId || !supabase) return;
    setQrSaving(true);
    setQrMessage(null);

    // Load existing payment_methods to preserve other fields
    const { data: existing } = await supabase
      .from("store_settings")
      .select("id, payment_methods")
      .eq("company_id", companyId)
      .maybeSingle();

    const currentPm = (existing?.payment_methods as Record<string, unknown>) ?? {};
    const updatedPm = { ...currentPm, qr_codes: qrCodes };

    const { error: saveErr } = existing
      ? await supabase.from("store_settings").update({ payment_methods: updatedPm, updated_at: new Date().toISOString() }).eq("company_id", companyId)
      : await supabase.from("store_settings").insert({ company_id: companyId, payment_methods: updatedPm });

    setQrSaving(false);
    setQrMessage(saveErr ? { type: "error", text: "Failed to save." } : { type: "success", text: "QR codes saved!" });
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

      {/* QR Code Payment Methods */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">QR Code Payments</h2>
        </div>
        <p className="text-[10px] text-gray-400">Upload QR codes for payment methods like bank apps, e-wallets, etc. When a customer pays via QR code, the cashier selects this method and confirms payment manually.</p>

        {/* Existing QR codes */}
        {qrCodes.map((qr, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="h-16 w-16 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0">
              <img src={qr.image_url} alt={qr.label} className="h-full w-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{qr.label}</p>
              <p className="text-[10px] text-gray-400">QR payment method</p>
            </div>
            <button onClick={() => removeQrCode(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add new QR code */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newQrLabel}
            onChange={(e) => setNewQrLabel(e.target.value)}
            placeholder="Label (e.g. PayNow, GrabPay)"
            className="app-input flex-1 text-xs"
          />
          <button
            onClick={() => qrInputRef.current?.click()}
            disabled={uploadingQr}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition disabled:opacity-50"
          >
            {uploadingQr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload QR
          </button>
        </div>
        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleQrUpload(file);
            e.target.value = "";
          }}
        />

        {qrMessage && (
          <p className={`text-xs ${qrMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {qrMessage.text}
          </p>
        )}

        <button onClick={() => void saveQrCodes()} disabled={qrSaving} className="app-primary-btn w-full text-sm font-semibold disabled:opacity-50">
          {qrSaving ? "Saving…" : "Save QR Codes"}
        </button>
      </div>
    </div>
  );
}
