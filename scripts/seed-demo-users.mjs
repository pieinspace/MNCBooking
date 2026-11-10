import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(email) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Stopped user lookup after 100 pages.");
}

async function ensureUser({ email, password, fullName, phone, division, role }) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: phone,
        division,
      },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email,
      phone_number: phone,
      division,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const otherRole = role === "admin" ? "user" : "admin";
  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", user.id)
    .eq("role", otherRole);
  if (deleteError) throw deleteError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;
  console.log(`Seeded ${role} account: ${email}`);
}

try {
  await ensureUser({
    email: "admin@mnc.com",
    password: required("MNC_DEMO_ADMIN_PASSWORD"),
    fullName: "Administrator MNC",
    phone: "081100000000",
    division: "Production",
    role: "admin",
  });
  await ensureUser({
    email: "user@mnc.com",
    password: required("MNC_DEMO_USER_PASSWORD"),
    fullName: "Budi Santoso",
    phone: "081200000000",
    division: "Production",
    role: "user",
  });
} catch (error) {
  console.error("Demo account seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
