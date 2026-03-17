import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetEmail = process.argv[2] ?? "martinwong58@gmail.com";

if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRole);

async function main() {
  const profileRes = await supabase
    .from("profiles")
    .select("id,email,is_master_user,business_active_company_id,updated_at")
    .eq("email", targetEmail)
    .maybeSingle();

  if (profileRes.error || !profileRes.data) {
    console.error("Profile lookup failed:", profileRes.error?.message ?? "not found");
    process.exit(1);
  }

  const profile = profileRes.data;
  console.log("Profile:", profile);

  if (!profile.business_active_company_id) {
    console.log("No active company is currently selected.");
    return;
  }

  const companyRes = await supabase
    .from("companies")
    .select("id,name,slug,is_active")
    .eq("id", profile.business_active_company_id)
    .maybeSingle();

  if (companyRes.error) {
    console.error("Company lookup failed:", companyRes.error.message);
    process.exit(1);
  }

  console.log("Active company:", companyRes.data ?? "missing");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
