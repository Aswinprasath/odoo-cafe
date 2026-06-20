import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).maybeSingle()).data });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form }; delete payload.id; delete payload.updated_at;
      await supabase.from("settings").update(payload).eq("id", 1);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!form) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6"><h1 className="font-display text-3xl font-light tracking-tight">Settings</h1><p className="text-sm text-muted-foreground">Restaurant, payments, and self-ordering branding</p></div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
        <Section title="Restaurant">
          <Field label="Restaurant name"><input value={form.restaurant_name} onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })} className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency code"><input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="input" /></Field>
            <Field label="Currency symbol"><input value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} className="input" /></Field>
          </div>
          <Field label="Default tax rate %"><input type="number" step="0.01" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: Number(e.target.value) })} className="input" /></Field>
        </Section>

        <Section title="Self-Ordering">
          <Toggle label="Enable self-ordering" checked={form.self_order_enabled} onChange={(v) => setForm({ ...form, self_order_enabled: v })} />
          <Toggle label="Enable QR menu" checked={form.qr_menu_enabled} onChange={(v) => setForm({ ...form, qr_menu_enabled: v })} />
          <Field label="Brand color"><div className="flex gap-2"><input type="color" value={form.self_order_brand_color} onChange={(e) => setForm({ ...form, self_order_brand_color: e.target.value })} className="h-10 w-16 rounded border border-border bg-background" /><input value={form.self_order_brand_color} onChange={(e) => setForm({ ...form, self_order_brand_color: e.target.value })} className="input font-mono" /></div></Field>
          <Field label="Banner image URL (optional)"><input value={form.self_order_banner_url ?? ""} onChange={(e) => setForm({ ...form, self_order_banner_url: e.target.value })} className="input" /></Field>
        </Section>

        <Section title="UPI Payments">
          <Field label="UPI ID"><input value={form.upi_id ?? ""} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="name@bank" className="input" /></Field>
          <Field label="UPI payee name"><input value={form.upi_payee_name ?? ""} onChange={(e) => setForm({ ...form, upi_payee_name: e.target.value })} className="input" /></Field>
        </Section>

        <button type="submit" className="rounded-lg bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90">Save Changes</button>
      </form>

      <style>{`.input { width:100%; border-radius:0.5rem; border:1px solid var(--border); background:var(--background); padding:0.75rem 1rem; font-size:0.875rem; }`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>{children}</label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
