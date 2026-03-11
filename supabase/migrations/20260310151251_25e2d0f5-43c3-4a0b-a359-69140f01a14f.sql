
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- TENANTS TABLE
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_name TEXT NOT NULL,
  gst_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT 'Maharashtra',
  state_code TEXT DEFAULT '27',
  pincode TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  branch_name TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'INV',
  terms_conditions TEXT DEFAULT '1. Goods once sold will not be taken back.
2. Subject to local jurisdiction.
3. E&OE (Errors and Omissions Excepted)',
  logo_url TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  max_employees INTEGER DEFAULT 2,
  plan TEXT DEFAULT 'Basic' CHECK (plan IN ('Basic', 'Pro', 'Enterprise')),
  subscription_start DATE DEFAULT CURRENT_DATE,
  subscription_end DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  language TEXT DEFAULT 'hi',
  is_active BOOLEAN DEFAULT true,
  show_bank_details BOOLEAN DEFAULT true,
  show_terms BOOLEAN DEFAULT true,
  show_eway_bill BOOLEAN DEFAULT false,
  invoice_copy_label TEXT DEFAULT 'original',
  financial_year_start INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- USERS TABLE
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'employee')),
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  show_stock_to_employee BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- CUSTOMERS TABLE
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  state_code TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  type TEXT DEFAULT 'regular',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- PRODUCTS TABLE
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC NOT NULL DEFAULT 18,
  unit TEXT DEFAULT 'Piece',
  stock_quantity NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 5,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- INVOICES TABLE
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_gst TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  customer_state TEXT DEFAULT '',
  customer_state_code TEXT DEFAULT '',
  vehicle_number TEXT DEFAULT '',
  eway_bill TEXT DEFAULT '',
  place_of_supply TEXT DEFAULT '',
  subtotal NUMERIC DEFAULT 0,
  cgst_total NUMERIC DEFAULT 0,
  sgst_total NUMERIC DEFAULT 0,
  igst_total NUMERIC DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  is_inter_state BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial')),
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES public.users(id),
  created_by_name TEXT DEFAULT '',
  created_by_role TEXT DEFAULT 'user',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- INVOICE ITEMS TABLE
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'Piece',
  rate NUMERIC NOT NULL DEFAULT 0,
  mrp NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- PAYMENTS TABLE
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'RTGS', 'Cheque')),
  reference_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- PURCHASES TABLE
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_gst TEXT DEFAULT '',
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  taxable_amount NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- USER PREFERENCES TABLE
CREATE TABLE public.user_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  language TEXT DEFAULT 'hi',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER FUNCTION to get tenant_id for current user
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- SECURITY DEFINER FUNCTION to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'admin'
  )
$$;

-- RLS POLICIES FOR TENANTS
CREATE POLICY "Users can view their own tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Admins can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Users can update their own tenant" ON public.tenants
  FOR UPDATE USING (id = public.get_user_tenant_id() OR public.is_admin());

-- RLS POLICIES FOR USERS
CREATE POLICY "Users can view users in their tenant" ON public.users
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin() OR tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update users in their tenant" ON public.users
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());

-- RLS POLICIES FOR CUSTOMERS
CREATE POLICY "Tenant users can view customers" ON public.customers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Tenant users can insert customers" ON public.customers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can update customers" ON public.customers
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can delete customers" ON public.customers
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- RLS POLICIES FOR PRODUCTS
CREATE POLICY "Tenant users can view products" ON public.products
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Tenant users can insert products" ON public.products
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can update products" ON public.products
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can delete products" ON public.products
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- RLS POLICIES FOR INVOICES
CREATE POLICY "Tenant users can view invoices" ON public.invoices
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Tenant users can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can update invoices" ON public.invoices
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can delete invoices" ON public.invoices
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- RLS POLICIES FOR INVOICE ITEMS
CREATE POLICY "Tenant users can view invoice items" ON public.invoice_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND (invoices.tenant_id = public.get_user_tenant_id() OR public.is_admin()))
  );
CREATE POLICY "Tenant users can insert invoice items" ON public.invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_id = public.get_user_tenant_id())
  );
CREATE POLICY "Tenant users can update invoice items" ON public.invoice_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_id = public.get_user_tenant_id())
  );
CREATE POLICY "Tenant users can delete invoice items" ON public.invoice_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_id = public.get_user_tenant_id())
  );

-- RLS POLICIES FOR PAYMENTS
CREATE POLICY "Tenant users can view payments" ON public.payments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Tenant users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can update payments" ON public.payments
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can delete payments" ON public.payments
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- RLS POLICIES FOR PURCHASES
CREATE POLICY "Tenant users can view purchases" ON public.purchases
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin());
CREATE POLICY "Tenant users can insert purchases" ON public.purchases
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can update purchases" ON public.purchases
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Tenant users can delete purchases" ON public.purchases
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- RLS POLICIES FOR USER PREFERENCES
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = user_preferences.user_id AND users.auth_user_id = auth.uid())
  );
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = user_preferences.user_id AND users.auth_user_id = auth.uid())
  );
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = user_preferences.user_id AND users.auth_user_id = auth.uid())
  );

-- TRIGGERS for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INDEXES for performance
CREATE INDEX idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_purchases_tenant_id ON public.purchases(tenant_id);
