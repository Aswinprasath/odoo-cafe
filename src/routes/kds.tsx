import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { currency, minutesAgo } from "@/lib/format";
import { Clock, ChefHat, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/kds")({
  head: () => ({ meta: [{ title: "Kitchen Display — Ember & Ash" }] }),
  component: KDS,
});

const STAGES = ["to_cook", "preparing", "completed"] as const;
const STAGE_LABEL: Record<string, string> = { to_cook: "To Cook", preparing: "Preparing", completed: "Completed" };
const STAGE_COLOR: Record<string, string> = {
  to_cook: "border-warning/40 bg-warning/5",
  preparing: "border-primary/40 bg-primary/5",
  completed: "border-success/30 bg-success/5",
};

function KDS() {
  const qc = useQueryClient();
  useRealtime([
    { table: "kitchen_tickets", queryKey: ["kds_tickets"] },
    { table: "orders", queryKey: ["kds_tickets"] },
    { table: "order_items", queryKey: ["kds_tickets"] },
  ]);

  const { data: tickets } = useQuery({
    queryKey: ["kds_tickets"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kitchen_tickets")
        .select("*, orders(*, order_items(*), restaurant_tables(table_number))")
        .neq("stage", "completed")
        .order("created_at");
      if (error) throw error;
      const { data: completed } = await supabase
        .from("kitchen_tickets")
        .select("*, orders(*, order_items(*), restaurant_tables(table_number))")
        .eq("stage", "completed")
        .order("updated_at", { ascending: false })
        .limit(10);
      return [...(data ?? []), ...(completed ?? [])];
    },
  });

  const advance = useMutation({
    mutationFn: async (t: any) => {
      const idx = STAGES.indexOf(t.stage);
      const next = STAGES[Math.min(idx + 1, STAGES.length - 1)];
      await supabase.from("kitchen_tickets").update({ stage: next }).eq("id", t.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kds_tickets"] }),
  });

  const markItem = useMutation({
    mutationFn: async (item: any) => {
      const next = item.kitchen_status === "done" ? "pending" : "done";
      await supabase.from("order_items").update({ kitchen_status: next }).eq("id", item.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kds_tickets"] }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <ChefHat className="size-5 text-primary" />
          <span className="font-serif text-2xl italic text-primary">Kitchen Display</span>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          {STAGES.map((s) => {
            const count = tickets?.filter((t) => t.stage === s).length ?? 0;
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${s === "to_cook" ? "bg-warning animate-pulse" : s === "preparing" ? "bg-primary" : "bg-success"}`} />
                {STAGE_LABEL[s]} · <strong className="text-foreground">{count}</strong>
              </div>
            );
          })}
        </div>
      </header>

      <main className="grid h-[calc(100vh-4rem)] grid-cols-3 gap-4 overflow-hidden p-4">
        {STAGES.map((stage) => {
          const lane = tickets?.filter((t) => t.stage === stage) ?? [];
          return (
            <section key={stage} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{STAGE_LABEL[stage]}</p>
                <p className="text-xs font-display">{lane.length}</p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {lane.map((t: any) => (
                  <article key={t.id} className={`rounded-xl border p-3 ${STAGE_COLOR[t.stage]}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-display text-sm font-semibold">#{t.orders?.order_number?.replace("ORD-", "")}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Table {t.orders?.restaurant_tables?.table_number ?? "—"} · {currency(t.orders?.total)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-warning">
                        <Clock className="size-3" />
                        {minutesAgo(t.created_at)}m
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {t.orders?.order_items?.map((i: any) => (
                        <li
                          key={i.id}
                          onClick={() => markItem.mutate(i)}
                          className={`flex cursor-pointer items-center justify-between rounded border-l-2 bg-background/40 px-2 py-1.5 text-xs ${
                            i.kitchen_status === "done" ? "text-muted-foreground line-through" : ""
                          }`}
                          style={{ borderLeftColor: i.category_color ?? "#E2AD86" }}
                        >
                          <span>
                            <strong>{i.qty}x</strong> {i.name_snapshot}
                            {i.notes && <em className="ml-1 text-[10px] text-muted-foreground">— {i.notes}</em>}
                          </span>
                          {i.kitchen_status === "done" && <Check className="size-3 text-success" />}
                        </li>
                      ))}
                    </ul>
                    {stage !== "completed" && (
                      <button
                        onClick={() => advance.mutate(t)}
                        className="mt-3 w-full rounded-md bg-primary py-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
                      >
                        Move to {STAGE_LABEL[STAGES[STAGES.indexOf(t.stage) + 1]]}
                      </button>
                    )}
                  </article>
                ))}
                {lane.length === 0 && (
                  <p className="py-12 text-center text-xs text-muted-foreground">No tickets</p>
                )}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
