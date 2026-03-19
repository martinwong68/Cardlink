"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { useActiveCompany } from "@/components/business/useActiveCompany";

const BANNER_MAX_DIMENSION = 1920;
const IMAGE_JPEG_QUALITY = 0.8;

const THEME_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#14b8a6", "#3b82f6",
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

type OperatingHours = Record<string, { open: boolean; openTime: string; closeTime: string }>;

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

async function compressBanner(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = objectUrl;
    });
    const longestSide = Math.max(image.width, image.height);
    const scale = longestSide > BANNER_MAX_DIMENSION ? BANNER_MAX_DIMENSION / longestSide : 1;
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
    return new File([compressedBlob], `banner-${Date.now()}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function StoreSetupPage() {
  const t = useTranslations("businessStore.setup");
  const router = useRouter();
  const { companyId, loading: companyLoading, supabase } = useActiveCompany();
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Step 1 fields
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(null);

  // Step 2 fields
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(() => {
    const hours: OperatingHours = {};
    DAYS.forEach((day) => {
      hours[day] = { open: day !== "sunday", openTime: "09:00", closeTime: "18:00" };
    });
    return hours;
  });

  const loadExisting = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("store_settings")
      .select("store_name, description, banner_url, theme_color, operating_hours")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) {
      if (data.store_name) setStoreName(data.store_name as string);
      if (data.description) setDescription(data.description as string);
      if (data.banner_url) {
        setExistingBannerUrl(data.banner_url as string);
        setBannerPreview(data.banner_url as string);
      }
      if (data.theme_color) setThemeColor(data.theme_color as string);
      if (data.operating_hours && typeof data.operating_hours === "object") {
        setOperatingHours((prev) => ({ ...prev, ...(data.operating_hours as OperatingHours) }));
      }
    } else {
      // Auto-fill store name from company
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();
      if (company?.name) setStoreName(company.name as string);
    }
  }, [companyId, supabase]);

  useEffect(() => { if (companyId) void loadExisting(); }, [companyId, loadExisting]);

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressBanner(file);
    setBannerFile(compressed);
    setBannerPreview(URL.createObjectURL(compressed));
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setExistingBannerUrl(null);
  };

  const handleDayToggle = (day: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open },
    }));
  };

  const handleTimeChange = (day: string, field: "openTime" | "closeTime", value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setMessage(null);

    let bannerUrl = existingBannerUrl;

    // Upload banner if new file
    if (bannerFile) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const path = `store-banners/${companyId}/${Date.now()}-banner.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, bannerFile, { upsert: true, contentType: "image/jpeg" });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          bannerUrl = urlData.publicUrl;
        }
      }
    }

    // If banner was removed
    if (!bannerPreview) bannerUrl = null;

    const payload = {
      company_id: companyId,
      store_name: storeName.trim() || null,
      description: description.trim() || null,
      banner_url: bannerUrl,
      theme_color: themeColor,
      operating_hours: operatingHours,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("store_settings")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("store_settings").update(payload).eq("company_id", companyId)
      : await supabase.from("store_settings").insert(payload);

    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: t("error") });
    } else {
      setMessage({ type: "success", text: t("saved") });
    }
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/business/store")} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div>
          <h1 className="app-title text-xl font-semibold">{t("title")}</h1>
          <p className="app-subtitle text-sm">{t("subtitle")}</p>
        </div>
      </div>

      <StepDots current={step} total={2} />

      {/* Step 1: Branding */}
      {step === 1 && (
        <div className="app-card space-y-5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700">{t("step1Title")}</h2>

          {/* Banner upload */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("bannerLabel")}</label>
            <p className="text-xs text-gray-400 mb-2">{t("bannerHint")}</p>
            {bannerPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={bannerPreview} alt="" className="h-36 w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-700 shadow hover:bg-white transition"
                  >
                    {t("changeBanner")}
                  </button>
                  <button onClick={removeBanner} className="rounded-lg bg-white/90 p-1 shadow hover:bg-white transition">
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => bannerInputRef.current?.click()}
                className="flex h-36 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 text-gray-400" />
                  <p className="mt-1 text-xs text-gray-500">{t("uploadBanner")}</p>
                </div>
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerSelect}
            />
          </div>

          {/* Store name */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("storeNameLabel")}</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder={t("storeNamePlaceholder")}
              className="app-input mt-1 w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="app-input mt-1 w-full resize-none"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            className="app-primary-btn w-full"
          >
            {t("next")}
          </button>
        </div>
      )}

      {/* Step 2: Theme Color + Operating Hours */}
      {step === 2 && (
        <div className="app-card space-y-5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700">{t("step2Title")}</h2>

          {/* Theme color */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("themeColorLabel")}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {THEME_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    themeColor === color ? "border-gray-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border-0 p-0"
              />
            </div>
          </div>

          {/* Operating hours */}
          <div>
            <label className="text-xs font-medium text-gray-600">{t("operatingHoursLabel")}</label>
            <div className="mt-2 space-y-2">
              {DAYS.map((day) => {
                const dayHours = operatingHours[day];
                return (
                  <div key={day} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <button
                      onClick={() => handleDayToggle(day)}
                      className={`h-5 w-9 rounded-full transition-colors ${dayHours.open ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${dayHours.open ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="w-14 text-xs font-medium text-gray-700">{t(`days.${day}`)}</span>
                    {dayHours.open ? (
                      <div className="flex flex-1 items-center gap-1.5">
                        <input
                          type="time"
                          value={dayHours.openTime}
                          onChange={(e) => handleTimeChange(day, "openTime", e.target.value)}
                          className="app-input text-xs flex-1 min-w-0 px-2 py-1"
                        />
                        <span className="text-xs text-gray-400">–</span>
                        <input
                          type="time"
                          value={dayHours.closeTime}
                          onChange={(e) => handleTimeChange(day, "closeTime", e.target.value)}
                          className="app-input text-xs flex-1 min-w-0 px-2 py-1"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{t("closed")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {message && (
            <p className={`text-xs text-center ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="app-secondary-btn flex-1">
              {t("back")}
            </button>
            <button onClick={handleSave} disabled={saving} className="app-primary-btn flex-1 disabled:opacity-50">
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
