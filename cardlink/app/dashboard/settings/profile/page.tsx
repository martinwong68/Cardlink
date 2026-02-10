"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";

export default function ProfileSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [initials, setInitials] = useState("CL");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("full_name, bio").maybeSingle();
      if (data?.full_name) {
        setFullName(data.full_name);
      }
      if (data?.bio) {
        setBio(data.bio);
      }
      const name = data?.full_name ?? "CardLink";
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
        bio: bio.trim(),
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
