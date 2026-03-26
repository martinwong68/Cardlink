"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, Plus, Trash2, Loader2, Upload, X,
  Package, Calendar, HardDrive, AlertTriangle,
} from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";
import ImportFromItems from "@/components/business/ImportFromItems";

const IMAGE_MAX_DIMENSION = 1024;
const IMAGE_JPEG_QUALITY = 0.8;

type ProductType = "physical" | "service" | "digital";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  product_type: ProductType;
  sku: string | null;
  stock_quantity: number | null;
  weight: number | null;
  duration_minutes: number | null;
  file_url: string | null;
  images: string[];
  is_active: boolean;
  category_id: string | null;
  category_name?: string;
  visibility: "public" | "all_users" | "members_only";
};

type CategoryOption = { id: string; name: string };

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current ? "w-6 bg-indigo-600" : i + 1 < current ? "w-2 bg-indigo-400" : "w-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

async function compressImage(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = objectUrl;
    });
    const longestSide = Math.max(image.width, image.height);
    const scale = longestSide > IMAGE_MAX_DIMENSION ? IMAGE_MAX_DIMENSION / longestSide : 1;
    const w = Math.max(1, Math.round(image.width * scale));
    const h = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to process image.");
    ctx.drawImage(image, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression failed."))), "image/jpeg", IMAGE_JPEG_QUALITY);
    });
    return new File([blob], `product-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function StoreProductsPage() {
  const t = useTranslations("businessStore.products");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formType, setFormType] = useState<ProductType>("physical");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formComparePrice, setFormComparePrice] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formAvailability, setFormAvailability] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formNewImages, setFormNewImages] = useState<File[]>([]);
  const [formCategory, setFormCategory] = useState<string>("");
  const [formVisibility, setFormVisibility] = useState<"public" | "all_users" | "members_only">("public");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Active discount info per product
  const [productDiscounts, setProductDiscounts] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const [productsRes, catsRes, discountsRes] = await Promise.all([
      supabase.from("store_products")
        .select("id, name, slug, description, price, compare_at_price, product_type, sku, stock_quantity, weight, duration_minutes, file_url, images, is_active, category_id, visibility")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("store_categories")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("store_discounts")
        .select("id, applies_to, target_id")
        .eq("company_id", companyId)
        .eq("is_active", true),
    ]);

    const cats = (catsRes.data ?? []) as CategoryOption[];
    setCategories(cats);
    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    const prods = ((productsRes.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images : [],
      category_name: p.category_id ? catMap.get(p.category_id as string) ?? undefined : undefined,
    })) as Product[];
    setProducts(prods);

    // Build discount lookup
    const discMap: Record<string, boolean> = {};
    const discounts = discountsRes.data ?? [];
    discounts.forEach((d) => {
      const appliesTo = d.applies_to as string;
      if (appliesTo === "all") prods.forEach((p) => { discMap[p.id] = true; });
      else if (appliesTo === "category") {
        prods.filter((p) => p.category_id === (d.target_id as string)).forEach((p) => { discMap[p.id] = true; });
      } else if (appliesTo === "product") {
        discMap[d.target_id as string] = true;
      }
    });
    setProductDiscounts(discMap);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && !companyId) { setLoading(false); return; }
    if (companyId) void loadData();
  }, [companyId, companyLoading, loadData]);

  const resetForm = () => {
    setFormStep(1);
    setFormType("physical");
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormComparePrice("");
    setFormSku("");
    setFormStock("");
    setFormWeight("");
    setFormDuration("");
    setFormAvailability("");
    setFormFileUrl("");
    setFormImages([]);
    setFormNewImages([]);
    setFormCategory("");
    setFormVisibility("public");
    setEditingId(null);
    setMessage(null);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleImportFromItems = async (masterItems: { id: string; name: string; sku: string | null; description: string | null; category: string | null; unit_price: number; cost_price: number; unit: string }[]) => {
    if (!companyId) return;
    for (const item of masterItems) {
      const slug = (item.name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now();
      await supabase.from("store_products").insert({
        company_id: companyId,
        name: item.name,
        slug,
        description: item.description || null,
        price: item.unit_price || 0,
        product_type: "physical",
        sku: item.sku || null,
        is_active: true,
        master_item_id: item.id,
      });
    }
    await loadData();
  };

  const openEditForm = (p: Product) => {
    resetForm();
    setEditingId(p.id);
    setFormType(p.product_type);
    setFormName(p.name);
    setFormDescription(p.description || "");
    setFormPrice(String(p.price));
    setFormComparePrice(p.compare_at_price ? String(p.compare_at_price) : "");
    setFormSku(p.sku || "");
    setFormStock(p.stock_quantity != null ? String(p.stock_quantity) : "");
    setFormWeight(p.weight != null ? String(p.weight) : "");
    setFormDuration(p.duration_minutes != null ? String(p.duration_minutes) : "");
    setFormFileUrl(p.file_url || "");
    setFormImages(p.images);
    setFormCategory(p.category_id || "");
    setFormVisibility(p.visibility ?? "public");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); resetForm(); };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const compressed: File[] = [];
    for (const file of Array.from(files)) {
      compressed.push(await compressImage(file));
    }
    setFormNewImages((prev) => [...prev, ...compressed]);
  };

  const removeExistingImage = (idx: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewImage = (idx: number) => {
    setFormNewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!companyId || !formName.trim()) return;
    setSaving(true);
    setMessage(null);

    // Upload new images
    const uploadedUrls: string[] = [...formImages];
    for (const file of formNewImages) {
      const path = `store-products/${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: "image/jpeg" });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    const slug = slugify(formName);
    const payload: Record<string, unknown> = {
      company_id: companyId,
      name: formName.trim(),
      slug,
      description: formDescription.trim() || null,
      price: parseFloat(formPrice) || 0,
      compare_at_price: formComparePrice ? parseFloat(formComparePrice) : null,
      product_type: formType,
      images: uploadedUrls,
      category_id: formCategory || null,
      is_active: true,
      visibility: formVisibility,
      updated_at: new Date().toISOString(),
    };

    if (formType === "physical") {
      payload.sku = formSku.trim() || null;
      payload.stock_quantity = formStock ? parseInt(formStock) : null;
      payload.weight = formWeight ? parseFloat(formWeight) : null;
    } else if (formType === "service") {
      payload.duration_minutes = formDuration ? parseInt(formDuration) : null;
    } else if (formType === "digital") {
      payload.file_url = formFileUrl.trim() || null;
    }

    if (editingId) {
      const { error } = await supabase.from("store_products").update(payload).eq("id", editingId);
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("store_products").insert(payload);
      if (error) { setMessage({ type: "error", text: t("error") }); setSaving(false); return; }
    }

    setSaving(false);
    setMessage({ type: "success", text: t("saved") });
    closeForm();
    void loadData();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from("store_products").update({ is_active: !p.is_active }).eq("id", p.id);
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("store_products").delete().eq("id", deleteId);
    setDeleteId(null);
    setMessage({ type: "success", text: t("deleted") });
    void loadData();
  };

  const filtered = filterCategory === "all"
    ? products
    : products.filter((p) => p.category_id === filterCategory);

  const typeBadge = (type: ProductType) => {
    const colors = {
      physical: "bg-blue-100 text-blue-700",
      service: "bg-teal-100 text-teal-700",
      digital: "bg-purple-100 text-purple-700",
    };
    const labels = { physical: t("typePhysical"), service: t("typeService"), digital: t("typeDigital") };
    return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[type]}`}>{labels[type]}</span>;
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
        <div className="flex items-center gap-2">
          <ImportFromItems onImport={handleImportFromItems} />
          <button onClick={openNewForm} className="app-primary-btn flex items-center gap-1.5 text-xs px-3 py-2">
            <Plus className="h-3.5 w-3.5" /> {t("addProduct")}
          </button>
        </div>
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

      {/* Product Form (multi-page) */}
      {showForm && (
        <div className="app-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">{editingId ? t("editProduct") : t("addProduct")}</h2>
          <StepDots current={formStep} total={3} />

          {/* Step 1: Type + Basics */}
          {formStep === 1 && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-gray-600">{t("step1Title")}</p>

              {/* Type selection */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: "physical" as const, icon: Package, label: t("typePhysical"), desc: t("typePhysicalDesc") },
                  { type: "service" as const, icon: Calendar, label: t("typeService"), desc: t("typeServiceDesc") },
                  { type: "digital" as const, icon: HardDrive, label: t("typeDigital"), desc: t("typeDigitalDesc") },
                ]).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      onClick={() => setFormType(opt.type)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition ${
                        formType === opt.type ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${formType === opt.type ? "text-indigo-600" : "text-gray-400"}`} />
                      <span className="text-xs font-semibold text-gray-800">{opt.label}</span>
                      <span className="text-[10px] text-gray-400 text-center">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">{t("nameLabel")}</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("namePlaceholder")} className="app-input mt-1 w-full" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">{t("descriptionLabel")}</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} rows={3} className="app-input mt-1 w-full resize-none" />
              </div>

              <button onClick={() => setFormStep(2)} disabled={!formName.trim()} className="app-primary-btn w-full disabled:opacity-50">{t("next")}</button>
            </div>
          )}

          {/* Step 2: Type-specific details */}
          {formStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-gray-600">{t("step2Title")}</p>

              <div>
                <label className="text-xs font-medium text-gray-600">{t("priceLabel")}</label>
                <input type="number" step="0.01" min="0" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="app-input mt-1 w-full" />
              </div>

              {formType === "physical" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{t("compareAtPriceLabel")}</label>
                    <p className="text-[10px] text-gray-400">{t("compareAtPriceHint")}</p>
                    <input type="number" step="0.01" min="0" value={formComparePrice} onChange={(e) => setFormComparePrice(e.target.value)} className="app-input mt-1 w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">{t("skuLabel")}</label>
                      <input type="text" value={formSku} onChange={(e) => setFormSku(e.target.value)} placeholder={t("skuPlaceholder")} className="app-input mt-1 w-full" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">{t("stockLabel")}</label>
                      <input type="number" min="0" value={formStock} onChange={(e) => setFormStock(e.target.value)} className="app-input mt-1 w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{t("weightLabel")}</label>
                    <input type="number" step="0.01" min="0" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} className="app-input mt-1 w-full" />
                  </div>
                </>
              )}

              {formType === "service" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{t("durationLabel")}</label>
                    <input type="number" min="1" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} className="app-input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">{t("availabilityNotesLabel")}</label>
                    <textarea value={formAvailability} onChange={(e) => setFormAvailability(e.target.value)} placeholder={t("availabilityNotesPlaceholder")} rows={2} className="app-input mt-1 w-full resize-none" />
                  </div>
                </>
              )}

              {formType === "digital" && (
                <div>
                  <label className="text-xs font-medium text-gray-600">{t("fileUrlLabel")}</label>
                  <input type="url" value={formFileUrl} onChange={(e) => setFormFileUrl(e.target.value)} placeholder={t("fileUrlPlaceholder")} className="app-input mt-1 w-full" />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setFormStep(1)} className="app-secondary-btn flex-1">{t("back")}</button>
                <button onClick={() => setFormStep(3)} className="app-primary-btn flex-1">{t("next")}</button>
              </div>
            </div>
          )}

          {/* Step 3: Images + Category */}
          {formStep === 3 && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-gray-600">{t("step3Title")}</p>

              {/* Images */}
              <div>
                <label className="text-xs font-medium text-gray-600">{t("imagesLabel")}</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formImages.map((url, idx) => (
                    <div key={url} className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeExistingImage(idx)} className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {formNewImages.map((file, idx) => (
                    <div key={file.name + idx} className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                      <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeNewImage(idx)} className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 transition"
                  >
                    <Upload className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-600">{t("categoryLabel")}</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="app-input mt-1 w-full">
                  <option value="">{t("noCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="text-xs font-medium text-gray-600">{t("visibilityLabel")}</label>
                <select value={formVisibility} onChange={(e) => setFormVisibility(e.target.value as "public" | "all_users" | "members_only")} className="app-input mt-1 w-full">
                  <option value="public">{t("visibilityPublic")}</option>
                  <option value="all_users">{t("visibilityAllUsers")}</option>
                  <option value="members_only">{t("visibilityMembersOnly")}</option>
                </select>
              </div>

              {message && (
                <p className={`text-xs ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setFormStep(2)} className="app-secondary-btn flex-1">{t("back")}</button>
                <button onClick={handleSave} disabled={saving} className="app-primary-btn flex-1 disabled:opacity-50">
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </div>
          )}

          {!saving && <button onClick={closeForm} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">{t("cancel")}</button>}
        </div>
      )}

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${filterCategory === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t("allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${filterCategory === c.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl">
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="app-card flex items-center gap-3 rounded-2xl px-4 py-3">
              {/* Thumbnail */}
              <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 overflow-hidden">
                {p.images.length > 0 ? (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-5 w-5 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <button onClick={() => openEditForm(p)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  {productDiscounts[p.id] && (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-medium text-green-700">%</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-gray-700">${p.price.toFixed(2)}</span>
                  {typeBadge(p.product_type)}
                  {p.category_name && <span className="text-[10px] text-gray-400">{p.category_name}</span>}
                </div>
                {p.product_type === "physical" && p.stock_quantity != null && (
                  <p className={`text-[10px] mt-0.5 ${p.stock_quantity <= 5 ? "text-orange-600 font-medium" : "text-gray-400"}`}>
                    {p.stock_quantity <= 5 ? (
                      <span className="flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />{t("lowStock", { count: p.stock_quantity })}</span>
                    ) : (
                      t("inStock", { count: p.stock_quantity })
                    )}
                  </p>
                )}
              </button>

              {/* Active toggle */}
              <button
                onClick={() => toggleActive(p)}
                className={`h-5 w-9 shrink-0 rounded-full transition-colors ${p.is_active ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${p.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>

              {/* Delete */}
              <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
