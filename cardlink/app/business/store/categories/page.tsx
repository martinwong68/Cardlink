"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function StoreCategoriesPage() {
  const t = useTranslations("businessStore.categories");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [editing, setEditing] = useState<string | null>(null); // null = new, id = editing
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteProductCount, setDeleteProductCount] = useState(0);

  const loadCategories = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data: cats } = await supabase
      .from("store_categories")
      .select("id, name, slug, description, icon, sort_order, is_active")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true });

    if (!cats) { setLoading(false); return; }

    // Get product counts per category
    const ids = cats.map((c) => c.id);
    let countsMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: products } = await supabase
        .from("store_products")
        .select("category_id")
        .eq("company_id", companyId)
        .in("category_id", ids);
      if (products) {
        products.forEach((p) => {
          const cid = p.category_id as string;
          countsMap[cid] = (countsMap[cid] || 0) + 1;
        });
      }
    }

    setCategories(cats.map((c) => ({ ...c, product_count: countsMap[c.id] || 0 })) as Category[]);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadCategories();
  }, [companyId, companyLoading, loadCategories]);

  const openNewForm = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormIcon("");
    setShowForm(true);
  };

  const openEditForm = (cat: Category) => {
    setEditing(cat.id);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormIcon(cat.icon || "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!companyId || !formName.trim()) return;
    setSaving(true);
    setMessage(null);

    const slug = slugify(formName);
    const payload = {
      company_id: companyId,
      name: formName.trim(),
      slug,
      description: formDescription.trim() || null,
      icon: formIcon.trim() || null,
    };

    if (editing) {
      const { error } = await supabase
        .from("store_categories")
        .update({ name: payload.name, slug, description: payload.description, icon: payload.icon })
        .eq("id", editing);
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    } else {
      const maxSort = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("store_categories")
        .insert({ ...payload, sort_order: maxSort });
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    }

    setSaving(false);
    setMessage({ type: "success", text: t("saved") });
    closeForm();
    void loadCategories();
  };

  const toggleActive = async (cat: Category) => {
    await supabase.from("store_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("store_categories").delete().eq("id", deleteId);
    setDeleteId(null);
    setMessage({ type: "success", text: t("deleted") });
    void loadCategories();
  };

  const confirmDelete = (cat: Category) => {
    setDeleteId(cat.id);
    setDeleteProductCount(cat.product_count);
  };

  const moveSortOrder = async (cat: Category, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const other = categories[swapIdx];
    await Promise.all([
      supabase.from("store_categories").update({ sort_order: other.sort_order }).eq("id", cat.id),
      supabase.from("store_categories").update({ sort_order: cat.sort_order }).eq("id", other.id),
    ]);
    void loadCategories();
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
          <Plus className="h-3.5 w-3.5" /> {t("addCategory")}
        </button>
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="app-card rounded-2xl border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">{t("deleteConfirm")}</p>
          {deleteProductCount > 0 && (
            <p className="text-xs text-red-600">{t("deleteWarning", { count: deleteProductCount })}</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setDeleteId(null)} className="app-secondary-btn flex-1 text-xs">{t("cancelDelete")}</button>
            <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 transition">{t("confirmDelete")}</button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{editing ? t("editCategory") : t("addCategory")}</h2>

          <div>
            <label className="text-xs font-medium text-gray-600">{t("nameLabel")}</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("namePlaceholder")} className="app-input mt-1 w-full" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t("descriptionLabel")}</label>
            <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} className="app-input mt-1 w-full" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t("iconLabel")}</label>
            <input type="text" value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder={t("iconPlaceholder")} className="app-input mt-1 w-20" maxLength={4} />
          </div>

          {message && (
            <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
          )}

          <div className="flex gap-2">
            <button onClick={closeForm} className="app-secondary-btn flex-1 text-sm">{t("cancel")}</button>
            <button onClick={handleSave} disabled={saving || !formName.trim()} className="app-primary-btn flex-1 text-sm disabled:opacity-50">
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}

      {/* Category List */}
      {categories.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl">
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div key={cat.id} className="app-card flex items-center gap-3 rounded-2xl px-4 py-3">
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg">
                {cat.icon || "📁"}
              </div>

              {/* Info */}
              <button onClick={() => openEditForm(cat)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                {cat.description && <p className="text-xs text-gray-400 truncate">{cat.description}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{t("productCount", { count: cat.product_count })}</p>
              </button>

              {/* Sort arrows */}
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveSortOrder(cat, "up")} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => moveSortOrder(cat, "down")} disabled={idx === categories.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => toggleActive(cat)}
                className={`h-5 w-9 rounded-full transition-colors ${cat.is_active ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>

              {/* Delete */}
              <button onClick={() => confirmDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
