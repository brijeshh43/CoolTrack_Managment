import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, LogIn, LogOut, MapPin, Camera, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, fmtDateTime, getPosition, todayISO } from "@/lib/fsm";
import { compressImage, fileToDataUrl, signedUrl } from "@/lib/offline";
import { CameraCapture } from "@/components/fsm/camera-capture";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

type AttRow = {
  id: string;
  work_date: string;
  in_time: string;
  out_time: string | null;
  in_latitude: number | null;
  in_longitude: number | null;
  out_latitude: number | null;
  out_longitude: number | null;
  remarks: string | null;
  selfie_path: string | null;
};

function SelfieThumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (path) {
      setLoading(true);
      void signedUrl(path).then((u) => {
        setUrl(u);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [path]);

  if (loading) {
    return (
      <div className="shrink-0 h-16 w-16 rounded-lg border border-border bg-muted animate-pulse" />
    );
  }
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg border border-border overflow-hidden"
      title="View attendance selfie"
    >
      <img src={url} alt="Attendance selfie" className="h-16 w-16 object-cover" loading="lazy" />
    </a>
  );
}

function AttendancePage() {
  const { user } = useAuth();
  const [today, setToday] = useState<AttRow | null>(null);
  const [history, setHistory] = useState<AttRow[]>([]);
  const [remarks, setRemarks] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("attendance")
      .select(
        "id, work_date, in_time, out_time, in_latitude, in_longitude, out_latitude, out_longitude, remarks, selfie_path",
      )
      .eq("engineer_id", user.id)
      .order("work_date", { ascending: false })
      .limit(30);
    const rows = (data as AttRow[]) ?? [];
    setToday(rows.find((r) => r.work_date === todayISO()) ?? null);
    setHistory(rows);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const punchIn = async (selfieDataUrl: string | null) => {
    if (!user) return;
    setBusy(true);
    try {
      const geo = await getPosition();
      let selfiePath: string | null = null;
      if (selfieDataUrl) {
        const rawBlob = await (await fetch(selfieDataUrl)).blob();
        const compressedBlob = await compressImage(rawBlob, 1000, 1000, 0.8);
        const path = `attendance/${user.id}/${todayISO()}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("job-media").upload(path, compressedBlob, {
          contentType: "image/jpeg",
        });
        if (!error) selfiePath = path;
      }
      const { error } = await supabase.from("attendance").insert({
        engineer_id: user.id,
        work_date: todayISO(),
        in_time: new Date().toISOString(),
        in_latitude: geo.latitude,
        in_longitude: geo.longitude,
        selfie_path: selfiePath,
        remarks: remarks || null,
      });
      if (error) throw error;
      toast.success("Duty started");
      setSelfie(null);
      setRemarks("");
      setShowCamera(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not punch in");
    } finally {
      setBusy(false);
    }
  };

  const punchOut = async () => {
    if (!today) return;
    setBusy(true);
    try {
      const geo = await getPosition();
      const { error } = await supabase
        .from("attendance")
        .update({
          out_time: new Date().toISOString(),
          out_latitude: geo.latitude,
          out_longitude: geo.longitude,
          ...(remarks ? { remarks } : {}),
        })
        .eq("id", today.id);
      if (error) throw error;
      toast.success("Duty ended");
      setRemarks("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not punch out");
    } finally {
      setBusy(false);
    }
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const onSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfie(await fileToDataUrl(file));
      // Reset input value so same photo can be re-selected if needed
      e.target.value = "";
    }
  };

  const handleCameraCapture = (dataUrl: string) => {
    setSelfie(dataUrl);
    setShowCamera(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-8 pb-10 text-primary-foreground">
        <div className="container-main">
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm opacity-80">{fmtDate(new Date().toISOString())}</p>
        </div>
      </header>

      <div className="container-main space-y-6 py-6">
        <div className="surface-card space-y-6 p-6">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <Clock className="size-5 text-primary" />
            {today
              ? today.out_time
                ? "Duty completed for today"
                : "On duty"
              : "Not punched in yet"}
          </div>

          {today && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>In: {fmtDateTime(today.in_time)}</p>
              <p>Out: {today.out_time ? fmtDateTime(today.out_time) : "—"}</p>
              {today.in_latitude != null && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  {today.in_latitude.toFixed(4)}, {today.in_longitude?.toFixed(4)}
                </p>
              )}
            </div>
          )}

          {!today && (
            <>
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/30">
                  {selfie ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={selfie}
                        alt="Attendance selfie"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex justify-between items-center text-white">
                        <span className="text-xs font-medium">Selfie Attached</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2"
                          onClick={() => setSelfie(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col h-full items-center justify-center bg-muted/40 cursor-pointer p-4 text-center space-y-2 hover:bg-muted/60 transition-colors"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="size-10 text-primary animate-pulse" />
                      <p className="text-sm font-medium">Tap to Take Selfie</p>
                      <p className="text-xs text-muted-foreground">Front camera required for punch in</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    className="flex-1 min-w-[130px] gap-2"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={busy}
                  >
                    <Camera className="size-4" /> {selfie ? "Retake Selfie" : "Take Selfie"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 min-w-[130px] gap-2"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={busy}
                  >
                    <Image className="size-4" /> Gallery
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="gap-2 text-muted-foreground"
                    onClick={() => setShowCamera(true)}
                    disabled={busy}
                    title="Open live camera viewfinder"
                  >
                    Live View
                  </Button>
                </div>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  onChange={onSelfie}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onSelfie}
                />
              </div>
            </>
          )}

          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
            maxLength={300}
            rows={3}
          />

          {!today ? (
            <Button size="lg" className="w-full" disabled={busy} onClick={() => punchIn(selfie)}>
              {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Punch In
            </Button>
          ) : !today.out_time ? (
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              disabled={busy}
              onClick={punchOut}
            >
              {busy ? <Loader2 className="animate-spin" /> : <LogOut />} Punch Out
            </Button>
          ) : null}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Last 30 days</h2>
          {history.map((row) => (
            <div
              key={row.id}
              className="surface-card flex items-center justify-between gap-4 p-4 text-sm"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className="font-medium whitespace-nowrap">{fmtDate(row.work_date)}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(row.in_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" → "}
                  {row.out_time
                    ? new Date(row.out_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "open"}
                </span>
              </div>
              {row.selfie_path && <SelfieThumb path={row.selfie_path} />}
            </div>
          ))}
          {history.length === 0 && (
            <p className="surface-card p-6 text-center text-base text-muted-foreground">
              No attendance recorded yet.
            </p>
          )}
        </section>
      </div>

      <BottomNav />

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          initialImage={selfie}
        />
      )}
    </div>
  );
}
