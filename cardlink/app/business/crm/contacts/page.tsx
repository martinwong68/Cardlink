"use client";

import { useEffect, useState, useCallback } from "react";

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  crm_company_name: string | null;
  job_title: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_postal_code: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
};

export default function CrmContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/contacts", { headers: { "x-cardlink-app-scope": "business" }, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setContacts(data.contacts ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const resetForm = () => { setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCompany(""); setJobTitle(""); setStreet(""); setCity(""); setState(""); setCountry(""); setPostalCode(""); setNotes(""); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (c: Contact) => {
    setFirstName(c.first_name); setLastName(c.last_name ?? ""); setEmail(c.email ?? ""); setPhone(c.phone ?? "");
    setCompany(c.crm_company_name ?? ""); setJobTitle(c.job_title ?? "");
    setStreet(c.address_street ?? ""); setCity(c.address_city ?? ""); setState(c.address_state ?? "");
    setCountry(c.address_country ?? ""); setPostalCode(c.address_postal_code ?? "");
    setNotes(c.notes ?? ""); setEditId(c.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    const payload = {
      first_name: firstName.trim(), last_name: lastName.trim() || null,
      email: email.trim() || null, phone: phone.trim() || null,
      crm_company_name: company.trim() || null, job_title: jobTitle.trim() || null,
      address_street: street.trim() || null, address_city: city.trim() || null,
      address_state: state.trim() || null, address_country: country.trim() || null,
      address_postal_code: postalCode.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (editId) { await fetch(`/api/crm/contacts/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/crm/contacts", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await loadContacts();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/crm/contacts/${id}`, { method: "DELETE", headers });
    await loadContacts();
  };

  const handleExportCSV = () => {
    window.open("/api/crm/contacts?format=csv", "_blank");
  };

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.crm_company_name ?? "").toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading contacts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Contacts</h1>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Contact</button>
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{editId ? "Edit Contact" : "New Contact"}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-500">First Name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-500">Last Name</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Job Title</label><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>

            {/* Address section */}
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Address</p>
              <div className="space-y-2">
                <div><input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal Code" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <div><label className="mb-1 block text-xs font-medium text-gray-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !firstName.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">No contacts</p>
          <p className="text-xs text-gray-400">Add your first CRM contact.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => {
            const colors = ["#6366F1", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981"];
            const color = colors[i % colors.length];
            const addressParts = [c.address_city, c.address_state, c.address_country].filter(Boolean);
            return (
            <div key={c.id} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
              <button onClick={() => openEdit(c)} className="flex flex-1 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: color }}>
                  {c.first_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-gray-500">{c.job_title ?? ""}{c.job_title && c.crm_company_name ? " · " : ""}{c.crm_company_name ?? ""}</p>
                  {addressParts.length > 0 && <p className="text-xs text-gray-400">{addressParts.join(", ")}</p>}
                </div>
              </button>
              <div className="flex items-center gap-2">
                {c.tags && c.tags.length > 0 && (
                  <div className="flex gap-1">
                    {c.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{tag}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => handleDelete(c.id)} className="rounded-lg bg-rose-50 p-1.5 text-xs text-rose-600 hover:bg-rose-100" title="Delete">
                  ✕
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
