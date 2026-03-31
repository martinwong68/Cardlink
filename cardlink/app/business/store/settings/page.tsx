"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Upload, Trash2, QrCode, CreditCard } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type DeliveryOptions = { enabled: boolean; fee: number; free_threshold: number };
type QrCodeEntry = { label: string; image_url: string };
type PaymentMethods = {
  cash: boolean;
  bank_transfer: boolean;
  online: boolean;
  qr_codes: QrCodeEntry[];
};

export default function StoreSettingsPage() {
  const t = useTranslations("businessStore.storeSettings");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [delivery, setDelivery] = useState<DeliveryOptions>({ enabled: false, fee: 0, free_threshold: 0 });
  const [payments, setPayments] = useState<PaymentMethods>({ cash: true, bank_transfer: false, online: false, qr_codes: [] });
  const [policies, setPolicies] = useState("");

  // Stripe Connect status
  const [stripeConnected, setStripeConnected] = useState(false);

  // QR code upload
  const [uploadingQr, setUploadingQr] = useState(false);
  const [newQrLabel, setNewQrLabel] = useState("");
  const qrInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data } = await supabase
      .from("store_settings")
      .select("delivery_options, payment_methods, store_policies")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) {
      if (data.delivery_options) setDelivery(data.delivery_options as DeliveryOptions);
      if (data.payment_methods) {
        const pm = data.payment_methods as Record<string, unknown>;
        setPayments({
          cash: pm.cash === true,
          bank_transfer: pm.bank_transfer === true,
          online: pm.online === true,
          qr_codes: Array.isArray(pm.qr_codes) ? (pm.qr_codes as QrCodeEntry[]) : [],
        });
      }
      if (data.store_policies) setPolicies(data.store_policies as string);
    }

    // Check Stripe Connect status
    try {
      const res = await fetch("/api/stripe/connect/status", {
        headers: { "x-business-scope": "true" },
        cache: "no-store",
      });
      if (res.ok) {
        const status = await res.json();
        setStripeConnected(!!status.chargesEnabled);
      }
    } catch { /* silent */ }

    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

  const handleQrUpload = async (file: File) => {
    if (!companyId) return;
    setUploadingQr(true);

    const ext = file.name.split(".").pop() || "png";
    const path = `${companyId}/qr-codes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true, contentType: file.type || "image/png" });

    if (uploadErr) {
      setMessage({ type: "error", text: "Failed to upload QR code." });
      setUploadingQr(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    setPayments((prev) => ({
      ...prev,
      qr_codes: [...prev.qr_codes, { label: newQrLabel.trim() || "QR Payment", image_url: imageUrl }],
    }));
    setNewQrLabel("");
    setUploadingQr(false);
  };

  const removeQrCode = (index: number) => {
    setPayments((prev) => ({
      ...prev,
      qr_codes: prev.qr_codes.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setMessage(null);

    const payload = {
      company_id: companyId,
      delivery_options: delivery,
      payment_methods: payments,
      store_policies: policies.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("store_settings")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("store_settings").update(payload).eq("company_id", companyId)
      : await supabase.from("store_settings").insert(payload);

    setSaving(false);
    setMessage(error ? { type: "error", text: t("error") } : { type: "success", text: t("saved") });
  };

  if (companyLoading || loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/business/store-management")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Delivery */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{t("deliveryTitle")}</h2>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">{t("enableDelivery")}</span>
          <button
            onClick={() => setDelivery((d) => ({ ...d, enabled: !d.enabled }))}
            className={`h-5 w-9 rounded-full transition-colors ${delivery.enabled ? "bg-indigo-600" : "bg-gray-300"}`}
          >
            <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${delivery.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>

        {delivery.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("deliveryFeeLabel")}</label>
              <input
                type="number" min="0" step="0.01"
                value={delivery.fee}
                onChange={(e) => setDelivery((d) => ({ ...d, fee: parseFloat(e.target.value) || 0 }))}
                className="app-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t("freeThresholdLabel")}</label>
              <input
                type="number" min="0" step="0.01"
                value={delivery.free_threshold}
                onChange={(e) => setDelivery((d) => ({ ...d, free_threshold: parseFloat(e.target.value) || 0 }))}
                className="app-input mt-1 w-full"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">{t("freeThresholdHint")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="app-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{t("paymentTitle")}</h2>

        {/* Cash */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-medium text-gray-600">{t("cash")}</span>
          <input
            type="checkbox"
            checked={payments.cash}
            onChange={(e) => setPayments((p) => ({ ...p, cash: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        {/* Bank Transfer */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-medium text-gray-600">{t("bankTransfer")}</span>
          <input
            type="checkbox"
            checked={payments.bank_transfer}
            onChange={(e) => setPayments((p) => ({ ...p, bank_transfer: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>

        {/* Stripe Online Payment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-500" />
            <div>
              <span className="text-xs font-medium text-gray-600">Stripe Online Payment</span>
              {!stripeConnected && (
                <p className="text-[10px] text-amber-600">
                  Connect Stripe first in{" "}
                  <button onClick={() => router.push("/business/settings/stripe-connect")} className="underline font-medium">Settings → Stripe Connect</button>
                </p>
              )}
              {stripeConnected && <p className="text-[10px] text-green-600">✓ Stripe connected</p>}
            </div>
          </div>
          <input
            type="checkbox"
            checked={payments.online}
            onChange={(e) => setPayments((p) => ({ ...p, online: e.target.checked }))}
            disabled={!stripeConnected}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        {/* QR Code Payments */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-gray-500" />
            <h3 className="text-xs font-semibold text-gray-700">QR Code Payments</h3>
          </div>
          <p className="text-[10px] text-gray-400">Upload QR codes for payment methods like bank apps, e-wallets, etc. Customers choose a QR code at checkout and you confirm payment manually.</p>

          {/* Existing QR codes */}
          {payments.qr_codes.map((qr, i) => (
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
        </div>
      </div>

      {/* Store Policies */}
      <div className="app-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">{t("policiesTitle")}</h2>
        <textarea
          value={policies}
          onChange={(e) => setPolicies(e.target.value)}
          placeholder={t("policiesPlaceholder")}
          rows={5}
          className="app-input w-full resize-none"
        />
      </div>

      {message && (
        <p className={`text-xs text-center ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button onClick={handleSave} disabled={saving} className="app-primary-btn w-full disabled:opacity-50">
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
