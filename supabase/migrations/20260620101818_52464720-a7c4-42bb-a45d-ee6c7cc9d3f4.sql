
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'customer');
CREATE TYPE public.order_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE public.order_source AS ENUM ('pos', 'self');
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'reserved');
CREATE TYPE public.kitchen_stage AS ENUM ('to_cook', 'preparing', 'completed');
CREATE TYPE public.item_kitchen_status AS ENUM ('pending', 'cooking', 'done');
CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE public.payment_kind AS ENUM ('cash', 'card', 'upi');
CREATE TYPE public.session_status AS ENUM ('open', 'closed');

-- =========================================================
-- UPDATED_AT TRIGGER FN
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + assign first user as admin, others as employee
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- CATEGORIES
-- =========================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#E2AD86',
  sort_order INT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable by auth" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  description TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(active) WHERE active = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon; -- needed for QR self ordering
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products readable by all" ON public.products FOR SELECT USING (active = true AND archived = false);
CREATE POLICY "admins read all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Allow anon to read categories too (for QR menu)
GRANT SELECT ON public.categories TO anon;
DROP POLICY "categories readable by auth" ON public.categories;
CREATE POLICY "categories readable by all" ON public.categories FOR SELECT USING (archived = false);

-- =========================================================
-- FLOORS
-- =========================================================
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
GRANT ALL ON public.floors TO service_role;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "floors readable by auth" ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage floors" ON public.floors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER floors_updated_at BEFORE UPDATE ON public.floors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- TABLES
-- =========================================================
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  seats INT NOT NULL DEFAULT 2,
  status table_status NOT NULL DEFAULT 'available',
  active BOOLEAN NOT NULL DEFAULT true,
  qr_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex') UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tables_floor ON public.restaurant_tables(floor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables readable by all" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "admins manage tables" ON public.restaurant_tables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "employees update table status" ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'employee') OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tables_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "staff write customers" ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- POS SESSIONS
-- =========================================================
CREATE TABLE public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  status session_status NOT NULL DEFAULT 'open',
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_employee ON public.pos_sessions(employee_id);
GRANT SELECT, INSERT, UPDATE ON public.pos_sessions TO authenticated;
GRANT ALL ON public.pos_sessions TO service_role;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read sessions" ON public.pos_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "staff manage own session" ON public.pos_sessions FOR ALL TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (employee_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON public.pos_sessions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- ORDERS
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || nextval('public.order_number_seq')::text),
  session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'draft',
  source order_source NOT NULL DEFAULT 'pos',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  notes TEXT,
  guests INT,
  sent_to_kitchen_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_table ON public.orders(table_id);
CREATE INDEX idx_orders_session ON public.orders(session_id);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon; -- self-order
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "anon self-order insert" ON public.orders FOR INSERT TO anon WITH CHECK (source = 'self');
CREATE POLICY "anon read self orders" ON public.orders FOR SELECT TO anon USING (source = 'self');
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- ORDER ITEMS
-- =========================================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  qty NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  kitchen_status item_kitchen_status NOT NULL DEFAULT 'pending',
  category_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage order items" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE POLICY "anon self order items" ON public.order_items FOR ALL TO anon
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.source='self'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.source='self'));
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- PAYMENT METHODS & PAYMENTS
-- =========================================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind payment_kind NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm readable by auth" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage pm" ON public.payment_methods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pm_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  kind payment_kind NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  amount_received NUMERIC(10,2),
  change_due NUMERIC(10,2),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON public.payments(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));

-- =========================================================
-- COUPONS & PROMOTIONS
-- =========================================================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT ON public.coupons TO anon;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons readable" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('product','order')),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  min_qty INT,
  min_amount NUMERIC(10,2),
  discount_type discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promos readable auth" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage promos" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER promos_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- KITCHEN TICKETS
