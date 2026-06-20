import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/qr")({
  component: QrAdmin,
});

function QrAdmin() {
  const { data } = useQuery({ queryKey: ["qr_tables"], queryFn: async () => (await supabase.from("restaurant_tables").select("*, floors(name)").order("table_number")).data });
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const base = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!data) return;
    Promise.all(
      data.map(async (t) => {
        const url = `${base}/s/${t.qr_token}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: "#F4F4F5", light: "#161618" } });
        return [t.id, dataUrl] as const;
      })
    ).then((arr) => setQrs(Object.fromEntries(arr)));
  }, [data, base]);

  return (
    <div>
      <div className="mb-6"><h1 className="font-display text-3xl font-light tracking-tight">QR Codes</h1><p className="text-sm text-muted-foreground">One unique QR per table. Print and place on tables for guest self-ordering.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {data?.map((t: any) => (
          <div key={t.id} className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="font-display text-3xl">{t.table_number}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t.floors?.name}</p>
            {qrs[t.id] && <img src={qrs[t.id]} alt="QR" className="mx-auto my-4 rounded-lg border border-border" />}
            <a href={qrs[t.id]} download={`qr-table-${t.table_number}.png`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Download className="size-3" /> Download PNG</a>
            <p className="mt-3 break-all rounded bg-background p-2 font-mono text-[10px] text-muted-foreground">{base}/s/{t.qr_token}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
