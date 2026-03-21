"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";
import HeaderBackButton from "@/components/HeaderBackButton";

type AuthProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return "CL";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function LoggedInTopHeader() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        setUserId(null);
        setProfile(null);
        return;
      }

      setUserId(user.id);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<AuthProfile>();

      if (!isMounted) {
        return;
      }

      setProfile(profileRow ?? null);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!userId) {
    return null;
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/business")) {
    return null;
  }

  const profileName = profile?.full_name ?? "CardLink";
  const initials = getInitials(profileName);

  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="app-page flex items-center justify-between py-3">
        <HeaderBackButton ariaLabel="Back" />
        <Link
          href="/dashboard/settings/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-indigo-600 to-indigo-600 text-xs font-semibold text-white shadow-lg shadow-indigo-300/30"
          aria-label="Profile"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profileName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </Link>
      </div>
    </header>
  );
}