
-- Credit Notes table
CREATE TABLE public.credit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  credit_note_number TEXT NOT NULL,
  credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  reason TEXT DEFAULT '',
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

-- Credit Note Items table
CREATE TABLE public.credit_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Debit Notes table
CREATE TABLE public.debit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  debit_note_number TEXT NOT NULL,
  debit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_invoice_id UUID REFERENCES public.invoices(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  reason TEXT DEFAULT '',
  subtotal NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false
);

-- Debit Note Items table
CREATE TABLE public.debit_note_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debit_note_id UUID NOT NULL REFERENCES public.debit_notes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_note_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_notes
CREATE POLICY "Tenant users can view credit notes" ON public.credit_notes
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_admin());

CREATE POLICY "Tenant users can insert credit notes" ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update credit notes" ON public.credit_notes
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can delete credit notes" ON public.credit_notes
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- RLS policies for credit_note_items (via credit_notes tenant check)
CREATE POLICY "Tenant users can view credit note items" ON public.credit_note_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM credit_notes WHERE credit_notes.id = credit_note_items.credit_note_id AND (credit_notes.tenant_id = get_user_tenant_id() OR is_admin())));

CREATE POLICY "Tenant users can insert credit note items" ON public.credit_note_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM credit_notes WHERE credit_notes.id = credit_note_items.credit_note_id AND credit_notes.tenant_id = get_user_tenant_id()));

CREATE POLICY "Tenant users can update credit note items" ON public.credit_note_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM credit_notes WHERE credit_notes.id = credit_note_items.credit_note_id AND credit_notes.tenant_id = get_user_tenant_id()));

CREATE POLICY "Tenant users can delete credit note items" ON public.credit_note_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM credit_notes WHERE credit_notes.id = credit_note_items.credit_note_id AND credit_notes.tenant_id = get_user_tenant_id()));

-- RLS policies for debit_notes
CREATE POLICY "Tenant users can view debit notes" ON public.debit_notes
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id() OR is_admin());

CREATE POLICY "Tenant users can insert debit notes" ON public.debit_notes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can update debit notes" ON public.debit_notes
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant users can delete debit notes" ON public.debit_notes
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- RLS policies for debit_note_items
CREATE POLICY "Tenant users can view debit note items" ON public.debit_note_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM debit_notes WHERE debit_notes.id = debit_note_items.debit_note_id AND (debit_notes.tenant_id = get_user_tenant_id() OR is_admin())));

CREATE POLICY "Tenant users can insert debit note items" ON public.debit_note_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM debit_notes WHERE debit_notes.id = debit_note_items.debit_note_id AND debit_notes.tenant_id = get_user_tenant_id()));

CREATE POLICY "Tenant users can update debit note items" ON public.debit_note_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM debit_notes WHERE debit_notes.id = debit_note_items.debit_note_id AND debit_notes.tenant_id = get_user_tenant_id()));

CREATE POLICY "Tenant users can delete debit note items" ON public.debit_note_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM debit_notes WHERE debit_notes.id = debit_note_items.debit_note_id AND debit_notes.tenant_id = get_user_tenant_id()));
