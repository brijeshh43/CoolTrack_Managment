import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const TABS: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/jobs", label: "Jobs" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/parts", label: "Parts" },
  { to: "/admin/team", label: "Team" },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="brand-gradient px-4 pt-8 pb-14 text-primary-foreground">
        <div className="mx-auto max-w-3xl">
          <Link to="/home" className="mb-3 inline-flex items-center gap-1 text-xs opacity-80">
            <ArrowLeft className="size-4" /> Engineer view
          </Link>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-xs opacity-80">Jobs, customers, equipment, parts and team</p>
        </div>
      </header>

      <div className="mx-auto -mt-9 max-w-3xl px-4">
        <div className="no-print surface-card flex gap-1 overflow-x-auto p-1">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to as never}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 space-y-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
