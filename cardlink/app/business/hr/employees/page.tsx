"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  employment_type: string;
  start_date: string | null;
  salary: number;
  salary_period: string;
  status: string;
  avatar_url: string | null;
  address: string | null;
  national_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  reporting_manager_id: string | null;
};

export default function EmployeesPage() {
  const t = useTranslations("businessHr");
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [startDate, setStartDate] = useState("");
  const [salary, setSalary] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("monthly");
  // Extended fields
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  const loadEmployees = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("hr_employees")
      .select("*")
      .eq("company_id", companyId)
      .order("full_name");
    setEmployees((data as Employee[]) ?? []);
    setLoading(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) void loadEmployees();
    else if (!companyLoading) setLoading(false);
  }, [companyId, companyLoading, loadEmployees]);

  const resetForm = () => {
    setFullName(""); setEmail(""); setPhone("");
    setPosition(""); setDepartment(""); setEmploymentType("full_time");
    setStartDate(""); setSalary(""); setSalaryPeriod("monthly");
    setAddress(""); setNationalId(""); setBankName(""); setBankAccount("");
    setEmergencyName(""); setEmergencyPhone(""); setEmergencyRelation("");
    setFormStep(0); setEditingId(null); setShowForm(false);
  };

  const openEdit = (e: Employee) => {
    setEditingId(e.id);
    setFullName(e.full_name); setEmail(e.email ?? ""); setPhone(e.phone ?? "");
    setPosition(e.position ?? ""); setDepartment(e.department ?? "");
    setEmploymentType(e.employment_type); setStartDate(e.start_date ?? "");
    setSalary(String(e.salary)); setSalaryPeriod(e.salary_period);
    setAddress(e.address ?? ""); setNationalId(e.national_id ?? "");
    setBankName(e.bank_name ?? ""); setBankAccount(e.bank_account ?? "");
    setEmergencyName(e.emergency_contact_name ?? "");
    setEmergencyPhone(e.emergency_contact_phone ?? "");
    setEmergencyRelation(e.emergency_contact_relation ?? "");
    setFormStep(0); setShowForm(true);
  };

  const handleSave = async () => {
    if (!companyId || !fullName.trim()) return;
    setSaving(true);
    const payload = {
      full_name: fullName.trim(),
      email: email || null,
      phone: phone || null,
      position: position || null,
      department: department || null,
      employment_type: employmentType,
      start_date: startDate || null,
      salary: Number(salary) || 0,
      salary_period: salaryPeriod,
      address: address || null,
      national_id: nationalId || null,
      bank_name: bankName || null,
      bank_account: bankAccount || null,
      emergency_contact_name: emergencyName || null,
      emergency_contact_phone: emergencyPhone || null,
      emergency_contact_relation: emergencyRelation || null,
    };

    if (editingId) {
      await supabase.from("hr_employees")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId).eq("company_id", companyId);
    } else {
      await supabase.from("hr_employees")
        .insert({ ...payload, company_id: companyId });
    }
    setSaving(false);
    resetForm();
    void loadEmployees();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hr_employees").delete().eq("id", id).eq("company_id", companyId);
    setDeleteConfirm(null);
    void loadEmployees();
  };

  const toggleStatus = async (emp: Employee) => {
    const next = emp.status === "active" ? "inactive" : "active";
    await supabase.from("hr_employees")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", emp.id).eq("company_id", companyId);
    void loadEmployees();
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    terminated: "bg-red-100 text-red-700",
  };

  const empTypes: Record<string, string> = {
    full_time: t("employmentTypes.fullTime"),
    part_time: t("employmentTypes.partTime"),
    contract: t("employmentTypes.contract"),
  };

  const totalSteps = 4;

  // Multi-step form
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
              {editingId ? t("employees.editTitle") : t("employees.addTitle")}
            </h1>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition ${i === formStep ? "bg-indigo-600 w-6" : i < formStep ? "bg-indigo-300" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="app-card p-5 space-y-4">
          {formStep === 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700">{t("employees.step1")}</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.fullName")}</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder={t("employees.fields.fullNamePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.email")}</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.phone")}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </>
          )}
          {formStep === 1 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700">{t("employees.step2")}</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.position")}</label>
                <input value={position} onChange={(e) => setPosition(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.department")}</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.employmentType")}</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="full_time">{empTypes.full_time}</option>
                  <option value="part_time">{empTypes.part_time}</option>
                  <option value="contract">{empTypes.contract}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.startDate")}</label>
                <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </>
          )}
          {formStep === 2 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700">{t("employees.step3")}</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.salary")}</label>
                <input value={salary} onChange={(e) => setSalary(e.target.value)} type="number" min="0" className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.salaryPeriod")}</label>
                <select value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="monthly">{t("employees.salaryPeriods.monthly")}</option>
                  <option value="hourly">{t("employees.salaryPeriods.hourly")}</option>
                </select>
              </div>
            </>
          )}
          {formStep === 3 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700">{t("employees.step4")}</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.address")}</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.nationalId")}</label>
                <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.bankName")}</label>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.bankAccount")}</label>
                  <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <h4 className="text-xs font-semibold text-gray-600 mt-2">{t("employees.fields.emergencyContact")}</h4>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.emergencyName")}</label>
                <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.emergencyPhone")}</label>
                  <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("employees.fields.emergencyRelation")}</label>
                  <input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3">
          {formStep > 0 && (
            <button onClick={() => setFormStep(formStep - 1)} className="app-secondary-btn flex-1 flex items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold">
              <ChevronLeft className="h-4 w-4" /> {t("employees.back")}
            </button>
          )}
          {formStep < totalSteps - 1 ? (
            <button onClick={() => setFormStep(formStep + 1)} disabled={formStep === 0 && !fullName.trim()} className="app-primary-btn flex-1 flex items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
              {t("employees.next")} <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !fullName.trim()} className="app-primary-btn flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
              {saving ? t("employees.saving") : t("employees.save")}
            </button>
          )}
        </div>
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
          <h1 className="app-title mt-1 text-xl font-semibold">{t("employees.title")}</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Plus className="h-4 w-4" /> {t("employees.add")}
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 mb-4">
            <Users className="h-6 w-6 text-purple-400" />
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">{t("employees.emptyTitle")}</h2>
          <p className="text-sm text-gray-400">{t("employees.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <div key={emp.id} className="app-card flex items-center gap-3 p-4">
              {/* Avatar / initials */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{emp.full_name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[emp.position, emp.department].filter(Boolean).join(" · ") || empTypes[emp.employment_type]}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[emp.status] ?? "bg-gray-100 text-gray-600"}`}>
                {t(`employees.statuses.${emp.status}`)}
              </span>
              <div className="flex gap-1">
                <button onClick={() => toggleStatus(emp)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title={t("employees.toggleStatus")}>
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {deleteConfirm === emp.id ? (
                  <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                    {t("employees.confirmDelete")}
                  </button>
                ) : (
                  <button onClick={() => setDeleteConfirm(emp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
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
