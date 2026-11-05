"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";
import {
  CardlinkApiError,
  getMyCard,
  patchMyCard,
} from "@/src/lib/cardlink-api";
import { getSupabaseAccessToken } from "@/src/lib/cardlink-api/auth-token";
import { resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import type { TemplateId } from "@/src/lib/templates";
import InkSignalCard from "@/components/namecard/InkSignalCard";
import NfcBindPanel from "@/components/namecard/NfcBindPanel";

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

const visibilityOptions = ["public", "friends", "hidden"] as const;

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
  background_image_url: string | null;
  template: TemplateId;
};

function normalizeTemplateId(template: string | null | undefined): TemplateId {
  if (template === "fullscreen-hero-tabs") {
    return "fullscreen-hero-tabs";
  }
  if (template === "minimal-editorial") {
    return "minimal-editorial";
  }
  if (template === "profile-community") {
    return "profile-community";
  }
  return "classic-business";
}

// Kept for legacy background upload helpers (UI hidden in Ink Signal phase 1).
const BACKGROUND_BUCKET = "avatars";
const BACKGROUND_FILE_NAME = "background.jpg";
const BACKGROUND_MAX_DIMENSION = 1920;
const BACKGROUND_JPEG_QUALITY = 0.85;
const BACKGROUND_MAX_SIZE_BYTES = 500 * 1024;

const contactPreviewClasses: Record<string, string> = {
  Phone: "bg-emerald-500",
  Email: "bg-rose-500",
  WhatsApp: "bg-emerald-600",
  LinkedIn: "bg-sky-600",
  WeChat: "bg-green-600",
  Telegram: "bg-sky-500",
  Instagram: "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-amber-400",
  Twitter: "bg-gray-900",
  Website: "bg-indigo-600",
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

const FREE_CONTACT_FIELDS_LIMIT = 2;
const FREE_LINKS_LIMIT = 2;

function moveItem<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [removed] = copy.splice(from, 1);
  copy.splice(to, 0, removed);
  return copy;
}

function formatDateRange(start: string, end: string, presentLabel: string) {
  const startLabel = start.trim();
  const endLabel = end.trim() || presentLabel;
  if (!startLabel && !endLabel) {
    return "";
  }
  return `${startLabel} — ${endLabel}`.trim();
}

