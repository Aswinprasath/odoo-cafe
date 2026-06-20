import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useProfile } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { initials } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

const TABS = [
  { to: "/pos", label: "POS Terminal" },
  { to: "/orders", label: "Orders" },
  { to: "/admin", label: "Admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-6">
          <Link to="/pos" className="font-serif text-2xl italic text-primary">
            {settings?.restaurant_name ?? "Ember & Ash"}
          </Link>
          <div className="hidden md:flex gap-1 rounded-lg bg-surface p-1">
            {TABS.map((t) => {
              const active = loc.pathname === t.to || loc.pathname.startsWith(t.to + "/");
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/kds" className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">KDS</a>
          <a href="/customer-display" className="hidden md:block text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">Display</a>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Signed in</p>
            <p className="text-xs font-semibold">{profile?.full_name ?? "Operator"}</p>
          </div>
          <div className="grid size-10 place-items-center rounded-full border border-border bg-surface font-serif text-xs italic">
            {initials(profile?.full_name)}
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid size-10 place-items-center rounded-full border border-border text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
