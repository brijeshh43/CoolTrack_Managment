import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JobCard, type JobRow } from "@/components/fsm/job-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  JOB_STATUS_LABEL,
  JOB_TYPES,
  JOB_TYPE_LABEL,
  downloadCsv,
  type JobStatus,
  type JobType,
} from "@/lib/fsm";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  component: AdminJobs,
});

const JOB_SELECT =
  "id, job_number, job_type, status, scheduled_at, description, customers(name, customer_code, address, location, latitude, longitude), units(unit_code, model_number, serial_number)";

type Option = { id: string; label: string };

function AdminJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [units, setUnits] = useState<{ id: string; customer_id: string; label: string }[]>([]);
  const [engineers, setEngineers] = useState<Option[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    unit_id: "",
    engineer_id: "",
    job_type: "pm" as JobType,
    priority: "normal",
    scheduled_at: "",
    description: "",
  });

  const load = async () => {
    const [{ data: j }, { data: c }, { data: u }, { data: p }] = await Promise.all([
      supabase
        .from("service_jobs")
        .select(JOB_SELECT)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("customers").select("id, name, customer_code").order("name"),
      supabase.from("units").select("id, customer_id, unit_code, model_number").order("unit_code"),
      supabase
        .from("profiles")
        .select("id, full_name, employee_code")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    setJobs((j as unknown as JobRow[]) ?? []);
    setCustomers(
      (c ?? []).map((x) => ({
        id: x.id,
        label: `${x.name}${x.customer_code ? ` (${x.customer_code})` : ""}`,
      })),
    );
    setUnits(
      (u ?? []).map((x) => ({
        id: x.id,
        customer_id: x.customer_id,
        label: `${x.unit_code ?? "Unit"}${x.model_number ? ` — ${x.model_number}` : ""}`,
      })),
    );
    setEngineers(
      (p ?? []).map((x) => ({
        id: x.id,
        label: `${x.full_name}${x.employee_code ? ` (${x.employee_code})` : ""}`,
      })),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) {
      toast.error("Select a customer");
      return;
    }
    setSaving(true);
    const jobNumber = `JOB-${Date.now().toString().slice(-8)}`;
    const { error } = await supabase.from("service_jobs").insert({
      job_number: jobNumber,
      customer_id: form.customer_id,
      unit_id: form.unit_id || null,
      engineer_id: form.engineer_id || null,
      job_type: form.job_type,
      status: "assigned",
      priority: form.priority,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      description: form.description || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Job ${jobNumber} created`);
    setOpen(false);
    setForm({ ...form, unit_id: "", description: "", scheduled_at: "" });
    void load();
  };

  const reassign = async (jobId: string, engineerId: string) => {
    const { error } = await supabase
      .from("service_jobs")
      .update({ engineer_id: engineerId || null })
      .eq("id", jobId);
    if (error) toast.error(error.message);
    else {
      toast.success("Engineer updated");
      void load();
    }
  };

  const visible = statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter);
  const unitOptions = units.filter((u) => !form.customer_id || u.customer_id === form.customer_id);

  return (
    <div className="container-main py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Jobs Management</h1>
        <p className="text-muted-foreground mt-1">Create, assign, and track service jobs</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | JobStatus)}
            className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
          >
            <option value="all">All statuses</option>
            {Object.entries(JOB_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "jobs.csv",
              visible.map((j) => ({
                job_number: j.job_number,
                customer: j.customers?.name ?? "",
                unit: j.units?.unit_code ?? "",
                type: j.job_type,
                status: j.status,
                scheduled_at: j.scheduled_at ?? "",
              })),
            )
          }
        >
          <Download className="size-4" /> Export CSV
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create & assign job</DialogTitle>
            </DialogHeader>
            <form onSubmit={createJob} className="space-y-5 py-2">
              <Field label="Customer *">
                <select
                  required
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value, unit_id: "" })}
                  className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Equipment unit">
                <select
                  value={form.unit_id}
                  onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                  className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
                >
                  <option value="">Not specified</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Job type">
                  <select
                    value={form.job_type}
                    onChange={(e) => setForm({ ...form, job_type: e.target.value as JobType })}
                    className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {JOB_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
              </div>

              <Field label="Assign engineer">
                <select
                  value={form.engineer_id}
                  onChange={(e) => setForm({ ...form, engineer_id: e.target.value })}
                  className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base"
                >
                  <option value="">Unassigned</option>
                  {engineers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Scheduled date & time">
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </Field>

              <Field label="Description / complaint">
                <Textarea
                  rows={4}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Create job
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {visible.length === 0 ? (
        <p className="surface-card p-8 text-center text-base text-muted-foreground">
          No jobs found.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((job) => (
            <div key={job.id} className="space-y-2">
              <JobCard job={job} />
              <div className="flex items-center gap-3 px-1 pb-2 text-sm text-muted-foreground">
                <span className="font-medium">Engineer</span>
                <select
                  defaultValue=""
                  onChange={(e) => void reassign(job.id, e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Reassign…</option>
                  {engineers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
