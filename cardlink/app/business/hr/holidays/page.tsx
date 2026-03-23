"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarHeart,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Holiday = {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
};

export default function HolidaysPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [recurring, setRecurring] = useState(false);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("hr_holidays")
      .select("*")
      .eq("company_id", companyId)
      .order("date");
    setHolidays((data as Holiday[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const resetForm = () => {
    setName("");
    setDate("");
    setRecurring(false);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (h: Holiday) => {
    setEditingId(h.id);
    setName(h.name);
    setDate(h.date);
    setRecurring(h.recurring);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!companyId || !name.trim() || !date) return;
    setSaving(true);
    const payload = { name: name.trim(), date, recurring };

    if (editingId) {
      await supabase.from("hr_holidays")
        .update(payload)
        .eq("id", editingId).eq("company_id", companyId);
    } else {
      await supabase.from("hr_holidays")
        .insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    resetForm();
    void loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hr_holidays").delete().eq("id", id).eq("company_id", companyId);
    setDeleteConfirm(null);
    void loadData();
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
              {editingId ? t("holidays.editTitle") : t("holidays.addTitle")}
            </h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("holidays.fields.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("holidays.fields.namePlaceholder")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("holidays.fields.date")}</label>
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded border-gray-300" />
            {t("holidays.fields.recurring")}
          </label>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim() || !date} className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
          {saving ? t("holidays.saving") : t("holidays.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">{t("brand")}</p>
          <h1 className="app-title mt-1 text-xl font-semibold">{t("holidays.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("holidays.add")}
        </button>
      </div>

      {holidays.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 mb-4">
            <CalendarHeart className="h-6 w-6 text-rose-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("holidays.emptyTitle")}</h2>
          <p className="text-sm text-gray-400">{t("holidays.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holidays.map((h) => (
            <div key={h.id} className="app-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-sm font-bold">
                <CalendarHeart className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{h.date}</span>
                  {h.recurring && (
                    <span className="flex items-center gap-0.5 text-purple-600">
                      <RotateCcw className="h-3 w-3" /> {t("holidays.recurring")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {deleteConfirm === h.id ? (
                  <button onClick={() => handleDelete(h.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                    {t("holidays.confirmDelete")}
                  </button>
                ) : (
                  <button onClick={() => setDeleteConfirm(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
