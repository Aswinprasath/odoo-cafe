import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tables")({
  component: TablesAdmin,
});

function TablesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data: floors } = useQuery({ queryKey: ["floors"], queryFn: async () => (await supabase.from("floors").select("*").order("sort_order")).data });
  const { data } = useQuery({ queryKey: ["admin_tables"], queryFn: async () => (await supabase.from("restaurant_tables").select("*, floors(name)").order("table_number")).data });
  const save = useMutation({
    mutationFn: async (t: any) => {
      const payload = { table_number: t.table_number, seats: Number(t.seats ?? 2), floor_id: t.floor_id, active: t.active ?? true };
      if (t.id) await supabase.from("restaurant_tables").update(payload).eq("id", t.id);
      else await supabase.from("restaurant_tables").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); setEditing(null); toast.success("Saved"); },
  });
  const del = useMutation({ mutationFn: async (id: string) => supabase.from("restaurant_tables").delete().eq("id", id), onSuccess: () => qc.invalidateQueries() });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-light tracking-tight">Tables</h1>
        <button onClick={() => setEditing({ table_number: "", seats: 2, floor_id: floors?.[0]?.id, active: true })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="p-3 text-left">Table</th><th className="p-3 text-left">Floor</th><th className="p-3 text-right">Seats</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {data?.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 font-medium">{t.table_number}</td>
                <td className="p-3">{t.floors?.name}</td>
                <td className="p-3 text-right font-mono">{t.seats}</td>
                <td className="p-3 text-xs uppercase">{t.status}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditing(t)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => del.mutate(t.id)} className="text-xs text-destructive hover:underline"><Trash2 className="inline size-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit" : "New"} Table</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.table_number} onChange={(e) => setEditing({ ...editing, table_number: e.target.value })} placeholder="Table number / label" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input type="number" value={editing.seats} onChange={(e) => setEditing({ ...editing, seats: e.target.value })} placeholder="Seats" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <select value={editing.floor_id ?? ""} onChange={(e) => setEditing({ ...editing, floor_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm">
              {floors?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
