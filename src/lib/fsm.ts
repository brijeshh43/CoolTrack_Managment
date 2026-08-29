/**
 * Field Service Management — shared domain model.
 * Add new job types / checklist items here; the UI reads from these tables.
 */

export type JobType = "pm" | "breakdown" | "installation" | "commissioning";

export type JobStatus =
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "waiting_for_parts"
  | "completed"
  | "cancelled";

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  pm: "Preventive Maintenance",
  breakdown: "Breakdown",
  installation: "Installation",
  commissioning: "Commissioning",
};

export const JOB_TYPE_SHORT: Record<JobType, string> = {
  pm: "PM",
  breakdown: "Breakdown",
  installation: "Installation",
  commissioning: "Commissioning",
};

export const JOB_TYPES: JobType[] = ["pm", "breakdown", "installation", "commissioning"];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  in_progress: "In Progress",
  waiting_for_parts: "Waiting for Parts",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const JOB_STATUSES = Object.keys(JOB_STATUS_LABEL) as JobStatus[];

/** Ordered progression an engineer moves through on site. */
export const STATUS_FLOW: JobStatus[] = [
  "assigned",
  "accepted",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
];

export function nextStatus(current: JobStatus): JobStatus | null {
  const i = STATUS_FLOW.indexOf(current);
  if (i < 0 || i >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1] ?? null;
}

export type ChecklistItem = {
  key: string;
  label: string;
  photoRequired: boolean;
  remarkRequired?: boolean;
  video?: boolean;
};

/**
 * Evidence checklists per job type. Adding an item here immediately adds it to
 * the engineer workflow, validation and the printed service report.
 */
export const CHECKLISTS: Record<JobType, ChecklistItem[]> = {
  pm: [
    { key: "filter", label: "Filter", photoRequired: true },
    { key: "clean_filter", label: "Cleaned Filter", photoRequired: true },
    { key: "outdoor_unit", label: "Outdoor Unit", photoRequired: true },
    { key: "controller_panel", label: "Controller Panel", photoRequired: true },
    { key: "humidifier", label: "Humidifier Tray / Bottle", photoRequired: false },
    { key: "outdoor_fan", label: "Outdoor Fan", photoRequired: true },
    { key: "other", label: "Other Equipment", photoRequired: false },
  ],
  breakdown: [
    { key: "problem", label: "Breakdown / Problem", photoRequired: true, remarkRequired: true },
    { key: "equipment", label: "Equipment", photoRequired: true },
    { key: "repair", label: "Repair Work", photoRequired: true },
    { key: "final", label: "Final Condition", photoRequired: true },
  ],
  installation: [
    { key: "indoor_unit", label: "Indoor Unit", photoRequired: true },
    { key: "outdoor_unit", label: "Outdoor Unit", photoRequired: true },
    { key: "connection", label: "Indoor/Outdoor Connection", photoRequired: true },
    { key: "copper_pipe", label: "Copper Pipe", photoRequired: true },
    { key: "cable", label: "Cable", photoRequired: true },
    { key: "install_video", label: "Installation Video", photoRequired: false, video: true },
    { key: "final", label: "Final Installation", photoRequired: true },
  ],
  commissioning: [
    { key: "system_test", label: "System Test", photoRequired: true },
    { key: "readings", label: "Test Readings", photoRequired: true, remarkRequired: true },
    { key: "test_video", label: "Running Test Video", photoRequired: false, video: true },
    { key: "final", label: "Final Condition", photoRequired: true },
  ],
};

export const PART_CONDITIONS = ["new", "old"] as const;

export type GeoPoint = { latitude: number | null; longitude: number | null };

export async function getPosition(): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { latitude: null, longitude: null };
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ latitude: null, longitude: null }), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve({ latitude: null, longitude: null });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

export function mapsHref(
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? "")}`;
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
