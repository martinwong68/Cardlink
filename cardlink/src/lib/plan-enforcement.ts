import { SupabaseClient } from "@supabase/supabase-js";

export type PlanCheckResult = {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentPlan?: string;
  limit?: number;
  used?: number;
};

type SubscriptionRow = {
  ai_actions_used: number;
  ai_actions_limit: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  plan_id: string;
  subscription_plans: {
    slug: string;
    name: string;
    ai_actions_monthly: number;
    max_companies: number;
    max_users: number;
    storage_mb: number;
    pdf_export: boolean;
    document_ocr_monthly: number;
  };
};

async function getSubscription(
  supabase: SupabaseClient,
  companyId: string,
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("company_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("company_id", companyId)
    .maybeSingle();
  return data as SubscriptionRow | null;
}

/** Returns allowed:false if plan is 'free' (ai_actions_monthly = 0) */
export async function checkAiAccess(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }
  const plan = sub.subscription_plans;
  if (plan.ai_actions_monthly === 0) {
    return {
      allowed: false,
      reason: "plan_no_ai",
      upgradeRequired: true,
      currentPlan: plan.name,
    };
  }
  return { allowed: true, currentPlan: plan.name };
}

/** Returns allowed:false if ai_actions_used >= limit AND no credits remaining */
export async function checkAiActionBalance(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }

  if (sub.ai_actions_used < sub.ai_actions_limit) {
    return {
      allowed: true,
      currentPlan: sub.subscription_plans.name,
      limit: sub.ai_actions_limit,
      used: sub.ai_actions_used,
    };
  }

  // Check for remaining purchased credits
  const { data: credits } = await supabase
    .from("ai_credits")
    .select("credits_remaining")
    .eq("company_id", companyId)
    .gt("credits_remaining", 0);

  const totalCredits = (credits ?? []).reduce(
    (sum: number, c: { credits_remaining: number }) => sum + c.credits_remaining,
    0,
  );

  if (totalCredits > 0) {
    return {
      allowed: true,
      currentPlan: sub.subscription_plans.name,
      limit: sub.ai_actions_limit,
      used: sub.ai_actions_used,
    };
  }

  return {
    allowed: false,
    reason: "ai_limit_reached",
    upgradeRequired: false,
    currentPlan: sub.subscription_plans.name,
    limit: sub.ai_actions_limit,
    used: sub.ai_actions_used,
  };
}

/** Returns allowed:false if storage_used_mb >= storage_limit_mb */
export async function checkStorageLimit(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }
  if (sub.storage_used_mb >= sub.storage_limit_mb) {
    return {
      allowed: false,
      reason: "storage_full",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
      limit: sub.storage_limit_mb,
      used: sub.storage_used_mb,
    };
  }
  return {
    allowed: true,
    currentPlan: sub.subscription_plans.name,
    limit: sub.storage_limit_mb,
    used: sub.storage_used_mb,
  };
}

/** Count user's companies. Returns allowed:false if >= plan.max_companies */
export async function checkCompanyLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanCheckResult> {
  // Get all companies the user owns
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  const companyCount = memberships?.length ?? 0;

  if (companyCount === 0) {
    return { allowed: true };
  }

  // Get the plan limit from the first company's subscription
  const firstCompanyId = memberships![0].company_id as string;
  const sub = await getSubscription(supabase, firstCompanyId);
  if (!sub) {
    // No subscription yet — allow first company
    return { allowed: true };
  }

  const maxCompanies = sub.subscription_plans.max_companies;
  if (companyCount >= maxCompanies) {
    return {
      allowed: false,
      reason: "company_limit",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
      limit: maxCompanies,
      used: companyCount,
    };
  }
  return {
    allowed: true,
    currentPlan: sub.subscription_plans.name,
    limit: maxCompanies,
    used: companyCount,
  };
}

/** Count company members. Returns allowed:false if >= plan.max_users */
export async function checkUserLimit(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }

  const { count } = await supabase
    .from("company_members")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  const memberCount = count ?? 0;
  const maxUsers = sub.subscription_plans.max_users;

  if (memberCount >= maxUsers) {
    return {
      allowed: false,
      reason: "user_limit",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
      limit: maxUsers,
      used: memberCount,
    };
  }
  return {
    allowed: true,
    currentPlan: sub.subscription_plans.name,
    limit: maxUsers,
    used: memberCount,
  };
}

/** Returns allowed:false if plan.pdf_export = false */
export async function checkPdfExport(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }
  if (!sub.subscription_plans.pdf_export) {
    return {
      allowed: false,
      reason: "pdf_not_available",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
    };
  }
  return { allowed: true, currentPlan: sub.subscription_plans.name };
}

/** Track OCR usage, compare to plan.document_ocr_monthly */
export async function checkOcrLimit(
  supabase: SupabaseClient,
  companyId: string,
): Promise<PlanCheckResult> {
  const sub = await getSubscription(supabase, companyId);
  if (!sub) {
    return { allowed: false, reason: "no_subscription", upgradeRequired: true };
  }

  const monthlyLimit = sub.subscription_plans.document_ocr_monthly;
  if (monthlyLimit === 0) {
    return {
      allowed: false,
      reason: "ocr_not_available",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
      limit: 0,
      used: 0,
    };
  }

  // OCR usage is tracked via features JSON or can be a counter on subscriptions
  // For now, use a convention within subscription metadata
  const features = (sub.subscription_plans as Record<string, unknown>)
    .features as Record<string, unknown> | undefined;
  const ocrUsed = (features?.ocr_used as number) ?? 0;

  if (ocrUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: "ocr_limit_reached",
      upgradeRequired: true,
      currentPlan: sub.subscription_plans.name,
      limit: monthlyLimit,
      used: ocrUsed,
    };
  }
  return {
    allowed: true,
    currentPlan: sub.subscription_plans.name,
    limit: monthlyLimit,
    used: ocrUsed,
  };
}
