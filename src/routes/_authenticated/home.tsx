import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { JobCard, type JobRow } from "@/components/fsm/job-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/home")({
  component: EngineerHome,
});

function EngineerHome() {
  const { profile, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [dutyOpen, setDutyOpen] = useState(false);
  const [counts, setCounts] = useState({ today: 0, pending: 0, done: 0 });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      ).toISOString();

      const { data } = await supabase
        .from("service_jobs")
        .select(
          "id, job_number, job_type, status, scheduled_at, description, customers(name, customer_code, address, location, latitude, longitude), units(unit_code, model_number, serial_number)",
        )
        .eq("engineer_id", user.id)
        .order("scheduled_at", { ascending: true });

      const all = (data as unknown as JobRow[]) ?? [];
      const todays = all.filter(
        (j) => j.scheduled_at && j.scheduled_at >= start && j.scheduled_at < end,
      );
      setJobs(todays.length > 0 ? todays : all.filter((j) => j.status !== "completed").slice(0, 5));
      setCounts({
        today: todays.length,
        pending: all.filter((j) => !["completed", "cancelled"].includes(j.status)).length,
        done: all.filter((j) => j.status === "completed").length,
      });

      const { data: att } = await supabase
        .from("attendance")
        .select("id, out_time")
        .eq("engineer_id", user.id)
        .eq("work_date", new Date().toISOString().slice(0, 10))
        .maybeSingle();
      setDutyOpen(Boolean(att && !att.out_time));
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-10 pb-14 text-primary-foreground">
        <div className="container-main">
          <p className="text-sm opacity-80">Welcome back</p>
          <h1 className="text-3xl font-bold mt-1">{profile?.full_name || "Engineer"}</h1>
          <p className="mt-2 text-sm opacity-80">
            ID: {profile?.employee_code || "—"} · {dutyOpen ? "On duty" : "Duty not started"}
          </p>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => void navigate({ to: "/admin" })}
            >
              <LayoutDashboard className="size-4" /> Admin Dashboard
            </Button>
          )}
        </div>
      </header>

      <div className="container-main -mt-8 pb-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat icon={CalendarClock} label="Today" value={counts.today} />
          <Stat icon={Wrench} label="Pending" value={counts.pending} />
          <Stat icon={CheckCircle2} label="Completed" value={counts.done} />
        </div>

        {!dutyOpen && (
          <Link
            to="/attendance"
            className="flex items-center gap-4 rounded-xl bg-accent/25 p-5 surface-card"
          >
            <div className="size-12 flex items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Clock className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">Start your duty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Attendance with selfie and GPS is required before site work.
              </p>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
          </Link>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Today's Jobs</h2>
            <Link to="/jobs" className="text-sm font-medium text-primary">
              View all
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="surface-card p-8 text-center text-base text-muted-foreground">
              No jobs assigned yet.
            </p>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: number }) {
  return (
    <div className="surface-card p-5 text-center">
      <div className="size-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
