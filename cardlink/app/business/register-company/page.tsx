"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Upload,
  X,
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingCart,
  Handshake,
  ClipboardList,
  Store,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";

/* ─── Constants ─── */
const TOTAL_STEPS = 5;

const LOGO_MAX_DIMENSION = 512;
const COVER_MAX_DIMENSION = 1920;
const IMAGE_JPEG_QUALITY = 0.8;

const industries = [
  "retail", "fnb", "services", "manufacturing", "technology",
  "healthcare", "education", "construction", "professional", "other",
] as const;

const companySizes = ["1-5", "6-20", "21-50", "50+"] as const;
const countries = ["MY", "HK", "SG", "other"] as const;
const currencies = ["MYR", "HKD", "SGD", "USD"] as const;
const months = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;
const accountingBases = ["cash", "accrual"] as const;

type PlanSlug = "starter" | "professional" | "business";

type ModuleKey = "accounting" | "hr" | "booking" | "inventory" | "pos" | "crm" | "procurement" | "store" | "cards";

const moduleConfig: { key: ModuleKey; icon: typeof BookOpen; defaultOn: boolean; alwaysOn: boolean }[] = [
  { key: "accounting", icon: BookOpen, defaultOn: true, alwaysOn: true },
  { key: "hr", icon: Users, defaultOn: false, alwaysOn: false },
  { key: "booking", icon: Calendar, defaultOn: false, alwaysOn: false },
  { key: "inventory", icon: Package, defaultOn: true, alwaysOn: false },
  { key: "pos", icon: ShoppingCart, defaultOn: true, alwaysOn: false },
  { key: "crm", icon: Handshake, defaultOn: true, alwaysOn: false },
  { key: "procurement", icon: ClipboardList, defaultOn: false, alwaysOn: false },
  { key: "store", icon: Store, defaultOn: true, alwaysOn: false },
  { key: "cards", icon: CreditCard, defaultOn: false, alwaysOn: false },
];

/* ─── Plan Feature Data ─── */
type FeatureRow = {
  key: string;
  starter: string;
  professional: string;
  business: string;
};

const planFeatures: FeatureRow[] = [
  { key: "aiActions", starter: "50/mo", professional: "200/mo", business: "2,000/mo" },
  { key: "aiChat", starter: "✅", professional: "✅", business: "✅ Priority" },
  { key: "companies", starter: "1", professional: "3", business: "unlimited" },
  { key: "users", starter: "3", professional: "5", business: "20" },
  { key: "storage", starter: "1GB", professional: "5GB", business: "50GB" },
  { key: "modules", starter: "core", professional: "allPlusAi", business: "allPlusCustomAi" },
  { key: "store", starter: "basic", professional: "full", business: "fullAnalytics" },
  { key: "pdfExport", starter: "none", professional: "✅", business: "✅" },
  { key: "docOcr", starter: "5/mo", professional: "20/mo", business: "200/mo" },
  { key: "support", starter: "email", professional: "email", business: "priority" },
];

const planPrices: Record<PlanSlug, number> = { starter: 20, professional: 40, business: 60 };

/* ─── Helper Components ─── */

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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

