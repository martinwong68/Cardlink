"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Loader2, ExternalLink, AlertTriangle } from "lucide-react";

type Document = {
  id: string;
  employee_id: string;
  document_type: string;
  title: string;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
};

const HEADERS: Record<string, string> = { "content-type": "application/json", "x-cardlink-app-scope": "business" };

const DOC_TYPES = ["contract", "id_card", "passport", "certificate", "medical", "other"] as const;

const TYPE_COLORS: Record<string, string> = {
  contract: "bg-indigo-100 text-indigo-700",
  id_card: "bg-sky-100 text-sky-700",
  passport: "bg-amber-100 text-amber-700",
  certificate: "bg-emerald-100 text-emerald-700",
  medical: "bg-rose-100 text-rose-700",
  other: "bg-gray-100 text-gray-600",
};

export default function EmployeeDocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterType, setFilterType] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [docType, setDocType] = useState<string>("contract");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterEmployee) params.set("employee_id", filterEmployee);
      if (filterType) params.set("document_type", filterType);
      const qs = params.toString();
      const url = `/api/business/hr/employee-documents${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      if (res.ok) { const data = await res.json(); setDocs(data.documents ?? []); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filterEmployee, filterType]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const resetForm = () => { setEmployeeId(""); setDocType("contract"); setTitle(""); setFileUrl(""); setExpiryDate(""); };

  const handleSubmit = async () => {
    if (!employeeId.trim() || !title.trim()) return;
    setSaving(true);
    const payload = {
      employee_id: employeeId.trim(), document_type: docType,
      title: title.trim(), file_url: fileUrl.trim() || null, expiry_date: expiryDate || null,
    };
    try {
      await fetch("/api/business/hr/employee-documents", { method: "POST", headers: HEADERS, body: JSON.stringify(payload) });
      setShowForm(false); resetForm(); await loadDocs();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Employee Documents</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add Document</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} placeholder="Filter by employee ID…" className="rounded-lg border border-gray-100 px-3 py-2 text-sm" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
          <option value="">All types</option>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">New Document</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Employee ID</label><input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Document Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm">
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">File URL</label><input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} type="url" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" placeholder="https://…" /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Expiry Date</label><input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date" className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm" /></div>
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !employeeId.trim() || !title.trim()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No documents found</p>
          <p className="text-xs text-gray-400">Upload an employee document to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{d.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[d.document_type] ?? "bg-gray-100 text-gray-600"}`}>{d.document_type.replace("_", " ")}</span>
                </div>
                <p className="text-xs text-gray-500">Employee: {d.employee_id}</p>
                {d.expiry_date && (
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${isExpired(d.expiry_date) ? "font-semibold text-rose-600" : "text-gray-400"}`}>
                    {isExpired(d.expiry_date) && <AlertTriangle className="h-3 w-3" />}
                    Expires: {d.expiry_date}
                  </p>
                )}
              </div>
              {d.file_url && (
                <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