-- =========================================================
CREATE TABLE public.kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage kitchen_stage NOT NULL DEFAULT 'to_cook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kt_order ON public.kitchen_tickets(order_id);
CREATE INDEX idx_kt_stage ON public.kitchen_tickets(stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kitchen_tickets TO authenticated;
GRANT ALL ON public.kitchen_tickets TO service_role;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage kt" ON public.kitchen_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'employee'));
CREATE TRIGGER kt_updated_at BEFORE UPDATE ON public.kitchen_tickets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- SETTINGS (single row)
-- =========================================================
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  restaurant_name TEXT NOT NULL DEFAULT 'Ember & Ash',
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 8,
  self_order_enabled BOOLEAN NOT NULL DEFAULT true,
  qr_menu_enabled BOOLEAN NOT NULL DEFAULT true,
  self_order_brand_color TEXT NOT NULL DEFAULT '#E2AD86',
  self_order_banner_url TEXT,
  upi_id TEXT,
  upi_payee_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;

-- =========================================================
-- SEED DATA
-- =========================================================
INSERT INTO public.floors (name, sort_order) VALUES
  ('Main Dining Room', 1),
  ('Terrace', 2),
  ('Bar', 3);

INSERT INTO public.categories (name, color, sort_order) VALUES
  ('Starters', '#E2AD86', 1),
  ('Mains', '#C97B5C', 2),
  ('Sides', '#8FA888', 3),
  ('Desserts', '#D4A5C0', 4),
  ('Wine', '#7C3F4D', 5),
  ('Cocktails', '#6FA8C9', 6),
  ('Coffee', '#A07856', 7);

-- products
WITH c AS (SELECT id, name FROM public.categories)
INSERT INTO public.products (name, category_id, price, tax_rate, description) VALUES
  ('Burrata & Heirloom Tomato', (SELECT id FROM c WHERE name='Starters'), 18.50, 8, 'Stracciatella, basil oil, sourdough'),
  ('Tuna Tartare', (SELECT id FROM c WHERE name='Starters'), 22.00, 8, 'Avocado, ponzu, sesame'),
  ('Charred Octopus', (SELECT id FROM c WHERE name='Starters'), 24.00, 8, 'Romesco, smoked paprika'),
  ('Dry-Aged Ribeye 400g', (SELECT id FROM c WHERE name='Mains'), 84.00, 8, 'Peppercorn crust, bone marrow butter'),
  ('Pan-Seared Scallops', (SELECT id FROM c WHERE name='Mains'), 38.00, 8, 'Cauliflower puree, brown butter'),
  ('Wagyu Burger', (SELECT id FROM c WHERE name='Mains'), 28.00, 8, 'Aged cheddar, truffle aioli'),
  ('Roasted Cauliflower', (SELECT id FROM c WHERE name='Mains'), 22.00, 8, 'Tahini, pomegranate, herbs'),
  ('Black Truffle Fries', (SELECT id FROM c WHERE name='Sides'), 14.00, 8, 'Parmesan, chives'),
  ('Charred Broccolini', (SELECT id FROM c WHERE name='Sides'), 12.00, 8, 'Chili, lemon'),
  ('Crème Brûlée', (SELECT id FROM c WHERE name='Desserts'), 14.00, 8, 'Vanilla bean, caramelized sugar'),
  ('Chocolate Torte', (SELECT id FROM c WHERE name='Desserts'), 16.00, 8, 'Single origin 70%, sea salt'),
  ('Château Margaux 2015', (SELECT id FROM c WHERE name='Wine'), 295.00, 8, 'Bordeaux blend'),
  ('Sancerre Blanc', (SELECT id FROM c WHERE name='Wine'), 18.00, 8, 'Glass'),
  ('Old Fashioned', (SELECT id FROM c WHERE name='Cocktails'), 16.00, 8, 'Bourbon, demerara, bitters'),
  ('Negroni', (SELECT id FROM c WHERE name='Cocktails'), 15.00, 8, 'Gin, Campari, sweet vermouth'),
  ('Espresso', (SELECT id FROM c WHERE name='Coffee'), 5.00, 8, 'Single shot'),
  ('Cappuccino', (SELECT id FROM c WHERE name='Coffee'), 6.50, 8, 'Steamed milk');

-- floor tables
WITH f AS (SELECT id, name FROM public.floors)
INSERT INTO public.restaurant_tables (floor_id, table_number, seats) VALUES
  ((SELECT id FROM f WHERE name='Main Dining Room'), '01', 2),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '02', 2),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '03', 4),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '04', 4),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '05', 4),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '06', 6),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '07', 6),
  ((SELECT id FROM f WHERE name='Main Dining Room'), '08', 2),
  ((SELECT id FROM f WHERE name='Terrace'), 'T1', 4),
  ((SELECT id FROM f WHERE name='Terrace'), 'T2', 4),
  ((SELECT id FROM f WHERE name='Terrace'), 'T3', 2),
  ((SELECT id FROM f WHERE name='Bar'), 'B1', 1),
  ((SELECT id FROM f WHERE name='Bar'), 'B2', 1),
  ((SELECT id FROM f WHERE name='Bar'), 'B3', 1);

INSERT INTO public.payment_methods (name, kind, active) VALUES
  ('Cash', 'cash', true),
  ('Card', 'card', true),
  ('UPI', 'upi', true);

INSERT INTO public.coupons (code, discount_type, discount_value, active) VALUES
  ('WELCOME10', 'percentage', 10, true),
  ('STAFF20', 'percentage', 20, true),
  ('FLAT5', 'fixed', 5, true);
