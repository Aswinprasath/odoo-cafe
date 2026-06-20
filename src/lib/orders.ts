import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
  tax_rate: number;
  category_color: string | null;
  notes?: string;
};

export function calcTotals(items: CartItem[], discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const tax = items.reduce((s, i) => s + i.qty * i.unit_price * (i.tax_rate / 100), 0);
  const total = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, total };
}

export function applyCoupon(
  subtotal: number,
  coupon: { discount_type: "percentage" | "fixed"; discount_value: number } | null,
) {
  if (!coupon) return 0;
  return coupon.discount_type === "percentage"
    ? +(subtotal * (coupon.discount_value / 100)).toFixed(2)
    : Math.min(subtotal, coupon.discount_value);
}

export async function createDraftOrder(input: {
  tableId: string | null;
  sessionId: string | null;
  employeeId: string | null;
  guests?: number | null;
}) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      table_id: input.tableId,
      session_id: input.sessionId,
      employee_id: input.employeeId,
      guests: input.guests ?? null,
      status: "draft",
      source: "pos",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveOrderItems(orderId: string, items: CartItem[]) {
  await supabase.from("order_items").delete().eq("order_id", orderId);
  if (items.length === 0) return;
  const rows = items.map((i) => ({
    order_id: orderId,
    product_id: i.product_id,
    name_snapshot: i.name,
    qty: i.qty,
    unit_price: i.unit_price,
    tax_rate: i.tax_rate,
    discount: 0,
    total: +(i.qty * i.unit_price * (1 + i.tax_rate / 100)).toFixed(2),
    notes: i.notes ?? null,
    category_color: i.category_color,
  }));
  const { error } = await supabase.from("order_items").insert(rows);
  if (error) throw error;
}

export async function updateOrderTotals(orderId: string, items: CartItem[], discount: number, couponCode?: string | null) {
  const { subtotal, tax, total } = calcTotals(items, discount);
  const { error } = await supabase.from("orders").update({
    subtotal, tax, discount, total, coupon_code: couponCode ?? null,
  }).eq("id", orderId);
  if (error) throw error;
}

export async function ensureSession(employeeId: string) {
  const { data: open } = await supabase
    .from("pos_sessions").select("*")
    .eq("employee_id", employeeId).eq("status", "open").maybeSingle();
  if (open) return open;
  const { data, error } = await supabase
    .from("pos_sessions").insert({ employee_id: employeeId, status: "open" }).select().single();
  if (error) throw error;
  return data;
}
