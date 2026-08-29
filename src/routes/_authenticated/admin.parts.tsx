import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/parts")({
  component: AdminParts,
});

type Part = {
  id: string;
  name: string;
  part_number: string | null;
  category: string | null;
  unit_of_measure: string | null;
  is_active: boolean;
};

function AdminParts() {
  const [parts, setParts] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    part_number: "",
    category: "",
    unit_of_measure: "pcs",
  });

  const load = async () => {
    const { data } = await supabase
      .from("parts")
      .select("id, name, part_number, category, unit_of_measure, is_active")
      .order("name");
    setParts((data as Part[]) ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const addPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("parts").insert({
      name: form.name,
      part_number: form.part_number || null,
      category: form.category || null,
      unit_of_measure: form.unit_of_measure || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Part added to catalog");
    setOpen(false);
    setForm({ name: "", part_number: "", category: "", unit_of_measure: "pcs" });
    void load();
  };

  const toggle = async (part: Part) => {
    const { error } = await supabase
      .from("parts")
      .update({ is_active: !part.is_active })
      .eq("id", part.id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="container-main py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Parts Catalog</h1>
        <p className="text-muted-foreground mt-1">Manage parts inventory for service jobs</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-semibold flex-1">All parts</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> New part
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add part</DialogTitle>
            </DialogHeader>
            <form onSubmit={addPart} className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part number</Label>
                  <Input
                    maxLength={60}
                    value={form.part_number}
                    onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    maxLength={60}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unit of measure</Label>
                <Input
                  maxLength={20}
                  value={form.unit_of_measure}
                  onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} Save part
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {parts.length === 0 ? (
        <p className="surface-card p-8 text-center text-base text-muted-foreground">
          No parts in the catalog yet.
        </p>
      ) : (
        <div className="surface-card divide-y divide-border">
          {parts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {p.part_number || "No part no."} · {p.category || "Uncategorised"} ·{" "}
                  {p.unit_of_measure || "pcs"}
                </p>
              </div>
              <Switch checked={p.is_active} onCheckedChange={() => void toggle(p)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
