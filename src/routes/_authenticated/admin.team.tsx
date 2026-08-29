import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { downloadCsv, fmtDateTime, todayISO } from "@/lib/fsm";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: AdminTeam,
});

type Member = {
  id: string;
  full_name: string;
  employee_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

type Attendance = {
  id: string;
  engineer_id: string;
  work_date: string;
  in_time: string;
  out_time: string | null;
  in_address: string | null;
};

function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: a }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, employee_code, phone, email, is_active")
        .order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("attendance")
        .select("id, engineer_id, work_date, in_time, out_time, in_address")
        .eq("work_date", todayISO()),
    ]);
    setMembers((p as Member[]) ?? []);
    const map: Record<string, string> = {};
    (r ?? []).forEach((x) => {
      map[x.user_id] = x.role;
    });
    setRoles(map);
    setAttendance((a as Attendance[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (m: Member) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !m.is_active })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="container-main py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Team & Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Manage team members and view today's attendance
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold flex-1">Today's attendance</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              `attendance-${todayISO()}.csv`,
              members.map((m) => {
                const a = attendance.find((x) => x.engineer_id === m.id);
                return {
                  name: m.full_name,
                  employee_code: m.employee_code ?? "",
                  role: roles[m.id] ?? "engineer",
                  in_time: a?.in_time ?? "",
                  out_time: a?.out_time ?? "",
                  in_address: a?.in_address ?? "",
                };
              }),
            )
          }
        >
          <Download className="size-4" /> Export attendance
        </Button>
      </div>

      <div className="surface-card divide-y divide-border">
        {members.map((m) => {
          const a = attendance.find((x) => x.engineer_id === m.id);
          return (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium flex items-center gap-2">
                  {m.full_name}{" "}
                  <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase text-muted-foreground">
                    {roles[m.id] ?? "engineer"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {m.employee_code || "—"} · {m.phone || m.email || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {a
                    ? `In ${fmtDateTime(a.in_time)}${a.out_time ? ` · Out ${fmtDateTime(a.out_time)}` : " · On duty"}`
                    : "Not checked in today"}
                </p>
              </div>
              <Switch checked={m.is_active} onCheckedChange={() => void toggleActive(m)} />
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="p-8 text-center text-base text-muted-foreground">No team members yet.</p>
        )}
      </div>
    </div>
  );
}
