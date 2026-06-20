import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("*").eq("archived", false).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useProducts(opts: { categoryId?: string | null; search?: string } = {}) {
  return useQuery({
    queryKey: ["products", opts.categoryId ?? null, opts.search ?? ""],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name,color)")
        .eq("active", true).eq("archived", false).order("name");
      if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
      if (opts.search) q = q.ilike("name", `%${opts.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useFloors() {
  return useQuery({
    queryKey: ["floors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("floors").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useTables(floorId?: string | null) {
  return useQuery({
    queryKey: ["tables", floorId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("restaurant_tables").select("*").eq("active", true).order("table_number");
      if (floorId) q = q.eq("floor_id", floorId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useTableActiveOrder(tableId: string | null | undefined) {
  return useQuery({
    queryKey: ["table_active_order", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("*, order_items(*), customers(name,phone)")
        .eq("table_id", tableId!).in("status", ["draft", "sent"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
