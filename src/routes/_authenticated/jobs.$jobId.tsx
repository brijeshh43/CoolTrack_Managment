import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PenLine,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JobTypeBadge, StatusBadge } from "@/components/fsm/badges";
import { MediaCapture, MediaThumb, useJobMedia } from "@/components/fsm/media";
import { SignaturePad } from "@/components/fsm/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CHECKLISTS,
  JOB_STATUS_LABEL,
  JOB_TYPE_LABEL,
  fmtDateTime,
  mapsHref,
  nextStatus,
  type JobStatus,
  type JobType,
} from "@/lib/fsm";
import { clearDraft, loadDraft, logLocation, saveDraft, writeAudit } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  component: JobWorkflow,
});

type JobDetail = {
  id: string;
  job_number: string;
  job_type: JobType;
  status: JobStatus;
  priority: string;
  description: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  customer_id: string;
  unit_id: string | null;
  customers: {
    name: string;
    contact_number: string | null;
    address: string | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  units: {
    unit_code: string;
    model_number: string | null;
    serial_number: string | null;
    equipment_type: string | null;
    location: string | null;
  } | null;
};

type PartRow = {
  id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  condition: string;
  serial_number: string | null;
  remarks: string | null;
};

type Draft = {
  remarks: Record<string, string>;
  work: Record<string, string>;
  customerName: string;
  signature: string | null;
  summary: string;
};

const EMPTY_DRAFT: Draft = {
  remarks: {},
  work: {},
  customerName: "",
  signature: null,
  summary: "",
};

function JobWorkflow() {
  const { jobId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const { media, reload } = useJobMedia(jobId);

  const loadJob = useCallback(async () => {
    const { data } = await supabase
      .from("service_jobs")
      .select(
        "id, job_number, job_type, status, priority, description, scheduled_at, started_at, completed_at, customer_id, unit_id, customers(name, contact_number, address, location, latitude, longitude), units(unit_code, model_number, serial_number, equipment_type, location)",
      )
      .eq("id", jobId)
      .maybeSingle();
    setJob((data as unknown as JobDetail) ?? null);
  }, [jobId]);

  const loadParts = useCallback(async () => {
    const { data } = await supabase
      .from("parts_used")
      .select("id, part_name, part_number, quantity, condition, serial_number, remarks")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    setParts((data as PartRow[]) ?? []);
  }, [jobId]);

  useEffect(() => {
    void loadJob();
    void loadParts();
    setDraft(loadDraft<Draft>(jobId) ?? EMPTY_DRAFT);
  }, [jobId, loadJob, loadParts]);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(jobId, next);
      return next;
    });
  };

  const advance = async () => {
    if (!job) return;
    const next = nextStatus(job.status);
    if (!next) return;
    if (next === "completed") {
      await completeJob();
      return;
    }
    setBusy(true);
    const geo = await logLocation(next, jobId);
    const patch =
      next === "in_progress"
        ? {
            status: next,
            started_at: new Date().toISOString(),
            start_latitude: geo.latitude,
            start_longitude: geo.longitude,
          }
        : { status: next };
    const { error } = await supabase.from("service_jobs").update(patch).eq("id", jobId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await writeAudit("service_jobs", jobId, `status:${next}`);
    toast.success(`Marked ${JOB_STATUS_LABEL[next]}`);
    void loadJob();
  };

  const checklist = job ? CHECKLISTS[job.job_type] : [];
  const missing = checklist.filter(
    (item) => item.photoRequired && !media.some((m) => m.checklist_key === item.key),
  );

  const completeJob = async () => {
    if (!job || !user) return;
    if (missing.length > 0) {
      toast.error(`Missing required photos: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    if (!draft.signature || !draft.customerName.trim()) {
      toast.error("Customer name and signature are required");
      return;
    }
    setBusy(true);
    try {
      const geo = await logLocation("completed", jobId);

      if (job.job_type === "pm") {
        await supabase
          .from("pm_records")
          .upsert(
            { job_id: jobId, checklist: draft.remarks as never, remarks: draft.summary || null },
            { onConflict: "job_id" },
          );
      } else if (job.job_type === "breakdown") {
        await supabase.from("breakdown_records").upsert(
          {
            job_id: jobId,
            complaint: draft.work["complaint"] ?? null,
            diagnosis: draft.work["diagnosis"] ?? null,
            action_taken: draft.work["action_taken"] ?? null,
            gas_type: draft.work["gas_type"] ?? null,
            gas_quantity: draft.work["gas_quantity"] ?? null,
            valve_details: draft.work["valve_details"] ?? null,
            remarks: draft.summary || null,
          },
          { onConflict: "job_id" },
        );
      } else if (job.job_type === "installation") {
        await supabase.from("installation_records").upsert(
          {
            job_id: jobId,
            installation_location: draft.work["installation_location"] ?? null,
            copper_pipe_details: draft.work["copper_pipe_details"] ?? null,
            pipe_size: draft.work["pipe_size"] ?? null,
            cable_details: draft.work["cable_details"] ?? null,
            remarks: draft.summary || null,
          },
          { onConflict: "job_id" },
        );
      } else {
        await supabase.from("commissioning_records").upsert(
          {
            job_id: jobId,
            commissioning_status: draft.work["commissioning_status"] ?? "passed",
            test_results: draft.work as never,
            remarks: draft.summary || null,
          },
          { onConflict: "job_id" },
        );
      }

      await supabase.from("customer_signatures").insert({
        job_id: jobId,
        customer_name: draft.customerName.trim(),
        signature_data: draft.signature,
        captured_by: user.id,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });

      const { error } = await supabase
        .from("service_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          complete_latitude: geo.latitude,
          complete_longitude: geo.longitude,
          remarks: draft.summary || null,
        })
        .eq("id", jobId);
      if (error) throw error;

      await supabase.from("service_reports").insert({
        job_id: jobId,
        report_number: `RPT-${job.job_number}`,
        summary: draft.summary || null,
        submitted_by: user.id,
        status: "submitted",
      });

      await writeAudit("service_jobs", jobId, "completed");
      clearDraft(jobId);
      toast.success("Job completed and report submitted");
      void navigate({ to: "/report/$jobId", params: { jobId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete job");
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const next = nextStatus(job.status);
  const locked = job.status === "completed" || job.status === "cancelled";

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="brand-gradient px-4 pt-8 pb-10 text-primary-foreground">
        <div className="container-main">
          <Link to="/jobs" className="mb-4 inline-flex items-center gap-2 text-sm opacity-80">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{job.customers?.name}</h1>
              <p className="text-sm opacity-80 mt-1">
                {job.job_number} · {JOB_TYPE_LABEL[job.job_type]}
              </p>
            </div>
            <StatusBadge
              status={job.status}
              className="bg-white/20 text-primary-foreground px-3 py-1 text-sm"
            />
          </div>
          <div className="mt-5 flex gap-3">
            <a
              href={mapsHref(
                job.customers?.latitude,
                job.customers?.longitude,
                job.customers?.address,
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 py-3 text-sm font-semibold"
            >
              <Navigation className="size-4" /> Navigate
            </a>
            {job.customers?.contact_number && (
              <a
                href={`tel:${job.customers.contact_number}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 py-3 text-sm font-semibold"
              >
                <Phone className="size-4" /> Call
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="container-main space-y-6 py-6">
        <section className="surface-card space-y-3 p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {job.customers?.address ?? job.customers?.location ?? "No address"}
          </p>
          <p>Scheduled: {fmtDateTime(job.scheduled_at)}</p>
          {job.units && (
            <p>
              Unit {job.units.unit_code} · {job.units.model_number ?? "—"} · SN{" "}
              {job.units.serial_number ?? "—"}
            </p>
          )}
          {job.description && <p className="text-foreground">{job.description}</p>}
        </section>

        <Tabs defaultValue="evidence">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evidence">Photos</TabsTrigger>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="parts">Parts</TabsTrigger>
            <TabsTrigger value="signoff">Sign-off</TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="space-y-5 pt-5">
            {checklist.map((item) => {
              const shots = media.filter((m) => m.checklist_key === item.key);
              return (
                <div key={item.key} className="surface-card space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">
                      {item.label}
                      {item.photoRequired && <span className="ml-2 text-destructive">*</span>}
                    </p>
                    {shots.length > 0 && <CheckCircle2 className="size-5 text-success" />}
                  </div>
                  <Textarea
                    value={draft.remarks[item.key] ?? ""}
                    onChange={(e) =>
                      update({ remarks: { ...draft.remarks, [item.key]: e.target.value } })
                    }
                    placeholder={item.remarkRequired ? "Remarks (required)" : "Remarks (optional)"}
                    maxLength={500}
                    disabled={locked}
                    rows={2}
                  />
                  {!locked && (
                    <MediaCapture
                      jobId={jobId}
                      customerId={job.customer_id}
                      unitId={job.unit_id}
                      checklistKey={item.key}
                      label={item.label}
                      remarks={draft.remarks[item.key] ?? ""}
                      allowVideo={item.video ?? false}
                      onDone={reload}
                    />
                  )}
                  {shots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {shots.map((m) => (
                        <MediaThumb key={m.id} item={m} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="work" className="space-y-5 pt-5">
            <div className="surface-card space-y-5 p-5">
              {WORK_FIELDS[job.job_type].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={draft.work[field.key] ?? ""}
                    onChange={(e) =>
                      update({ work: { ...draft.work, [field.key]: e.target.value } })
                    }
                    maxLength={200}
                    disabled={locked}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="summary">Work summary</Label>
                <Textarea
                  id="summary"
                  value={draft.summary}
                  onChange={(e) => update({ summary: e.target.value })}
                  maxLength={1000}
                  disabled={locked}
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-5 pt-5">
            <PartsSection
              jobId={jobId}
              unitId={job.unit_id}
              parts={parts}
              reload={loadParts}
              locked={locked}
            />
          </TabsContent>

          <TabsContent value="signoff" className="space-y-5 pt-5">
            <div className="surface-card space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="custName">Customer name *</Label>
                <Input
                  id="custName"
                  value={draft.customerName}
                  onChange={(e) => update({ customerName: e.target.value })}
                  maxLength={80}
                  disabled={locked}
                />
              </div>
              <SignaturePad value={draft.signature} onChange={(v) => update({ signature: v })} />
              {missing.length > 0 && (
                <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                  Required photos still missing: {missing.map((m) => m.label).join(", ")}
                </p>
              )}
            </div>
            {locked && (
              <Link
                to="/report/$jobId"
                params={{ jobId }}
                className="surface-card flex items-center gap-3 p-5 text-base font-semibold text-primary"
              >
                <FileText className="size-5" /> View service report
                <ChevronRight className="ml-auto size-5" />
              </Link>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {!locked && next && (
        <div className="no-print fixed inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
          <div className="container-main">
            <Button size="lg" className="w-full" disabled={busy} onClick={advance}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              {next === "completed"
                ? "Complete Job & Submit Report"
                : `Mark ${JOB_STATUS_LABEL[next]}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const WORK_FIELDS: Record<JobType, { key: string; label: string }[]> = {
  pm: [{ key: "observations", label: "Observations" }],
  breakdown: [
    { key: "complaint", label: "Customer complaint" },
    { key: "diagnosis", label: "Diagnosis / root cause" },
    { key: "action_taken", label: "Action taken" },
    { key: "gas_type", label: "Gas type" },
    { key: "gas_quantity", label: "Gas quantity charged" },
    { key: "valve_details", label: "Valve details" },
  ],
  installation: [
    { key: "installation_location", label: "Installation location" },
    { key: "copper_pipe_details", label: "Copper pipe details" },
    { key: "pipe_size", label: "Pipe size" },
    { key: "cable_details", label: "Cable details" },
  ],
  commissioning: [
    { key: "commissioning_status", label: "Commissioning status (passed/failed)" },
    { key: "supply_air_temp", label: "Supply air temperature" },
    { key: "return_air_temp", label: "Return air temperature" },
    { key: "current_draw", label: "Current draw (A)" },
    { key: "pressure", label: "Suction / discharge pressure" },
  ],
};

function PartsSection({
  jobId,
  unitId,
  parts,
  reload,
  locked,
}: {
  jobId: string;
  unitId: string | null;
  parts: PartRow[];
  reload: () => Promise<void>;
  locked: boolean;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [qty, setQty] = useState("1");
  const [condition, setCondition] = useState<"new" | "old">("new");
  const [serial, setSerial] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) {
      toast.error("Part name is required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("parts_used").insert({
      job_id: jobId,
      unit_id: unitId,
      part_name: name.trim(),
      part_number: number.trim() || null,
      quantity: Number(qty) || 1,
      condition,
      serial_number: serial.trim() || null,
      recorded_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setNumber("");
    setQty("1");
    setSerial("");
    await reload();
  };

  const remove = async (id: string) => {
    await supabase.from("parts_used").delete().eq("id", id);
    await reload();
  };

  return (
    <div className="space-y-4">
      {parts.map((p) => (
        <div key={p.id} className="surface-card flex items-center gap-4 p-4">
          <Package className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">{p.part_name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {p.part_number ?? "no P/N"} · qty {p.quantity} · {p.condition}
              {p.serial_number ? ` · SN ${p.serial_number}` : ""}
            </p>
          </div>
          {!locked && (
            <Button variant="ghost" size="icon" onClick={() => void remove(p.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}

      {!locked && (
        <div className="surface-card space-y-4 p-5">
          <p className="text-base font-semibold">Add part used</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Part name *"
            maxLength={100}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Part number"
              maxLength={60}
            />
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              inputMode="numeric"
              maxLength={5}
            />
          </div>
          <Input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Serial number"
            maxLength={60}
          />
          <div className="flex gap-3">
            {(["new", "old"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                variant={condition === c ? "default" : "outline"}
                size="sm"
                className="flex-1 capitalize"
                onClick={() => setCondition(c)}
              >
                {c} part
              </Button>
            ))}
          </div>
          <Button className="w-full" disabled={busy} onClick={add}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Add Part
          </Button>
        </div>
      )}

      {parts.length === 0 && locked && (
        <p className="surface-card p-6 text-center text-base text-muted-foreground">
          No parts recorded.
        </p>
      )}
    </div>
  );
}
