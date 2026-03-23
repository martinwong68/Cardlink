"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Receipt,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { useActiveCompany } from "@/components/business/useActiveCompany";

/* ── types ── */

const TAX_TYPES = ["income", "social_security", "medicare", "state", "local", "other"] as const;
type TaxType = (typeof TAX_TYPES)[number];

const DEDUCTION_TYPES = ["benefit", "insurance", "retirement", "loan", "other"] as const;
type DeductionType = (typeof DEDUCTION_TYPES)[number];

const CALC_METHODS = ["fixed", "percentage"] as const;
type CalcMethod = (typeof CALC_METHODS)[number];

type TaxBracket = {
  id: string;
  company_id: string;
  name: string;
  tax_type: TaxType;
  bracket_min: number;
  bracket_max: number | null;
  rate: number;
  fixed_amount: number;
  is_employer_contribution: boolean;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
};

type Deduction = {
  id: string;
  company_id: string;
  name: string;
  deduction_type: DeductionType;
  calculation_method: CalcMethod;
  amount: number;
  percentage: number;
  max_annual: number | null;
  is_pre_tax: boolean;
  is_active: boolean;
};

/* ── helpers ── */

const typeBadge: Record<string, string> = {
  income: "bg-blue-100 text-blue-700",
  social_security: "bg-purple-100 text-purple-700",
  medicare: "bg-teal-100 text-teal-700",
  state: "bg-amber-100 text-amber-700",
  local: "bg-orange-100 text-orange-700",
  benefit: "bg-green-100 text-green-700",
  insurance: "bg-cyan-100 text-cyan-700",
  retirement: "bg-indigo-100 text-indigo-700",
  loan: "bg-rose-100 text-rose-700",
  other: "bg-gray-100 text-gray-600",
};

const activeBadge = (a: boolean) =>
  a ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ── component ── */

