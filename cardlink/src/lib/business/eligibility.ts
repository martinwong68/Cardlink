import type { SupabaseClient, User } from "@supabase/supabase-js";

const BUSINESS_ELIGIBLE_ROLES = new Set([
  "owner",
  "admin",
  "manager",
  "company_owner",
  "company_admin",
]);

type CompanyMemberRoleRow = {
  company_id: string | null;
  role: string | null;
};

type AdminCompanyIdRow = {
  company_id: string;
};

type ProfileMasterRow = {
  is_master_user: boolean | null;
};

export type BusinessEligibility = {
  eligible: boolean;
  isMasterUser: boolean;
  adminCompanyIds: string[];
  reasonCode:
    | "master_user"
    | "company_role"
    | "company_creator"
    | "admin_rpc"
    | "not_eligible";
};

function parseCsvList(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isBusinessEligibleRole(role: string | null | undefined): boolean {
  return BUSINESS_ELIGIBLE_ROLES.has((role ?? "").toLowerCase());
}

export function isMasterUser(user: User): boolean {
  const allowedIds = parseCsvList(process.env.CARDLINK_MASTER_USER_IDS);
  const allowedEmails = parseCsvList(process.env.CARDLINK_MASTER_USER_EMAILS);
  const userEmail = (user.email ?? "").toLowerCase();

  return allowedIds.has(user.id.toLowerCase()) || (userEmail.length > 0 && allowedEmails.has(userEmail));
}

export async function resolveBusinessEligibility(
  supabase: SupabaseClient,
  user: User
): Promise<BusinessEligibility> {
  const [profileRes, memberRolesRes, createdCompaniesRes, adminCompaniesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_master_user")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabase.from("companies").select("id").eq("created_by", user.id),
    supabase.rpc("get_my_admin_company_ids"),
  ]);

  const roleRows = (memberRolesRes.data ?? []) as CompanyMemberRoleRow[];
  const createdRows = (createdCompaniesRes.data ?? []) as { id: string }[];
  const rpcRows = (adminCompaniesRes.data ?? []) as AdminCompanyIdRow[];
  const profileRow = (profileRes.data ?? null) as ProfileMasterRow | null;

  const masterByDb = profileRow?.is_master_user === true;
  const master = masterByDb || isMasterUser(user);

  const byRole = roleRows
    .filter((row) => isBusinessEligibleRole(row.role) && !!row.company_id)
    .map((row) => row.company_id as string);
  const byCreator = createdRows.map((row) => row.id);
  const byRpc = rpcRows.map((row) => row.company_id);

  const adminCompanyIds = Array.from(new Set([...byRole, ...byCreator, ...byRpc]));

  if (master) {
    return {
      eligible: true,
      isMasterUser: true,
      adminCompanyIds,
      reasonCode: "master_user",
    };
  }

  if (byRole.length > 0) {
    return {
      eligible: true,
      isMasterUser: false,
      adminCompanyIds,
      reasonCode: "company_role",
    };
  }

  if (byCreator.length > 0) {
    return {
      eligible: true,
      isMasterUser: false,
      adminCompanyIds,
      reasonCode: "company_creator",
    };
  }

  if (byRpc.length > 0) {
    return {
      eligible: true,
      isMasterUser: false,
      adminCompanyIds,
      reasonCode: "admin_rpc",
    };
  }

  return {
    eligible: false,
    isMasterUser: false,
    adminCompanyIds,
    reasonCode: "not_eligible",
  };
}