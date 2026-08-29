import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { flushQueue, queueSize } from "@/lib/offline";

/** Shows "Saved Offline" / "Syncing..." / "Synced Successfully". */
export function SyncBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [state, setState] = useState<"idle" | "syncing" | "synced">("idle");

  useEffect(() => {
    const refresh = () => setPending(queueSize());
    refresh();
    setOnline(navigator.onLine);

    const sync = async () => {
      if (!navigator.onLine || queueSize() === 0) return;
      setState("syncing");
      const n = await flushQueue();
      refresh();
      setState(n > 0 ? "synced" : "idle");
      if (n > 0) setTimeout(() => setState("idle"), 3000);
    };

    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const interval = setInterval(() => {
      refresh();
      void sync();
    }, 20000);
    void sync();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0 && state !== "synced") return null;

  const label = !online
    ? `Offline${pending ? ` — ${pending} item(s) saved offline` : ""}`
    : state === "syncing"
      ? "Syncing..."
      : pending > 0
        ? `${pending} item(s) waiting to sync`
        : "Synced Successfully";

  const Icon = !online ? CloudOff : state === "syncing" ? RefreshCw : CheckCircle2;

  return (
    <div
      className={`no-print sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        !online
          ? "bg-warning text-warning-foreground"
          : state === "synced"
            ? "bg-success text-success-foreground"
            : "bg-info text-info-foreground"
      }`}
    >
      <Icon className={`size-4 ${state === "syncing" ? "animate-spin" : ""}`} />
      {label}
    </div>
  );
}
