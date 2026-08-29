import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Clock, History, Home, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/attendance", label: "Attendance", icon: Clock },
  { to: "/feed", label: "Feed", icon: MessageSquare },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[80rem] items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 py-3 text-sm font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-6", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
