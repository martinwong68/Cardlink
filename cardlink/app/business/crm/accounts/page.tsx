"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Loader2 } from "lucide-react";

type Account = {
  id: string;
  account_name: string;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  is_active: boolean;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

export default function CrmAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  const [accountName, setAccountName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/accounts", { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setAccounts(data.accounts ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const resetForm = () => {
    setAccountName(""); setIndustry(""); setCompanySize(""); setWebsite("");
    setPhone(""); setEmail(""); setStreet(""); setCity(""); setAddrState("");
    setCountry(""); setPostalCode("");
  };

  const handleSubmit = async () => {
    if (!accountName.trim()) return;
    setSaving(true);
    const payload = {
      account_name: accountName.trim(), industry: industry.trim() || null,
      company_size: companySize.trim() || null, website: website.trim() || null,
      phone: phone.trim() || null, email: email.trim() || null,
      street: street.trim() || null, city: city.trim() || null,
      state: addrState.trim() || null, country: country.trim() || null,
      postal_code: postalCode.trim() || null,
    };
    try {
      await fetch("/api/crm/accounts", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadAccounts();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const industries = [...new Set(accounts.map((a) => a.industry).filter(Boolean))] as string[];

  const filtered = accounts.filter((a) => {
    if (search && !a.account_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (industryFilter && a.industry !== industryFilter) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">CRM Accounts</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Account</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by account name…" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
          <option value="">All industries</option>
          {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Account</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Account Name</label><input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Industry</label><input value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Company Size</label><input value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="e.g. 50-100" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Website</label><input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="https://…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Address</p>
              <div className="space-y-2">
                <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                  <input value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="State" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal Code" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !accountName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <Building2 className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No accounts found</p>
          <p className="text-xs text-gray-400">Add your first CRM account.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                {a.account_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{a.account_name}</p>
                  {a.industry && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{a.industry}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{a.is_active ? "Active" : "Inactive"}</span>
                </div>
                <p className="text-xs text-gray-500">{[a.email, a.phone, a.city].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
