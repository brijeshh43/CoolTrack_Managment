import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { JobCard, type JobRow } from "@/components/fsm/job-card";
import { Input } from "@/components/ui/input";
import { JOB_TYPE_SHORT, JOB_TYPES, type JobType } from "@/lib/fsm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs/")({
  component: JobsList,
});

const JOB_SELECT =
  "id, job_number, job_type, status, scheduled_at, description, customers(name, customer_code, address, location, latitude, longitude), units(unit_code, model_number, serial_number)";

function JobsList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<JobType | "all">("all");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("service_jobs")
        .select(JOB_SELECT)
        .eq("engineer_id", user.id)
        .not("status", "in", "(completed,cancelled)")
        .order("scheduled_at", { ascending: true });
      setJobs((data as unknown as JobRow[]) ?? []);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (type !== "all" && j.job_type !== type) return false;
      if (!term) return true;
      return (
        j.job_number.toLowerCase().includes(term) ||
        (j.customers?.name ?? "").toLowerCase().includes(term) ||
        (j.customers?.location ?? "").toLowerCase().includes(term)
      );
    });
  }, [jobs, q, type]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-10 pb-8 text-primary-foreground">
        <div className="container-main">
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-sm opacity-80 mt-1">{filtered.length} open job(s)</p>
        </div>
      </header>

      <div className="container-main space-y-5 py-6">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search job, customer or site"
            className="pl-12"
            maxLength={80}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(["all", ...JOB_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                type === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t === "all" ? "All" : JOB_TYPE_SHORT[t]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="surface-card p-8 text-center text-base text-muted-foreground">
            No open jobs match your filters.
          </p>
        ) : (
          filtered.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}
