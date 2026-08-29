import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Phone, ShieldCheck, IdCard, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/fsm/bottom-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient px-4 pt-10 pb-14 text-primary-foreground">
        <div className="container-main">
          <h1 className="text-2xl font-bold">{profile?.full_name ?? "Profile"}</h1>
          <p className="text-sm opacity-80 mt-1 capitalize">{role ?? "engineer"}</p>
        </div>
      </header>

      <div className="container-main -mt-8 space-y-5">
        <div className="surface-card divide-y divide-border">
          <Row icon={IdCard} label="Employee ID" value={profile?.employee_code ?? "—"} />
          <Row icon={Mail} label="Email" value={profile?.email ?? "—"} />
          <Row icon={Phone} label="Phone" value={profile?.phone ?? "—"} />
          <Row icon={ShieldCheck} label="Role" value={role ?? "engineer"} />
        </div>

        {isAdmin && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void navigate({ to: "/admin" })}
          >
            <LayoutDashboard className="size-4" /> Open Admin Dashboard
          </Button>
        )}

        <Button variant="destructive" className="w-full" onClick={handleSignOut}>
          <LogOut className="size-4" /> Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-5">
      <Icon className="size-5 text-muted-foreground" />
      <span className="text-base text-muted-foreground">{label}</span>
      <span className="ml-auto text-base font-medium capitalize">{value}</span>
    </div>
  );
}
