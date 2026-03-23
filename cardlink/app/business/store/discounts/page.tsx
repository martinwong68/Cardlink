"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type DiscountType = "percentage" | "fixed";
type AppliesTo = "all" | "category" | "product";

type Discount = {
  id: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  target_id: string | null;
  target_name?: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type CategoryOption = { id: string; name: string };
type ProductOption = { id: string; name: string };

function getDiscountStatus(d: Discount): "active" | "expired" | "scheduled" {
  const now = new Date();
  if (d.end_date && new Date(d.end_date) < now) return "expired";
  if (d.start_date && new Date(d.start_date) > now) return "scheduled";
  return "active";
}

export default function StoreDiscountsPage() {
  const t = useTranslations("businessStore.discounts");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<DiscountType>("percentage");
  const [formValue, setFormValue] = useState("");
  const [formAppliesTo, setFormAppliesTo] = useState<AppliesTo>("all");
  const [formTargetId, setFormTargetId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const [discRes, catsRes, prodsRes] = await Promise.all([
      supabase.from("store_discounts").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("store_categories").select("id, name").eq("company_id", companyId).eq("is_active", true).order("sort_order"),
      supabase.from("store_products").select("id, name").eq("company_id", companyId).eq("is_active", true).order("name"),
    ]);

    const cats = (catsRes.data ?? []) as CategoryOption[];
    const prods = (prodsRes.data ?? []) as ProductOption[];
    setCategories(cats);
    setProducts(prods);

    const catMap = new Map(cats.map((c) => [c.id, c.name]));
    const prodMap = new Map(prods.map((p) => [p.id, p.name]));

    const discs = ((discRes.data ?? []) as Array<Record<string, unknown>>).map((d) => ({
      ...d,
      target_name: d.applies_to === "category"
        ? catMap.get(d.target_id as string) ?? undefined
        : d.applies_to === "product"
          ? prodMap.get(d.target_id as string) ?? undefined
          : undefined,
    })) as Discount[];

    setDiscounts(discs);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

  const resetForm = () => {
    setFormName("");
    setFormType("percentage");
    setFormValue("");
    setFormAppliesTo("all");
    setFormTargetId("");
    setFormStartDate("");
    setFormEndDate("");
    setEditingId(null);
    setMessage(null);
  };

  const openNewForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (d: Discount) => {
    resetForm();
    setEditingId(d.id);
    setFormName(d.name);
    setFormType(d.discount_type);
    setFormValue(String(d.discount_value));
    setFormAppliesTo(d.applies_to);
    setFormTargetId(d.target_id || "");
    setFormStartDate(d.start_date ? d.start_date.slice(0, 10) : "");
    setFormEndDate(d.end_date ? d.end_date.slice(0, 10) : "");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); resetForm(); };

  const handleSave = async () => {
    if (!companyId || !formName.trim() || !formValue) return;
    setSaving(true);
    setMessage(null);

    const payload: Record<string, unknown> = {
      company_id: companyId,
      name: formName.trim(),
      discount_type: formType,
      discount_value: parseFloat(formValue),
      applies_to: formAppliesTo,
      target_id: formAppliesTo !== "all" ? formTargetId || null : null,
      start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
      end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
      is_active: true,
    };

    if (editingId) {
      const { error } = await supabase.from("store_discounts").update(payload).eq("id", editingId);
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("store_discounts").insert(payload);
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    }

    setSaving(false);
    setMessage({ type: "success", text: t("saved") });
    closeForm();
    void loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("store_discounts").delete().eq("id", deleteId);
    setDeleteId(null);
    setMessage({ type: "success", text: t("deleted") });
    void loadData();
  };

  const statusBadge = (d: Discount) => {
    const status = getDiscountStatus(d);
    const styles = {
      active: "bg-green-100 text-green-700",
      expired: "bg-gray-100 text-gray-500",
      scheduled: "bg-blue-100 text-blue-700",
    };
    const labels = { active: t("active"), expired: t("expired"), scheduled: t("scheduled") };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const formatDateRange = (d: Discount) => {
    if (!d.start_date && !d.end_date) return t("noExpiry");
    const parts: string[] = [];
    if (d.start_date) parts.push(new Date(d.start_date).toLocaleDateString());
    if (d.end_date) parts.push(new Date(d.end_date).toLocaleDateString());
    return parts.join(" – ");
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
        <div className="flex-1">
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
        <button onClick={openNewForm} className="app-primary-btn flex items-center gap-1.5 text-xs px-3 py-2">
          <Plus className="h-3.5 w-3.5" /> {t("addDiscount")}
        </button>
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="app-card rounded-2xl border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">{t("deleteConfirm")}</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteId(null)} className="app-secondary-btn flex-1 text-xs">{t("cancelDelete")}</button>
            <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition">{t("confirmDelete")}</button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{editingId ? t("editDiscount") : t("addDiscount")}</h2>

          <div>
            <label className="text-xs font-medium text-gray-600">{t("nameLabel")}</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("namePlaceholder")} className="app-input mt-1 w-full" />
          </div>

          {/* Type toggle */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("typeLabel")}</label>
            <div className="mt-1 flex gap-2">
              {(["percentage", "fixed"] as const).map((dt) => (
                <button
                  key={dt}
                  onClick={() => setFormType(dt)}
                  className={`flex-1 rounded-xl border-2 py-2 text-xs font-semibold transition ${
                    formType === dt ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {dt === "percentage" ? t("typePercentage") : t("typeFixed")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t("valueLabel")}</label>
            <input type="number" min="0" step="0.01" value={formValue} onChange={(e) => setFormValue(e.target.value)} className="app-input mt-1 w-full" />
          </div>

          {/* Applies to */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("appliesToLabel")}</label>
            <div className="mt-1 flex gap-2">
              {(["all", "category", "product"] as const).map((at) => (
                <button
                  key={at}
                  onClick={() => { setFormAppliesTo(at); setFormTargetId(""); }}
                  className={`flex-1 rounded-xl border-2 py-2 text-[11px] font-semibold transition ${
                    formAppliesTo === at ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {at === "all" ? t("appliesToAll") : at === "category" ? t("appliesToCategory") : t("appliesToProduct")}
                </button>
              ))}
            </div>
          </div>

          {formAppliesTo === "category" && (
            <select value={formTargetId} onChange={(e) => setFormTargetId(e.target.value)} className="app-input w-full">
              <option value="">{t("selectCategory")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {formAppliesTo === "product" && (
            <select value={formTargetId} onChange={(e) => setFormTargetId(e.target.value)} className="app-input w-full">
              <option value="">{t("selectProduct")}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t("startDateLabel")}</label>
              <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="app-input mt-1 w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t("endDateLabel")}</label>
              <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="app-input mt-1 w-full" />
            </div>
          </div>

          {message && (
            <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}

          <div className="flex gap-2">
            <button onClick={closeForm} className="app-secondary-btn flex-1 text-sm">{t("cancel")}</button>
            <button onClick={handleSave} disabled={saving || !formName.trim() || !formValue} className="app-primary-btn flex-1 text-sm disabled:opacity-50">
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}

      {/* Discount list */}
      {discounts.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl">
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {discounts.map((d) => (
            <div key={d.id} className="app-card flex items-center gap-3 rounded-2xl px-4 py-3">
              {/* Type badge */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${d.discount_type === "percentage" ? "bg-green-50" : "bg-blue-50"}`}>
                <span className={`text-sm font-bold ${d.discount_type === "percentage" ? "text-green-600" : "text-blue-600"}`}>
                  {d.discount_type === "percentage" ? "%" : "$"}
                </span>
              </div>

              {/* Info */}
              <button onClick={() => openEditForm(d)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                  {statusBadge(d)}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {d.discount_type === "percentage" ? t("percentOff", { value: d.discount_value }) : t("fixedOff", { value: d.discount_value })}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {d.applies_to === "all" ? t("allProducts")
                    : d.applies_to === "category" ? t("categoryTarget", { name: d.target_name || "" })
                    : t("productTarget", { name: d.target_name || "" })}
                  {" · "}
                  {formatDateRange(d)}
                </p>
              </button>

              {/* Delete */}
              <button onClick={() => setDeleteId(d.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
