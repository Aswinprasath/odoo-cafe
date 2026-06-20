import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { currency, fmtDate } from "@/lib/format";
import { useRealtime } from "@/hooks/use-realtime";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — Ember & Ash" }] }),
  component: OrdersList,
});

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted-foreground/20 text-muted-foreground",
  sent: "bg-warning/20 text-warning",
  paid: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

function OrdersList() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  useRealtime([{ table: "orders", queryKey: ["orders_list"] }]);

  const { data: orders } = useQuery({
    queryKey: ["orders_list", status, search],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, restaurant_tables(table_number), customers(name)").order("created_at", { ascending: false }).limit(100);
      if (status !== "all") q = q.eq("status", status as any);
      if (search) q = q.ilike("order_number", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-light tracking-tight">Orders</h1>
            <p className="text-sm text-muted-foreground">{orders?.length ?? 0} orders</p>
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search #order" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm focus:border-primary focus:outline-none" />
            {["all", "draft", "sent", "paid", "cancelled"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase tracking-wider ${status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface"}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-4 text-left">Order</th>
                <th className="p-4 text-left">Table</th>
                <th className="p-4 text-left">Customer</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Source</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o: any) => (
                <tr key={o.id} className="border-t border-border hover:bg-surface/50">
                  <td className="p-4 font-mono text-xs">{o.order_number}</td>
                  <td className="p-4">{o.restaurant_tables?.table_number ?? "—"}</td>
                  <td className="p-4">{o.customers?.name ?? "—"}</td>
                  <td className="p-4"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[o.status]}`}>{o.status}</span></td>
                  <td className="p-4 text-xs uppercase text-muted-foreground">{o.source}</td>
                  <td className="p-4 text-right font-mono">{currency(o.total)}</td>
                  <td className="p-4 text-xs text-muted-foreground">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
