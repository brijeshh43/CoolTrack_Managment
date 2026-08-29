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

async function assignRoles() {
  console.log("Assigning roles to existing users...");

  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const adminUser = users.find((u) => u.email === "admin@cooltrack.local");
  const engineerUser = users.find((u) => u.email === "engineer@cooltrack.local");

  if (adminUser) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) console.error("Admin role error:", error.message);
    else console.log(`Assigned admin role to ${adminUser.email}`);
  }

  if (engineerUser) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: engineerUser.id, role: "engineer" }, { onConflict: "user_id,role" });
    if (error) console.error("Engineer role error:", error.message);
    else console.log(`Assigned engineer role to ${engineerUser.email}`);
  }

  console.log("Done!");
}

assignRoles().catch(console.error);
