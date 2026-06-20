import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersAdmin,
});

function CustomersAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["admin_customers", search],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(100);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      return (await q).data;
    },
  });
  const save = useMutation({
    mutationFn: async (c: any) => {
      const payload = { name: c.name, email: c.email || null, phone: c.phone || null, notes: c.notes || null };
      if (c.id) await supabase.from("customers").update(payload).eq("id", c.id);
      else await supabase.from("customers").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); setEditing(null); toast.success("Saved"); },
  });
  const del = useMutation({ mutationFn: async (id: string) => supabase.from("customers").delete().eq("id", id), onSuccess: () => qc.invalidateQueries() });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-light tracking-tight">Customers</h1>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm" /></div>
          <button onClick={() => setEditing({ name: "" })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Phone</th><th className="p-3"></th></tr></thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.name}</td><td className="p-3 text-muted-foreground">{c.email ?? "—"}</td><td className="p-3 text-muted-foreground">{c.phone ?? "—"}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditing(c)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => del.mutate(c.id)} className="text-xs text-destructive hover:underline"><Trash2 className="inline size-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save.mutate(editing); }} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit" : "New"} Customer</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes" rows={3} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
