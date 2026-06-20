import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsAdmin,
});

function CouponsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const { data } = useQuery({ queryKey: ["admin_coupons"], queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data });
  const save = useMutation({
    mutationFn: async (c: any) => {
      const payload = { code: c.code.toUpperCase(), discount_type: c.discount_type, discount_value: Number(c.discount_value), expires_at: c.expires_at || null, active: c.active ?? true };
      if (c.id) await supabase.from("coupons").update(payload).eq("id", c.id);
      else await supabase.from("coupons").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries(); setEditing(null); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const del = useMutation({ mutationFn: async (id: string) => supabase.from("coupons").delete().eq("id", id), onSuccess: () => qc.invalidateQueries() });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-light tracking-tight">Coupons</h1>
        <button onClick={() => setEditing({ code: "", discount_type: "percentage", discount_value: 10, active: true })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Value</th><th className="p-3 text-left">Expires</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono font-semibold">{c.code}</td>
                <td className="p-3 text-xs uppercase">{c.discount_type}</td>
                <td className="p-3 text-right font-mono">{c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-xs"><span className={c.active ? "text-success" : "text-muted-foreground"}>{c.active ? "Active" : "Inactive"}</span></td>
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
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit" : "New"} Coupon</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="CODE" className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono uppercase tracking-widest" />
            <select value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm">
              <option value="percentage">Percentage</option><option value="fixed">Fixed</option>
            </select>
            <input required type="number" step="0.01" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: e.target.value })} placeholder="Value" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input type="date" value={editing.expires_at?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
