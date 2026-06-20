import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

type Coupon = { code: string; discount_type: "percentage" | "fixed"; discount_value: number };

export function CouponDialog({ onClose, onApply }: { onClose: () => void; onApply: (c: Coupon) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("coupons").select("*").eq("code", code.trim().toUpperCase()).eq("active", true).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("Coupon not found"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Coupon expired"); return; }
      onApply({ code: data.code, discount_type: data.discount_type, discount_value: Number(data.discount_value) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg">Apply Coupon</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md hover:bg-background"><X className="size-4" /></button>
        </div>
        <input
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="COUPON CODE"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono uppercase tracking-widest focus:border-primary focus:outline-none"
        />
        <p className="mt-3 text-[10px] text-muted-foreground">Try WELCOME10 · STAFF20 · FLAT5</p>
        <button
          onClick={apply} disabled={busy || !code}
          className="mt-5 w-full rounded-lg bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
