import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/employees")({
  component: EmployeesAdmin,
});

function EmployeesAdmin() {
  const { data } = useQuery({
    queryKey: ["admin_employees"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const map = new Map<string, string[]>();
      roles?.forEach((r) => {
        const arr = map.get(r.user_id) ?? [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });

  return (
    <div>
      <div className="mb-6"><h1 className="font-display text-3xl font-light tracking-tight">Employees</h1><p className="text-sm text-muted-foreground">{data?.length ?? 0} team members. The first signup is admin; others default to employee.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((u) => (
          <div key={u.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <div className="grid size-12 place-items-center rounded-full border border-border bg-background font-serif italic">{initials(u.full_name)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.full_name ?? "—"}</p>
              <p className="mt-1 flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <span key={r} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r === "admin" ? "bg-primary/20 text-primary" : "bg-border text-muted-foreground"}`}>{r}</span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">To add an employee, share the sign-in page URL — they'll be created automatically. Role management is forthcoming.</p>
    </div>
  );
}