export default function TaxConfigPage() {
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();

  const [tab, setTab] = useState<"brackets" | "deductions">("brackets");

  /* bracket state */
  const [brackets, setBrackets] = useState<TaxBracket[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [showBForm, setShowBForm] = useState(false);
  const [editBId, setEditBId] = useState<string | null>(null);
  const [savingB, setSavingB] = useState(false);
  const [deleteBConfirm, setDeleteBConfirm] = useState<string | null>(null);

  const [bName, setBName] = useState("");
  const [bTaxType, setBTaxType] = useState<TaxType>("income");
  const [bMin, setBMin] = useState("0");
  const [bMax, setBMax] = useState("");
  const [bRate, setBRate] = useState("0");
  const [bFixed, setBFixed] = useState("0");
  const [bEmployer, setBEmployer] = useState(false);
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");

  /* deduction state */
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loadingD, setLoadingD] = useState(true);
  const [showDForm, setShowDForm] = useState(false);
  const [editDId, setEditDId] = useState<string | null>(null);
  const [savingD, setSavingD] = useState(false);
  const [deleteDConfirm, setDeleteDConfirm] = useState<string | null>(null);

  const [dName, setDName] = useState("");
  const [dType, setDType] = useState<DeductionType>("benefit");
  const [dCalc, setDCalc] = useState<CalcMethod>("fixed");
  const [dAmount, setDAmount] = useState("0");
  const [dPct, setDPct] = useState("0");
  const [dMax, setDMax] = useState("");
  const [dPreTax, setDPreTax] = useState(true);

  /* ── data loading ── */

  const loadBrackets = useCallback(async () => {
    if (!companyId) return;
    setLoadingB(true);
    const { data } = await supabase
      .from("hr_payroll_tax_brackets")
      .select("*")
      .eq("company_id", companyId)
      .order("bracket_min");
    setBrackets((data as TaxBracket[]) ?? []);
    setLoadingB(false);
  }, [companyId, supabase]);

  const loadDeductions = useCallback(async () => {
    if (!companyId) return;
    setLoadingD(true);
    const { data } = await supabase
      .from("hr_payroll_deductions")
      .select("*")
      .eq("company_id", companyId)
      .order("name");
    setDeductions((data as Deduction[]) ?? []);
    setLoadingD(false);
  }, [companyId, supabase]);

  useEffect(() => {
    if (!companyLoading && companyId) {
      void loadBrackets();
      void loadDeductions();
    } else if (!companyLoading) {
      setLoadingB(false);
      setLoadingD(false);
    }
  }, [companyId, companyLoading, loadBrackets, loadDeductions]);

  /* ── bracket helpers ── */

  const resetBForm = () => {
    setBName(""); setBTaxType("income"); setBMin("0"); setBMax("");
    setBRate("0"); setBFixed("0"); setBEmployer(false); setBFrom(""); setBTo("");
    setEditBId(null); setShowBForm(false);
  };

  const openEditB = (b: TaxBracket) => {
    setEditBId(b.id); setBName(b.name); setBTaxType(b.tax_type);
    setBMin(String(b.bracket_min)); setBMax(b.bracket_max != null ? String(b.bracket_max) : "");
    setBRate(String(b.rate)); setBFixed(String(b.fixed_amount));
    setBEmployer(b.is_employer_contribution); setBFrom(b.effective_from ?? "");
    setBTo(b.effective_to ?? ""); setShowBForm(true);
  };

  const handleSaveB = async () => {
    if (!companyId || !bName.trim()) return;
    setSavingB(true);
    const payload = {
      name: bName.trim(), tax_type: bTaxType,
      bracket_min: Number(bMin), bracket_max: bMax ? Number(bMax) : null,
      rate: Number(bRate), fixed_amount: Number(bFixed),
      is_employer_contribution: bEmployer, is_active: true,
      effective_from: bFrom || null, effective_to: bTo || null,
    };
    if (editBId) {
      await supabase.from("hr_payroll_tax_brackets").update(payload).eq("id", editBId).eq("company_id", companyId);
    } else {
      await supabase.from("hr_payroll_tax_brackets").insert({ ...payload, company_id: companyId });
    }
    setSavingB(false); resetBForm(); void loadBrackets();
  };

  const handleDeleteB = async (id: string) => {
    await supabase.from("hr_payroll_tax_brackets").delete().eq("id", id).eq("company_id", companyId);
    setDeleteBConfirm(null); void loadBrackets();
  };

  const toggleActiveB = async (b: TaxBracket) => {
    await supabase.from("hr_payroll_tax_brackets").update({ is_active: !b.is_active }).eq("id", b.id).eq("company_id", companyId);
    void loadBrackets();
  };

  /* ── deduction helpers ── */

  const resetDForm = () => {
    setDName(""); setDType("benefit"); setDCalc("fixed");
    setDAmount("0"); setDPct("0"); setDMax(""); setDPreTax(true);
    setEditDId(null); setShowDForm(false);
  };

  const openEditD = (d: Deduction) => {
    setEditDId(d.id); setDName(d.name); setDType(d.deduction_type);
    setDCalc(d.calculation_method); setDAmount(String(d.amount));
    setDPct(String(d.percentage)); setDMax(d.max_annual != null ? String(d.max_annual) : "");
    setDPreTax(d.is_pre_tax); setShowDForm(true);
  };

  const handleSaveD = async () => {
    if (!companyId || !dName.trim()) return;
    setSavingD(true);
    const payload = {
      name: dName.trim(), deduction_type: dType, calculation_method: dCalc,
      amount: Number(dAmount), percentage: Number(dPct),
      max_annual: dMax ? Number(dMax) : null, is_pre_tax: dPreTax, is_active: true,
    };
    if (editDId) {
      await supabase.from("hr_payroll_deductions").update(payload).eq("id", editDId).eq("company_id", companyId);
    } else {
      await supabase.from("hr_payroll_deductions").insert({ ...payload, company_id: companyId });
    }
    setSavingD(false); resetDForm(); void loadDeductions();
  };

  const handleDeleteD = async (id: string) => {
    await supabase.from("hr_payroll_deductions").delete().eq("id", id).eq("company_id", companyId);
    setDeleteDConfirm(null); void loadDeductions();
  };

  const toggleActiveD = async (d: Deduction) => {
    await supabase.from("hr_payroll_deductions").update({ is_active: !d.is_active }).eq("id", d.id).eq("company_id", companyId);
    void loadDeductions();
  };

  /* ── loading ── */

  if (companyLoading || (loadingB && loadingD)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ── bracket form ── */

  if (showBForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetBForm} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">HR · Tax Config</p>
            <h1 className="app-title mt-1 text-xl font-semibold">
              {editBId ? "Edit Tax Bracket" : "New Tax Bracket"}
            </h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input value={bName} onChange={(e) => setBName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Federal Income 22%" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax Type</label>
            <select value={bTaxType} onChange={(e) => setBTaxType(e.target.value as TaxType)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              {TAX_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bracket Min</label>
              <input type="number" value={bMin} onChange={(e) => setBMin(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bracket Max</label>
              <input type="number" value={bMax} onChange={(e) => setBMax(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder="No limit" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rate (%)</label>
              <input type="number" step="0.01" value={bRate} onChange={(e) => setBRate(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fixed Amount</label>
              <input type="number" step="0.01" value={bFixed} onChange={(e) => setBFixed(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Effective From</label>
              <input type="date" value={bFrom} onChange={(e) => setBFrom(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Effective To</label>
              <input type="date" value={bTo} onChange={(e) => setBTo(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={bEmployer} onChange={(e) => setBEmployer(e.target.checked)} className="rounded" />
            Employer contribution
          </label>
        </div>

        <button onClick={handleSaveB} disabled={savingB || !bName.trim()} className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
          {savingB ? "Saving…" : editBId ? "Update Bracket" : "Create Bracket"}
        </button>
      </div>
    );
  }

  /* ── deduction form ── */

  if (showDForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={resetDForm} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <p className="app-kicker">HR · Tax Config</p>
            <h1 className="app-title mt-1 text-xl font-semibold">
              {editDId ? "Edit Deduction" : "New Deduction"}
            </h1>
          </div>
        </div>

        <div className="app-card p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input value={dName} onChange={(e) => setDName(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. 401(k) Match" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deduction Type</label>
            <select value={dType} onChange={(e) => setDType(e.target.value as DeductionType)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              {DEDUCTION_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Calculation Method</label>
            <select value={dCalc} onChange={(e) => setDCalc(e.target.value as CalcMethod)} className="app-input w-full rounded-lg border px-3 py-2 text-sm">
              {CALC_METHODS.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fixed Amount</label>
              <input type="number" step="0.01" value={dAmount} onChange={(e) => setDAmount(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Percentage (%)</label>
              <input type="number" step="0.01" value={dPct} onChange={(e) => setDPct(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Annual</label>
            <input type="number" step="0.01" value={dMax} onChange={(e) => setDMax(e.target.value)} className="app-input w-full rounded-lg border px-3 py-2 text-sm" placeholder="No limit" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={dPreTax} onChange={(e) => setDPreTax(e.target.checked)} className="rounded" />
            Pre-tax deduction
          </label>
        </div>

        <button onClick={handleSaveD} disabled={savingD || !dName.trim()} className="app-primary-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
          {savingD ? "Saving…" : editDId ? "Update Deduction" : "Create Deduction"}
        </button>
      </div>
    );
  }

  /* ── main list view ── */

  const tabs = ["brackets", "deductions"] as const;

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Link href="/business/hr" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <p className="app-kicker">HR · Payroll</p>
          <h1 className="app-title mt-1 text-xl font-semibold">Tax Configuration</h1>
        </div>
        <button
          onClick={() => (tab === "brackets" ? setShowBForm(true) : setShowDForm(true))}
          className="app-primary-btn flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
              tab === tb ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tb === "brackets" ? `Tax Brackets (${brackets.length})` : `Deductions (${deductions.length})`}
          </button>
        ))}
      </div>

      {/* brackets list */}
      {tab === "brackets" && (
        <>
          {brackets.length === 0 ? (
            <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 mb-4">
                <Landmark className="h-6 w-6 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-700 mb-1">No Tax Brackets</h2>
              <p className="text-sm text-gray-400">Add your first tax bracket to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {brackets.map((b) => (
                <div key={b.id} className="app-card flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {b.rate}% + ${b.fixed_amount} · {b.bracket_min.toLocaleString()}
                      {b.bracket_max != null ? `–${b.bracket_max.toLocaleString()}` : "+"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadge[b.tax_type] ?? typeBadge.other}`}>
                    {label(b.tax_type)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeBadge(b.is_active)}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActiveB(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Toggle active">
                      {b.is_active ? <ToggleRight className="h-3.5 w-3.5 text-green-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => openEditB(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteBConfirm === b.id ? (
                      <button onClick={() => handleDeleteB(b.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                        Confirm
                      </button>
                    ) : (
                      <button onClick={() => setDeleteBConfirm(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* deductions list */}
      {tab === "deductions" && (
        <>
          {deductions.length === 0 ? (
            <div className="app-card flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 mb-4">
                <Receipt className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-700 mb-1">No Deductions</h2>
              <p className="text-sm text-gray-400">Add your first deduction to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deductions.map((d) => (
                <div key={d.id} className="app-card flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {d.calculation_method === "fixed" ? `$${d.amount}` : `${d.percentage}%`}
                      {d.max_annual != null ? ` · Max $${d.max_annual.toLocaleString()}/yr` : ""}
                      {d.is_pre_tax ? " · Pre-tax" : " · Post-tax"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadge[d.deduction_type] ?? typeBadge.other}`}>
                    {label(d.deduction_type)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${activeBadge(d.is_active)}`}>
                    {d.is_active ? "Active" : "Inactive"}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActiveD(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Toggle active">
                      {d.is_active ? <ToggleRight className="h-3.5 w-3.5 text-green-600" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => openEditD(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {deleteDConfirm === d.id ? (
                      <button onClick={() => handleDeleteD(d.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold px-2">
                        Confirm
                      </button>
                    ) : (
                      <button onClick={() => setDeleteDConfirm(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
