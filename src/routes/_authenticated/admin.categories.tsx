import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesAdmin,
});

const PALETTE = ["#E2AD86","#C97B5C","#8FA888","#D4A5C0","#7C3F4D","#6FA8C9","#A07856","#B4A7D6","#A37E2C"];

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data } = useQuery({ queryKey: ["admin_categories"], queryFn: async () => (await supabase.from("categories").select("*").eq("archived", false).order("sort_order")).data });
  const save = useMutation({
    mutationFn: async (c: any) => {
      const payload = { name: c.name, color: c.color, sort_order: Number(c.sort_order ?? 0) };
      if (c.id) await supabase.from("categories").update(payload).eq("id", c.id);
      else await supabase.from("categories").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); setEditing(null); toast.success("Saved"); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => supabase.from("categories").update({ archived: true }).eq("id", id),
    onSuccess: () => { qc.invalidateQueries(); toast.success("Archived"); },
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-light tracking-tight">Categories</h1>
        <button onClick={() => setEditing({ name: "", color: PALETTE[0], sort_order: (data?.length ?? 0) + 1 })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {data?.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between">
              <span className="size-8 rounded-lg" style={{ background: c.color }} />
              <button onClick={() => del.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
            </div>
            <p className="mt-4 font-display">{c.name}</p>
            <button onClick={() => setEditing(c)} className="mt-3 text-xs text-primary hover:underline">Edit</button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit" : "New"} Category</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color</p>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((p) => (
                  <button key={p} type="button" onClick={() => setEditing({ ...editing, color: p })} className={`size-8 rounded-lg border-2 ${editing.color === p ? "border-foreground" : "border-transparent"}`} style={{ background: p }} />
                ))}
              </div>
              <input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
