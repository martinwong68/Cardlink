"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Search, Loader2, Users, Mail, Phone, DollarSign, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
};

const HEADERS = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function StoreCustomersPage() {
  const t = useTranslations("businessStore.customers");
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/business/store/customers?${params}`, {
        headers: { "x-cardlink-app-scope": "business" }, cache: "no-store",
      });
      if (res.ok) { const d = await res.json(); setCustomers(d.customers ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [searchQuery]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = { name: formName.trim(), email: formEmail.trim() || null, phone: formPhone.trim() || null };
      if (editingId) {
        await fetch(`/api/business/store/customers/${editingId}`, { method: "PATCH", headers: HEADERS, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/business/store/customers", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      }
      resetForm();
      await load();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/business/store/customers/${id}`, { method: "DELETE", headers: HEADERS });
    await load();
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormEmail(c.email ?? "");
    setFormPhone(c.phone ?? "");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
  };

  const exportCsv = () => {
    window.open("/api/business/store/customers?format=csv", "_blank");
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
        <button onClick={exportCsv} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition">
          CSV
        </button>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
          {t("addCustomer")}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="app-input w-full pl-10" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="app-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{editingId ? t("editCustomer") : t("addCustomer")}</h3>
          <div>
            <label className="text-xs font-medium text-gray-600">{t("nameLabel")}</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t("namePlaceholder")} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">{t("emailLabel")}</label>
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder={t("emailPlaceholder")} className="app-input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">{t("phoneLabel")}</label>
            <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder={t("phonePlaceholder")} className="app-input mt-1 w-full" />
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">{t("cancel")}</button>
            <button onClick={handleSave} disabled={saving || !formName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? t("saving") : t("save")}</button>
          </div>
        </div>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-12 px-4">
          <Users className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <div key={c.id} className="app-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {c.email && <span className="flex items-center gap-1 text-[10px] text-gray-400"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1 text-[10px] text-gray-400"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 transition">{t("edit")}</button>
                  <button onClick={() => handleDelete(c.id)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 transition">{t("delete")}</button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{t("ordersCount", { count: c.total_orders })}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(c.total_spent).toFixed(2)}</span>
                {c.last_order_at && <span className="text-[10px] text-gray-400">{t("lastOrder")}: {new Date(c.last_order_at).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
