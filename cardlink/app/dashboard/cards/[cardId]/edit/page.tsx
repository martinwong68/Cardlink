"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { createClient } from "@/src/lib/supabase/client";
import TemplateSelector from "@/components/TemplateSelector";
import TemplateRenderer from "@/components/templates/TemplateRenderer";
import type { TemplateId } from "@/src/lib/templates";

const fieldTypes = [
  "Phone",
  "Email",
  "WhatsApp",
  "LinkedIn",
  "WeChat",
  "Telegram",
  "Instagram",
  "Twitter",
  "Website",
] as const;

const fieldTypeLabelMap: Record<(typeof fieldTypes)[number], string> = {
  Phone: "電話",
  Email: "電子郵件",
  WhatsApp: "WhatsApp",
  LinkedIn: "LinkedIn",
  WeChat: "微信",
  Telegram: "Telegram",
  Instagram: "Instagram",
  Twitter: "Twitter",
  Website: "網站",
};

const visibilityOptions = ["public", "friends", "hidden"] as const;

const visibilityLabelMap: Record<(typeof visibilityOptions)[number], string> = {
  public: "公開",
  friends: "好友",
  hidden: "隱藏",
};

type Visibility = (typeof visibilityOptions)[number];

type FieldState = {
  id?: string;
  field_type: string;
  field_label: string;
  field_value: string;
  visibility: Visibility;
};

type LinkState = {
  id?: string;
  label: string;
  url: string;
  icon: string;
};

type ExperienceState = {
  id?: string;
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
};

type CardState = {
  id: string;
  card_name: string;
  full_name: string;
  title: string;
  company: string;
  bio: string;
  slug: string;
  background_pattern: string;
  background_color: string;
  template: TemplateId | null;
};

const coreTemplateIds: TemplateId[] = [
  "classic-business",
  "minimalist",
  "modern-tech",
];

const coreTemplateSet = new Set<TemplateId>(coreTemplateIds);

const patternOptions = [
  "gradient-1",
  "gradient-2",
  "gradient-3",
  "gradient-4",
  "gradient-5",
  "pattern-dots",
  "pattern-waves",
  "pattern-grid",
  "pattern-circles",
  "pattern-topography",
];

const patternClassMap: Record<string, string> = {
  "gradient-1": "cardlink-pattern-gradient-1",
  "gradient-2": "cardlink-pattern-gradient-2",
  "gradient-3": "cardlink-pattern-gradient-3",
  "gradient-4": "cardlink-pattern-gradient-4",
  "gradient-5": "cardlink-pattern-gradient-5",
  "pattern-dots": "cardlink-pattern-dots",
  "pattern-waves": "cardlink-pattern-waves",
  "pattern-grid": "cardlink-pattern-grid",
  "pattern-circles": "cardlink-pattern-circles",
  "pattern-topography": "cardlink-pattern-topography",
};

const createClientId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

const colorOptions = [
  "#4f46e5",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#10b981",
  "#f97316",
  "#f43f5e",
  "#111827",
  "#a855f7",
  "#f59e0b",
];

const AVATAR_BUCKET = "avatars";
const AVATAR_FILE_NAME = "avatar.jpg";
const AVATAR_MAX_DIMENSION = 1024;
const AVATAR_JPEG_QUALITY = 0.8;

const extractAvatarStoragePath = (avatarPublicUrl: string | null | undefined) => {
  if (!avatarPublicUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = avatarPublicUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const rawPath = avatarPublicUrl.slice(markerIndex + marker.length);
  const [pathWithoutQuery] = rawPath.split("?");
  const decodedPath = decodeURIComponent(pathWithoutQuery || "");

  return decodedPath || null;
};

const compressAvatarImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("圖片讀取失敗"));
      img.src = objectUrl;
    });

    const longestSide = Math.max(image.width, image.height);
    const scale =
      longestSide > AVATAR_MAX_DIMENSION
        ? AVATAR_MAX_DIMENSION / longestSide
        : 1;

    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("無法處理圖片壓縮");
    }

    context.drawImage(image, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("圖片壓縮失敗"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        AVATAR_JPEG_QUALITY
      );
    });

    return new File([compressedBlob], AVATAR_FILE_NAME, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const contactPreviewClasses: Record<string, string> = {
  Phone: "bg-emerald-500",
  Email: "bg-red-500",
  WhatsApp: "bg-emerald-600",
  LinkedIn: "bg-sky-600",
  WeChat: "bg-green-600",
  Telegram: "bg-sky-500",
  Instagram: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400",
  Twitter: "bg-slate-900",
  Website: "bg-indigo-600",
};

function moveItem<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [removed] = copy.splice(from, 1);
  copy.splice(to, 0, removed);
  return copy;
}

