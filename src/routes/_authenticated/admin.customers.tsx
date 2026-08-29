import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtDate } from "@/lib/fsm";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: AdminCustomers,
});

type Customer = {
  id: string;
  customer_code: string;
  name: string;
  address: string | null;
  location: string | null;
  contact_number: string | null;
  email: string | null;
};

type Unit = {
  id: string;
  customer_id: string;
  unit_code: string;
  model_number: string | null;
  serial_number: string | null;
  equipment_type: string | null;
  location: string | null;
  warranty_until: string | null;
  status: string;
};

function AdminCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [unitFor, setUnitFor] = useState<string | null>(null);

  const [cust, setCust] = useState({
    name: "",
    customer_code: "",
    address: "",
    location: "",
    contact_number: "",
    email: "",
  });
  const [unit, setUnit] = useState({
    unit_code: "",
    model_number: "",
    serial_number: "",
    equipment_type: "",
    location: "",
    warranty_until: "",
  });

  const load = async () => {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase
        .from("customers")
        .select("id, customer_code, name, address, location, contact_number, email")
        .order("name"),
      supabase
        .from("units")
        .select(
          "id, customer_id, unit_code, model_number, serial_number, equipment_type, location, warranty_until, status",
        )
        .order("unit_code"),
    ]);
    setCustomers((c as Customer[]) ?? []);
    setUnits((u as Unit[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("customers").insert({
      name: cust.name,
      customer_code: cust.customer_code || `CUS-${Date.now().toString().slice(-6)}`,
      address: cust.address || null,
      location: cust.location || null,
      contact_number: cust.contact_number || null,
      email: cust.email || null,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Customer added");
    setCustOpen(false);
    setCust({
      name: "",
      customer_code: "",
      address: "",
      location: "",
      contact_number: "",
      email: "",
    });
    void load();
  };

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitFor) return;
    setSaving(true);
    const { error } = await supabase.from("units").insert({
      customer_id: unitFor,
      unit_code: unit.unit_code || `UNIT-${Date.now().toString().slice(-6)}`,
      model_number: unit.model_number || null,
      serial_number: unit.serial_number || null,
      equipment_type: unit.equipment_type || null,
      location: unit.location || null,
      warranty_until: unit.warranty_until || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Equipment unit added");
    setUnitFor(null);
    setUnit({
      unit_code: "",
      model_number: "",
      serial_number: "",
      equipment_type: "",
      location: "",
      warranty_until: "",
    });
    void load();
  };

  const visible = customers.filter((c) =>
    `${c.name} ${c.customer_code} ${c.location ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container-main py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Customers & Equipment</h1>
        <p className="text-muted-foreground mt-1">Manage customer sites and equipment units</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs flex-1 min-w-[250px]"
        />
        <Dialog open={custOpen} onOpenChange={setCustOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={addCustomer} className="space-y-5 py-2">
              <F label="Name *">
                <Input
                  required
                  maxLength={120}
                  value={cust.name}
                  onChange={(e) => setCust({ ...cust, name: e.target.value })}
                />
              </F>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Customer code">
                  <Input
                    maxLength={30}
                    value={cust.customer_code}
                    onChange={(e) => setCust({ ...cust, customer_code: e.target.value })}
                  />
                </F>
                <F label="Contact number">
                  <Input
                    maxLength={20}
                    value={cust.contact_number}
                    onChange={(e) => setCust({ ...cust, contact_number: e.target.value })}
                  />
                </F>
              </div>
              <F label="Email">
                <Input
                  type="email"
                  value={cust.email}
                  onChange={(e) => setCust({ ...cust, email: e.target.value })}
                />
              </F>
              <F label="Site / location">
                <Input
                  maxLength={120}
                  value={cust.location}
                  onChange={(e) => setCust({ ...cust, location: e.target.value })}
                />
              </F>
              <F label="Address">
                <Textarea
                  rows={3}
                  maxLength={500}
                  value={cust.address}
                  onChange={(e) => setCust({ ...cust, address: e.target.value })}
                />
              </F>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Save customer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {visible.length === 0 ? (
        <p className="surface-card p-8 text-center text-base text-muted-foreground">
          No customers yet.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((c) => {
            const list = units.filter((u) => u.customer_id === c.id);
            const open = expanded === c.id;
            return (
              <div key={c.id} className="surface-card p-5">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : c.id)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {c.customer_code} · {c.location || c.address || "No location"} · {list.length}{" "}
                      unit(s)
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 transition-transform text-muted-foreground ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      {c.contact_number || "No phone"} · {c.email || "No email"}
                    </p>
                    {list.map((u) => (
                      <div key={u.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                        <p className="font-medium">
                          {u.unit_code} {u.equipment_type ? `· ${u.equipment_type}` : ""}
                        </p>
                        <p className="text-muted-foreground">
                          {u.model_number || "No model"} · SN {u.serial_number || "—"} ·{" "}
                          {u.location || "—"}
                        </p>
                        <p className="text-muted-foreground">
                          Warranty until {u.warranty_until ? fmtDate(u.warranty_until) : "—"} ·{" "}
                          {u.status}
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUnitFor(c.id)}
                      className="gap-2"
                    >
                      <Plus className="size-4" /> Add equipment unit
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(unitFor)} onOpenChange={(o) => !o && setUnitFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add equipment unit</DialogTitle>
          </DialogHeader>
          <form onSubmit={addUnit} className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Unit code">
                <Input
                  maxLength={40}
                  value={unit.unit_code}
                  onChange={(e) => setUnit({ ...unit, unit_code: e.target.value })}
                />
              </F>
              <F label="Equipment type">
                <Input
                  maxLength={60}
                  placeholder="Split AC / VRF / Chiller"
                  value={unit.equipment_type}
                  onChange={(e) => setUnit({ ...unit, equipment_type: e.target.value })}
                />
              </F>
              <F label="Model number">
                <Input
                  maxLength={60}
                  value={unit.model_number}
                  onChange={(e) => setUnit({ ...unit, model_number: e.target.value })}
                />
              </F>
              <F label="Serial number">
                <Input
                  maxLength={60}
                  value={unit.serial_number}
                  onChange={(e) => setUnit({ ...unit, serial_number: e.target.value })}
                />
              </F>
              <F label="Installed location">
                <Input
                  maxLength={80}
                  value={unit.location}
                  onChange={(e) => setUnit({ ...unit, location: e.target.value })}
                />
              </F>
              <F label="Warranty until">
                <Input
                  type="date"
                  value={unit.warranty_until}
                  onChange={(e) => setUnit({ ...unit, warranty_until: e.target.value })}
                />
              </F>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save unit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
