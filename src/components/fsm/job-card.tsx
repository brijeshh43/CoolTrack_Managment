import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Clock } from "lucide-react";
import { JobTypeBadge, StatusBadge } from "@/components/fsm/badges";
import { fmtDateTime, type JobStatus, type JobType } from "@/lib/fsm";

export type JobRow = {
  id: string;
  job_number: string;
  job_type: JobType;
  status: JobStatus;
  scheduled_at: string | null;
  description: string | null;
  customers: {
    name: string;
    customer_code: string | null;
    address: string | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  units: {
    unit_code: string | null;
    model_number: string | null;
    serial_number: string | null;
  } | null;
};

export function JobCard({ job }: { job: JobRow }) {
  return (
    <Link
      to="/jobs/$jobId"
      params={{ jobId: job.id }}
      className="surface-card block p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{job.customers?.name ?? "Customer"}</p>
          <p className="text-sm text-muted-foreground mt-1">{job.job_number}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <JobTypeBadge type={job.job_type} />
        {job.units?.unit_code && (
          <span className="text-sm text-muted-foreground">Unit {job.units.unit_code}</span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        {job.customers?.location && (
          <p className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{job.customers.location}</span>
          </p>
        )}
        {job.scheduled_at && (
          <p className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            {fmtDateTime(job.scheduled_at)}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end text-sm font-medium text-primary">
        Open job <ChevronRight className="size-4" />
      </div>
    </Link>
  );
}
