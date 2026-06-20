import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { currency } from "@/lib/format";
import { toast } from "sonner";
import { Plus, X, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsAdmin,
});

function ProductsAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin_products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name, color)").eq("archived", false).order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("archived", false).order("sort_order")).data,
  });

  const saveMut = useMutation({
    mutationFn: async (p: any) => {
      const payload = { name: p.name, category_id: p.category_id || null, price: Number(p.price), tax_rate: Number(p.tax_rate ?? 0), description: p.description || null, unit: p.unit || "pcs", active: p.active ?? true, image_url: p.image_url || null };
      if (p.id) await supabase.from("products").update(payload).eq("id", p.id);
      else await supabase.from("products").insert(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] }); setEditing(null); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => supabase.from("products").update({ archived: true }).eq("id", id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_products"] }); toast.success("Archived"); },
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div><h1 className="font-display text-3xl font-light tracking-tight">Products</h1><p className="text-sm text-muted-foreground">{products?.length ?? 0} items</p></div>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none" /></div>
          <button onClick={() => setEditing({ name: "", price: 0, tax_rate: 8, unit: "pcs", active: true })} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="size-4" /> New</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Tax %</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t border-border hover:bg-surface/40">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.categories ? <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: p.categories.color }} />{p.categories.name}</span> : "—"}</td>
                <td className="p-3 text-right font-mono">{currency(p.price)}</td>
                <td className="p-3 text-right font-mono">{p.tax_rate}</td>
                <td className="p-3"><span className={`text-[10px] font-bold uppercase ${p.active ? "text-success" : "text-muted-foreground"}`}>{p.active ? "Active" : "Off"}</span></td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => setEditing(p)} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => deleteMut.mutate(p.id)} className="text-xs text-destructive hover:underline"><Trash2 className="inline size-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }} className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><p className="font-display text-lg">{editing.id ? "Edit Product" : "New Product"}</p><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
            <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <select value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm">
              <option value="">— Category —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="Price" className="rounded-lg border border-border bg-background px-4 py-3 text-sm" />
              <input type="number" step="0.01" value={editing.tax_rate ?? 0} onChange={(e) => setEditing({ ...editing, tax_rate: e.target.value })} placeholder="Tax %" className="rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            </div>
            <input value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="Unit (pcs, kg…)" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={3} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="Image URL (optional)" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            <button type="submit" className="w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
