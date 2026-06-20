import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Search, Plus } from "lucide-react";

type Customer = { id: string; name: string; email?: string | null; phone?: string | null };

export function CustomerDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (c: Customer) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: customers, refetch } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(20);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Customer[];
    },
  });

  async function create() {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("customers").insert({ name, email: email || null, phone: phone || null }).select().single();
    if (error) { toast.error(error.message); return; }
    onSelect(data);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg">{creating ? "New Customer" : "Assign Customer"}</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md hover:bg-background"><X className="size-4" /></button>
        </div>

        {!creating ? (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone"
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {customers?.map((c) => (
                <button key={c.id} onClick={() => onSelect(c)} className="flex w-full items-center justify-between rounded-md bg-background px-3 py-2 text-left text-sm hover:bg-surface-hover">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.email || c.phone}</span>
                </button>
              ))}
              {customers?.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No customers</p>}
            </div>
            <button onClick={() => setCreating(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground">
              <Plus className="size-3" /> New Customer
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setCreating(false)} className="rounded-lg border border-border py-3 text-xs font-bold uppercase tracking-widest hover:bg-background">Back</button>
              <button onClick={create} className="rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90">Create</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
