import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { useFloors, useTables } from "@/hooks/use-pos-data";
import { useRealtime } from "@/hooks/use-realtime";
import { currency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "POS Terminal — Ember & Ash" }] }),
  component: PosFloor,
});

function PosFloor() {
  const { data: floors } = useFloors();
  const [floorId, setFloorId] = useState<string | null>(null);
  const activeFloor = floorId ?? floors?.[0]?.id ?? null;
  const { data: tables } = useTables(activeFloor);
  const nav = useNavigate();
  useRealtime([
    { table: "restaurant_tables", queryKey: ["tables"] },
    { table: "orders", queryKey: ["table_active_order"] },
  ]);

  const { data: tableTotals } = useQuery({
    queryKey: ["table_totals", activeFloor],
    enabled: !!activeFloor,
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("table_id,total,guests,created_at")
        .in("status", ["draft", "sent"]);
      const map = new Map<string, { total: number; guests: number | null; since: string }>();
      data?.forEach((o) => {
        if (!o.table_id) return;
        const prev = map.get(o.table_id);
        if (!prev || new Date(o.created_at) > new Date(prev.since)) {
          map.set(o.table_id, { total: o.total, guests: o.guests, since: o.created_at });
        }
      });
      return map;
    },
  });

  const summary = useMemo(() => {
    if (!tables) return { active: 0, occupancy: 0 };
    const active = tables.filter((t) => t.status !== "available").length;
    return { active, occupancy: tables.length ? Math.round((active / tables.length) * 100) : 0 };
  }, [tables]);

  return (
    <AppShell>
      <div className="grid h-full grid-cols-12">
        {/* Floor switcher */}
        <aside className="col-span-2 border-r border-border p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Floors</p>
          <div className="space-y-1">
            {floors?.map((f) => (
              <button
                key={f.id}
                onClick={() => setFloorId(f.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-all ${
                  activeFloor === f.id
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-surface"
                }`}
              >
                <p className="font-display text-sm font-medium">{f.name}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Floor map */}
        <section className="col-span-10 overflow-y-auto p-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="font-display text-3xl font-light tracking-tight">
                {floors?.find((f) => f.id === activeFloor)?.name ?? "Main Floor"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {summary.active} active · {summary.occupancy}% occupancy
              </p>
            </div>
            <Link
              to="/pos/$tableId"
              params={{ tableId: "walkin" }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Quick Order
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables?.map((t) => {
              const ot = tableTotals?.get(t.id);
              const isActive = !!ot;
              return (
                <button
                  key={t.id}
                  onClick={() => nav({ to: "/pos/$tableId", params: { tableId: t.id } })}
                  className={`aspect-square rounded-2xl border p-5 text-left transition-all ${
                    isActive
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : "border-border bg-surface hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`font-display text-4xl font-light ${isActive ? "text-primary" : ""}`}>
                      {t.table_number}
                    </span>
                    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "bg-primary/20 text-primary" : "bg-border text-muted-foreground"
                    }`}>
                      {isActive ? "Active" : "Vacant"}
                    </span>
                  </div>
                  <div className="mt-auto pt-8">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {isActive ? "Total bill" : "Ready"}
                    </p>
                    <p className={`font-display text-xl ${isActive ? "" : "text-muted-foreground"}`}>
                      {currency(ot?.total ?? 0)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t.seats} seats{ot?.guests ? ` · ${ot.guests} guests` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
