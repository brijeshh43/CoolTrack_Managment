import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { captureAndStore, signedUrl } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/fsm";

export type MediaRow = {
  id: string;
  kind: "photo" | "video";
  storage_path: string;
  label: string | null;
  checklist_key: string | null;
  remarks: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string;
};

export function useJobMedia(jobId: string) {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("job_media")
      .select(
        "id, kind, storage_path, label, checklist_key, remarks, latitude, longitude, captured_at",
      )
      .eq("job_id", jobId)
      .order("captured_at", { ascending: true });
    setMedia((data as MediaRow[]) ?? []);
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { media, loading, reload };
}

export function MediaThumb({ item }: { item: MediaRow }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void signedUrl(item.storage_path).then(setUrl);
  }, [item.storage_path]);

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-muted">
      {url ? (
        item.kind === "video" ? (
          <video src={url} controls className="h-36 w-full object-cover" />
        ) : (
          <img
            src={url}
            alt={item.label ?? "Service evidence photo"}
            loading="lazy"
            className="h-36 w-full object-cover"
          />
        )
      ) : (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <figcaption className="space-y-1 px-3 py-2 text-sm leading-tight text-muted-foreground">
        <div className="font-semibold text-foreground">{item.label ?? "Photo"}</div>
        <div>{fmtDateTime(item.captured_at)}</div>
        {item.latitude != null && (
          <div>
            {item.latitude.toFixed(4)}, {item.longitude?.toFixed(4)}
          </div>
        )}
        {item.remarks && <div className="italic">{item.remarks}</div>}
      </figcaption>
    </figure>
  );
}

type CaptureProps = {
  jobId: string;
  customerId: string | null;
  unitId: string | null;
  checklistKey?: string;
  label?: string;
  remarks?: string;
  allowVideo?: boolean | undefined;
  onDone: () => void;
};

/** Prominent camera controls — the most-used control in the field. */
export function MediaCapture({
  jobId,
  customerId,
  unitId,
  checklistKey,
  label,
  remarks,
  allowVideo,
  onDone,
}: CaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File | undefined, kind: "photo" | "video") => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await captureAndStore({
        jobId,
        customerId,
        unitId,
        kind,
        checklistKey: checklistKey ?? null,
        label: label ?? null,
        remarks: remarks ?? null,
        file,
      });
      toast.success(result === "queued" ? "Saved Offline — will sync later" : "Uploaded");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void handle(e.target.files?.[0], "photo")}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handle(e.target.files?.[0], "photo")}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => void handle(e.target.files?.[0], "video")}
      />
      <Button
        size="lg"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
        className="flex-1 min-w-[140px] gap-2"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Camera className="size-4" />} Take Photo
      </Button>
      <Button
        size="lg"
        variant="secondary"
        disabled={busy}
        onClick={() => galleryRef.current?.click()}
        className="min-w-[140px] gap-2"
      >
        <Images className="size-4" /> Gallery
      </Button>
      {allowVideo && (
        <Button
          size="lg"
          variant="secondary"
          disabled={busy}
          onClick={() => videoRef.current?.click()}
          className="min-w-[140px] gap-2"
        >
          <Video className="size-4" /> Video
        </Button>
      )}
    </div>
  );
}
