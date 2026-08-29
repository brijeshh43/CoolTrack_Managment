import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "./fsm";

/**
 * Offline-first helpers.
 *
 * Drafts (form values, checklist remarks, signature) are always written to
 * localStorage first so an engineer never loses work in a basement plant room.
 * Media captured while offline is queued as a data URL and flushed when the
 * browser reports connectivity again.
 */

const DRAFT_PREFIX = "fsm:draft:";
const QUEUE_KEY = "fsm:mediaQueue";

export type SyncState = "idle" | "offline" | "syncing" | "synced";

export function saveDraft<T>(jobId: string, data: T) {
  try {
    localStorage.setItem(DRAFT_PREFIX + jobId, JSON.stringify({ data, at: Date.now() }));
  } catch {
    /* storage full — ignore */
  }
}

export function loadDraft<T>(jobId: string): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + jobId);
    if (!raw) return null;
    return (JSON.parse(raw) as { data: T }).data;
  } catch {
    return null;
  }
}

export function clearDraft(jobId: string) {
  localStorage.removeItem(DRAFT_PREFIX + jobId);
}

export type QueuedMedia = {
  id: string;
  jobId: string;
  customerId: string | null;
  unitId: string | null;
  kind: "photo" | "video";
  checklistKey: string | null;
  label: string | null;
  remarks: string | null;
  latitude: number | null;
  longitude: number | null;
  capturedAt: string;
  fileName: string;
  dataUrl: string;
};

function readQueue(): QueuedMedia[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedMedia[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedMedia[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function queueSize(): number {
  return readQueue().length;
}

export function enqueueMedia(item: QueuedMedia) {
  writeQueue([...readQueue(), item]);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadMedia(params: {
  jobId: string;
  customerId: string | null;
  unitId: string | null;
  kind: "photo" | "video";
  checklistKey?: string | null;
  label?: string | null;
  remarks?: string | null;
  file: Blob;
  fileName: string;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const path = `${params.jobId}/${Date.now()}-${params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: upErr } = await supabase.storage.from("job-media").upload(path, params.file, {
    upsert: false,
    ...(params.file.type ? { contentType: params.file.type } : {}),
  });

  if (upErr) throw upErr;

  const { error } = await supabase.from("job_media").insert({
    job_id: params.jobId,
    customer_id: params.customerId,
    unit_id: params.unitId,
    uploaded_by: userId ?? null,
    kind: params.kind,
    checklist_key: params.checklistKey ?? null,
    label: params.label ?? null,
    storage_path: path,
    remarks: params.remarks ?? null,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    captured_at: params.capturedAt ?? new Date().toISOString(),
  });
  if (error) throw error;
  return path;
}

/** Capture flow used by every [Take Photo] / [Record Video] button. */
export async function captureAndStore(params: {
  jobId: string;
  customerId: string | null;
  unitId: string | null;
  kind: "photo" | "video";
  checklistKey?: string | null;
  label?: string | null;
  remarks?: string | null;
  file: File;
}): Promise<"uploaded" | "queued"> {
  const geo = await getPosition();
  const capturedAt = new Date().toISOString();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueMedia({
      id: crypto.randomUUID(),
      jobId: params.jobId,
      customerId: params.customerId,
      unitId: params.unitId,
      kind: params.kind,
      checklistKey: params.checklistKey ?? null,
      label: params.label ?? null,
      remarks: params.remarks ?? null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      capturedAt,
      fileName: params.file.name || `${params.kind}.jpg`,
      dataUrl: await fileToDataUrl(params.file),
    });
    return "queued";
  }

  try {
    await uploadMedia({
      ...params,
      file: params.file,
      fileName: params.file.name || `${params.kind}.jpg`,
      latitude: geo.latitude,
      longitude: geo.longitude,
      capturedAt,
    });
    return "uploaded";
  } catch {
    enqueueMedia({
      id: crypto.randomUUID(),
      jobId: params.jobId,
      customerId: params.customerId,
      unitId: params.unitId,
      kind: params.kind,
      checklistKey: params.checklistKey ?? null,
      label: params.label ?? null,
      remarks: params.remarks ?? null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      capturedAt,
      fileName: params.file.name || `${params.kind}.jpg`,
      dataUrl: await fileToDataUrl(params.file),
    });
    return "queued";
  }
}

/** Flush anything captured while offline. */
export async function flushQueue(): Promise<number> {
  const items = readQueue();
  if (items.length === 0) return 0;
  const remaining: QueuedMedia[] = [];
  let synced = 0;
  for (const item of items) {
    try {
      const blob = await dataUrlToBlob(item.dataUrl);
      await uploadMedia({
        jobId: item.jobId,
        customerId: item.customerId,
        unitId: item.unitId,
        kind: item.kind,
        checklistKey: item.checklistKey,
        label: item.label,
        remarks: item.remarks,
        file: blob,
        fileName: item.fileName,
        latitude: item.latitude,
        longitude: item.longitude,
        capturedAt: item.capturedAt,
      });
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return synced;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from("job-media").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function logLocation(event: string, jobId: string | null) {
  const geo = await getPosition();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return geo;
  await supabase.from("location_logs").insert({
    job_id: jobId,
    user_id: data.user.id,
    event,
    latitude: geo.latitude,
    longitude: geo.longitude,
  });
  return geo;
}

export async function writeAudit(
  entity: string,
  entityId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    entity,
    entity_id: entityId,
    action,
    details: details as never,
  });
}
