import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AdminLayout } from "@/components/admin/admin-layout";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Ember & Ash" }] }),
  component: () => (
    <AppShell>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AppShell>
  ),
});
