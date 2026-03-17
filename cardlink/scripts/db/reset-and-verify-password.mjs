import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2] ?? "martinwong58@gmail.com";
const password = process.argv[3] ?? "Wmt63559115";

if (!url || !service || !anon) {
  console.error("ENV_MISSING");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const pub = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (list.error) {
  console.error(`LIST_ERR=${list.error.message}`);
  process.exit(1);
}

const user = (list.data.users ?? []).find(
  (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
);
if (!user) {
  console.error("USER_NOT_FOUND");
  process.exit(1);
}

const updated = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});
if (updated.error) {
  console.error(`UPDATE_ERR=${updated.error.message}`);
  process.exit(1);
}

console.log(`PASSWORD_UPDATED=${user.id}`);

const login = await pub.auth.signInWithPassword({ email, password });
if (login.error) {
  console.error(`LOGIN_ERR=${login.error.message}`);
  process.exit(2);
}

console.log(`LOGIN_OK=${login.data.user.id}`);
