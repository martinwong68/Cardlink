"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Building, ChevronLeft, Image as ImageIcon, Mail, MapPin, Briefcase, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";

import { useActiveCompany } from "@/components/business/useActiveCompany";
import { createClient } from "@/src/lib/supabase/client";

const COMPANY_ASSETS_BUCKET = "company-assets";
const LOGO_MAX_DIMENSION = 512;
const COVER_MAX_DIMENSION = 1920;
const IMAGE_JPEG_QUALITY = 0.8;

const compressImage = async (file: File, maxDimension: number, fileName: string): Promise<File> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to compress image."))),
        "image/jpeg",
        IMAGE_JPEG_QUALITY,
      );
    });
    return new File([blob], fileName, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

type CompanyData = {
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  email: string;
  phone: string;
  website: string;
  business_type: string;
};

type ProfileData = {
  industry: string;
  company_size: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_region: string;
  postal_code: string;
  country: string;
};

const EMPTY_COMPANY: CompanyData = {
  name: "",
  description: "",
  logo_url: "",
  cover_url: "",
  email: "",
  phone: "",
  website: "",
  business_type: "",
};

const EMPTY_PROFILE: ProfileData = {
  industry: "",
  company_size: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state_region: "",
  postal_code: "",
  country: "",
};

export default function CompanyProfileSettingsPage() {
  const t = useTranslations("companyProfileSettings");
  const { companyId, loading } = useActiveCompany();

  const [company, setCompany] = useState<CompanyData>(EMPTY_COMPANY);
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch("/api/company-management/profile", {
        headers: { "x-cardlink-app-scope": "business" },
      });
      if (!res.ok) {
        setLoadError(t("loadError"));
        return;
      }
      const json = await res.json();
      if (json.company) {
        setCompany({
          name: json.company.name ?? "",
          description: json.company.description ?? "",
          logo_url: json.company.logo_url ?? "",
          cover_url: json.company.cover_url ?? "",
          email: json.company.email ?? "",
          phone: json.company.phone ?? "",
          website: json.company.website ?? "",
          business_type: json.company.business_type ?? "",
        });
      }
      if (json.profile) {
        setProfile({
          industry: json.profile.industry ?? "",
          company_size: json.profile.company_size ?? "",
          address_line1: json.profile.address_line1 ?? "",
          address_line2: json.profile.address_line2 ?? "",
          city: json.profile.city ?? "",
          state_region: json.profile.state_region ?? "",
          postal_code: json.profile.postal_code ?? "",
          country: json.profile.country ?? "",
        });
      }
    } catch {
      setLoadError(t("loadError"));
    }
  }, [companyId, t]);

  useEffect(() => {
    if (!loading && companyId) void loadData();
  }, [loading, companyId, loadData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/company-management/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-cardlink-app-scope": "business",
        },
        body: JSON.stringify({
          company_id: companyId,
          ...company,
          ...profile,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? t("error"));
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError(t("error"));
    }
    setSaving(false);
  };

  const handleUploadImage = async (file: File, kind: "logo" | "cover") => {
    if (!companyId) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    const setter = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    setError(null);

    try {
      const maxDim = kind === "logo" ? LOGO_MAX_DIMENSION : COVER_MAX_DIMENSION;
      const fileName = kind === "logo" ? "logo.jpg" : "cover.jpg";
      const compressed = await compressImage(file, maxDim, fileName);

      const supabase = createClient();
      const storagePath = `${companyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(COMPANY_ASSETS_BUCKET)
        .upload(storagePath, compressed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        setError(uploadError.message);
        setter(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from(COMPANY_ASSETS_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      if (kind === "logo") {
        setCompany((prev) => ({ ...prev, logo_url: publicUrl }));
      } else {
        setCompany((prev) => ({ ...prev, cover_url: publicUrl }));
      }
    } catch {
      setError("Failed to upload image.");
    }
    setter(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/business/settings" className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800">{t("title")}</h1>
        </div>
        <div className="app-card p-5 text-center">
          <p className="text-sm text-red-500">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/business/settings"
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-gray-100 transition"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-800">{t("title")}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("basicInfo")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("name")}</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              placeholder={t("namePlaceholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("description")}</label>
            <textarea
              value={company.description}
              onChange={(e) => setCompany({ ...company, description: e.target.value })}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="app-input text-sm w-full resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("businessType")}</label>
            <select
              value={company.business_type}
              onChange={(e) => setCompany({ ...company, business_type: e.target.value })}
              className="app-input text-sm w-full"
            >
              <option value="">—</option>
              <option value="sole_proprietorship">Sole Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="corporation">Corporation</option>
              <option value="llc">LLC</option>
              <option value="non_profit">Non-Profit</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-pink-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("branding")}</h2>
        </div>
        <div className="space-y-4">
          {/* Logo Upload */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("logoUrl")}</label>
            <div className="flex items-start gap-3">
              {company.logo_url && (
                <NextImage
                  src={company.logo_url}
                  alt="Company logo"
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-xl object-cover border border-gray-100"
                />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={company.logo_url}
                  onChange={(e) => setCompany({ ...company, logo_url: e.target.value })}
                  placeholder={t("logoUrlPlaceholder")}
                  className="app-input text-sm w-full"
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadImage(file, "logo");
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploadingLogo ? "Uploading…" : "Upload Logo"}
                </button>
              </div>
            </div>
          </div>

          {/* Cover Upload */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("coverUrl")}</label>
            <div className="space-y-2">
              {company.cover_url && (
                <NextImage
                  src={company.cover_url}
                  alt="Company cover"
                  width={800}
                  height={200}
                  unoptimized
                  className="h-32 w-full rounded-xl object-cover border border-gray-100"
                />
              )}
              <input
                type="text"
                value={company.cover_url}
                onChange={(e) => setCompany({ ...company, cover_url: e.target.value })}
                placeholder={t("coverUrlPlaceholder")}
                className="app-input text-sm w-full"
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadImage(file, "cover");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploadingCover ? "Uploading…" : "Upload Background"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("contactInfo")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("email")}</label>
            <input
              type="email"
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
              placeholder={t("emailPlaceholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("phone")}</label>
            <input
              type="tel"
              value={company.phone}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
              placeholder={t("phonePlaceholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("website")}</label>
            <input
              type="url"
              value={company.website}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
              placeholder={t("websitePlaceholder")}
              className="app-input text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("address")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("addressLine1")}</label>
            <input
              type="text"
              value={profile.address_line1}
              onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
              placeholder={t("addressLine1Placeholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("addressLine2")}</label>
            <input
              type="text"
              value={profile.address_line2}
              onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
              placeholder={t("addressLine2Placeholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t("city")}</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder={t("cityPlaceholder")}
                className="app-input text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t("stateRegion")}</label>
              <input
                type="text"
                value={profile.state_region}
                onChange={(e) => setProfile({ ...profile, state_region: e.target.value })}
                placeholder={t("stateRegionPlaceholder")}
                className="app-input text-sm w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t("postalCode")}</label>
              <input
                type="text"
                value={profile.postal_code}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                placeholder={t("postalCodePlaceholder")}
                className="app-input text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{t("country")}</label>
              <input
                type="text"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                placeholder={t("countryPlaceholder")}
                className="app-input text-sm w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="app-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-800">{t("businessDetails")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("industry")}</label>
            <input
              type="text"
              value={profile.industry}
              onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
              placeholder={t("industryPlaceholder")}
              className="app-input text-sm w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">{t("companySize")}</label>
            <select
              value={profile.company_size}
              onChange={(e) => setProfile({ ...profile, company_size: e.target.value })}
              className="app-input text-sm w-full"
            >
              <option value="">—</option>
              <option value="1-5">1–5</option>
              <option value="6-20">6–20</option>
              <option value="21-50">21–50</option>
              <option value="50+">50+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !company.name.trim()}
        className="app-primary-btn w-full py-3 text-sm font-medium disabled:opacity-50"
      >
        {saved ? t("saved") : saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
