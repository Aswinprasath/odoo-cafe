import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { currency } from "@/lib/format";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { startOfDay, subDays, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

const RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "week", label: "7 Days", days: 7 },
  { id: "month", label: "30 Days", days: 30 },
] as const;

function Dashboard() {
  const [rangeId, setRangeId] = useState<typeof RANGES[number]["id"]>("week");
  const range = RANGES.find((r) => r.id === rangeId)!;
  const since = startOfDay(subDays(new Date(), range.days - 1)).toISOString();

  const { data } = useQuery({
    queryKey: ["dashboard", rangeId],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(qty, unit_price, name_snapshot, category_color)")
        .gte("created_at", since)
        .eq("status", "paid");
      return orders ?? [];
    },
  });

  const totalRevenue = data?.reduce((s, o) => s + Number(o.total), 0) ?? 0;
  const totalOrders = data?.length ?? 0;
  const aov = totalOrders ? totalRevenue / totalOrders : 0;

  // sales by day
  const byDay = new Map<string, number>();
  for (let i = range.days - 1; i >= 0; i--) {
    byDay.set(format(subDays(new Date(), i), "MMM d"), 0);
  }
  data?.forEach((o) => {
    const key = format(new Date(o.created_at), "MMM d");
    byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total));
  });
  const series = Array.from(byDay, ([day, total]) => ({ day, total: +total.toFixed(2) }));

  // top products
  const prodMap = new Map<string, { name: string; qty: number; revenue: number; color: string }>();
  data?.forEach((o: any) => {
    o.order_items?.forEach((i: any) => {
      const p = prodMap.get(i.name_snapshot) ?? { name: i.name_snapshot, qty: 0, revenue: 0, color: i.category_color ?? "#E2AD86" };
      p.qty += Number(i.qty);
      p.revenue += Number(i.qty) * Number(i.unit_price);
      prodMap.set(i.name_snapshot, p);
    });
  });
  const topProducts = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Performance overview</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRangeId(r.id)} className={`rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${rangeId === r.id ? "bg-background text-foreground" : "text-muted-foreground"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Revenue", value: currency(totalRevenue), accent: true },
          { label: "Orders", value: totalOrders.toString() },
          { label: "Avg Order Value", value: currency(aov) },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{k.label}</p>
            <p className={`mt-3 font-display text-4xl font-light ${k.accent ? "text-primary" : ""}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Revenue Trend</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series}>
            <CartesianGrid stroke="#2a2a2d" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip contentStyle={{ background: "#161618", border: "1px solid #2a2a2d", borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke="#E2AD86" strokeWidth={2} dot={{ fill: "#E2AD86", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top products */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Top Products by Revenue</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts}>
              <CartesianGrid stroke="#2a2a2d" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} angle={-20} textAnchor="end" height={70} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ background: "#161618", border: "1px solid #2a2a2d", borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="#E2AD86" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Best Sellers</p>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr><th className="pb-2 text-left">Product</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Revenue</th></tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 6).map((p) => (
                <tr key={p.name} className="border-t border-border">
                  <td className="py-2"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: p.color }} />{p.name}</td>
                  <td className="py-2 text-right font-mono">{p.qty}</td>
                  <td className="py-2 text-right font-mono">{currency(p.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
