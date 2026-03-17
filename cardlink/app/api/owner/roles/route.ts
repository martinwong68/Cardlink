import { NextResponse } from "next/server";
import { requireBusinessActiveCompanyContext } from "@/src/lib/business/active-company-guard";

export async function GET(request: Request) {
  const guard = await requireBusinessActiveCompanyContext({ request });
  if (!guard.ok) return guard.response;

  // No dedicated roles table exists yet — return sensible defaults
  const defaultRoles = [
    { id: "owner", role_name: "Owner", module_name: "all" },
    { id: "admin", role_name: "Admin", module_name: "all" },
    { id: "manager", role_name: "Manager", module_name: "crm,pos,inventory" },
    { id: "staff", role_name: "Staff", module_name: "pos" },
  ];

  return NextResponse.json({ roles: defaultRoles });
}
