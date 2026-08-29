import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MediaThumb, useJobMedia } from "@/components/fsm/media";
import { JobTypeBadge, StatusBadge } from "@/components/fsm/badges";
import { fmtDateTime, type JobStatus, type JobType } from "@/lib/fsm";

export const Route = createFileRoute("/_authenticated/report/$jobId")({
  component: ReportPage,
});

type Row = {
  job_number: string;
  job_type: JobType;
  status: JobStatus;
  description: string | null;
  remarks: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  customers: { name: string; address: string | null; contact_number: string | null } | null;
  units: { unit_code: string; model_number: string | null; serial_number: string | null } | null;
};

function ReportPage() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<Row | null>(null);
  const [parts, setParts] = useState<
    { id: string; part_name: string; quantity: number; condition: string }[]
  >([]);
  const [sign, setSign] = useState<{
    customer_name: string;
    signature_data: string;
    signed_at: string;
  } | null>(null);
  const { media } = useJobMedia(jobId);

  useEffect(() => {
    void (async () => {
      const [{ data: j }, { data: p }, { data: s }] = await Promise.all([
        supabase
          .from("service_jobs")
          .select(
            "job_number, job_type, status, description, remarks, scheduled_at, completed_at, customers(name, address, contact_number), units(unit_code, model_number, serial_number)",
          )
          .eq("id", jobId)
          .maybeSingle(),
        supabase
          .from("parts_used")
          .select("id, part_name, quantity, condition")
          .eq("job_id", jobId),
        supabase
          .from("customer_signatures")
          .select("customer_name, signature_data, signed_at")
          .eq("job_id", jobId)
          .order("signed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setJob((j as unknown as Row) ?? null);
      setParts(p ?? []);
      setSign(s ?? null);
    })();
  }, [jobId]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <Link to="/jobs" className="inline-flex items-center gap-2 text-base text-muted-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Print / PDF
        </Button>
      </div>

      <article className="container-main space-y-6 py-8">
        <header className="border-b border-border pb-6">
          <h1 className="text-2xl font-bold">Service Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{job.job_number}</p>
          <div className="mt-3 flex gap-3">
            <JobTypeBadge type={job.job_type} />
            <StatusBadge status={job.status} />
          </div>
        </header>

        <section className="grid gap-2 text-base">
          <p>
            <strong>Customer:</strong> {job.customers?.name}
          </p>
          <p>
            <strong>Site:</strong> {job.customers?.address ?? "—"}
          </p>
          <p>
            <strong>Unit:</strong> {job.units?.unit_code ?? "—"} · {job.units?.model_number ?? "—"}{" "}
            · SN {job.units?.serial_number ?? "—"}
          </p>
          <p>
            <strong>Scheduled:</strong> {fmtDateTime(job.scheduled_at)}
          </p>
          <p>
            <strong>Completed:</strong> {fmtDateTime(job.completed_at)}
          </p>
        </section>

        {job.remarks && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Work summary</h2>
            <p className="text-base text-muted-foreground">{job.remarks}</p>
          </section>
        )}

        {parts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Parts used</h2>
            <ul className="space-y-2 text-base text-muted-foreground">
              {parts.map((p) => (
                <li key={p.id}>
                  {p.part_name} — qty {p.quantity} ({p.condition})
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Evidence ({media.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <MediaThumb key={m.id} item={m} />
            ))}
          </div>
        </section>

        {sign && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Customer acceptance</h2>
            <img
              src={sign.signature_data}
              alt="Customer signature"
              className="h-32 rounded border border-border bg-card"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {sign.customer_name} · {fmtDateTime(sign.signed_at)}
            </p>
          </section>
        )}
      </article>
    </div>
  );
}