/* ─── Image compression (follows existing avatar pattern) ─── */
async function compressImage(file: File, maxDimension: number, fileName: string): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = objectUrl;
    });
    const longestSide = Math.max(image.width, image.height);
    const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Failed to process image.");
    context.drawImage(image, 0, 0, width, height);
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to compress image."))),
        "image/jpeg",
        IMAGE_JPEG_QUALITY
      );
    });
    return new File([compressedBlob], fileName, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* ─── Main Page Component ─── */
export default function RegisterCompanyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("registerCompany");

  const [step, setStep] = useState(1);
  /* Sub-step for step 3: "3a" = basic info, "3b" = address & contact */
  const [subStep, setSubStep] = useState<"3a" | "3b">("3a");

  /* Step 1: Plan */
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>("starter");

  /* Step 2: Payment confirmation */
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  /* Step 3a: Basic Info */
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");

  /* Step 3b: Address & Contact */
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  /* Step 4: Financial */
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [taxRegNumber, setTaxRegNumber] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("");
  const [accountingBasis, setAccountingBasis] = useState("");

  /* Step 5: Branding + Modules */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Record<ModuleKey, boolean>>({
    accounting: true,
    hr: false,
    booking: false,
    inventory: true,
    pos: true,
    crm: true,
    procurement: false,
    store: true,
    cards: false,
  });

  /* State */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* ─── Check for payment return from Stripe ─── */
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const planParam = searchParams.get("plan");
    if (checkout === "success") {
      setPaymentConfirmed(true);
      if (planParam && (["starter", "professional", "business"] as PlanSlug[]).includes(planParam as PlanSlug)) {
        setSelectedPlan(planParam as PlanSlug);
      }
      setStep(3);
      setSubStep("3a");
    }
  }, [searchParams]);

  /* ─── Validation ─── */
  function validateStep3a(): boolean {
    const errors: Record<string, string> = {};
    if (companyName.trim().length < 2) errors.companyName = t("validation.companyNameMin");
    if (!industry) errors.industry = t("validation.required");
    if (!companySize) errors.companySize = t("validation.required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep3b(): boolean {
    const errors: Record<string, string> = {};
    if (!addressLine1.trim()) errors.addressLine1 = t("validation.required");
    if (!city.trim()) errors.city = t("validation.required");
    if (!stateRegion.trim()) errors.stateRegion = t("validation.required");
    if (!postalCode.trim()) errors.postalCode = t("validation.required");
    if (!country) errors.country = t("validation.required");
    if (!phone.trim()) errors.phone = t("validation.required");
    if (!email.trim()) errors.email = t("validation.required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("validation.invalidEmail");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep4(): boolean {
    const errors: Record<string, string> = {};
    if (!fiscalYearEnd) errors.fiscalYearEnd = t("validation.required");
    if (!accountingBasis) errors.accountingBasis = t("validation.required");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /* ─── Navigation ─── */
  function handleBack() {
    setFieldErrors({});
    setError(null);
    if (step === 1) {
      router.push("/business");
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3 && subStep === "3b") {
      setSubStep("3a");
    } else if (step === 3 && subStep === "3a") {
      setStep(2);
    } else {
      setStep(step - 1);
    }
  }

  async function handleNextFromStep1() {
    setFieldErrors({});
    setStep(2);
  }

  async function handlePayAndContinue() {
    setPaymentLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug: selectedPlan,
          interval: "monthly",
          mode: "subscription",
          successUrl: `${origin}/business/register-company?checkout=success&plan=${selectedPlan}`,
          cancelUrl: `${origin}/business/register-company?checkout=cancelled`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || t("step2.paymentError"));
        setPaymentLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("step2.paymentError"));
      setPaymentLoading(false);
    }
  }

  function handleNextFromStep3a() {
    if (!validateStep3a()) return;
    setFieldErrors({});
    setSubStep("3b");
  }

  function handleNextFromStep3b() {
    if (!validateStep3b()) return;
    setFieldErrors({});
    setStep(4);
  }

  function handleNextFromStep4() {
    if (!validateStep4()) return;
    setFieldErrors({});
    setStep(5);
  }

  /* ─── Image Handlers ─── */
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, LOGO_MAX_DIMENSION, "logo.jpg");
      setLogoFile(compressed);
      setLogoPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Failed to process logo image.");
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, COVER_MAX_DIMENSION, "cover.jpg");
      setCoverFile(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch {
      setError("Failed to process cover image.");
    }
  }

  /* ─── Submit ─── */
  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      /* Upload images first if provided */
      let logoUrl: string | null = null;
      let coverUrl: string | null = null;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("Not authenticated.");
        setLoading(false);
        return;
      }

      if (logoFile) {
        const path = `company-logos/${userData.user.id}/${Date.now()}-logo.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, logoFile, { upsert: true, contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      }

      if (coverFile) {
        const path = `company-covers/${userData.user.id}/${Date.now()}-cover.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, coverFile, { upsert: true, contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          coverUrl = urlData.publicUrl;
        }
      }

      const enabledList = Object.entries(enabledModules)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const res = await fetch("/api/business/register-company", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planSlug: selectedPlan,
          companyName: companyName.trim(),
          registrationNumber: registrationNumber.trim() || undefined,
          industry,
          companySize,
          yearEstablished: yearEstablished ? parseInt(yearEstablished, 10) : undefined,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          stateRegion: stateRegion.trim(),
          postalCode: postalCode.trim(),
          country,
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim() || undefined,
          defaultCurrency,
          taxRegistrationNumber: taxRegNumber.trim() || undefined,
          taxRate: taxRate ? parseFloat(taxRate) : undefined,
          fiscalYearEnd,
          accountingBasis,
          enabledModules: enabledList,
          logoUrl,
          coverUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("step4.error"));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/business");
        router.refresh();
      }, 1500);
    } catch {
      setError(t("step4.error"));
      setLoading(false);
    }
  }

  /* ─── Render the visual step number (step 3 has sub-steps but shows as step 3) ─── */
  const visualStep = step;

  /* ─── Feature value display helper ─── */
  function renderFeatureValue(val: string): React.ReactNode {
    if (val === "none") return <span className="text-red-400">❌ {t("step1.featureValues.none")}</span>;
    if (val === "✅") return <span className="text-green-600">✅</span>;
    if (val.startsWith("✅ ")) return <span className="text-green-600">{val}</span>;
    // Check if it's a translatable key
    const translatableKeys = ["unlimited", "core", "allPlusAi", "allPlusCustomAi", "basic", "full", "fullAnalytics", "community", "email", "priority"];
    if (translatableKeys.includes(val)) {
      return t(`step1.featureValues.${val}`);
    }
    return val;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </button>

      {/* Step indicator */}
      <StepDots current={visualStep} total={TOTAL_STEPS} />
      <p className="text-center text-xs text-gray-400">
        {t("stepOf", { current: visualStep, total: TOTAL_STEPS })}
      </p>

      {/* Success message */}
      {success && (
        <div className="app-card rounded-2xl p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-700">{t("step4.success")}</p>
        </div>
      )}

      {/* Error banner */}
      {error && !success && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <X className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 1: Plan Selection */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 1 && !success && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step1.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step1.subtitle")}</p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["starter", "professional", "business"] as PlanSlug[]).map((slug) => {
              const isSelected = selectedPlan === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setSelectedPlan(slug)}
                  className={`app-card rounded-2xl p-5 text-left transition relative ${
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "hover:border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  <div className="text-2xl mb-2">{t(`step1.plans.${slug}.emoji`)}</div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t(`step1.plans.${slug}.name`)}
                  </h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-gray-900">
                      ${planPrices[slug]}
                    </span>
                    <span className="text-sm text-gray-500">{t("step1.perMonth")}</span>
                  </div>

                  {/* Feature list */}
                  <div className="mt-4 space-y-2">
                    {planFeatures.map((feat) => (
                      <div key={feat.key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{t(`step1.features.${feat.key}`)}</span>
                        <span className="font-medium text-gray-700 text-right">
                          {renderFeatureValue(feat[slug])}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <div
                      className={`w-full py-2 rounded-full text-center text-sm font-semibold transition ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isSelected ? t("step1.selected") : t("step1.selectPlan")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI Credits add-on section */}
          <div className="app-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-800">{t("step1.aiCredits.title")}</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">{t("step1.aiCredits.subtitle")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: t("step1.aiCredits.pack100"), price: t("step1.aiCredits.pack100Price") },
                { label: t("step1.aiCredits.pack500"), price: t("step1.aiCredits.pack500Price"), save: t("step1.aiCredits.pack500Save") },
                { label: t("step1.aiCredits.pack2000"), price: t("step1.aiCredits.pack2000Price"), save: t("step1.aiCredits.pack2000Save") },
              ].map((pack) => (
                <div
                  key={pack.label}
                  className="rounded-xl border border-gray-200 p-3 text-center"
                >
                  <p className="text-xs font-medium text-gray-700">{pack.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{pack.price}</p>
                  {pack.save && (
                    <span className="inline-block mt-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      {pack.save}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleNextFromStep1()}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 2: Payment */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 2 && !success && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step2.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step2.subtitle")}</p>
          </div>

          <div className="rounded-xl bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {t(`step1.plans.${selectedPlan}.name`)}
                </p>
                <p className="text-xs text-gray-500">
                  ${planPrices[selectedPlan]}/{t("step1.perMonth")}
                </p>
              </div>
              <CreditCard className="h-6 w-6 text-indigo-500" />
            </div>
          </div>

          {paymentConfirmed ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <Check className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700">{t("step2.paymentConfirmed")}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center">
              {t("step2.paymentRequired")}
            </p>
          )}

          {paymentConfirmed ? (
            <button
              type="button"
              onClick={() => { setStep(3); setSubStep("3a"); }}
              className="app-primary-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {t("step2.continueSetup")}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePayAndContinue()}
              disabled={paymentLoading}
              className="app-primary-btn w-full py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("step2.redirecting")}
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  {t("step2.payNow")}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 3A: Basic Info */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 3 && subStep === "3a" && !success && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step2a.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step2a.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel required>{t("step2a.companyName")}</FieldLabel>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("step2a.companyNamePlaceholder")}
                maxLength={120}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
              <FieldError message={fieldErrors.companyName} />
            </div>

            <div>
              <FieldLabel>{t("step2a.registrationNumber")}</FieldLabel>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder={t("step2a.registrationNumberPlaceholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <FieldLabel required>{t("step2a.industry")}</FieldLabel>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                <option value="">{t("step2a.industryPlaceholder")}</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{t(`step2a.industries.${ind}`)}</option>
                ))}
              </select>
              <FieldError message={fieldErrors.industry} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>{t("step2a.companySize")}</FieldLabel>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="app-input w-full px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">{t("step2a.companySizePlaceholder")}</option>
                  {companySizes.map((s) => (
                    <option key={s} value={s}>{t(`step2a.sizes.${s}`)}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.companySize} />
              </div>
              <div>
                <FieldLabel>{t("step2a.yearEstablished")}</FieldLabel>
                <input
                  type="number"
                  value={yearEstablished}
                  onChange={(e) => setYearEstablished(e.target.value)}
                  placeholder={t("step2a.yearEstablishedPlaceholder")}
                  min={1800}
                  max={new Date().getFullYear()}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextFromStep3a}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 3B: Address & Contact */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 3 && subStep === "3b" && !success && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step2b.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step2b.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel required>{t("step2b.addressLine1")}</FieldLabel>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder={t("step2b.addressLine1Placeholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
              <FieldError message={fieldErrors.addressLine1} />
            </div>

            <div>
              <FieldLabel>{t("step2b.addressLine2")}</FieldLabel>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder={t("step2b.addressLine2Placeholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>{t("step2b.city")}</FieldLabel>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("step2b.cityPlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
                <FieldError message={fieldErrors.city} />
              </div>
              <div>
                <FieldLabel required>{t("step2b.stateRegion")}</FieldLabel>
                <input
                  type="text"
                  value={stateRegion}
                  onChange={(e) => setStateRegion(e.target.value)}
                  placeholder={t("step2b.stateRegionPlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
                <FieldError message={fieldErrors.stateRegion} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>{t("step2b.postalCode")}</FieldLabel>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder={t("step2b.postalCodePlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
                <FieldError message={fieldErrors.postalCode} />
              </div>
              <div>
                <FieldLabel required>{t("step2b.country")}</FieldLabel>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="app-input w-full px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">{t("step2b.countryPlaceholder")}</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{t(`step2b.countries.${c}`)}</option>
                  ))}
                </select>
                <FieldError message={fieldErrors.country} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>{t("step2b.phone")}</FieldLabel>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("step2b.phonePlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
                <FieldError message={fieldErrors.phone} />
              </div>
              <div>
                <FieldLabel required>{t("step2b.email")}</FieldLabel>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("step2b.emailPlaceholder")}
                  className="app-input w-full px-3 py-2.5 text-sm"
                />
                <FieldError message={fieldErrors.email} />
              </div>
            </div>

            <div>
              <FieldLabel>{t("step2b.website")}</FieldLabel>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t("step2b.websitePlaceholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextFromStep3b}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 4: Financial Settings */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 4 && !success && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step3.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step3.subtitle")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <FieldLabel required>{t("step3.defaultCurrency")}</FieldLabel>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{t(`step3.currencies.${c}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>{t("step3.taxRegistrationNumber")}</FieldLabel>
              <input
                type="text"
                value={taxRegNumber}
                onChange={(e) => setTaxRegNumber(e.target.value)}
                placeholder={t("step3.taxRegistrationNumberPlaceholder")}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <FieldLabel>{t("step3.taxRate")}</FieldLabel>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder={t("step3.taxRatePlaceholder")}
                min={0}
                max={100}
                step={0.01}
                className="app-input w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <FieldLabel required>{t("step3.fiscalYearEnd")}</FieldLabel>
              <select
                value={fiscalYearEnd}
                onChange={(e) => setFiscalYearEnd(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                <option value="">{t("step3.fiscalYearEndPlaceholder")}</option>
                {months.map((m) => (
                  <option key={m} value={m}>{t(`step3.months.${m}`)}</option>
                ))}
              </select>
              <FieldError message={fieldErrors.fiscalYearEnd} />
            </div>

            <div>
              <FieldLabel required>{t("step3.accountingBasis")}</FieldLabel>
              <select
                value={accountingBasis}
                onChange={(e) => setAccountingBasis(e.target.value)}
                className="app-input w-full px-3 py-2.5 text-sm bg-white"
              >
                <option value="">{t("step3.accountingBasisPlaceholder")}</option>
                {accountingBases.map((b) => (
                  <option key={b} value={b}>{t(`step3.bases.${b}`)}</option>
                ))}
              </select>
              <FieldError message={fieldErrors.accountingBasis} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextFromStep4}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* STEP 5: Branding + Modules */}
      {/* ══════════════════════════════════════════════════════════ */}
      {step === 5 && !success && (
        <div className="app-card rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="app-title text-xl font-semibold">{t("step4.title")}</h1>
            <p className="app-subtitle mt-1 text-sm">{t("step4.subtitle")}</p>
          </div>

          {/* Logo upload */}
          <div>
            <FieldLabel>{t("step4.companyLogo")}</FieldLabel>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="app-secondary-btn mt-2 px-3 py-1 text-xs"
                  >
                    {t("step4.changeImage")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition"
                >
                  <Upload className="h-4 w-4" />
                  {t("step4.uploadLogo")}
                </button>
              )}
            </div>
          </div>

          {/* Cover upload */}
          <div>
            <FieldLabel>{t("step4.coverImage")}</FieldLabel>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
            {coverPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-32 rounded-xl object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="app-secondary-btn mt-2 px-3 py-1 text-xs"
                >
                  {t("step4.changeImage")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition"
              >
                <Upload className="h-4 w-4" />
                {t("step4.uploadCover")}
              </button>
            )}
          </div>

          {/* Module selection */}
          <div>
            <FieldLabel>{t("step4.modules")}</FieldLabel>
            <div className="mt-2 space-y-2">
              {moduleConfig.map((mod) => {
                const Icon = mod.icon;
                const checked = enabledModules[mod.key];
                return (
                  <label
                    key={mod.key}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition cursor-pointer ${
                      checked
                        ? "border-indigo-200 bg-indigo-50/50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } ${mod.alwaysOn ? "opacity-80" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={mod.alwaysOn}
                      onChange={(e) =>
                        setEnabledModules((prev) => ({ ...prev, [mod.key]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {t(`step4.moduleNames.${mod.key}`)}
                    </span>
                    {mod.alwaysOn && (
                      <span className="ml-auto text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        {t("step4.alwaysOn")}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="app-primary-btn w-full py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("step4.submitting")}
              </>
            ) : (
              <>
                {t("step4.submit")}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
