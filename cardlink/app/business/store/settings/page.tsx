"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type DeliveryOptions = { enabled: boolean; fee: number; free_threshold: number };
type PaymentMethods = { cash: boolean; bank_transfer: boolean; online: boolean };

export default function StoreSettingsPage() {
  const t = useTranslations("businessStore.storeSettings");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [delivery, setDelivery] = useState<DeliveryOptions>({ enabled: false, fee: 0, free_threshold: 0 });
  const [payments, setPayments] = useState<PaymentMethods>({ cash: true, bank_transfer: false, online: false });
  const [policies, setPolicies] = useState("");

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
      if (data.payment_methods) setPayments(data.payment_methods as PaymentMethods);
      if (data.store_policies) setPolicies(data.store_policies as string);
    }
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

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
      <div className="app-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">{t("paymentTitle")}</h2>

        {(["cash", "bankTransfer", "onlinePayment"] as const).map((method) => {
          const key = method === "bankTransfer" ? "bank_transfer" : method === "onlinePayment" ? "online" : "cash";
          return (
            <label key={method} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-gray-600">{t(method)}</span>
              <input
                type="checkbox"
                checked={payments[key]}
                onChange={(e) => setPayments((p) => ({ ...p, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          );
        })}
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
