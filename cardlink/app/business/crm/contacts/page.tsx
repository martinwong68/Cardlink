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
  address: string | null;
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
  const [address, setAddress] = useState("");
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

  const resetForm = () => { setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCompany(""); setJobTitle(""); setAddress(""); setNotes(""); setEditId(null); };

  const openCreate = () => { resetForm(); setShowForm(true); };
  const openEdit = (c: Contact) => {
    setFirstName(c.first_name); setLastName(c.last_name ?? ""); setEmail(c.email ?? ""); setPhone(c.phone ?? "");
    setCompany(c.crm_company_name ?? ""); setJobTitle(c.job_title ?? ""); setAddress(c.address ?? ""); setNotes(c.notes ?? "");
    setEditId(c.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) return;
    setSaving(true);
    const payload = { first_name: firstName.trim(), last_name: lastName.trim() || null, email: email.trim() || null, phone: phone.trim() || null, crm_company_name: company.trim() || null, job_title: jobTitle.trim() || null, address: address.trim() || null, notes: notes.trim() || null };
    try {
      if (editId) { await fetch(`/api/crm/contacts/${editId}`, { method: "PATCH", headers, body: JSON.stringify(payload) }); }
      else { await fetch("/api/crm/contacts", { method: "POST", headers, body: JSON.stringify(payload) }); }
      setShowForm(false); resetForm(); await loadContacts();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) || (c.crm_company_name ?? "").toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-neutral-500">Loading contacts…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Contacts</h1>
        <button onClick={openCreate} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ Add Contact</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" />

      {showForm && (
        <div className="rounded-xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-neutral-900">{editId ? "Edit Contact" : "New Contact"}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">First Name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-neutral-500">Last Name</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Job Title</label><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-neutral-500">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-neutral-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-xl border border-neutral-100 py-2.5 text-sm font-medium text-neutral-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !firstName.trim()} className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="text-sm font-medium text-neutral-500">No contacts</p>
          <p className="text-xs text-neutral-400">Add your first CRM contact.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => openEdit(c)} className="w-full rounded-xl border border-neutral-100 bg-white p-4 text-left transition hover:bg-neutral-50">
              <p className="text-sm font-bold text-neutral-900">{c.first_name} {c.last_name}</p>
              <p className="text-xs text-neutral-500">{c.crm_company_name ?? "—"} · {c.job_title ?? ""}</p>
              <div className="mt-1 flex gap-3">
                {c.email && <span className="text-xs text-purple-500">{c.email}</span>}
                {c.phone && <span className="text-xs text-neutral-500">{c.phone}</span>}
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {c.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{tag}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
