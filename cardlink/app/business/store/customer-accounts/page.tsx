"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Search, Loader2, Mail, Phone, MapPin, DollarSign, ShoppingBag } from "lucide-react";

type CustomerAccount = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  total_orders: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function CustomerAccountsPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formPostal, setFormPostal] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/business/store/customer-accounts?${params}`, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const d = await res.json(); setAccounts(d.accounts ?? []); }
      else setError("Failed to load accounts");
    } catch { setError("Network error"); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setShowForm(false); setFormEmail(""); setFormName(""); setFormPhone(""); setFormStreet(""); setFormCity(""); setFormState(""); setFormCountry(""); setFormPostal(""); };

  const handleCreate = async () => {
    if (!formEmail.trim() || !formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/business/store/customer-accounts", {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({ email: formEmail.trim(), name: formName.trim(), phone: formPhone.trim() || null, street: formStreet.trim() || null, city: formCity.trim() || null, state: formState.trim() || null, country: formCountry.trim() || null, postal_code: formPostal.trim() || null }),
      });
      if (res.ok) { resetForm(); await load(); } else setError("Failed to create account");
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  const totalCustomers = accounts.length;
  const activeCustomers = accounts.filter((a) => a.is_active).length;
  const totalRevenue = accounts.reduce((sum, a) => sum + Number(a.total_spent), 0);

  const filtered = search
    ? accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Accounts</h1>
          <p className="text-xs text-gray-500">{totalCustomers} accounts</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
          <Users className="mx-auto h-5 w-5 text-indigo-500 mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalCustomers}</p>
          <p className="text-[10px] text-gray-500">Total</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
          <Users className="mx-auto h-5 w-5 text-green-500 mb-1" />
          <p className="text-lg font-bold text-gray-800">{activeCustomers}</p>
          <p className="text-[10px] text-gray-500">Active</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
          <DollarSign className="mx-auto h-5 w-5 text-amber-500 mb-1" />
          <p className="text-lg font-bold text-gray-800">${totalRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">Revenue</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="w-full rounded-lg border border-gray-100 pl-10 px-3 py-2 text-sm" />
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New Customer Account</h3>
          <div className="grid grid-cols-2 gap-2">
            <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email *" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name *" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <input value={formStreet} onChange={(e) => setFormStreet(e.target.value)} placeholder="Street" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="City" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formState} onChange={(e) => setFormState(e.target.value)} placeholder="State" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={formCountry} onChange={(e) => setFormCountry(e.target.value)} placeholder="Country" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
            <input value={formPostal} onChange={(e) => setFormPostal(e.target.value)} placeholder="Postal Code" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-600">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !formEmail.trim() || !formName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No customer accounts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-gray-500"><Mail className="h-3 w-3" />{a.email}</span>
                    {a.phone && <span className="flex items-center gap-1 text-[10px] text-gray-500"><Phone className="h-3 w-3" />{a.phone}</span>}
                    {a.city && <span className="flex items-center gap-1 text-[10px] text-gray-500"><MapPin className="h-3 w-3" />{a.city}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{a.total_orders} orders</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(a.total_spent).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
