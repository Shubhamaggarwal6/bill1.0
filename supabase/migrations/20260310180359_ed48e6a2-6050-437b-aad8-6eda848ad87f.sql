
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_purchase_rate numeric DEFAULT 0;
