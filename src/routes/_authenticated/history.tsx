import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { JobCard, type JobRow } from "@/components/fsm/job-card";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("service_jobs")
        .select(
          "id, job_number, job_type, status, scheduled_at, description, customers(name, customer_code, address, location, latitude, longitude), units(unit_code, model_number, serial_number)",
        )
        .eq("engineer_id", user.id)
        .in("status", ["completed", "cancelled"])
        .order("completed_at", { ascending: false })
        .limit(100);
      setJobs((data as unknown as JobRow[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-10 pb-8 text-primary-foreground">
        <div className="container-main">
          <h1 className="text-2xl font-bold">Job History</h1>
          <p className="text-sm opacity-80 mt-1">{jobs.length} closed job(s)</p>
        </div>
      </header>
      <div className="container-main space-y-4 py-6">
        {jobs.length === 0 ? (
          <p className="surface-card p-8 text-center text-base text-muted-foreground">
            Completed jobs will appear here.
          </p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
      <BottomNav />
    </div>
  );
}
