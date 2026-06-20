import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useProducts } from "@/hooks/use-pos-data";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { currency } from "@/lib/format";
import { type CartItem, calcTotals, applyCoupon, ensureSession, createDraftOrder, saveOrderItems, updateOrderTotals } from "@/lib/orders";
import { ArrowLeft, Plus, Minus, X, Search, User as UserIcon, Tag, Send, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { CouponDialog } from "@/components/pos/coupon-dialog";
import { CustomerDialog } from "@/components/pos/customer-dialog";

export const Route = createFileRoute("/_authenticated/pos_/$tableId")({
  head: () => ({ meta: [{ title: "Order — Ember & Ash" }] }),
  component: OrderView,
});

function OrderView() {
  const { tableId } = Route.useParams();
  const isWalkin = tableId === "walkin";
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: categories } = useCategories();
  const { data: products } = useProducts({ categoryId, search });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discount_type: "percentage" | "fixed"; discount_value: number } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  // Load table info
  const { data: table } = useQuery({
    queryKey: ["table", tableId],
    enabled: !isWalkin,
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurant_tables")
        .select("*, floors(name)").eq("id", tableId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Bootstrap session + draft order
  useEffect(() => {
    if (!user) return;
    (async () => {
      const session = await ensureSession(user.id);
      setSessionId(session.id);

      // try to find existing draft for this table
      let existing = null;
      if (!isWalkin) {
        const { data } = await supabase.from("orders")
          .select("*, order_items(*)")
          .eq("table_id", tableId).in("status", ["draft", "sent"])
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        existing = data;
      }
      if (existing) {
        setOrderId(existing.id);
        setCart((existing.order_items ?? []).map((i: any) => ({
          product_id: i.product_id,
          name: i.name_snapshot,
          qty: Number(i.qty),
          unit_price: Number(i.unit_price),
          tax_rate: Number(i.tax_rate),
          category_color: i.category_color,
          notes: i.notes,
        })));
        if (existing.coupon_code) {
          const { data: c } = await supabase.from("coupons").select("*").eq("code", existing.coupon_code).maybeSingle();
          if (c) setCoupon({ code: c.code, discount_type: c.discount_type, discount_value: Number(c.discount_value) });
        }
        if (existing.customer_id) {
          setCustomerId(existing.customer_id);
          const { data: cust } = await supabase.from("customers").select("name").eq("id", existing.customer_id).maybeSingle();
          setCustomerName(cust?.name ?? null);
        }
      } else {
        const order = await createDraftOrder({
          tableId: isWalkin ? null : tableId,
          sessionId: session.id,
          employeeId: user.id,
        });
        setOrderId(order.id);
        if (!isWalkin) {
          await supabase.from("restaurant_tables").update({ status: "occupied" }).eq("id", tableId);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tableId]);

  const discount = useMemo(() => applyCoupon(calcTotals(cart).subtotal, coupon), [cart, coupon]);
  const totals = useMemo(() => calcTotals(cart, discount), [cart, discount]);

  function addProduct(p: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        return prev.map((i) => i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        product_id: p.id, name: p.name, qty: 1,
        unit_price: Number(p.price), tax_rate: Number(p.tax_rate),
        category_color: p.categories?.color ?? null,
      }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart((prev) => prev.flatMap((i) => {
      if (i.product_id !== id) return [i];
      const q = i.qty + delta;
      return q <= 0 ? [] : [{ ...i, qty: q }];
    }));
  }
  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== id));
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!orderId) return;
      await saveOrderItems(orderId, cart);
      await updateOrderTotals(orderId, cart, discount, coupon?.code ?? null);
      if (customerId) await supabase.from("orders").update({ customer_id: customerId }).eq("id", orderId);
    },
  });

  const sendKitchenMut = useMutation({
    mutationFn: async () => {
      if (!orderId || cart.length === 0) throw new Error("Add items first");
      await saveMut.mutateAsync();
      await supabase.from("orders").update({ status: "sent", sent_to_kitchen_at: new Date().toISOString() }).eq("id", orderId);
      await supabase.from("kitchen_tickets").insert({ order_id: orderId, stage: "to_cook" });
    },
    onSuccess: () => { toast.success("Sent to kitchen"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function onPaid() {
    if (!isWalkin && tableId) {
      await supabase.from("restaurant_tables").update({ status: "available" }).eq("id", tableId);
    }
    qc.invalidateQueries();
    toast.success("Payment complete");
    nav({ to: "/pos" });
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <Link to="/pos" className="grid size-9 place-items-center rounded-lg border border-border hover:bg-surface">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="font-display text-lg leading-none">
              {isWalkin ? "Walk-in Order" : `Table ${table?.table_number ?? "…"}`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {!isWalkin && table?.floors?.name} · Server: {profile?.full_name ?? "—"}
            </p>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Order #{orderId?.slice(0, 6) ?? "—"}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* Category rail */}
        <aside className="col-span-2 border-r border-border overflow-y-auto p-3">
          <div className="space-y-1">
            <button
              onClick={() => setCategoryId(null)}
              className={`w-full rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                categoryId === null ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              All Items
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                  categoryId === c.id ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface/50"
                }`}
              >
                <span className="size-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Products */}
        <section className="col-span-7 flex flex-col overflow-hidden border-r border-border">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="grid flex-1 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products?.map((p: any) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="group relative flex flex-col items-start rounded-xl border border-border bg-surface p-3 text-left transition-all hover:border-primary/40 hover:bg-surface-hover active:scale-[0.98]"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: p.categories?.color ?? "#E2AD86" }} />
                <span className="font-display text-sm font-medium leading-tight">{p.name}</span>
                <span className="mt-auto pt-4 text-sm font-semibold text-primary">{currency(p.price)}</span>
              </button>
            ))}
            {products?.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No products match.</p>
            )}
          </div>
        </section>

        {/* Cart */}
        <aside className="col-span-3 flex flex-col overflow-hidden bg-surface">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-display text-base">Current Order</h2>
            <button
              onClick={() => setCustomerOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <UserIcon className="size-3" /> {customerName ?? "Customer"}
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cart.length === 0 && (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Tap a product to start the order
              </p>
            )}
            {cart.map((i) => (
              <div key={i.product_id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-[10px] text-muted-foreground">{currency(i.unit_price)} · tax {i.tax_rate}%</p>
                  </div>
                  <p className="text-sm font-semibold">{currency(i.qty * i.unit_price)}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(i.product_id, -1)} className="grid size-7 place-items-center rounded border border-border hover:bg-surface"><Minus className="size-3" /></button>
                    <span className="w-8 text-center font-mono text-sm">{i.qty}</span>
                    <button onClick={() => changeQty(i.product_id, +1)} className="grid size-7 place-items-center rounded border border-border hover:bg-surface"><Plus className="size-3" /></button>
                  </div>
                  <button onClick={() => removeItem(i.product_id)} className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-border bg-background/60 p-4">
            {coupon && (
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-xs">
                <span className="text-primary"><Tag className="mr-1 inline size-3" /> {coupon.code}</span>
                <button onClick={() => setCoupon(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
              </div>
            )}
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{currency(totals.subtotal, settings?.currency_symbol ?? "$")}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{currency(totals.tax, settings?.currency_symbol ?? "$")}</span></div>
              {discount > 0 && <div className="flex justify-between text-primary"><span>Discount</span><span>-{currency(discount, settings?.currency_symbol ?? "$")}</span></div>}
              <div className="flex justify-between pt-2 text-lg font-display font-semibold text-foreground">
                <span>Total</span><span className="text-primary">{currency(totals.total, settings?.currency_symbol ?? "$")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCouponOpen(true)}
                className="rounded-lg border border-border py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface"
              >
                <Tag className="mr-1 inline size-3" /> Coupon
              </button>
              <button
                onClick={() => sendKitchenMut.mutate()}
                disabled={cart.length === 0}
                className="rounded-lg border border-border py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface disabled:opacity-50"
              >
                <Send className="mr-1 inline size-3" /> Kitchen
              </button>
            </div>
            <button
              onClick={async () => { await saveMut.mutateAsync(); setPayOpen(true); }}
              disabled={cart.length === 0}
              className="w-full rounded-lg bg-primary py-4 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <CreditCard className="mr-2 inline size-4" />
              Pay {currency(totals.total, settings?.currency_symbol ?? "$")}
            </button>
          </div>
        </aside>
      </div>

      {payOpen && orderId && (
        <PaymentDialog
          orderId={orderId}
          total={totals.total}
          currencySymbol={settings?.currency_symbol ?? "$"}
          upiId={settings?.upi_id}
          upiPayee={settings?.upi_payee_name}
          onClose={() => setPayOpen(false)}
          onPaid={onPaid}
        />
      )}
      {couponOpen && (
        <CouponDialog
          onClose={() => setCouponOpen(false)}
          onApply={(c) => { setCoupon(c); setCouponOpen(false); }}
        />
      )}
      {customerOpen && (
        <CustomerDialog
          onClose={() => setCustomerOpen(false)}
          onSelect={(c) => { setCustomerId(c.id); setCustomerName(c.name); setCustomerOpen(false); }}
        />
      )}
    </div>
  );
}
