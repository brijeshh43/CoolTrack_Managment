import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, LogIn, LogOut, MapPin, Camera, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDate, fmtDateTime, getPosition, todayISO } from "@/lib/fsm";
import { fileToDataUrl } from "@/lib/offline";
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
        const blob = await (await fetch(selfieDataUrl)).blob();
        const path = `attendance/${user.id}/${todayISO()}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("job-media").upload(path, blob, {
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

  const onSelfie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelfie(await fileToDataUrl(file));
  };

  const handleCameraCapture = (dataUrl: string) => {
    setSelfie(dataUrl);
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
                <label className="cursor-pointer">
                  <div className="relative aspect-[4/3] rounded-xl border-2 border-dashed border-border overflow-hidden">
                    {selfie ? (
                      <img
                        src={selfie}
                        alt="Attendance selfie"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <Camera className="size-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 min-w-[140px] gap-2"
                    onClick={() => setShowCamera(true)}
                    disabled={busy}
                  >
                    <Camera className="size-4" /> Use Camera
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="flex-1 min-w-[140px] gap-2"
                    onClick={() => document.getElementById("selfie-upload")?.click()}
                    disabled={busy}
                  >
                    <Image className="size-4" /> Upload Photo
                  </Button>
                </div>
                <input
                  id="selfie-upload"
                  type="file"
                  accept="image/*"
                  capture="user"
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
              className="surface-card flex items-center justify-between p-4 text-sm"
            >
              <span className="font-medium">{fmtDate(row.work_date)}</span>
              <span className="text-muted-foreground">
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
