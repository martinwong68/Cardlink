"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Ticket, Copy, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  applies_to: string;
  target_id: string | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

const HEADERS = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function StoreCouponsPage() {
  const t = useTranslations("businessStore.coupons");
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formMaxDiscount, setFormMaxDiscount] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/business/store/coupons", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setCoupons(d.coupons ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!formCode.trim() || !formValue) return;
    setSaving(true);
    try {
      const payload = {
        code: formCode,
        name: formName.trim() || null,
        discount_type: formType,
        discount_value: parseFloat(formValue),
        min_order_amount: parseFloat(formMinOrder) || 0,
        max_discount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
        usage_limit: formUsageLimit ? parseInt(formUsageLimit) : null,
        valid_from: formValidFrom || null,
        valid_until: formValidUntil || null,
        is_active: formActive,
      };
      if (editingId) {
        await fetch(`/api/business/store/coupons/${editingId}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/business/store/coupons", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      }
      resetForm();
      await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/business/store/coupons/${id}`, { method: "DELETE", headers: HEADERS });
    await load();
  };

  const startEdit = (c: Coupon) => {
    setEditingId(c.id);
    setFormCode(c.code);
    setFormName(c.name ?? "");
    setFormType(c.discount_type as "percentage" | "fixed");
    setFormValue(String(c.discount_value));
    setFormMinOrder(String(c.min_order_amount || ""));
    setFormMaxDiscount(c.max_discount ? String(c.max_discount) : "");
    setFormUsageLimit(c.usage_limit ? String(c.usage_limit) : "");
    setFormValidFrom(c.valid_from ? c.valid_from.slice(0, 10) : "");
    setFormValidUntil(c.valid_until ? c.valid_until.slice(0, 10) : "");
    setFormActive(c.is_active);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormCode("");
    setFormName("");
    setFormType("percentage");
    setFormValue("");
    setFormMinOrder("");
    setFormMaxDiscount("");
    setFormUsageLimit("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormActive(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCouponStatus = (c: Coupon): string => {
    if (!c.is_active) return "inactive";
    const now = new Date();
    if (c.valid_until && new Date(c.valid_until) < now) return "expired";
    if (c.valid_from && new Date(c.valid_from) > now) return "scheduled";
    if (c.usage_limit && c.usage_count >= c.usage_limit) return "exhausted";
    return "active";
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
    expired: "bg-gray-100 text-gray-400",
    scheduled: "bg-blue-100 text-blue-700",
    exhausted: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/business/store-management")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
          {t("addCoupon")}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="app-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{editingId ? t("editCoupon") : t("addCoupon")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("codeLabel")}</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder={t("codePlaceholder")} className="app-input mt-1 w-full uppercase" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t("nameLabel")}</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("namePlaceholder")} className="app-input mt-1 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("typeLabel")}</label>
              <div className="mt-1 flex gap-2">
                {(["percentage", "fixed"] as const).map((type) => (
                  <button key={type} onClick={() => setFormType(type)} className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${formType === type ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {t(`type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t("valueLabel")}</label>
              <input type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder={formType === "percentage" ? "10" : "5.00"} className="app-input mt-1 w-full" min="0" step={formType === "percentage" ? "1" : "0.01"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("minOrderLabel")}</label>
              <input type="number" value={formMinOrder} onChange={(e) => setFormMinOrder(e.target.value)} placeholder="0" className="app-input mt-1 w-full" min="0" step="0.01" />
            </div>
            {formType === "percentage" && (
              <div>
                <label className="text-xs font-medium text-gray-600">{t("maxDiscountLabel")}</label>
                <input type="number" value={formMaxDiscount} onChange={(e) => setFormMaxDiscount(e.target.value)} placeholder={t("noLimit")} className="app-input mt-1 w-full" min="0" step="0.01" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600">{t("usageLimitLabel")}</label>
              <input type="number" value={formUsageLimit} onChange={(e) => setFormUsageLimit(e.target.value)} placeholder={t("unlimited")} className="app-input mt-1 w-full" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("validFromLabel")}</label>
              <input type="date" value={formValidFrom} onChange={(e) => setFormValidFrom(e.target.value)} className="app-input mt-1 w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t("validUntilLabel")}</label>
              <input type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} className="app-input mt-1 w-full" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
              <span className="text-xs font-medium text-gray-600">{t("activeLabel")}</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">{t("cancel")}</button>
            <button onClick={handleSave} disabled={saving || !formCode.trim() || !formValue} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? t("saving") : t("save")}</button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-4">
          <Ticket className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const status = getCouponStatus(c);
            return (
              <div key={c.id} className="app-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCode(c.code)} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-sm font-mono font-bold text-gray-800 hover:bg-gray-100 transition">
                      {c.code}
                      {copiedCode === c.code ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[status]}`}>
                      {t(`status.${status}`)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(c)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50">{t("edit")}</button>
                    <button onClick={() => handleDelete(c.id)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50">{t("delete")}</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `$${Number(c.discount_value).toFixed(2)} off`}
                  </span>
                  {c.name && <span>{c.name}</span>}
                  {c.min_order_amount > 0 && <span>{t("minOrder", { amount: Number(c.min_order_amount).toFixed(2) })}</span>}
                  <span>{t("used", { count: c.usage_count, limit: c.usage_limit ?? "∞" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
