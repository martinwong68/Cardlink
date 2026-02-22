"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { createClient } from "@/src/lib/supabase/client";

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
      img.onerror = () => reject(new Error("Failed to load image."));
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
        AVATAR_JPEG_QUALITY
      );
    });

    return new File([compressedBlob], AVATAR_FILE_NAME, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default function ProfileSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("profile");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initials, setInitials] = useState("CL");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setMessage(t("errors.signInEdit"));
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, title, company, bio, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();

      setFullName(data?.full_name ?? "");
      setEmail(data?.email ?? userData.user.email ?? "");
      setTitle(data?.title ?? "");
      setCompany(data?.company ?? "");
      setBio(data?.bio ?? "");
      setAvatarUrl(data?.avatar_url ?? "");

      const name = data?.full_name ?? userData.user.email ?? t("defaults.name");
      const parts = name
        .split(" ")
        .map((part: string) => part.trim())
        .filter(Boolean);
      setInitials(
        parts.length === 0
          ? "CL"
          : parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      );
    };

    void loadProfile();
  }, [supabase]);

  useEffect(() => {
    const name = fullName.trim() || t("defaults.name");
    const parts = name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean);
    setInitials(
      parts.length === 0
        ? "CL"
        : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    );
  }, [fullName]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInSave"));
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        email: email.trim(),
        title: title.trim(),
        company: company.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.user.id);

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    setMessage(t("toast.updated"));
    setIsSaving(false);
  };

  const handleUploadAvatar = async (file: File) => {
    setIsUploading(true);
    setMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage(t("errors.signInEdit"));
      setIsUploading(false);
      return;
    }

    let compressedFile: File;
    try {
      compressedFile = await compressAvatarImage(file);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to compress image.");
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

    const { data: publicUrlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    const nextAvatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: nextAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.user.id);

    if (updateError) {
      setMessage(updateError.message);
      setIsUploading(false);
      return;
    }

    setAvatarUrl(`${nextAvatarUrl}?v=${Date.now()}`);
    setMessage(t("toast.updated"));
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          {t("brand")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-lg font-semibold text-white">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("avatar.title")}</p>
            <p className="text-xs text-slate-500">{t("avatar.subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
              {t("fields.fullName")}
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              {t("fields.email")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="title">
              {t("fields.title")}
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="company">
              {t("fields.company")}
            </label>
            <input
              id="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="bio">
              {t("fields.bio")}
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("fields.avatarUrl")}
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700">
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
                {isUploading ? "Uploading..." : "Upload Avatar"}
              </label>
              <span className="text-xs text-slate-500">
                Auto-compress before upload. One user stores one avatar only.
              </span>
            </div>
          </div>
        </div>

        {message ? (
          <p className="mt-4 text-sm text-violet-600">{message}</p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="mt-6 rounded-full bg-violet-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? t("actions.saving") : t("actions.save")}
        </button>
      </div>
    </div>
  );
}
