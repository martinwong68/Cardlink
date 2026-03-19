"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Building2,
  Briefcase,
  MapPin,
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";

const TOTAL_STEPS = 5;

const industries = [
  "retail", "food", "services", "tech", "health",
  "education", "finance", "realestate", "entertainment",
  "manufacturing", "logistics", "agriculture", "other",
] as const;

const businessTypes = [
  "sole_proprietorship", "partnership", "corporation", "llc",
  "nonprofit", "cooperative", "franchise", "other",
] as const;

const employeeRanges = [
  "1", "2-10", "11-50", "51-200", "201-500", "501-1000", "1001+",
] as const;

type Plan = "free" | "pro" | "enterprise";

const planIcons: Record<Plan, typeof Rocket> = {
  free: Rocket,
  pro: Zap,
  enterprise: Crown,
};

const planColors: Record<Plan, { ring: string; bg: string; icon: string }> = {
  free: { ring: "ring-gray-200", bg: "bg-gray-50", icon: "text-gray-500" },
  pro: { ring: "ring-indigo-300", bg: "bg-indigo-50", icon: "text-indigo-600" },
  enterprise: { ring: "ring-amber-300", bg: "bg-amber-50", icon: "text-amber-600" },
};

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? "w-6 bg-indigo-600"
              : i + 1 < current
              ? "w-2 bg-indigo-400"
              : "w-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-700 mb-1.5">{children}</label>;
}

