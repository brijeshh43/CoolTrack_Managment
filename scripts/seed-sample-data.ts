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

async function seedSampleData() {
  console.log("Seeding sample customers and units...");

  // Get admin user
  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();
  const adminUser = users.find((u) => u.email === "admin@cooltrack.local");
  if (!adminUser) {
    console.error("Admin user not found");
    return;
  }

  // Create sample customers
  const customers = [
    {
      customer_code: "CUST001",
      name: "Greenfield Hospital",
      address: "123 Medical Center Dr, Springfield, IL 62701",
      location: "Building A - Rooftop",
      contact_number: "+1-555-0101",
      email: "facilities@greenfieldhospital.com",
      created_by: adminUser.id,
    },
    {
      customer_code: "CUST002",
      name: "Metro Office Complex",
      address: "456 Business Ave, Chicago, IL 60601",
      location: "Tower B - Mechanical Room",
      contact_number: "+1-555-0102",
      email: "maintenance@metrooffice.com",
      created_by: adminUser.id,
    },
    {
      customer_code: "CUST003",
      name: "Sunset Shopping Mall",
      address: "789 Retail Blvd, Los Angeles, CA 90001",
      location: "Anchor Store - HVAC Room",
      contact_number: "+1-555-0103",
      email: "ops@sunsetmall.com",
      created_by: adminUser.id,
    },
  ];

  for (const customer of customers) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("customer_code", customer.customer_code)
      .single();

    if (existing) {
      console.log(`Customer ${customer.customer_code} already exists`);
      continue;
    }

    const { data, error } = await supabase.from("customers").insert(customer).select().single();

    if (error) {
      console.error(`Failed to create ${customer.name}:`, error.message);
    } else {
      console.log(`Created customer: ${customer.name}`);
    }
  }

  // Get engineer user
  const engineerUser = users.find((u) => u.email === "engineer@cooltrack.local");

  // Create sample units
  const { data: customerData } = await supabase
    .from("customers")
    .select("id, customer_code")
    .in("customer_code", ["CUST001", "CUST002", "CUST003"]);

  if (customerData) {
    const units = [
      {
        customer_id: customerData.find((c) => c.customer_code === "CUST001")?.id,
        unit_code: "AC-001",
        model_number: "Trane YCD180",
        serial_number: "SN789456",
        equipment_type: "Rooftop Unit",
        location: "Roof - Zone 1",
        installation_date: "2022-03-15",
        warranty_until: "2027-03-15",
      },
      {
        customer_id: customerData.find((c) => c.customer_code === "CUST001")?.id,
        unit_code: "AC-002",
        model_number: "Carrier 48TC",
        serial_number: "SN123789",
        equipment_type: "Split System",
        location: "Roof - Zone 2",
        installation_date: "2021-11-20",
        warranty_until: "2026-11-20",
      },
      {
        customer_id: customerData.find((c) => c.customer_code === "CUST002")?.id,
        unit_code: "CHL-001",
        model_number: "York YK",
        serial_number: "SN456123",
        equipment_type: "Chiller",
        location: "Basement Mechanical",
        installation_date: "2020-06-10",
        warranty_until: "2025-06-10",
      },
      {
        customer_id: customerData.find((c) => c.customer_code === "CUST003")?.id,
        unit_code: "RTU-001",
        model_number: "Lennox LGC",
        serial_number: "SN987654",
        equipment_type: "Rooftop Unit",
        location: "Roof - Main",
        installation_date: "2023-01-05",
        warranty_until: "2028-01-05",
      },
    ];

    for (const unit of units) {
      if (!unit.customer_id) continue;

      const { data: existing } = await supabase
        .from("units")
        .select("id")
        .eq("unit_code", unit.unit_code)
        .eq("customer_id", unit.customer_id)
        .single();

      if (existing) {
        console.log(`Unit ${unit.unit_code} already exists`);
        continue;
      }

      const { error } = await supabase.from("units").insert(unit);
      if (error) {
        console.error(`Failed to create unit ${unit.unit_code}:`, error.message);
      } else {
        console.log(`Created unit: ${unit.unit_code}`);
      }
    }
  }

  console.log("Sample data seeding complete!");
}

seedSampleData().catch(console.error);
