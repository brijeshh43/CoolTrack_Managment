import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_TYPE_SHORT, type JobStatus, type JobType } from "@/lib/fsm";

const STATUS_STYLE: Record<JobStatus, string> = {
  assigned: "bg-muted text-muted-foreground",
  accepted: "bg-info/15 text-info",
  on_the_way: "bg-info/15 text-info",
  arrived: "bg-primary/15 text-primary",
  in_progress: "bg-warning/20 text-warning-foreground",
  waiting_for_parts: "bg-warning/20 text-warning-foreground",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const TYPE_STYLE: Record<JobType, string> = {
  pm: "bg-primary/10 text-primary",
  breakdown: "bg-destructive/10 text-destructive",
  installation: "bg-accent/25 text-accent-foreground",
  commissioning: "bg-success/10 text-success",
};

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}

export function JobTypeBadge({ type, className }: { type: JobType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold tracking-wide uppercase",
        TYPE_STYLE[type],
        className,
      )}
    >
      {JOB_TYPE_SHORT[type]}
    </span>
  );
}
