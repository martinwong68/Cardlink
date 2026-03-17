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
import { resolveEffectiveViewerPlan } from "@/src/lib/visibility";
import TemplateSelector from "@/components/TemplateSelector";
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

const BACKGROUND_BUCKET = "avatars";
const BACKGROUND_FILE_NAME = "background.jpg";
const BACKGROUND_MAX_DIMENSION = 1920;
const BACKGROUND_JPEG_QUALITY = 0.85;
const BACKGROUND_MAX_SIZE_BYTES = 500 * 1024;

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

const FREE_CONTACT_FIELDS_LIMIT = 2;
const FREE_LINKS_LIMIT = 2;

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

    const [{ data: cardData, error: cardError }, { data: profileData }] =
      await Promise.all([
        supabase
          .from("business_cards")
          .select(
            "id, card_name, full_name, title, company, bio, slug, background_pattern, background_color, background_image_url, template, card_fields(id, field_type, field_label, field_value, visibility, sort_order), card_links(id, label, url, icon, sort_order), card_experiences(id, role, company, start_date, end_date, description, sort_order)"
          )
          .eq("id", cardId)
          .eq("user_id", userData.user.id)
          .order("sort_order", { foreignTable: "card_fields", ascending: true })
          .order("sort_order", { foreignTable: "card_links", ascending: true })
          .order("sort_order", {
            foreignTable: "card_experiences",
            ascending: true,
          })
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("avatar_url, plan, premium_until")
          .eq("id", userData.user.id)
          .maybeSingle(),
      ]);

    if (cardError || !cardData) {
      setMessage(cardError?.message ?? t("errors.notFound"));
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

    setAvatarUrl(profileData?.avatar_url ?? "");
    setViewerPlan(resolveEffectiveViewerPlan(profileData));
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

    const { error: updateError } = await supabase
      .from("business_cards")
      .update({
        background_image_url: nextBackgroundImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("user_id", userData.user.id);

    if (updateError) {
      setMessage(updateError.message);
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

    const { error: updateError } = await supabase
      .from("business_cards")
      .update({
        background_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("user_id", userData.user.id);

    if (updateError) {
      setMessage(updateError.message);
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

    const { error: cardError } = await supabase
      .from("business_cards")
      .update({
        card_name: card.card_name.trim(),
        full_name: card.full_name.trim(),
        title: card.title.trim(),
        company: card.company.trim(),
        bio: card.bio.trim(),
        background_pattern: card.background_pattern,
        background_color: card.background_color,
        background_image_url: card.background_image_url,
        template: card.template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", card.id)
      .eq("user_id", userData.user.id);

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

    const freeLimitedFields = isFreePlan
      ? cleanedFields.slice(0, FREE_CONTACT_FIELDS_LIMIT)
      : cleanedFields;

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

    const freeLimitedLinks = isFreePlan
      ? cleanedLinks.slice(0, FREE_LINKS_LIMIT)
      : cleanedLinks;

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

    const freeLimitedExperiences = isFreePlan ? [] : cleanedExperiences;

    const freeTrimmedFieldIds = isFreePlan
      ? cleanedFields
          .slice(FREE_CONTACT_FIELDS_LIMIT)
          .map((field) => field.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const freeTrimmedLinkIds = isFreePlan
      ? cleanedLinks
          .slice(FREE_LINKS_LIMIT)
          .map((link) => ("id" in link ? (link.id as string | undefined) : undefined))
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const freeRemovedExperienceIds = isFreePlan
      ? experiences
          .map((experience) => experience.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];

    if (freeLimitedFields.length > 0) {
      const { error } = await supabase.from("card_fields").upsert(freeLimitedFields, {
        onConflict: "id",
      });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (freeLimitedLinks.length > 0) {
      const { error } = await supabase.from("card_links").upsert(freeLimitedLinks, {
        onConflict: "id",
      });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (freeLimitedExperiences.length > 0) {
      const { error } = await supabase
        .from("card_experiences")
        .upsert(freeLimitedExperiences, { onConflict: "id" });
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    const allRemovedFieldIds = Array.from(
      new Set([...removedFieldIds, ...freeTrimmedFieldIds])
    );
    if (allRemovedFieldIds.length > 0) {
      const { error } = await supabase
        .from("card_fields")
        .delete()
        .in("id", allRemovedFieldIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedFieldIds([]);
    }

    const allRemovedLinkIds = Array.from(
      new Set([...removedLinkIds, ...freeTrimmedLinkIds])
    );
    if (allRemovedLinkIds.length > 0) {
      const { error } = await supabase
        .from("card_links")
        .delete()
        .in("id", allRemovedLinkIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedLinkIds([]);
    }

    const allRemovedExperienceIds = Array.from(
      new Set([...removedExperienceIds, ...freeRemovedExperienceIds])
    );
    if (allRemovedExperienceIds.length > 0) {
      const { error } = await supabase
        .from("card_experiences")
        .delete()
        .in("id", allRemovedExperienceIds);
      if (error) {
        setMessage(error.message);
        setIsSaving(false);
        return;
      }
      setRemovedExperienceIds([]);
    }

    setMessage(t("messages.saved"));
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        {t("messages.loading")}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm">
        {message ?? t("errors.notFound")}
      </div>
    );
  }

  const patternClass =
    patternClassMap[card.background_pattern] ?? patternClassMap["gradient-1"];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
              {t("brand")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {t("title")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="rounded-full border border-gray-100 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 lg:hidden"
            >
              {showPreview ? t("actions.hidePreview") : t("actions.showPreview")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isSaving ? t("actions.saving") : t("actions.save")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/cards")}
              className="rounded-full border border-gray-100 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
            >
              {t("actions.back")}
            </button>
          </div>
        </div>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <TemplateSelector
            currentTemplate={card.template}
            isPremiumUser={viewerPlan === "premium"}
            onChange={(template) =>
              setCard((prev) => (prev ? { ...prev, template } : prev))
            }
          />
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("sections.background")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUploadBackgroundImage(file);
                  }
                }}
              />
              {isUploading
                ? t("actions.uploading")
                : t("actions.uploadBackground")}
            </label>
            <button
              type="button"
              onClick={() => void handleRemoveBackgroundImage()}
              disabled={!card.background_image_url || isUploading}
              className="rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("actions.removeBackground")}
            </button>
            <p className="text-xs text-gray-500">
              {t("misc.backgroundUploadNote")}
            </p>
          </div>
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
                      : "border-gray-100"
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
                <label className="text-xs font-semibold uppercase text-gray-500">
                  {t("labels.color")}
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
                  className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-gray-100"
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
                        : "border-gray-100"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {t("labels.preview")}
                </p>
                <div
                  className={`cardlink-cover ${patternClass} mt-2 h-20 rounded-xl`}
                  style={{
                    "--cardlink-base": card.background_color,
                  } as React.CSSProperties}
                >
                  {card.background_image_url ? (
                    <img
                      src={card.background_image_url}
                      alt="Background"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
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
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            {t("sections.livePreview")}
          </p>
          <div className="mt-4 rounded-3xl border border-gray-100 bg-gray-50">
            <div
              className={`cardlink-cover ${patternClass} h-24 rounded-t-3xl`}
              style={{
                "--cardlink-base": card.background_color,
              } as React.CSSProperties}
            >
              {card.background_image_url ? (
                <img
                  src={card.background_image_url}
                  alt="Background preview"
                  className="h-full w-full rounded-t-3xl object-cover"
                />
              ) : null}
            </div>
            <div className="-mt-8 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white text-sm font-semibold text-gray-700 shadow-md">
                {card.full_name.trim()
                  ? card.full_name.trim().slice(0, 2).toUpperCase()
                  : "CL"}
              </div>
            </div>
            <div className="px-4 pb-4 pt-2">
              <p className="text-base font-semibold text-gray-900">
                {card.full_name || t("placeholders.yourName")}
              </p>
              <p className="text-xs text-gray-500">
                {[card.title, card.company].filter(Boolean).join(" • ")}
              </p>
              {card.bio ? (
                <p className="mt-2 text-xs text-gray-600">{card.bio}</p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {fields
                  .filter((field) => field.visibility === "public")
                  .slice(0, 4)
                  .map((field) => (
                    <div
                      key={`${field.field_type}-${field.id ?? "new"}`}
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold text-white ${
                        contactPreviewClasses[field.field_type] ?? "bg-slate-600"
                      }`}
                    >
                      {field.field_label || field.field_type}
                    </div>
                  ))}
              </div>
              {links.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-3">
                  <p className="text-xs font-semibold text-gray-500">
                    {t("sections.links")}
                  </p>
                  <p className="text-xs text-gray-600">
                    {links[0]?.label || t("placeholders.linkLabel")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
