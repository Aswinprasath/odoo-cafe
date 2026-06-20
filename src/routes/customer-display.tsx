import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { useSettings } from "@/hooks/use-settings";
import { currency } from "@/lib/format";
import { Check } from "lucide-react";

export const Route = createFileRoute("/customer-display")({
  head: () => ({ meta: [{ title: "Customer Display — Ember & Ash" }] }),
  component: CustomerDisplay,
});

function CustomerDisplay() {
  const { data: settings } = useSettings();
  useRealtime([{ table: "orders", queryKey: ["display_order"] }, { table: "order_items", queryKey: ["display_order"] }]);
  const { data: order } = useQuery({
    queryKey: ["display_order"],
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders").select("*, order_items(*), restaurant_tables(table_number)")
        .in("status", ["draft", "sent", "paid"])
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  if (!order) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="text-center">
          <p className="font-serif text-5xl italic text-primary">{settings?.restaurant_name ?? "Ember & Ash"}</p>
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-muted-foreground">Welcome</p>
        </div>
      </div>
    );
  }

  if (order.status === "paid") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-success/20"><Check className="size-12 text-success" /></div>
          <h1 className="mt-8 font-serif text-6xl italic text-primary">Thank you</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-muted-foreground">Order #{order.order_number.replace("ORD-", "")} · {currency(order.total, settings?.currency_symbol ?? "$")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-2 bg-background text-foreground">
      <aside className="flex flex-col justify-between border-r border-border p-12">
        <p className="font-serif text-3xl italic text-primary">{settings?.restaurant_name ?? "Ember & Ash"}</p>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Order</p>
          <p className="font-display text-5xl">#{order.order_number.replace("ORD-", "")}</p>
          {order.restaurant_tables?.table_number && <p className="mt-2 text-sm text-muted-foreground">Table {order.restaurant_tables.table_number}</p>}
        </div>
      </aside>
      <section className="flex flex-col overflow-hidden p-12">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {order.order_items?.map((i: any) => (
            <div key={i.id} className="flex justify-between border-b border-border pb-3">
              <span className="text-sm">{i.qty}× {i.name_snapshot}</span>
              <span className="font-mono text-sm">{currency(i.qty * i.unit_price, settings?.currency_symbol ?? "$")}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border pt-6 font-mono">
          <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{currency(order.subtotal, settings?.currency_symbol ?? "$")}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span>{currency(order.tax, settings?.currency_symbol ?? "$")}</span></div>
          {Number(order.discount) > 0 && <div className="flex justify-between text-sm text-primary"><span>Discount</span><span>-{currency(order.discount, settings?.currency_symbol ?? "$")}</span></div>}
          <div className="flex justify-between border-t border-border pt-3 font-display text-3xl text-primary">
            <span>Total</span><span>{currency(order.total, settings?.currency_symbol ?? "$")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
