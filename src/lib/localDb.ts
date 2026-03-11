import Dexie, { type Table } from 'dexie';

export interface LocalTenant {
  id: string;
  firm_name: string;
  gst_number?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  branch_name?: string;
  invoice_prefix?: string;
  invoice_copy_label?: string;
  financial_year_start?: number;
  show_bank_details?: boolean;
  show_terms?: boolean;
  show_eway_bill?: boolean;
  terms_conditions?: string;
  logo_url?: string;
  upi_id?: string;
  plan?: string;
  max_employees?: number;
  subscription_start?: string;
  subscription_end?: string;
  language?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalUser {
  id: string;
  tenant_id: string;
  auth_user_id?: string;
  role: string;
  name: string;
  username: string;
  is_active?: boolean;
  show_stock_to_employee?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalCustomer {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  gst_number?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  type?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalProduct {
  id: string;
  tenant_id: string;
  name: string;
  hsn_code?: string;
  price: number;
  gst_rate: number;
  unit?: string;
  stock_quantity?: number;
  min_stock_level?: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalInvoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id?: string;
  customer_name: string;
  customer_gst?: string;
  customer_address?: string;
  customer_state?: string;
  customer_state_code?: string;
  vehicle_number?: string;
  eway_bill?: string;
  place_of_supply?: string;
  subtotal?: number;
  cgst_total?: number;
  sgst_total?: number;
  igst_total?: number;
  discount_total?: number;
  round_off?: number;
  grand_total: number;
  is_inter_state?: boolean;
  status?: string;
  paid_amount?: number;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  created_by_role?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalInvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  mrp?: number;
  selling_price?: number;
  discount_percent?: number;
  taxable_amount?: number;
  gst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_amount?: number;
  unit?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalPayment {
  id: string;
  tenant_id: string;
  customer_id?: string;
  invoice_id?: string;
  amount: number;
  payment_date: string;
  payment_mode?: string;
  reference_number?: string;
  notes?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalPurchase {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_gst?: string;
  invoice_number: string;
  invoice_date: string;
  taxable_amount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  total?: number;
  description?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'DONE' | 'FAILED';

export interface LocalCreditNote {
  id: string;
  tenant_id: string;
  credit_note_number: string;
  credit_note_date: string;
  original_invoice_id?: string;
  original_invoice_number?: string;
  customer_id?: string;
  customer_name: string;
  reason?: string;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  misc_amount?: number;
  misc_reason?: string;
  notes?: string;
  status?: string;
  created_by?: string;
  created_by_name?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalCreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id?: string;
  product_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  unit?: string;
  taxable_amount?: number;
  gst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface LocalDebitNote {
  id: string;
  tenant_id: string;
  debit_note_number: string;
  debit_note_date: string;
  original_invoice_id?: string;
  original_invoice_number?: string;
  customer_id?: string;
  customer_name: string;
  reason?: string;
  amount?: number;
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  notes?: string;
  status?: string;
  created_by?: string;
  created_by_name?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalDebitNoteItem {
  id: string;
  debit_note_id: string;
  product_id?: string;
  product_name: string;
  hsn_code?: string;
  quantity: number;
  rate: number;
  taxable_amount?: number;
  gst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface LocalSupplier {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  opening_balance?: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  payload: any;
  created_at: string;
  retry_count: number;
  last_error?: string;
  status: SyncStatus;
  device_id?: string;
}

export interface SyncMetadata {
  table_name: string;
  last_synced_at: string;
}

class BillSaathiDB extends Dexie {
  tenants!: Table<LocalTenant, string>;
  users!: Table<LocalUser, string>;
  customers!: Table<LocalCustomer, string>;
  products!: Table<LocalProduct, string>;
  invoices!: Table<LocalInvoice, string>;
  invoice_items!: Table<LocalInvoiceItem, string>;
  payments!: Table<LocalPayment, string>;
  purchases!: Table<LocalPurchase, string>;
  credit_notes!: Table<LocalCreditNote, string>;
  credit_note_items!: Table<LocalCreditNoteItem, string>;
  debit_notes!: Table<LocalDebitNote, string>;
  debit_note_items!: Table<LocalDebitNoteItem, string>;
  suppliers!: Table<LocalSupplier, string>;
  sync_queue!: Table<SyncQueueItem, string>;
  sync_metadata!: Table<SyncMetadata, string>;

  constructor() {
    super('BillSaathiDB');
    this.version(1).stores({
      tenants: 'id, firm_name, updated_at',
      users: 'id, tenant_id, auth_user_id, username, role, updated_at',
      customers: 'id, tenant_id, name, phone, is_deleted, updated_at',
      products: 'id, tenant_id, name, hsn_code, is_deleted, updated_at',
      invoices: 'id, tenant_id, invoice_number, invoice_date, customer_id, status, is_deleted, created_at, updated_at',
      invoice_items: 'id, invoice_id, product_id',
      payments: 'id, tenant_id, customer_id, invoice_id, is_deleted, updated_at',
      purchases: 'id, tenant_id, is_deleted, updated_at',
      sync_queue: 'id, table_name, record_id, status, created_at',
      sync_metadata: 'table_name',
    });
    this.version(2).stores({
      credit_notes: 'id, tenant_id, credit_note_number, original_invoice_id, customer_id, is_deleted, updated_at',
      credit_note_items: 'id, credit_note_id, product_id',
      debit_notes: 'id, tenant_id, debit_note_number, original_invoice_id, customer_id, is_deleted, updated_at',
      debit_note_items: 'id, debit_note_id, product_id',
    });
    this.version(3).stores({
      suppliers: 'id, tenant_id, name, gst_number, is_deleted, updated_at',
    });
  }
}

export const db = new BillSaathiDB();

// Device ID for multi-device sync
export function getDeviceId(): string {
  let id = localStorage.getItem('bs_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('bs_device_id', id);
  }
  return id;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

// Helper: add to sync queue
export async function queueSync(
  tableName: string,
  recordId: string,
  operation: SyncOperation,
  payload: any
) {
  await db.sync_queue.add({
    id: generateId(),
    table_name: tableName,
    record_id: recordId,
    operation,
    payload,
    created_at: nowISO(),
    retry_count: 0,
    status: 'PENDING',
    device_id: getDeviceId(),
  });
}