export default function RegisterBusinessPage() {
  const router = useRouter();
  const t = useTranslations("businessRegister");

  const [step, setStep] = useState(1);

  /* Step 1: Basic Info */
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");

  /* Step 2: Business Details */
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [foundedDate, setFoundedDate] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");
  const [website, setWebsite] = useState("");

  /* Step 3: Address & Contact */
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  /* Step 4: Plan */
  const [plan, setPlan] = useState<Plan>("free");

  /* State */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canProceedStep1 = companyName.trim().length >= 2 && industry.length > 0 && businessType.length > 0;
  const canProceedStep3 = email.trim().length > 0 && phone.trim().length > 0;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          businessType,
          industry,
          registrationNumber: registrationNumber.trim() || undefined,
          taxId: taxId.trim() || undefined,
          foundedDate: foundedDate || undefined,
          employeeRange: employeeRange || undefined,
          website: website.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          address: {
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim() || undefined,
            city: city.trim(),
            stateProvince: stateProvince.trim() || undefined,
            postalCode: postalCode.trim() || undefined,
            country: country.trim() || undefined,
          },
          plan,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("step5.error"));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/business");
        router.refresh();
      }, 1500);
    } catch {
      setError(t("step5.error"));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          if (step > 1) setStep(step - 1);
          else router.push("/dashboard/settings");
        }}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </button>

      {/* Step indicator */}
      <StepDots current={step} total={TOTAL_STEPS} />
      <p className="text-center text-xs text-gray-400">
        {t("stepIndicator", { current: step, total: TOTAL_STEPS })}
      </p>

      {/* ── Step 1: Basic Company Info ── */}
      {step === 1 && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="app-title text-xl font-semibold">{t("step1.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step1.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>{t("step1.companyName")}</FieldLabel>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("step1.companyNamePlaceholder")}
                maxLength={120}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">{t("step1.companyNameHint")}</p>
            </div>

            <div>
              <FieldLabel>{t("step1.businessType")}</FieldLabel>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                <option value="">{t("step1.businessTypePlaceholder")}</option>
                {businessTypes.map((bt) => (
                  <option key={bt} value={bt}>
                    {t(`step1.businessTypes.${bt}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>{t("step1.industry")}</FieldLabel>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                <option value="">{t("step1.industryPlaceholder")}</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {t(`step1.industries.${ind}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {t("step1.next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Business Details ── */}
      {step === 2 && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <Briefcase className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="app-title text-xl font-semibold">{t("step2.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step2.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel>{t("step2.registrationNumber")}</FieldLabel>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder={t("step2.registrationNumberPlaceholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">{t("step2.registrationNumberHint")}</p>
            </div>

            <div>
              <FieldLabel>{t("step2.taxId")}</FieldLabel>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={t("step2.taxIdPlaceholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{t("step2.foundedDate")}</FieldLabel>
                <input
                  type="date"
                  value={foundedDate}
                  onChange={(e) => setFoundedDate(e.target.value)}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <FieldLabel>{t("step2.employeeRange")}</FieldLabel>
                <select
                  value={employeeRange}
                  onChange={(e) => setEmployeeRange(e.target.value)}
                  className="app-input w-full px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">{t("step2.employeeRangePlaceholder")}</option>
                  {employeeRanges.map((r) => (
                    <option key={r} value={r}>{r} {t("step2.employees")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel>{t("step2.website")}</FieldLabel>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="app-secondary-btn flex-1 py-2.5 text-sm font-semibold"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="app-primary-btn flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {t("step2.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400">{t("step2.optional")}</p>
        </div>
      )}

      {/* ── Step 3: Address & Contact ── */}
      {step === 3 && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
              <MapPin className="h-6 w-6 text-teal-600" />
            </div>
            <h1 className="app-title text-xl font-semibold">{t("step3.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step3.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{t("step3.email")}</FieldLabel>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("step3.emailPlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <FieldLabel>{t("step3.phone")}</FieldLabel>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("step3.phonePlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-3">{t("step3.addressSection")}</p>
              <div className="space-y-3">
                <div>
                  <FieldLabel>{t("step3.addressLine1")}</FieldLabel>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder={t("step3.addressLine1Placeholder")}
                    className="app-input w-full px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <FieldLabel>{t("step3.addressLine2")}</FieldLabel>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder={t("step3.addressLine2Placeholder")}
                    className="app-input w-full px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{t("step3.city")}</FieldLabel>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t("step3.cityPlaceholder")}
                      className="app-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("step3.stateProvince")}</FieldLabel>
                    <input
                      type="text"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder={t("step3.stateProvincePlaceholder")}
                      className="app-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{t("step3.postalCode")}</FieldLabel>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={t("step3.postalCodePlaceholder")}
                      className="app-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <FieldLabel>{t("step3.country")}</FieldLabel>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder={t("step3.countryPlaceholder")}
                      className="app-input w-full px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="app-secondary-btn flex-1 py-2.5 text-sm font-semibold"
            >
              {t("back")}
            </button>
            <button
              type="button"
              disabled={!canProceedStep3}
              onClick={() => setStep(4)}
              className="app-primary-btn flex-1 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t("step3.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Plan Selection ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step4.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step4.subtitle")}</p>
          </div>

          <div className="space-y-3">
            {(["free", "pro", "enterprise"] as const).map((p) => {
              const selected = plan === p;
              const colors = planColors[p];
              const Icon = planIcons[p];
              const features = t.raw(`step4.${p}.features`) as string[];

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`app-card w-full rounded-2xl p-5 text-left transition ring-2 ${
                    selected ? `${colors.ring} ring-opacity-100` : "ring-transparent hover:ring-gray-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {t(`step4.${p}.name`)}
                        </span>
                        {p === "pro" && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
                            {t("step4.popular")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-bold text-gray-900">
                          {t(`step4.${p}.price`)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t(`step4.${p}.period`)}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {features.map((f: string) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      selected ? "border-indigo-600 bg-indigo-600" : "border-gray-200"
                    }`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="app-secondary-btn flex-1 py-2.5 text-sm font-semibold"
            >
              {t("back")}
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="app-primary-btn flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {t("step4.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Review & Create ── */}
      {step === 5 && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="app-title text-xl font-semibold">{t("step5.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step5.subtitle")}</p>
          </div>

          {/* Company Info Summary */}
          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{t("step5.companySection")}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step5.companyNameLabel")}</span>
              <span className="text-sm font-medium text-gray-800">{companyName}</span>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step5.businessTypeLabel")}</span>
              <span className="text-sm font-medium text-gray-800">
                {businessType ? t(`step1.businessTypes.${businessType as "corporation"}`) : "—"}
              </span>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step5.industryLabel")}</span>
              <span className="text-sm font-medium text-gray-800">
                {t(`step1.industries.${industry as "retail"}`)}
              </span>
            </div>
            {registrationNumber && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t("step2.registrationNumber")}</span>
                  <span className="text-sm font-medium text-gray-800">{registrationNumber}</span>
                </div>
              </>
            )}
            {foundedDate && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t("step2.foundedDate")}</span>
                  <span className="text-sm font-medium text-gray-800">{foundedDate}</span>
                </div>
              </>
            )}
          </div>

          {/* Contact & Address Summary */}
          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{t("step5.contactSection")}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step3.email")}</span>
              <span className="text-sm font-medium text-gray-800">{email}</span>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step3.phone")}</span>
              <span className="text-sm font-medium text-gray-800">{phone}</span>
            </div>
            {addressLine1 && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{t("step5.addressLabel")}</span>
                  <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">
                    {[addressLine1, city, stateProvince, country].filter(Boolean).join(", ")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Plan Summary */}
          <div className="space-y-3 rounded-xl bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{t("step5.planSection")}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{t("step5.planLabel")}</span>
              <span className="text-sm font-medium text-gray-800">
                {t(`step4.${plan}.name`)}
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-600">{t("step5.success")}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={loading || success}
              className="app-secondary-btn flex-1 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              {t("back")}
            </button>
            <button
              type="button"
              disabled={loading || success}
              onClick={handleCreate}
              className="app-primary-btn flex-1 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("step5.creating")}
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("step5.success")}
                </>
              ) : (
                t("step5.create")
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400">{t("step5.terms")}</p>
        </div>
      )}
    </div>
  );
}
