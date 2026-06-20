import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to postgres_changes on the given tables and invalidates
 * the matching React Query keys. Safe in StrictMode.
 */
export function useRealtime(tables: Array<{ table: string; queryKey: unknown[] }>) {
  const qc = useQueryClient();
  useEffect(() => {
    const channels = tables.map(({ table, queryKey }) => {
      const ch = supabase
        .channel(`rt_${table}_${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          qc.invalidateQueries({ queryKey });
        })
        .subscribe();
      return ch;
    });
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