function formatDateRange(start: string, end: string) {
  const startLabel = start.trim();
  const endLabel = end.trim() || "至今";
  if (!startLabel && !endLabel) {
    return "";
  }
  return `${startLabel} — ${endLabel}`.trim();
}

export default function CardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const cardId = typeof params.cardId === "string" ? params.cardId : "";
  const isCompanyCardMode = searchParams.get("mode") === "company";

  const [card, setCard] = useState<CardState | null>(null);
  const [fields, setFields] = useState<FieldState[]>([]);
  const [links, setLinks] = useState<LinkState[]>([]);
  const [experiences, setExperiences] = useState<ExperienceState[]>([]);
  const [removedFieldIds, setRemovedFieldIds] = useState<string[]>([]);
  const [removedLinkIds, setRemovedLinkIds] = useState<string[]>([]);
  const [removedExperienceIds, setRemovedExperienceIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [viewerPlan, setViewerPlan] = useState<"free" | "premium">("free");

  const loadCard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("請先登入以編輯你的名片。");
      setIsLoading(false);
      return;
    }

    const [{ data: cardData, error: cardError }, { data: profileData }, { data: adminCompanyData }, { data: adminRoleData }] =
      await Promise.all([
        (isCompanyCardMode
          ? supabase
              .from("business_cards")
              .select(
                "id, user_id, card_name, full_name, title, company, bio, slug, background_pattern, background_color, template, card_fields(id, field_type, field_label, field_value, visibility, sort_order), card_links(id, label, url, icon, sort_order), card_experiences(id, role, company, start_date, end_date, description, sort_order)"
              )
              .eq("id", cardId)
              .order("sort_order", { foreignTable: "card_fields", ascending: true })
              .order("sort_order", { foreignTable: "card_links", ascending: true })
              .order("sort_order", {
                foreignTable: "card_experiences",
                ascending: true,
              })
              .maybeSingle()
          : supabase
              .from("business_cards")
              .select(
                "id, user_id, card_name, full_name, title, company, bio, slug, background_pattern, background_color, template, card_fields(id, field_type, field_label, field_value, visibility, sort_order), card_links(id, label, url, icon, sort_order), card_experiences(id, role, company, start_date, end_date, description, sort_order)"
              )
              .eq("id", cardId)
              .eq("user_id", userData.user.id)
              .order("sort_order", { foreignTable: "card_fields", ascending: true })
              .order("sort_order", { foreignTable: "card_links", ascending: true })
              .order("sort_order", {
                foreignTable: "card_experiences",
                ascending: true,
              })
              .maybeSingle()),
        supabase
          .from("profiles")
          .select("avatar_url, plan")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase.rpc("get_my_admin_company_ids"),
        supabase
          .from("company_members")
          .select("company_id, role, status")
          .eq("user_id", userData.user.id)
          .eq("status", "active"),
      ]);

    if (cardError || !cardData) {
      setMessage(cardError?.message ?? "找不到名片。");
      setIsLoading(false);
      return;
    }

    if (isCompanyCardMode) {
      const ownerUserId = (cardData as { user_id?: string | null }).user_id ?? null;
      if (!ownerUserId) {
        setMessage("找不到公司名片擁有者。");
        setIsLoading(false);
        return;
      }

      const rpcAdminIds = ((adminCompanyData ?? []) as { company_id: string }[]).map(
        (item) => item.company_id
      );
      const roleAdminIds = ((adminRoleData ?? []) as { company_id: string; role: string }[])
        .filter((item) =>
          ["owner", "admin", "manager", "company_owner", "company_admin"].includes(
            (item.role ?? "").toLowerCase()
          )
        )
        .map((item) => item.company_id);

      const adminCompanyIds = Array.from(new Set([...rpcAdminIds, ...roleAdminIds]));

      if (!adminCompanyIds.length) {
        setMessage("你沒有公司管理權限。");
        setIsLoading(false);
        return;
      }

      const { data: ownerMembershipRows, error: ownerMembershipError } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", ownerUserId)
        .eq("status", "active");

      if (ownerMembershipError) {
        setMessage(ownerMembershipError.message);
        setIsLoading(false);
        return;
      }

      const ownerCompanyIds = new Set(
        ((ownerMembershipRows ?? []) as { company_id: string }[]).map((item) => item.company_id)
      );

      const hasAccess = adminCompanyIds.some((companyId) => ownerCompanyIds.has(companyId));
      if (!hasAccess) {
        setMessage("你沒有權限編輯這張公司名片。");
        setIsLoading(false);
        return;
      }
    }

    const savedTemplate = (cardData.template as TemplateId | null) ?? "classic-business";

    setCard({
      id: cardData.id,
      card_name: cardData.card_name ?? "My Card",
      full_name: isCompanyCardMode ? "" : cardData.full_name ?? "",
      title: cardData.title ?? "",
      company: cardData.company ?? "",
      bio: cardData.bio ?? "",
      slug: cardData.slug ?? "",
      background_pattern: cardData.background_pattern ?? "gradient-1",
      background_color: cardData.background_color ?? "#6366f1",
      template: coreTemplateSet.has(savedTemplate)
        ? savedTemplate
        : "classic-business",
    });

    setViewerPlan(profileData?.plan === "premium" ? "premium" : "free");

    setFields(
      (cardData.card_fields ?? []).map((field) => ({
        id: field.id,
        field_type: field.field_type,
        field_label: field.field_label ?? field.field_type,
        field_value: field.field_value,
        visibility: field.visibility,
      }))
    );

    setLinks(
      (cardData.card_links ?? []).map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        icon: link.icon ?? "",
      }))
    );

    setExperiences(
      (cardData.card_experiences ?? []).map((experience) => ({
        id: experience.id,
        role: experience.role,
        company: experience.company,
        start_date: experience.start_date ?? "",
        end_date: experience.end_date ?? "",
        description: experience.description ?? "",
      }))
    );

    setAvatarUrl(profileData?.avatar_url ?? "");
    setIsLoading(false);
  };

  useEffect(() => {
    void loadCard();
  }, [cardId, isCompanyCardMode]);

  const updateField = (index: number, updates: Partial<FieldState>) => {
    setFields((prev) =>
      prev.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field
      )
    );
  };

  const updateLink = (index: number, updates: Partial<LinkState>) => {
    setLinks((prev) =>
      prev.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...updates } : link
      )
    );
  };

  const updateExperience = (index: number, updates: Partial<ExperienceState>) => {
    setExperiences((prev) =>
      prev.map((experience, experienceIndex) =>
        experienceIndex === index ? { ...experience, ...updates } : experience
      )
    );
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: createClientId(),
        field_type: "Phone",
        field_label: "Phone",
        field_value: "",
        visibility: "public",
      },
    ]);
  };

  const addLink = () => {
    setLinks((prev) => [...prev, { label: "", url: "", icon: "" }]);
  };

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      { role: "", company: "", start_date: "", end_date: "", description: "" },
    ]);
  };

  const removeField = (index: number) => {
    setFields((prev) => {
      const target = prev[index];
      if (target?.id) {
        setRemovedFieldIds((ids) => [...ids, target.id!]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const removeLink = (index: number) => {
    setLinks((prev) => {
      const target = prev[index];
      if (target?.id) {
        setRemovedLinkIds((ids) => [...ids, target.id!]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const removeExperience = (index: number) => {
    setExperiences((prev) => {
      const target = prev[index];
      if (target?.id) {
        setRemovedExperienceIds((ids) => [...ids, target.id!]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleUploadAvatar = async (file: File) => {
    setIsUploading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("請先登入以上傳頭像。");
      setIsUploading(false);
      return;
    }

    let compressedFile: File;
    try {
      compressedFile = await compressAvatarImage(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "圖片壓縮失敗");
      setIsUploading(false);
      return;
    }

    const filePath = `${userData.user.id}/${AVATAR_FILE_NAME}`;
    const previousStoragePath = extractAvatarStoragePath(avatarUrl);

    if (previousStoragePath && previousStoragePath !== filePath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([previousStoragePath]);
    }

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, compressedFile, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userData.user.id);

    if (updateError) {
      setMessage(updateError.message);
      setIsUploading(false);
      return;
    }

    setAvatarUrl(`${publicUrl}?v=${Date.now()}`);
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!card) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("請先登入以儲存名片。");
      setIsSaving(false);
      return;
    }

    let cardUpdateQuery = supabase
      .from("business_cards")
      .update({
        card_name: card.card_name.trim(),
        full_name: isCompanyCardMode ? null : card.full_name.trim(),
        title: card.title.trim(),
        company: card.company.trim(),
        bio: card.bio.trim(),
        background_pattern: card.background_pattern,
        background_color: card.background_color,
        template: card.template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id);

    if (!isCompanyCardMode) {
      cardUpdateQuery = cardUpdateQuery.eq("user_id", userData.user.id);
    }

    const { error: cardError } = await cardUpdateQuery;

    if (cardError) {
      setMessage(cardError.message);
      setIsSaving(false);
      return;
    }

    const cleanedFields = fields
      .map((field, index) => {
        const payload = {
          card_id: card.id,
          field_type: field.field_type,
          field_label: field.field_label.trim() || field.field_type,
          field_value: field.field_value.trim(),
          visibility: field.visibility,
          sort_order: index,
        };

        const fieldId = field.id ?? createClientId();
        return { id: fieldId, ...payload };
      })
      .filter((field) => field.field_value !== "");

    const cleanedLinks = links
      .map((link, index) => {
        const payload = {
          card_id: card.id,
          label: link.label.trim(),
          url: link.url.trim(),
          icon: link.icon.trim() || "link",
          sort_order: index,
        };

        return link.id ? { id: link.id, ...payload } : payload;
      })
      .filter((link) => link.label !== "" && link.url !== "");

    const cleanedExperiences = experiences
      .map((experience, index) => {
        const payload = {
          card_id: card.id,
          role: experience.role.trim(),
          company: experience.company.trim(),
          start_date: experience.start_date.trim() || null,
          end_date: experience.end_date.trim() || null,
          description: experience.description.trim() || null,
          sort_order: index,
        };

        return experience.id ? { id: experience.id, ...payload } : payload;
      })
      .filter((experience) => experience.role !== "" && experience.company !== "");

    if (cleanedFields.length > 0) {
      const { error } = await supabase.from("card_fields").upsert(cleanedFields, {
        onConflict: "id",
      });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (cleanedLinks.length > 0) {
      const { error } = await supabase.from("card_links").upsert(cleanedLinks, {
        onConflict: "id",
      });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (cleanedExperiences.length > 0) {
      const { error } = await supabase
        .from("card_experiences")
        .upsert(cleanedExperiences, { onConflict: "id" });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (removedFieldIds.length > 0) {
      const { error } = await supabase
        .from("card_fields")
        .delete()
        .in("id", removedFieldIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedFieldIds([]);
    }

    if (removedLinkIds.length > 0) {
      const { error } = await supabase
        .from("card_links")
        .delete()
        .in("id", removedLinkIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedLinkIds([]);
    }

    if (removedExperienceIds.length > 0) {
      const { error } = await supabase
        .from("card_experiences")
        .delete()
        .in("id", removedExperienceIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedExperienceIds([]);
    }

    setMessage("名片已成功儲存。");
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading editor...
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        {message ?? "Card not found."}
      </div>
    );
  }

  const patternClass =
    patternClassMap[card.background_pattern] ?? patternClassMap["gradient-1"];
  const previewTemplate = (card.template ?? "classic-business") as TemplateId;
  const previewFields = fields.map((field, index) => ({
    id: field.id ?? `preview-field-${index}`,
    field_type: field.field_type,
    field_label: field.field_label || field.field_type,
    field_value: field.field_value,
    visibility: field.visibility,
    sort_order: index,
  }));
  const previewLinks = links.map((link, index) => ({
    id: link.id ?? `preview-link-${index}`,
    label: link.label,
    url: link.url,
    icon: link.icon || null,
    sort_order: index,
  }));
  const previewExperiences = experiences.map((experience, index) => ({
    id: experience.id ?? `preview-experience-${index}`,
    role: experience.role,
    company: experience.company,
    start_date: experience.start_date || null,
    end_date: experience.end_date || null,
    description: experience.description || null,
    sort_order: index,
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
              CardLink
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">
              Edit Card
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/cards")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
            >
              Back
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Background Settings
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_200px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {patternOptions.map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() =>
                    setCard((prev) =>
                      prev
                        ? { ...prev, background_pattern: pattern }
                        : prev
                    )
                  }
                  className={`rounded-2xl border p-1 transition ${
                    card.background_pattern === pattern
                      ? "border-indigo-500"
                      : "border-slate-200"
                  }`}
                >
                  <div
                    className={`cardlink-cover ${
                      patternClassMap[pattern]
                    } h-16 w-full rounded-xl`}
                    style={{
                      "--cardlink-base": card.background_color,
                    } as React.CSSProperties}
                  />
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Color
                </label>
                <input
                  type="color"
                  value={card.background_color}
                  onChange={(event) =>
                    setCard((prev) =>
                      prev
                        ? { ...prev, background_color: event.target.value }
                        : prev
                    )
                  }
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setCard((prev) =>
                        prev ? { ...prev, background_color: color } : prev
                      )
                    }
                    className={`h-8 w-8 rounded-full border transition ${
                      card.background_color === color
                        ? "border-slate-900"
                        : "border-slate-200"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  預覽
                </p>
                <div
                  className={`cardlink-cover ${patternClass} mt-2 h-20 rounded-xl`}
                  style={{
                    "--cardlink-base": card.background_color,
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <TemplateSelector
            currentTemplate={card.template}
            isPremiumUser={viewerPlan === "premium"}
            onChange={(template) =>
              setCard((prev) => (prev ? { ...prev, template } : prev))
            }
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">個人頭像</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUploadAvatar(file);
                  }
                }}
              />
              {isUploading ? "上傳中..." : "上傳照片"}
            </label>
            <p className="text-xs text-slate-500">
              上傳前會自動壓縮，且每位使用者只保留一張頭像（新圖會覆蓋並清理舊圖）。
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">自我介紹與資訊</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="cardName">
                名片名稱
              </label>
              <input
                id="cardName"
                value={card.card_name}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, card_name: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            {!isCompanyCardMode ? (
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
                  全名
                </label>
                <input
                  id="fullName"
                  value={card.full_name}
                  onChange={(event) =>
                    setCard((prev) =>
                      prev ? { ...prev, full_name: event.target.value } : prev
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            ) : null}
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="title">
                職稱
              </label>
              <input
                id="title"
                value={card.title}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, title: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="company">
                公司
              </label>
              <input
                id="company"
                value={card.company}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, company: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="bio">
                簡介
              </label>
              <textarea
                id="bio"
                rows={4}
                value={card.bio}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, bio: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              聯絡欄位
            </h2>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> 新增
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-slate-500">尚未有欄位。</p>
            ) : null}
            {fields.map((field, index) => (
              <div
                key={field.id ?? `${field.field_type}-${index}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      類型
                    </label>
                    <select
                      value={field.field_type}
                      onChange={(event) =>
                        updateField(index, { field_type: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {fieldTypeLabelMap[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      值
                    </label>
                    <input
                      value={field.field_value}
                      onChange={(event) =>
                        updateField(index, { field_value: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      標籤
                    </label>
                    <input
                      value={field.field_label}
                      onChange={(event) =>
                        updateField(index, { field_label: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      可見性
                    </label>
                    <select
                      value={field.visibility}
                      onChange={(event) =>
                        updateField(index, {
                          visibility: event.target.value as Visibility,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {visibilityLabelMap[option]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                      contactPreviewClasses[field.field_type] ?? "bg-slate-600"
                    }`}
                  >
                    {field.field_label || field.field_type}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        index > 0 &&
                        setFields((prev) => moveItem(prev, index, index - 1))
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < fields.length - 1 &&
                        setFields((prev) => moveItem(prev, index, index + 1))
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">連結</h2>
            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> 新增
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {links.length === 0 ? (
              <p className="text-sm text-slate-500">尚未有連結。</p>
            ) : null}
            {links.map((link, index) => (
              <div
                key={link.id ?? `link-${index}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      標籤
                    </label>
                    <input
                      value={link.label}
                      onChange={(event) =>
                        updateLink(index, { label: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      網址
                    </label>
                    <input
                      value={link.url}
                      onChange={(event) =>
                        updateLink(index, { url: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      圖示
                    </label>
                    <input
                      value={link.icon}
                      onChange={(event) =>
                        updateLink(index, { icon: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <span className="text-sm text-slate-500">預覽：</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {link.icon || "🔗"} {link.label || "連結"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        index > 0 &&
                        setLinks((prev) => moveItem(prev, index, index - 1))
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < links.length - 1 &&
                        setLinks((prev) => moveItem(prev, index, index + 1))
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">經歷</h2>
            <button
              type="button"
              onClick={addExperience}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> 新增
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {experiences.length === 0 ? (
              <p className="text-sm text-slate-500">尚未有經歷。</p>
            ) : null}
            {experiences.map((experience, index) => (
              <div
                key={experience.id ?? `experience-${index}`}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      職位
                    </label>
                    <input
                      value={experience.role}
                      onChange={(event) =>
                        updateExperience(index, { role: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      公司
                    </label>
                    <input
                      value={experience.company}
                      onChange={(event) =>
                        updateExperience(index, { company: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      開始日期
                    </label>
                    <input
                      value={experience.start_date}
                      onChange={(event) =>
                        updateExperience(index, { start_date: event.target.value })
                      }
                      placeholder="2020-01"
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      結束日期
                    </label>
                    <input
                      value={experience.end_date}
                      onChange={(event) =>
                        updateExperience(index, { end_date: event.target.value })
                      }
                      placeholder="至今"
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      描述
                    </label>
                    <textarea
                      rows={3}
                      value={experience.description}
                      onChange={(event) =>
                        updateExperience(index, { description: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {formatDateRange(experience.start_date, experience.end_date)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        index > 0 &&
                        setExperiences((prev) =>
                          moveItem(prev, index, index - 1)
                        )
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < experiences.length - 1 &&
                        setExperiences((prev) =>
                          moveItem(prev, index, index + 1)
                        )
                      }
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {message ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {message}
          </p>
        ) : null}
      </div>

      <aside
        className={`space-y-4 lg:sticky lg:top-24 ${
          showPreview ? "block" : "hidden lg:block"
        }`}
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Live Preview
          </p>
          <div className="mt-4 max-h-[74vh] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-100">
            <div className="pointer-events-none">
              <TemplateRenderer
                template={previewTemplate}
                fullName={isCompanyCardMode ? card.card_name || "Company Card" : card.full_name || "Your Name"}
                title={card.title || null}
                company={card.company || null}
                bio={card.bio || null}
                slug={card.slug || card.id}
                avatarUrl={avatarUrl || null}
                backgroundPattern={card.background_pattern}
                backgroundColor={card.background_color}
                vcardHref="#"
                cardFields={previewFields}
                cardLinks={previewLinks}
                cardExperiences={previewExperiences}
                ownerId={card.id}
                viewerId={null}
                viewerPlan={"free"}
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