const extractStoragePath = (publicUrl: string | null | undefined, bucket: string) => {
  if (!publicUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const rawPath = publicUrl.slice(markerIndex + marker.length);
  const [pathWithoutQuery] = rawPath.split("?");
  const decodedPath = decodeURIComponent(pathWithoutQuery || "");

  return decodedPath || null;
};

const compressBackgroundImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = objectUrl;
    });

    const longestSide = Math.max(image.width, image.height);
    const scale =
      longestSide > BACKGROUND_MAX_DIMENSION
        ? BACKGROUND_MAX_DIMENSION / longestSide
        : 1;

    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to process image.");
    }

    context.drawImage(image, 0, 0, width, height);

    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        BACKGROUND_JPEG_QUALITY
      );
    });

    if (compressedBlob.size > BACKGROUND_MAX_SIZE_BYTES) {
      throw new Error("BACKGROUND_IMAGE_TOO_LARGE_AFTER_COMPRESSION");
    }

    return new File([compressedBlob], BACKGROUND_FILE_NAME, {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default function CardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("cardEditor");
  const cardId = typeof params.cardId === "string" ? params.cardId : "";

  const fieldTypeLabels: Record<string, string> = {
    Phone: t("fieldTypes.phone"),
    Email: t("fieldTypes.email"),
    WhatsApp: t("fieldTypes.whatsapp"),
    LinkedIn: t("fieldTypes.linkedin"),
    WeChat: t("fieldTypes.wechat"),
    Telegram: t("fieldTypes.telegram"),
    Instagram: t("fieldTypes.instagram"),
    Twitter: t("fieldTypes.twitter"),
    Website: t("fieldTypes.website"),
  };

  const visibilityLabels: Record<Visibility, string> = {
    public: t("visibility.public"),
    friends: t("visibility.friends"),
    hidden: t("visibility.hidden"),
  };

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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [boundNfcUids, setBoundNfcUids] = useState<string[]>([]);

  const isFreePlan = viewerPlan === "free";

  const loadCard = async () => {
    setIsLoading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInEdit"));
      setIsLoading(false);
      return;
    }

    const token = await getSupabaseAccessToken(supabase);
    if (!token) {
      setMessage(t("errors.signInEdit"));
      setIsLoading(false);
      return;
    }

    // Plan / avatar still from Supabase Auth profile; card body from backend.
    const { data: profileData } = await supabase
      .from("profiles")
      .select("avatar_url, plan, premium_until")
      .eq("id", userData.user.id)
      .maybeSingle();

    let cardData;
    try {
      cardData = await getMyCard(token);
    } catch (error) {
      const msg =
        error instanceof CardlinkApiError
          ? error.message
          : t("errors.notFound");
      setMessage(msg);
      setIsLoading(false);
      return;
    }

    if (!cardData || cardData.id !== cardId) {
      setMessage(t("errors.notFound"));
      setIsLoading(false);
      return;
    }

    setCard({
      id: cardData.id,
      card_name: cardData.card_name ?? t("defaults.cardName"),
      full_name: cardData.full_name ?? "",
      title: cardData.title ?? "",
      company: cardData.company ?? "",
      bio: cardData.bio ?? "",
      slug: cardData.slug ?? "",
      background_pattern: cardData.background_pattern ?? "gradient-1",
      background_color: cardData.background_color ?? "#6366f1",
      background_image_url: cardData.background_image_url ?? null,
      template: normalizeTemplateId(cardData.template),
    });

    setFields(
      (cardData.card_fields ?? []).map((field) => ({
        id: field.id,
        field_type: field.field_type,
        field_label:
          field.field_label ??
          fieldTypeLabels[field.field_type] ??
          field.field_type,
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

    setAvatarUrl(profileData?.avatar_url ?? cardData.profiles?.avatar_url ?? "");
    setViewerPlan(resolveEffectiveViewerPlan(profileData));
    setAccessToken(token);
    setBoundNfcUids(
      (cardData.nfc ?? [])
        .map((chip) => chip.nfc_uid)
        .filter((value): value is string => Boolean(value))
    );
    setIsLoading(false);
  };

  useEffect(() => {
    void loadCard();
  }, [cardId]);

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
    if (isFreePlan && fields.length >= FREE_CONTACT_FIELDS_LIMIT) {
      setMessage(
        t("errors.freePlanContactLimit", {
          count: FREE_CONTACT_FIELDS_LIMIT,
        })
      );
      return;
    }

    setFields((prev) => [
      ...prev,
      {
        id: createClientId(),
        field_type: "Phone",
        field_label: fieldTypeLabels.Phone ?? "Phone",
        field_value: "",
        visibility: "public",
      },
    ]);
  };

  const addLink = () => {
    if (isFreePlan && links.length >= FREE_LINKS_LIMIT) {
      setMessage(
        t("errors.freePlanLinkLimit", {
          count: FREE_LINKS_LIMIT,
        })
      );
      return;
    }

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
      setMessage(t("errors.signInUpload"));
      setIsUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `${userData.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
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

    setAvatarUrl(publicUrl);
    setIsUploading(false);
  };

  const handleUploadBackgroundImage = async (file: File) => {
    if (!card) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage(t("errors.invalidImageFile"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage(t("errors.backgroundTooLargeBeforeCompression"));
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInUpload"));
      setIsUploading(false);
      return;
    }

    let compressedFile: File;
    try {
      compressedFile = await compressBackgroundImage(file);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BACKGROUND_IMAGE_TOO_LARGE_AFTER_COMPRESSION"
      ) {
        setMessage(t("errors.backgroundTooLargeAfterCompression"));
      } else {
        setMessage(t("errors.backgroundProcessFailed"));
      }
      setIsUploading(false);
      return;
    }

    const folderPath = `${userData.user.id}/cards/${card.id}`;
    const filePath = `${folderPath}/${BACKGROUND_FILE_NAME}`;
    const previousStoragePath = extractStoragePath(card.background_image_url, BACKGROUND_BUCKET);

    if (previousStoragePath && previousStoragePath !== filePath) {
      await supabase.storage.from(BACKGROUND_BUCKET).remove([previousStoragePath]);
    }

    const { data: existingFiles } = await supabase.storage
      .from(BACKGROUND_BUCKET)
      .list(folderPath, { limit: 100 });

    const duplicatePaths = (existingFiles ?? [])
      .map((item) => item.name)
      .filter((name) => name !== BACKGROUND_FILE_NAME)
      .map((name) => `${folderPath}/${name}`);

    if (duplicatePaths.length > 0) {
      await supabase.storage.from(BACKGROUND_BUCKET).remove(duplicatePaths);
    }

    const { error: uploadError } = await supabase.storage
      .from(BACKGROUND_BUCKET)
      .upload(filePath, compressedFile, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BACKGROUND_BUCKET)
      .getPublicUrl(filePath);

    const nextBackgroundImageUrl = publicUrlData.publicUrl;

    const token = await getSupabaseAccessToken(supabase);
    if (!token) {
      setMessage(t("errors.signInUpload"));
      setIsUploading(false);
      return;
    }

    try {
      await patchMyCard(token, {
        background_image_url: nextBackgroundImageUrl,
      });
    } catch (error) {
      const msg =
        error instanceof CardlinkApiError
          ? error.message
          : t("errors.notFound");
      setMessage(msg);
      setIsUploading(false);
      return;
    }

    setCard((prev) =>
      prev
        ? {
            ...prev,
            background_image_url: nextBackgroundImageUrl,
          }
        : prev
    );
    setMessage(t("messages.backgroundUploaded"));
    setIsUploading(false);
  };

  const handleRemoveBackgroundImage = async () => {
    if (!card) {
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInUpload"));
      setIsUploading(false);
      return;
    }

    const previousStoragePath = extractStoragePath(
      card.background_image_url,
      BACKGROUND_BUCKET
    );

    if (previousStoragePath) {
      await supabase.storage.from(BACKGROUND_BUCKET).remove([previousStoragePath]);
    }

    const token = await getSupabaseAccessToken(supabase);
    if (!token) {
      setMessage(t("errors.signInUpload"));
      setIsUploading(false);
      return;
    }

    try {
      await patchMyCard(token, { background_image_url: null });
    } catch (error) {
      const msg =
        error instanceof CardlinkApiError
          ? error.message
          : t("errors.notFound");
      setMessage(msg);
      setIsUploading(false);
      return;
    }

    setCard((prev) =>
      prev
        ? {
            ...prev,
            background_image_url: null,
          }
        : prev
    );
    setMessage(t("messages.backgroundRemoved"));
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
      setMessage(t("errors.signInSave"));
      setIsSaving(false);
      return;
    }

    const token = await getSupabaseAccessToken(supabase);
    if (!token) {
      setMessage(t("errors.signInSave"));
      setIsSaving(false);
      return;
    }

    const cleanedFields = fields
      .map((field, index) => ({
        id: field.id,
        field_type: field.field_type,
        field_label: field.field_label.trim() || field.field_type,
        field_value: field.field_value.trim(),
        visibility: field.visibility,
        sort_order: index,
      }))
      .filter((field) => field.field_value !== "");

    const freeLimitedFields = isFreePlan
      ? cleanedFields.slice(0, FREE_CONTACT_FIELDS_LIMIT)
      : cleanedFields;

    const cleanedLinks = links
      .map((link, index) => ({
        id: link.id,
        label: link.label.trim(),
        url: link.url.trim(),
        icon: link.icon.trim() || "link",
        sort_order: index,
      }))
      .filter((link) => link.label !== "" && link.url !== "");

    const freeLimitedLinks = isFreePlan
      ? cleanedLinks.slice(0, FREE_LINKS_LIMIT)
      : cleanedLinks;

    const cleanedExperiences = experiences
      .map((experience, index) => ({
        id: experience.id,
        role: experience.role.trim(),
        company: experience.company.trim(),
        start_date: experience.start_date.trim() || null,
        end_date: experience.end_date.trim() || null,
        description: experience.description.trim() || null,
        sort_order: index,
      }))
      .filter((experience) => experience.role !== "" && experience.company !== "");

    const freeLimitedExperiences = isFreePlan ? [] : cleanedExperiences;

    try {
      // Card CRUD via Geekbobo-backend; never patch nfc_uid here.
      await patchMyCard(token, {
        card_name: card.card_name.trim(),
        full_name: card.full_name.trim(),
        title: card.title.trim(),
        company: card.company.trim(),
        bio: card.bio.trim(),
        background_pattern: card.background_pattern,
        background_color: card.background_color,
        background_image_url: card.background_image_url,
        template: card.template,
        card_fields: freeLimitedFields,
        card_links: freeLimitedLinks,
        card_experiences: freeLimitedExperiences,
      });
    } catch (error) {
      const msg =
        error instanceof CardlinkApiError
          ? error.message
          : t("errors.notFound");
      setMessage(msg);
      setIsSaving(false);
      return;
    }

    setRemovedFieldIds([]);
    setRemovedLinkIds([]);
    setRemovedExperienceIds([]);
    setMessage(t("messages.saved"));
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="ink-signal flex min-h-[60vh] items-center justify-center text-sm text-[color:var(--ink-muted)]">
        {t("messages.loading")}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="ink-signal mx-auto max-w-[420px] px-5 py-16 text-center">
        <h1 className="ink-signal-display text-[24px]">
          {message ?? t("errors.notFound")}
        </h1>
      </div>
    );
  }

  const previewFields = fields
    .filter((field) => field.visibility === "public")
    .map((field, index) => ({
      id: field.id ?? `field-${index}`,
      field_type: field.field_type,
      field_label: field.field_label,
      field_value: field.field_value,
      visibility: field.visibility,
      sort_order: index,
    }));
  const previewLinks = links.map((link, index) => ({
    id: link.id ?? `link-${index}`,
    label: link.label,
    url: link.url,
    icon: link.icon || null,
    sort_order: index,
  }));
  const previewExperiences = experiences.map((experience, index) => ({
    id: experience.id ?? `exp-${index}`,
    role: experience.role,
    company: experience.company,
    start_date: experience.start_date || null,
    end_date: experience.end_date || null,
    description: experience.description || null,
    sort_order: index,
  }));

  return (
    <div className="ink-signal min-h-screen">
    <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="space-y-6 pb-24 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="ink-signal-display text-[24px] md:text-[28px]">
              {t("title")}
            </h1>
            {card.slug ? (
              <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
                /c/{card.slug}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="ink-signal-btn-secondary !w-auto px-4 text-sm lg:hidden"
            >
              {showPreview ? t("actions.hidePreview") : t("actions.showPreview")}
            </button>
            {card.slug ? (
              <a
                href={`/c/${card.slug}`}
                target="_blank"
                rel="noreferrer"
                className="ink-signal-btn-secondary !w-auto px-4 text-sm"
              >
                {t("actions.viewPublic")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/dashboard/cards")}
              className="ink-signal-btn-secondary !w-auto px-4 text-sm"
            >
              {t("actions.back")}
            </button>
          </div>
        </div>

        <section className="border-b border-[color:var(--line)] pb-6">
          <h2 className="ink-signal-section-label !mb-4">
            {t("sections.profilePhoto")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600">
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
              {isUploading ? t("actions.uploading") : t("actions.uploadPhoto")}
            </label>
            <p className="text-xs text-gray-500">
              {t("misc.storageNote")}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("sections.bioInfo")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="cardName">
                {t("labels.cardName")}
              </label>
              <input
                id="cardName"
                value={card.card_name}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, card_name: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="fullName">
                {t("labels.fullName")}
              </label>
              <input
                id="fullName"
                value={card.full_name}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, full_name: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="title">
                {t("labels.title")}
              </label>
              <input
                id="title"
                value={card.title}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, title: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="company">
                {t("labels.company")}
              </label>
              <input
                id="company"
                value={card.company}
                onChange={(event) =>
                  setCard((prev) =>
                    prev ? { ...prev, company: event.target.value } : prev
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="bio">
                {t("labels.bio")}
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
                className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("sections.contactFields")}
            </h2>
            <button
              type="button"
              onClick={addField}
              disabled={isFreePlan && fields.length >= FREE_CONTACT_FIELDS_LIMIT}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> {t("actions.add")}
            </button>
          </div>
          {isFreePlan ? (
            <p className="mt-3 text-xs text-gray-500">
              {t("messages.freePlanContactLimit", {
                count: FREE_CONTACT_FIELDS_LIMIT,
              })}
            </p>
          ) : null}

          <div className="mt-4 space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500">{t("empty.fields")}</p>
            ) : null}
            {fields.map((field, index) => (
              <div
                key={field.id ?? `${field.field_type}-${index}`}
                className="rounded-2xl border border-gray-100 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.type")}
                    </label>
                    <select
                      value={field.field_type}
                      onChange={(event) =>
                        updateField(index, { field_type: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    >
                      {fieldTypes.map((type) => (
                        <option key={type} value={type}>
                          {fieldTypeLabels[type] ?? type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.value")}
                    </label>
                    <input
                      value={field.field_value}
                      onChange={(event) =>
                        updateField(index, { field_value: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.label")}
                    </label>
                    <input
                      value={field.field_label}
                      onChange={(event) =>
                        updateField(index, { field_label: event.target.value })
                      }
                      placeholder={fieldTypeLabels[field.field_type] ?? field.field_type}
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.visibility")}
                    </label>
                    <select
                      value={field.visibility}
                      onChange={(event) =>
                        updateField(index, {
                          visibility: event.target.value as Visibility,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {visibilityLabels[option]}
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
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < fields.length - 1 &&
                        setFields((prev) => moveItem(prev, index, index + 1))
                      }
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
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

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("sections.links")}
            </h2>
            <button
              type="button"
              onClick={addLink}
              disabled={isFreePlan && links.length >= FREE_LINKS_LIMIT}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> {t("actions.add")}
            </button>
          </div>
          {isFreePlan ? (
            <p className="mt-3 text-xs text-gray-500">
              {t("messages.freePlanLinkLimit", {
                count: FREE_LINKS_LIMIT,
              })}
            </p>
          ) : null}
          <div className="mt-4 space-y-4">
            {links.length === 0 ? (
              <p className="text-sm text-gray-500">{t("empty.links")}</p>
            ) : null}
            {links.map((link, index) => (
              <div
                key={link.id ?? `link-${index}`}
                className="rounded-2xl border border-gray-100 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.label")}
                    </label>
                    <input
                      value={link.label}
                      onChange={(event) =>
                        updateLink(index, { label: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.url")}
                    </label>
                    <input
                      value={link.url}
                      onChange={(event) =>
                        updateLink(index, { url: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.icon")}
                    </label>
                    <input
                      value={link.icon}
                      onChange={(event) =>
                        updateLink(index, { icon: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <span className="text-sm text-gray-500">{t("labels.preview")}:</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {link.icon || "🔗"} {link.label || t("placeholders.linkLabel")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        index > 0 &&
                        setLinks((prev) => moveItem(prev, index, index - 1))
                      }
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        index < links.length - 1 &&
                        setLinks((prev) => moveItem(prev, index, index + 1))
                      }
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
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

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("sections.experience")}
            </h2>
            <button
              type="button"
              onClick={addExperience}
              disabled={isFreePlan}
              className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" /> {t("actions.add")}
            </button>
          </div>
          {isFreePlan ? (
            <p className="mt-3 text-xs text-gray-500">
              {t("messages.freePlanNoExperience")}
            </p>
          ) : null}
          <div className="mt-4 space-y-4">
            {experiences.length === 0 ? (
              <p className="text-sm text-gray-500">{t("empty.experience")}</p>
            ) : null}
            {(isFreePlan ? [] : experiences).map((experience, index) => (
              <div
                key={experience.id ?? `experience-${index}`}
                className="rounded-2xl border border-gray-100 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.role")}
                    </label>
                    <input
                      value={experience.role}
                      onChange={(event) =>
                        updateExperience(index, { role: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.company")}
                    </label>
                    <input
                      value={experience.company}
                      onChange={(event) =>
                        updateExperience(index, { company: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.startDate")}
                    </label>
                    <input
                      value={experience.start_date}
                      onChange={(event) =>
                        updateExperience(index, { start_date: event.target.value })
                      }
                      placeholder={t("placeholders.startDate")}
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.endDate")}
                    </label>
                    <input
                      value={experience.end_date}
                      onChange={(event) =>
                        updateExperience(index, { end_date: event.target.value })
                      }
                      placeholder={t("placeholders.endDate")}
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase text-gray-500">
                      {t("labels.description")}
                    </label>
                    <textarea
                      rows={3}
                      value={experience.description}
                      onChange={(event) =>
                        updateExperience(index, { description: event.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatDateRange(
                      experience.start_date,
                      experience.end_date,
                      t("placeholders.present")
                    )}
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
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
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
                      className="rounded-full border border-gray-100 px-2 py-1 text-xs text-gray-500"
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

        <NfcBindPanel
          token={accessToken}
          boundUids={boundNfcUids}
          onBound={(uid) =>
            setBoundNfcUids((prev) => (prev.includes(uid) ? prev : [...prev, uid]))
          }
        />

        {message ? (
          <p
            className={`rounded-[10px] px-3 py-2 text-sm ${
              message === t("messages.saved")
                ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-pressed)]"
                : "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--line)] bg-[color:var(--paper-elevated)] px-5 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="ink-signal-btn-primary mx-auto flex max-w-[420px] items-center gap-2 lg:max-w-none"
          >
            <Save className="h-4 w-4" />
            {isSaving ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </div>

      <aside
        className={`lg:sticky lg:top-24 lg:self-start ${
          showPreview ? "block" : "hidden lg:block"
        }`}
      >
        <p className="ink-signal-section-label">{t("sections.livePreview")}</p>
        <div className="overflow-hidden rounded-[12px] border border-[color:var(--line)] bg-[color:var(--paper-elevated)]">
          <InkSignalCard
            compact
            fullName={card.full_name || t("placeholders.yourName")}
            title={card.title || null}
            company={card.company || null}
            bio={card.bio || null}
            slug={card.slug || "preview"}
            avatarUrl={avatarUrl || null}
            vcardHref="#"
            cardFields={previewFields}
            cardLinks={previewLinks}
            cardExperiences={previewExperiences}
          />
        </div>
      </aside>
    </div>
    </div>
  );
}
