"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  Edit2,
  Trash2,
  Search,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  total_bookings: number;
  total_spent: number;
  last_visit_date: string | null;
};

export default function BookingCustomersPage() {
  const t = useTranslations("businessBooking");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const loadCustomers = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("booking_customers")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadCustomers();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadCustomers]);

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setNotes("");
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name); setEmail(c.email ?? ""); setPhone(c.phone ?? ""); setNotes(c.notes ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!companyId || !name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    };

    if (editingId) {
      await supabase.from("booking_customers")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId).eq("company_id", companyId);
    } else {
      await supabase.from("booking_customers")
        .insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    resetForm();
    void loadCustomers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("booking_customers").delete().eq("id", id).eq("company_id", companyId);
    setDeleteConfirm(null);
    void loadCustomers();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const filtered = searchQuery
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery)
      )
    : customers;

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
              {editingId ? t("customers.editTitle") : t("customers.addTitle")}
            </h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("customers.fields.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("customers.fields.email")}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("customers.fields.phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("customers.fields.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()} className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
          {saving ? t("customers.saving") : t("customers.save")}
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
          <h1 className="app-title mt-1 text-xl font-semibold">{t("customers.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("customers.add")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("customers.searchPlaceholder")}
          className="app-input w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <Users className="h-8 w-8 text-gray-300 mb-3" />
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("customers.emptyTitle")}</h2>
          <p className="text-sm text-gray-400">{t("customers.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="app-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span>{c.total_bookings} {t("customers.bookings")}</span>
                    <span>·</span>
                    <span>${c.total_spent.toFixed(2)} {t("customers.spent")}</span>
                    {c.last_visit_date && (
                      <>
                        <span>·</span>
                        <span>{t("customers.lastVisit")}: {c.last_visit_date}</span>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {deleteConfirm === c.id ? (
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                    {t("customers.confirmDelete")}
                  </button>
                ) : (
                  <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
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
