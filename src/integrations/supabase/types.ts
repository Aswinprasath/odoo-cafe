export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      floors: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kitchen_tickets: {
        Row: {
          created_at: string
          id: string
          order_id: string
          stage: Database["public"]["Enums"]["kitchen_stage"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          stage?: Database["public"]["Enums"]["kitchen_stage"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          stage?: Database["public"]["Enums"]["kitchen_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          category_color: string | null
          created_at: string
          discount: number
          id: string
          kitchen_status: Database["public"]["Enums"]["item_kitchen_status"]
          name_snapshot: string
          notes: string | null
          order_id: string
          product_id: string | null
          qty: number
          tax_rate: number
          total: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category_color?: string | null
          created_at?: string
          discount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["item_kitchen_status"]
          name_snapshot: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          qty?: number
          tax_rate?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category_color?: string | null
          created_at?: string
          discount?: number
          id?: string
          kitchen_status?: Database["public"]["Enums"]["item_kitchen_status"]
          name_snapshot?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          qty?: number
          tax_rate?: number
          total?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_id: string | null
          discount: number
          employee_id: string | null
          guests: number | null
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          sent_to_kitchen_at: string | null
          session_id: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          employee_id?: string | null
          guests?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          sent_to_kitchen_at?: string | null
          session_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          employee_id?: string | null
          guests?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          sent_to_kitchen_at?: string | null
          session_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_received: number | null
          change_due: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          order_id: string
          payment_method_id: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          amount_received?: number | null
          change_due?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          order_id: string
          payment_method_id?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          amount_received?: number | null
          change_due?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          order_id?: string
          payment_method_id?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          closed_at: string | null
          closing_cash: number | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          opened_at: string
          opening_cash: number
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          archived: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          tax_rate: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          archived?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          tax_rate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          archived?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          tax_rate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          min_amount: number | null
          min_qty: number | null
          name: string
          product_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          min_amount?: number | null
          min_qty?: number | null
          name: string
          product_id?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          min_amount?: number | null
          min_qty?: number | null
          name?: string
          product_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          active: boolean
          created_at: string
          floor_id: string
          id: string
          qr_token: string
          seats: number
          status: Database["public"]["Enums"]["table_status"]
          table_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          floor_id: string
          id?: string
          qr_token?: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
          table_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          floor_id?: string
          id?: string
          qr_token?: string
          seats?: number
          status?: Database["public"]["Enums"]["table_status"]
          table_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          currency: string
          currency_symbol: string
          default_tax_rate: number
          id: number
          qr_menu_enabled: boolean
          restaurant_name: string
          self_order_banner_url: string | null
          self_order_brand_color: string
          self_order_enabled: boolean
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
        }
        Insert: {
          currency?: string
          currency_symbol?: string
          default_tax_rate?: number
          id?: number
          qr_menu_enabled?: boolean
          restaurant_name?: string
          self_order_banner_url?: string | null
          self_order_brand_color?: string
          self_order_enabled?: boolean
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Update: {
          currency?: string
          currency_symbol?: string
          default_tax_rate?: number
          id?: number
          qr_menu_enabled?: boolean
          restaurant_name?: string
          self_order_banner_url?: string | null
          self_order_brand_color?: string
          self_order_enabled?: boolean
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "customer"
      discount_type: "percentage" | "fixed"
      item_kitchen_status: "pending" | "cooking" | "done"
      kitchen_stage: "to_cook" | "preparing" | "completed"
      order_source: "pos" | "self"
      order_status: "draft" | "sent" | "paid" | "cancelled"
      payment_kind: "cash" | "card" | "upi"
      session_status: "open" | "closed"
      table_status: "available" | "occupied" | "reserved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee", "customer"],
      discount_type: ["percentage", "fixed"],
      item_kitchen_status: ["pending", "cooking", "done"],
      kitchen_stage: ["to_cook", "preparing", "completed"],
      order_source: ["pos", "self"],
      order_status: ["draft", "sent", "paid", "cancelled"],
      payment_kind: ["cash", "card", "upi"],
      session_status: ["open", "closed"],
      table_status: ["available", "occupied", "reserved"],
    },
  },
} as const
