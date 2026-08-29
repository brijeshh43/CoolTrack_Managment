import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_USERS = [
  {
    email: "admin@cooltrack.local",
    password: "Admin@123",
    full_name: "Admin User",
    employee_code: "ADM001",
    phone: "+1234567890",
    role: "admin",
  },
  {
    email: "engineer@cooltrack.local",
    password: "Engineer@123",
    full_name: "Field Engineer",
    employee_code: "ENG001",
    phone: "+1234567891",
    role: "engineer",
  },
];

async function seedUsers() {
  console.log("Seeding default users...");

  for (const user of DEFAULT_USERS) {
    const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      continue;
    }

    const userExists = existingUser.users.some((u) => u.email === user.email);

    if (userExists) {
      console.log(`User ${user.email} already exists, skipping...`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        employee_code: user.employee_code,
        phone: user.phone,
      },
    });

    if (error) {
      console.error(`Failed to create ${user.email}:`, error.message);
      continue;
    }

    if (data.user) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: user.role });

      if (roleError) {
        console.error(`Failed to assign role for ${user.email}:`, roleError.message);
      } else {
        console.log(`Created ${user.email} with role ${user.role}`);
      }
    }
  }

  console.log("Seeding complete!");
}

seedUsers().catch(console.error);
