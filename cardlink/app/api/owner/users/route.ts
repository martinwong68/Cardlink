import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_members")
    .select("id, user_id, role, status, invited_at, created_at")
    .eq("company_id", guard.context.activeCompanyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

/**
 * POST /api/owner/users — Invite a user to the company by email.
 * Body: { email: string, role?: string }
 */
export async function POST(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const VALID_ROLES = new Set(["admin", "manager", "member", "staff"]);
  const role = VALID_ROLES.has(body.role ?? "") ? body.role! : "member";

  const admin = createAdminClient();
  const companyId = guard.context.activeCompanyId;

  /* Look up user by email — first try profiles table, then auth admin */
  let targetUserId: string | null = null;

  const { data: profileMatch } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileMatch) targetUserId = profileMatch.id;

  /* Fallback: search auth.users by email if not found in profiles */
  if (!targetUserId) {
    /* Use listUsers and filter — Supabase admin API supports this */
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listData?.users) {
      const match = listData.users.find((u) => u.email === email);
      if (match) targetUserId = match.id;
    }
  }

  if (!targetUserId) {
    return NextResponse.json(
      { error: "No user found with that email. They must create a Cardlink account first." },
      { status: 404 }
    );
  }

  /* Check if already a member */
  const { data: existing } = await admin
    .from("company_members")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This user is already a member of the company." },
      { status: 409 }
    );
  }

  /* Insert new member */
  const { data: member, error: insertError } = await admin
    .from("company_members")
    .insert({
      company_id: companyId,
      user_id: targetUserId,
      role,
      status: "active",
      invited_at: new Date().toISOString(),
    })
    .select("id, user_id, role, status, invited_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, member });
}

/**
 * PATCH /api/owner/users — Update a team member's role.
 * Body: { memberId: string, role: string }
 */
export async function PATCH(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  let body: { memberId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const memberId = body.memberId?.trim();
  const newRole = body.role?.trim();

  if (!memberId || !newRole) {
    return NextResponse.json({ error: "memberId and role are required." }, { status: 400 });
  }

  const VALID_ROLES = new Set(["admin", "manager", "member", "staff"]);
  if (!VALID_ROLES.has(newRole)) {
    return NextResponse.json({ error: "Invalid role. Allowed: admin, manager, member, staff." }, { status: 400 });
  }

  const supabase = await createClient();
  const companyId = guard.context.activeCompanyId;

  /* Verify target member belongs to this company and is not the owner */
  const { data: target } = await supabase
    .from("company_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change the owner's role." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("company_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, memberId, role: newRole });
}
