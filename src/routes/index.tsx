import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Utensils, ChefHat, QrCode, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ember & Ash — Restaurant POS" },
      { name: "description", content: "Run your restaurant from one terminal. Orders, kitchen, payments and QR ordering." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/pos" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex h-16 items-center justify-between border-b border-border px-6">
        <span className="font-serif text-2xl italic text-primary">Ember &amp; Ash</span>
        <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Sign in
        </Link>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Restaurant POS Platform</p>
        <h1 className="mt-4 font-display text-5xl font-light tracking-tight md:text-7xl">
          One terminal for the entire <span className="font-serif italic text-primary">service</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground">
          POS, kitchen display, customer display and QR self-ordering — built for busy floors and tight kitchens.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth" className="rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90">
            Open terminal
          </Link>
          <Link to="/kds" className="rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium hover:bg-surface-hover">
            View KDS
          </Link>
        </div>

        <div className="mt-24 grid gap-4 md:grid-cols-4">
          {[
            { icon: Utensils, title: "POS Terminal", desc: "Floor map, cart, payments." },
            { icon: ChefHat, title: "Kitchen Display", desc: "Live ticket lanes." },
            { icon: QrCode, title: "QR Self-Order", desc: "Per-table guest ordering." },
            { icon: BarChart3, title: "Analytics", desc: "Revenue, products, trends." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-5">
              <Icon className="size-5 text-primary" />
              <p className="mt-3 font-display text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
