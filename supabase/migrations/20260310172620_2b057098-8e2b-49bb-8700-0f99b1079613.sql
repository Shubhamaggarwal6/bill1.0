
-- Add missing columns to credit_notes
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS original_invoice_number text DEFAULT '';
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS misc_amount numeric DEFAULT 0;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS misc_reason text DEFAULT '';
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS created_by_name text DEFAULT '';

-- Add missing columns to credit_note_items
ALTER TABLE public.credit_note_items ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Piece';

-- Add missing columns to debit_notes
ALTER TABLE public.debit_notes ADD COLUMN IF NOT EXISTS original_invoice_number text DEFAULT '';
ALTER TABLE public.debit_notes ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0;
ALTER TABLE public.debit_notes ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.debit_notes ADD COLUMN IF NOT EXISTS created_by_name text DEFAULT '';
