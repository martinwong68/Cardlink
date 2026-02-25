import type { SupabaseClient, User } from "@supabase/supabase-js";

type MinimalProfile = {
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  banned_reason: string | null;
};

type CompanyRelation = {
  name: string | null;
  is_banned: boolean;
  banned_reason: string | null;
};

type CompanyMemberRow = {
  status: string;
  companies?: CompanyRelation[] | CompanyRelation | null;
};

export type UserAccessState = {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  isBanned: boolean;
  banScope: "user" | "company" | null;
  banReason: string | null;
  bannedUntil: string | null;
  companyName: string | null;
};

function normalizeSingle<T>(value: T[] | T | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getBannedUntil(user: User): string | null {
  const withBannedUntil = user as User & { banned_until?: string | null };
  return withBannedUntil.banned_until ?? null;
}

export async function getUserAccessState(
  supabase: SupabaseClient,
  user: User
): Promise<UserAccessState> {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, is_banned, banned_reason")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData as MinimalProfile | null) ?? null;
  const bannedUntil = getBannedUntil(user);
  const now = Date.now();
  const bannedByAuth =
    typeof bannedUntil === "string" && new Date(bannedUntil).getTime() > now;

  if (profile?.is_banned || bannedByAuth) {
    return {
      profile: profile
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      isBanned: true,
      banScope: "user",
      banReason: profile?.banned_reason ?? null,
      bannedUntil,
      companyName: null,
    };
  }

  const { data: memberRows } = await supabase
    .from("company_members")
    .select("status, companies(name, is_banned, banned_reason)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const inactiveMemberCompany = ((memberRows ?? []) as CompanyMemberRow[])
    .map((row) => normalizeSingle(row.companies))
    .find((company) => company?.is_banned === true);

  if (inactiveMemberCompany) {
    return {
      profile: profile
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      isBanned: true,
      banScope: "company",
      banReason: inactiveMemberCompany.banned_reason ?? null,
      bannedUntil: null,
      companyName: inactiveMemberCompany.name,
    };
  }

  const { data: ownedInactiveCompany } = await supabase
    .from("companies")
    .select("name, banned_reason")
    .eq("created_by", user.id)
    .eq("is_banned", true)
    .limit(1)
    .maybeSingle();

  if (ownedInactiveCompany) {
    const company = ownedInactiveCompany as {
      name: string | null;
      banned_reason: string | null;
    };

    return {
      profile: profile
        ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      isBanned: true,
      banScope: "company",
      banReason: company.banned_reason ?? null,
      bannedUntil: null,
      companyName: company.name,
    };
  }

  return {
    profile: profile
      ? {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        }
      : null,
    isBanned: false,
    banScope: null,
    banReason: null,
    bannedUntil: null,
    companyName: null,
  };
}
