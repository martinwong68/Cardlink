"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  ArrowLeft,
  Loader2,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Document = {
  id: string;
  employee_id: string;
  name: string;
  doc_type: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
};

type Employee = {
  id: string;
  full_name: string;
};

export default function DocumentsPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // Form fields
  const [employeeId, setEmployeeId] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("contract");
  const [fileUrl, setFileUrl] = useState("");

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [empRes] = await Promise.all([
      supabase
        .from("hr_employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .order("full_name"),
    ]);
    setEmployees((empRes.data as Employee[]) ?? []);

    // Load documents for selected employee or all
    if (selectedEmployee) {
      const { data } = await supabase
        .from("hr_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", selectedEmployee)
        .order("created_at", { ascending: false });
      setDocuments((data as Document[]) ?? []);
    } else {
      const { data } = await supabase
        .from("hr_documents")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setDocuments((data as Document[]) ?? []);
    }
    setLoading(false);
  }, [companyId, supabase, selectedEmployee]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadData();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadData]);

  const handleSubmit = async () => {
    if (!companyId || !employeeId || !docName.trim() || !fileUrl.trim()) return;
    setSaving(true);
    await supabase.from("hr_documents").insert({
      company_id: companyId,
      employee_id: employeeId,
      name: docName.trim(),
      doc_type: docType,
      file_url: fileUrl.trim(),
    });
    setSaving(false);
    setShowForm(false);
    setDocName("");
    setFileUrl("");
    setDocType("contract");
    setEmployeeId("");
    void loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hr_documents").delete().eq("id", id).eq("company_id", companyId);
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

  const docTypeColors: Record<string, string> = {
    contract: "bg-blue-100 text-blue-700",
    id_document: "bg-amber-100 text-amber-700",
    certificate: "bg-green-100 text-green-700",
    payslip: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-700",
  };

  const employeeMap = new Map(employees.map((e) => [e.id, e.full_name]));

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">{t("brand")}</p>
            <h1 className="app-title mt-1 text-xl font-semibold">{t("documents.addTitle")}</h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("documents.fields.employee")}</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">{t("leave.fields.selectEmployee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("documents.fields.name")}</label>
            <input value={docName} onChange={(e) => setDocName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("documents.fields.namePlaceholder")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("documents.fields.docType")}</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              {["contract", "id_document", "certificate", "payslip", "other"].map((dt) => (
                <option key={dt} value={dt}>{t(`documents.types.${dt}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t("documents.fields.fileUrl")}</label>
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !employeeId || !docName.trim() || !fileUrl.trim()}
          className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? t("documents.saving") : t("documents.save")}
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
          <h1 className="app-title mt-1 text-xl font-semibold">{t("documents.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Upload className="h-4 w-4" /> {t("documents.add")}
        </button>
      </div>

      {/* Employee filter */}
      <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
        <option value="">{t("documents.allEmployees")}</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>{e.full_name}</option>
        ))}
      </select>

      {documents.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-4">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("documents.emptyTitle")}</h2>
          <p className="text-sm text-gray-400">{t("documents.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="app-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{employeeMap.get(doc.employee_id) ?? t("leave.unknownEmployee")}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${docTypeColors[doc.doc_type] ?? "bg-gray-100 text-gray-600"}`}>
                    {t(`documents.types.${doc.doc_type}`)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Download className="h-3.5 w-3.5" />
                </a>
                {deleteConfirm === doc.id ? (
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                    {t("documents.confirmDelete")}
                  </button>
                ) : (
                  <button onClick={() => setDeleteConfirm(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
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
