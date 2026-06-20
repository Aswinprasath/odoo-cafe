import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/floors")({
  component: FloorsAdmin,
});

function FloorsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data } = useQuery({ queryKey: ["admin_floors"], queryFn: async () => (await supabase.from("floors").select("*").order("sort_order")).data });
  const save = useMutation({
    mutationFn: async (f: any) => {
      const payload = { name: f.name, sort_order: Number(f.sort_order ?? 0) };
      if (f.id) await supabase.from("floors").update(payload).eq("id", f.id);
      else await supabase.from("floors").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); setEditing(null); toast.success("Saved"); },
  });
  const del = useMutation({ mutationFn: async (id: string) => supabase.from("floors").delete().eq("id", id), onSuccess: () => qc.invalidateQueries() });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-light tracking-tight">Floors</h1>
        <button onClick={() => setEditing({ name: "", sort_order: (data?.length ?? 0) + 1 })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-right">Order</th><th className="p-3"></th></tr></thead>
          <tbody>
            {data?.map((f) => (
              <tr key={f.id} className="border-t border-border">
                <td className="p-3 font-medium">{f.name}</td>
                <td className="p-3 text-right font-mono">{f.sort_order}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditing(f)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => del.mutate(f.id)} className="text-xs text-destructive hover:underline"><Trash2 className="inline size-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit" : "New"} Floor</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} placeholder="Order" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
