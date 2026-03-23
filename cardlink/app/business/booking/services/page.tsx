"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
  max_concurrent: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  min_notice_hours: number;
  max_advance_days: number;
  image_url: string | null;
  sort_order: number;
};

export default function BookingServicesPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState("1");
  const [bufferBefore, setBufferBefore] = useState("0");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [minNotice, setMinNotice] = useState("0");
  const [maxAdvance, setMaxAdvance] = useState("90");

  const loadServices = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("booking_services")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    setServices((data as Service[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadServices();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadServices]);

  const resetForm = () => {
    setName(""); setDescription(""); setDuration("60");
    setPrice(""); setCategory(""); setMaxConcurrent("1");
    setBufferBefore("0"); setBufferAfter("0"); setMinNotice("0"); setMaxAdvance("90");
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setName(s.name); setDescription(s.description ?? "");
    setDuration(String(s.duration_minutes)); setPrice(String(s.price));
    setCategory(s.category ?? ""); setMaxConcurrent(String(s.max_concurrent));
    setBufferBefore(String(s.buffer_before_mins ?? 0)); setBufferAfter(String(s.buffer_after_mins ?? 0));
    setMinNotice(String(s.min_notice_hours ?? 0)); setMaxAdvance(String(s.max_advance_days ?? 90));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!companyId || !name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description || null,
      duration_minutes: Number(duration) || 60,
      price: Number(price) || 0,
      category: category || null,
      max_concurrent: Number(maxConcurrent) || 1,
      buffer_before_mins: Number(bufferBefore) || 0,
      buffer_after_mins: Number(bufferAfter) || 0,
      min_notice_hours: Number(minNotice) || 0,
      max_advance_days: Number(maxAdvance) || 90,
    };

    if (editingId) {
      await supabase.from("booking_services")
        .update(payload).eq("id", editingId).eq("company_id", companyId);
    } else {
      await supabase.from("booking_services")
        .insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    resetForm();
    void loadServices();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("booking_services").delete().eq("id", id).eq("company_id", companyId);
    setDeleteConfirm(null);
    void loadServices();
  };

  const toggleActive = async (s: Service) => {
    await supabase.from("booking_services")
      .update({ is_active: !s.is_active }).eq("id", s.id).eq("company_id", companyId);
    void loadServices();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">{t("brand")}</p>
            <h1 className="app-title mt-1 text-xl font-semibold">
              {editingId ? t("services.editTitle") : t("services.addTitle")}
            </h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("services.fields.namePlaceholder")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.description")}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.duration")}</label>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" min="5" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.price")}</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.category")}</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.maxConcurrent")}</label>
            <input value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} type="number" min="1" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.bufferBefore")}</label>
              <input value={bufferBefore} onChange={(e) => setBufferBefore(e.target.value)} type="number" min="0" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.bufferAfter")}</label>
              <input value={bufferAfter} onChange={(e) => setBufferAfter(e.target.value)} type="number" min="0" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.minNotice")}</label>
              <input value={minNotice} onChange={(e) => setMinNotice(e.target.value)} type="number" min="0" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("services.fields.maxAdvance")}</label>
              <input value={maxAdvance} onChange={(e) => setMaxAdvance(e.target.value)} type="number" min="1" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()} className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
          {saving ? t("services.saving") : t("services.save")}
        </button>
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
          <h1 className="app-title mt-1 text-xl font-semibold">{t("services.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("services.add")}
        </button>
      </div>

      {services.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <ClipboardList className="h-8 w-8 text-gray-300 mb-3" />
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("services.emptyTitle")}</h2>
          <p className="text-sm text-gray-400">{t("services.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className={`app-card flex items-center gap-3 p-4 ${!svc.is_active ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{svc.name}</p>
                  {svc.category && (
                    <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-0.5 text-[10px] font-medium">{svc.category}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {svc.duration_minutes} {t("services.mins")} · ${svc.price.toFixed(2)}
                </p>
              </div>
              <button onClick={() => toggleActive(svc)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                {svc.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => openEdit(svc)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              {deleteConfirm === svc.id ? (
                <button onClick={() => handleDelete(svc.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                  {t("services.confirmDelete")}
                </button>
              ) : (
                <button onClick={() => setDeleteConfirm(svc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
