import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { JobCard, type JobRow } from "@/components/fsm/job-card";
import { JOB_STATUS_LABEL, type JobStatus } from "@/lib/fsm";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

const JOB_SELECT =
  "id, job_number, job_type, status, scheduled_at, description, customers(name, customer_code, address, location, latitude, longitude), units(unit_code, model_number, serial_number)";

function AdminOverview() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [counts, setCounts] = useState({ jobs: 0, customers: 0, units: 0, team: 0 });
  const [byStatus, setByStatus] = useState<Record<string, number>>({});

  useEffect(() => {
    void (async () => {
      const [{ data }, { count: c }, { count: u }, { count: p }, { data: statuses }] =
        await Promise.all([
          supabase
            .from("service_jobs")
            .select(JOB_SELECT)
            .order("created_at", { ascending: false })
            .limit(15),
          supabase.from("customers").select("id", { count: "exact", head: true }),
          supabase.from("units").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("service_jobs").select("status"),
        ]);
      setJobs((data as unknown as JobRow[]) ?? []);
      const all = (statuses ?? []) as { status: JobStatus }[];
      setCounts({ jobs: all.length, customers: c ?? 0, units: u ?? 0, team: p ?? 0 });
      const map: Record<string, number> = {};
      all.forEach((r) => {
        map[r.status] = (map[r.status] ?? 0) + 1;
      });
      setByStatus(map);
    })();
  }, []);

  return (
    <div className="container-main py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your field service operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total jobs" value={counts.jobs} />
        <Stat label="Customers" value={counts.customers} />
        <Stat label="Equipment units" value={counts.units} />
        <Stat label="Team members" value={counts.team} />
      </div>

      <section className="surface-card p-6">
        <h2 className="text-lg font-semibold mb-4">Jobs by status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(JOB_STATUS_LABEL).map(([key, label]) => (
            <div key={key} className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{byStatus[key] ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Latest jobs</h2>
        </div>
        {jobs.length === 0 ? (
          <p className="surface-card p-8 text-center text-base text-muted-foreground">
            No jobs created yet.
          </p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-6 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}
