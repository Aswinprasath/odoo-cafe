import { Link, useLocation, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Package, Tag, Users, MapPin, Grid3x3, TicketPercent, QrCode, Settings as SettingsIcon, UserCog } from "lucide-react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: Tag },
  { to: "/admin/floors", label: "Floors", icon: MapPin },
  { to: "/admin/tables", label: "Tables", icon: Grid3x3 },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { to: "/admin/employees", label: "Employees", icon: UserCog },
  { to: "/admin/qr", label: "QR Codes", icon: QrCode },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="grid h-full grid-cols-12">
      <aside className="col-span-2 border-r border-border p-3 overflow-y-auto">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <nav className="space-y-0.5">
          {NAV.map((n) => {
            const active = n.exact ? loc.pathname === n.to : loc.pathname === n.to || loc.pathname.startsWith(n.to + "/");
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${active ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface/50 hover:text-foreground"}`}>
                <n.icon className="size-3.5" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="col-span-10 overflow-y-auto p-8">{children ?? <Outlet />}</section>
    </div>
  );
}
