import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { currency } from "@/lib/format";
import { toast } from "sonner";
import { X, Banknote, CreditCard, Smartphone } from "lucide-react";

type Props = {
  orderId: string;
  total: number;
  currencySymbol: string;
  upiId?: string | null;
  upiPayee?: string | null;
  onClose: () => void;
  onPaid: () => void;
};

export function PaymentDialog({ orderId, total, currencySymbol, upiId, upiPayee, onClose, onPaid }: Props) {
  const [tab, setTab] = useState<"cash" | "card" | "upi">("cash");
  const [received, setReceived] = useState<string>(total.toFixed(2));
  const [reference, setReference] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = Math.max(0, (parseFloat(received) || 0) - total);

  useEffect(() => {
    if (tab !== "upi") return;
    const link = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiPayee ?? "Restaurant")}&am=${total.toFixed(2)}&cu=INR`
      : `pay:${orderId}:${total.toFixed(2)}`;
    QRCode.toDataURL(link, { width: 280, margin: 1, color: { dark: "#F4F4F5", light: "#161618" } })
      .then(setQrUrl);
  }, [tab, upiId, upiPayee, total, orderId]);

  async function confirm() {
    setBusy(true);
    try {
      const { data: pm } = await supabase.from("payment_methods").select("*").eq("kind", tab).eq("active", true).limit(1).maybeSingle();
      const payload: any = {
        order_id: orderId,
        payment_method_id: pm?.id ?? null,
        kind: tab,
        amount: total,
      };
      if (tab === "cash") {
        payload.amount_received = parseFloat(received) || total;
        payload.change_due = change;
      }
      if (tab !== "cash") payload.reference = reference || null;

      const { error } = await supabase.from("payments").insert(payload);
      if (error) throw error;

      await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", orderId);
      onPaid();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Process Payment</p>
            <p className="mt-1 font-display text-3xl text-primary">{currency(total, currencySymbol)}</p>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md hover:bg-background"><X className="size-4" /></button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {[
            { id: "cash", icon: Banknote, label: "Cash" },
            { id: "card", icon: CreditCard, label: "Card" },
            { id: "upi", icon: Smartphone, label: "UPI" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setTab(m.id as any)}
              className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition-all ${
                tab === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-background"
              }`}
            >
              <m.icon className="size-4" />
              {m.label}
            </button>
          ))}
        </div>

        {tab === "cash" && (
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount received</label>
            <input
              type="number" step="0.01" value={received} onChange={(e) => setReceived(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-lg focus:border-primary focus:outline-none"
            />
            <div className="flex justify-between rounded-lg bg-background px-4 py-3 text-sm">
              <span className="text-muted-foreground">Change due</span>
              <span className="font-display text-lg text-primary">{currency(change, currencySymbol)}</span>
            </div>
          </div>
        )}

        {tab === "card" && (
          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction reference</label>
            <input
              value={reference} onChange={(e) => setReference(e.target.value)} placeholder="POS terminal ref…"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        )}

        {tab === "upi" && (
          <div className="flex flex-col items-center gap-3">
            {qrUrl && <img src={qrUrl} alt="UPI QR" className="rounded-lg border border-border" />}
            <p className="text-center text-xs text-muted-foreground">
              {upiId ? `Pay to ${upiId}` : "Configure UPI in Admin → Settings"}
            </p>
            <input
              value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID (optional)"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        )}

        <button
          onClick={confirm} disabled={busy}
          className="mt-6 w-full rounded-lg bg-primary py-4 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Processing…" : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}
