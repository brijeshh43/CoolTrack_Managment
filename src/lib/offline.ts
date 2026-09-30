import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "./fsm";

/**
 * Offline-first helpers.
 *
 * Drafts (form values, checklist remarks, signature) are written safely with try/catch.
 * Media captured is compressed and stored in IndexedDB (which has hundreds of MBs quota
 * compared to localStorage's 5MB limit), flushing when connectivity is restored.
 */

const DRAFT_PREFIX = "fsm:draft:";
const IDB_NAME = "cooltrack_fsm_db";
const IDB_STORE = "media_queue";
const IDB_VERSION = 1;

export type SyncState = "idle" | "offline" | "syncing" | "synced";

export function saveDraft<T>(jobId: string, data: T) {
  try {
    localStorage.setItem(DRAFT_PREFIX + jobId, JSON.stringify({ data, at: Date.now() }));
  } catch (err) {
    console.warn("Storage quota reached or localStorage unavailable for draft:", err);
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
  try {
    localStorage.removeItem(DRAFT_PREFIX + jobId);
  } catch {
    /* ignore */
  }
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

// In-memory cache of queued media for synchronous checks and offline state
let inMemoryQueue: QueuedMedia[] = [];
let idbAvailable = true;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      idbAvailable = false;
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      idbAvailable = false;
      reject(request.error);
    };
  });
}

// Initialize queue from IDB and clean up any legacy bloated localStorage items
if (typeof window !== "undefined") {
  // Clear any old oversized localStorage mediaQueue to free space immediately
  try {
    const legacy = localStorage.getItem("fsm:mediaQueue");
    if (legacy) {
      localStorage.removeItem("fsm:mediaQueue");
    }
  } catch {
    /* ignore */
  }

  void (async () => {
    try {
      const items = await getQueuedMedia();
      inMemoryQueue = items;
    } catch {
      /* ignore */
    }
  })();
}

export async function getQueuedMedia(): Promise<QueuedMedia[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as QueuedMedia[]) || [];
        inMemoryQueue = items;
        resolve(items);
      };
      req.onerror = () => resolve(inMemoryQueue);
    });
  } catch {
    return inMemoryQueue;
  }
}

export async function addQueuedMedia(item: QueuedMedia): Promise<void> {
  inMemoryQueue = [...inMemoryQueue.filter((x) => x.id !== item.id), item];
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to store media in IndexedDB, saved to memory:", err);
  }
}

export async function removeQueuedMedia(id: string): Promise<void> {
  inMemoryQueue = inMemoryQueue.filter((x) => x.id !== id);
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function getJobQueuedMedia(jobId: string): Promise<QueuedMedia[]> {
  const all = await getQueuedMedia();
  return all.filter((item) => item.jobId === jobId);
}

export function queueSize(): number {
  return inMemoryQueue.length;
}

export function enqueueMedia(item: QueuedMedia) {
  void addQueuedMedia(item);
}

/**
 * Resizes and compresses images in-browser to prevent high-res mobile photos (10MB+)
 * from blowing quotas and choking mobile networks.
 */
export async function compressImage(
  file: Blob | File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
): Promise<Blob> {
  if (!file.type || !file.type.startsWith("image/")) {
    return file;
  }

  // Skip tiny files (< 200KB)
  if (file.size < 200 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function fileToDataUrl(file: Blob | File): Promise<string> {
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
  file: File | Blob;
}): Promise<"uploaded" | "queued"> {
  const geo = await getPosition();
  const capturedAt = new Date().toISOString();

  // Compress photo before uploading or queuing
  let processedBlob: Blob = params.file;
  if (params.kind === "photo") {
    try {
      processedBlob = await compressImage(params.file, 1600, 1600, 0.82);
    } catch (err) {
      console.warn("Compression failed, using original:", err);
      processedBlob = params.file;
    }
  }

  const fileName = (params.file as File).name || `${params.kind}_${Date.now()}.jpg`;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const dataUrl = await fileToDataUrl(processedBlob);
    await addQueuedMedia({
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
      fileName,
      dataUrl,
    });
    return "queued";
  }

  try {
    await uploadMedia({
      ...params,
      file: processedBlob,
      fileName,
      latitude: geo.latitude,
      longitude: geo.longitude,
      capturedAt,
    });
    return "uploaded";
  } catch (err) {
    console.warn("Online upload failed, queuing media offline in IndexedDB:", err);
    const dataUrl = await fileToDataUrl(processedBlob);
    await addQueuedMedia({
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
      fileName,
      dataUrl,
    });
    return "queued";
  }
}

/** Flush anything captured while offline. */
export async function flushQueue(): Promise<number> {
  const items = await getQueuedMedia();
  if (items.length === 0) return 0;
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
      await removeQueuedMedia(item.id);
      synced += 1;
    } catch (err) {
      console.warn(`Failed to flush queued media ${item.id}:`, err);
    }
  }
  return synced;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  try {
    const { data } = await supabase.storage.from("job-media").createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export async function logLocation(event: string, jobId: string | null) {
  const geo = await getPosition();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return geo;
    await supabase.from("location_logs").insert({
      job_id: jobId,
      user_id: data.user.id,
      event,
      latitude: geo.latitude,
      longitude: geo.longitude,
    });
  } catch {
    /* ignore offline */
  }
  return geo;
}

export async function writeAudit(
  entity: string,
  entityId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      actor_id: data.user.id,
      entity,
      entity_id: entityId,
      action,
      details: details as never,
    });
  } catch {
    /* ignore offline */
  }
}
