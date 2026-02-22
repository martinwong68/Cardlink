import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/src/lib/supabase/server";

type RequestBody = {
  companyId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  cardName?: string;
  title?: string;
  company?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hasAdminRole(role: string | null | undefined) {
  return ["owner", "admin", "manager", "company_owner", "company_admin"].includes(
    (role ?? "").toLowerCase()
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const companyId = body.companyId?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.fullName?.trim() ?? "";
    const cardName = body.cardName?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const company = body.company?.trim() ?? "";

    if (!companyId || !email || !password) {
      return NextResponse.json(
        { error: "companyId, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const requesterClient = await createClient();
    const {
      data: { user: requester },
      error: requesterError,
    } = await requesterClient.auth.getUser();

    if (requesterError || !requester) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [{ data: memberRows }, { data: adminCompanyRows }] = await Promise.all([
      requesterClient
        .from("company_members")
        .select("company_id, role, status")
        .eq("user_id", requester.id)
        .eq("status", "active"),
      requesterClient.rpc("get_my_admin_company_ids"),
    ]);

    const memberAdminIds = ((memberRows ?? []) as { company_id: string; role: string }[])
      .filter((item) => hasAdminRole(item.role))
      .map((item) => item.company_id);

    const rpcAdminIds = ((adminCompanyRows ?? []) as { company_id: string }[]).map(
      (item) => item.company_id
    );

    const adminCompanyIdSet = new Set([...memberAdminIds, ...rpcAdminIds]);

    if (!adminCompanyIdSet.has(companyId)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase service-role environment variables." },
        { status: 500 }
      );
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);

    const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName || null,
      },
    });

    if (createUserError || !createdUserData.user) {
      return NextResponse.json(
        { error: createUserError?.message ?? "Failed to create auth user." },
        { status: 400 }
      );
    }

    const createdUserId = createdUserData.user.id;

    const profilePayload: Record<string, unknown> = {
      id: createdUserId,
      full_name: fullName || null,
      email,
    };

    await adminClient.from("profiles").upsert(profilePayload, { onConflict: "id" });

    const { error: memberInsertError } = await adminClient.from("company_members").upsert(
      {
        company_id: companyId,
        user_id: createdUserId,
        role: "member",
        status: "active",
        joined_at: new Date().toISOString(),
      },
      { onConflict: "company_id,user_id" }
    );

    if (memberInsertError) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      return NextResponse.json({ error: memberInsertError.message }, { status: 400 });
    }

    const baseName = fullName || cardName || "Company Card";
    const slug = `${slugify(baseName) || "company-card"}-${Date.now().toString(36).slice(-6)}`;

    const { data: cardRow, error: cardInsertError } = await adminClient
      .from("business_cards")
      .insert({
        user_id: createdUserId,
        card_name: cardName || "Company Card",
        full_name: fullName || null,
        title: title || null,
        company: company || null,
        slug,
        is_default: false,
        background_pattern: "gradient-1",
        background_color: "#6366f1",
      })
      .select("id")
      .single();

    if (cardInsertError) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      return NextResponse.json({ error: cardInsertError.message }, { status: 400 });
    }

    const { error: resendError } = await adminClient.auth.resend({
      type: "signup",
      email,
    });

    return NextResponse.json({
      userId: createdUserId,
      cardId: cardRow?.id ?? null,
      verificationEmailSent: !resendError,
      verificationMessage: resendError
        ? `Account created, but verification email failed: ${resendError.message}`
        : "Verification email sent.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
