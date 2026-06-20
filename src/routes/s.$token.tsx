import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/use-settings";
import { currency } from "@/lib/format";
import { type CartItem, calcTotals } from "@/lib/orders";
import { Plus, Minus, X, Check, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/s/$token")({
  head: () => ({ meta: [{ title: "Order at your table" }] }),
  component: SelfOrder,
});

function SelfOrder() {
  const { token } = Route.useParams();
  const { data: settings } = useSettings();
  const nav = useNavigate();
  const [view, setView] = useState<"menu" | "cart" | "placed">("menu");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const { data: table } = useQuery({
    queryKey: ["self_table", token],
    queryFn: async () => {
      const { data } = await supabase.from("restaurant_tables").select("*, floors(name)").eq("qr_token", token).maybeSingle();
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["self_categories"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("archived", false).order("sort_order")).data,
  });

  const { data: products } = useQuery({
    queryKey: ["self_products", categoryId],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name,color)").eq("active", true).eq("archived", false).order("name");
      if (categoryId) q = q.eq("category_id", categoryId);
      return (await q).data;
    },
  });

  const totals = useMemo(() => calcTotals(cart), [cart]);

  function add(p: any) {
    setCart((prev) => {
      const ex = prev.find((i) => i.product_id === p.id);
      if (ex) return prev.map((i) => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product_id: p.id, name: p.name, qty: 1, unit_price: Number(p.price), tax_rate: Number(p.tax_rate), category_color: p.categories?.color ?? null }];
    });
    toast.success(`${p.name} added`);
  }

  async function placeOrder() {
    if (!table) return toast.error("Table not found");
    const { data: order, error } = await supabase.from("orders").insert({
      table_id: table.id, source: "self", status: "sent",
      subtotal: totals.subtotal, tax: totals.tax, total: totals.total,
      sent_to_kitchen_at: new Date().toISOString(),
    }).select().single();
    if (error || !order) return toast.error(error?.message ?? "Failed");

    const items = cart.map((i) => ({
      order_id: order.id, product_id: i.product_id, name_snapshot: i.name,
      qty: i.qty, unit_price: i.unit_price, tax_rate: i.tax_rate, discount: 0,
      total: +(i.qty * i.unit_price * (1 + i.tax_rate / 100)).toFixed(2),
      category_color: i.category_color,
    }));
    await supabase.from("order_items").insert(items);
    await supabase.from("kitchen_tickets").insert({ order_id: order.id, stage: "to_cook" });
    setPlacedOrderId(order.id);
    setView("placed");
  }

  // Track placed order status
  const { data: liveOrder } = useQuery({
    queryKey: ["self_order_status", placedOrderId],
    enabled: !!placedOrderId,
    refetchInterval: 6000,
    queryFn: async () => (await supabase.from("orders").select("*, kitchen_tickets(stage)").eq("id", placedOrderId!).maybeSingle()).data,
  });

  if (!table) {
    return <div className="grid min-h-screen place-items-center bg-background p-6 text-center"><p className="text-muted-foreground">Invalid table QR.</p></div>;
  }

  const brand = settings?.self_order_brand_color ?? "#E2AD86";

  if (view === "placed") {
    const stage = liveOrder?.kitchen_tickets?.[0]?.stage ?? "to_cook";
    const labels: Record<string, string> = { to_cook: "Order received", preparing: "Preparing your order", completed: "Ready / Served" };
    const idx = ["to_cook", "preparing", "completed"].indexOf(stage);
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="flex h-16 items-center justify-center border-b border-border" style={{ color: brand }}>
          <span className="font-serif text-2xl italic">{settings?.restaurant_name}</span>
        </header>
        <main className="mx-auto max-w-md p-6 text-center">
          <div className="mx-auto my-12 grid size-24 place-items-center rounded-full" style={{ background: `${brand}20` }}>
            {stage === "completed" ? <Check className="size-12" style={{ color: brand }} /> : <Clock className="size-12 animate-pulse" style={{ color: brand }} />}
          </div>
          <p className="font-display text-2xl">{labels[stage]}</p>
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Order #{liveOrder?.order_number?.replace("ORD-", "") ?? "…"}</p>
          <div className="my-10 flex justify-between gap-2">
            {["to_cook", "preparing", "completed"].map((s, i) => (
              <div key={s} className="flex-1 space-y-2">
                <div className="h-1 rounded-full" style={{ background: i <= idx ? brand : "var(--border)" }} />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{labels[s]}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-display text-xl text-primary">{currency(liveOrder?.total ?? totals.total, settings?.currency_symbol ?? "$")}</p>
          <p className="mt-2 text-xs text-muted-foreground">Pay your server when the meal arrives</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <div>
            <p className="font-serif text-xl italic" style={{ color: brand }}>{settings?.restaurant_name}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Table {table.table_number} · {table.floors?.name}</p>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setView("cart")} className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground" style={{ background: brand }}>
              {cart.reduce((s, i) => s + i.qty, 0)} · {currency(totals.total, settings?.currency_symbol ?? "$")}
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <button onClick={() => setCategoryId(null)} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${categoryId === null ? "bg-foreground text-background" : "border-border text-muted-foreground"}`}>All</button>
          {categories?.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold ${categoryId === c.id ? "bg-foreground text-background" : "border-border text-muted-foreground"}`}>
              <span className="size-1.5 rounded-full" style={{ background: c.color }} />{c.name}
            </button>
          ))}
        </div>
      </header>

      {view === "menu" && (
        <div className="space-y-3 p-4">
          {products?.map((p: any) => (
            <button key={p.id} onClick={() => add(p)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-hover">
              <div className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full" style={{ background: p.categories?.color ?? brand }} />
                <div>
                  <p className="font-display font-medium">{p.name}</p>
                  {p.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                </div>
              </div>
              <p className="font-mono text-sm font-semibold" style={{ color: brand }}>{currency(p.price, settings?.currency_symbol ?? "$")}</p>
            </button>
          ))}
        </div>
      )}

      {view === "cart" && (
        <div className="p-4">
          <button onClick={() => setView("menu")} className="mb-4 text-xs text-muted-foreground hover:text-foreground">← Back to menu</button>
          <p className="mb-4 font-display text-2xl">Your Order</p>
          <div className="space-y-3">
            {cart.map((i) => (
              <div key={i.product_id} className="rounded-xl border border-border bg-surface p-3">
                <div className="flex justify-between">
                  <p className="font-medium">{i.name}</p>
                  <p className="font-mono">{currency(i.qty * i.unit_price, settings?.currency_symbol ?? "$")}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart((p) => p.map((x) => x.product_id === i.product_id ? { ...x, qty: Math.max(0, x.qty - 1) } : x).filter((x) => x.qty > 0))} className="grid size-8 place-items-center rounded border border-border"><Minus className="size-3" /></button>
                    <span className="w-8 text-center font-mono">{i.qty}</span>
                    <button onClick={() => setCart((p) => p.map((x) => x.product_id === i.product_id ? { ...x, qty: x.qty + 1 } : x))} className="grid size-8 place-items-center rounded border border-border"><Plus className="size-3" /></button>
                  </div>
                  <button onClick={() => setCart((p) => p.filter((x) => x.product_id !== i.product_id))} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {cart.length === 0 && <p className="py-12 text-center text-muted-foreground">Your cart is empty</p>}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
          <div className="mb-3 flex justify-between font-mono">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-xl" style={{ color: brand }}>{currency(totals.total, settings?.currency_symbol ?? "$")}</span>
          </div>
          <button onClick={view === "cart" ? placeOrder : () => setView("cart")} className="w-full rounded-xl py-4 text-xs font-bold uppercase tracking-widest text-primary-foreground" style={{ background: brand }}>
            {view === "cart" ? "Place Order" : "Review Cart"}
          </button>
        </div>
      )}
    </div>
  );
}
