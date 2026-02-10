"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";

export default function ProfileSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initials, setInitials] = useState("CL");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        setMessage("Please sign in to edit your profile.");
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

      const name = data?.full_name ?? userData.user.email ?? "CardLink";
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
    const name = fullName.trim() || "CardLink";
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
      setMessage("Please sign in to save your profile.");
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

    setMessage("Profile updated.");
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
          CardLink
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Edit Profile
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-lg font-semibold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Avatar</p>
            <p className="text-xs text-slate-500">Upload coming soon</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
              Full name
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
              Email
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
              Title
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
              Company
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
              Bio
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
            <label className="text-sm font-medium text-slate-700" htmlFor="avatarUrl">
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
            />
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
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
