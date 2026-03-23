import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/src/lib/supabase/server";

export type AdminContext = {
  user: User;
  adminUserId: string;
  role: string; // super_admin | moderator | support
};

/**
 * Checks if the current request originates from an admin-scoped route.
 */
export function isAdminScopedRequest(request: Request): boolean {
  const scopeHeader = request.headers.get("x-cardlink-app-scope");
  if (scopeHeader?.toLowerCase() === "admin") return true;

  const referer = request.headers.get("referer");
  try {
    if (referer) {
      const refererUrl = new URL(referer);
      return refererUrl.pathname.startsWith("/admin");
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Requires the requesting user to be a platform admin (in admin_users table).
 * Returns the admin context or a 401/403 response.
 */
export async function requireAdminContext(params: {
  request: Request;
}): Promise<
  | { ok: true; context: AdminContext }
  | { ok: false; response: NextResponse }
> {
  if (!isAdminScopedRequest(params.request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin APIs are restricted to Admin App routes." },
        { status: 403 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  // Check if user is in admin_users table
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Platform admin access denied." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    context: {
      user,
      adminUserId: adminUser.id as string,
      role: adminUser.role as string,
    },
  };
}
