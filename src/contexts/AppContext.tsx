import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Customer, Product, Invoice, Payment, PurchaseEntry, CreditNote, DebitNote, Supplier } from '@/lib/types';
import { initialUsers, initialCustomers, initialProducts, initialInvoices, initialPayments, initialPurchases } from '@/lib/demoData';
import { db, queueSync, generateId, nowISO, type LocalCustomer, type LocalProduct, type LocalInvoice, type LocalInvoiceItem, type LocalPayment, type LocalPurchase, type LocalCreditNote, type LocalCreditNoteItem, type LocalDebitNote, type LocalSupplier } from '@/lib/localDb';
import { triggerSync, startAutoSync } from '@/lib/syncEngine';

// Helpers to convert between old format and Dexie format
function toLocalCustomer(c: Customer): LocalCustomer {
  return {
    id: c.id, tenant_id: c.userId, name: c.name, phone: c.phone || '',
    gst_number: c.gstNumber || '', address: c.address || '', city: c.city || '',
    state: c.state || '', state_code: c.stateCode || '', pincode: c.pincode || '',
    type: 'regular', is_deleted: false,
    created_at: c.createdAt || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalCustomer(c: LocalCustomer): Customer {
  return {
    id: c.id, userId: c.tenant_id, name: c.name, phone: c.phone || '',
    gstNumber: c.gst_number || '', address: c.address || '', city: c.city || '',
    state: c.state || '', stateCode: c.state_code || '', pincode: c.pincode || '',
    createdAt: c.created_at,
  };
}

function toLocalProduct(p: Product): LocalProduct {
  return {
    id: p.id, tenant_id: p.userId, name: p.name, hsn_code: p.hsn || '',
    price: p.price, gst_rate: p.gstPercent, unit: p.unit || 'Piece',
    stock_quantity: p.stock ?? 0, min_stock_level: p.lowStockThreshold ?? 5,
    is_deleted: false, created_at: nowISO(), updated_at: nowISO(),
  };
}

function fromLocalProduct(p: LocalProduct): Product {
  return {
    id: p.id, userId: p.tenant_id, name: p.name, hsn: p.hsn_code || '',
    price: p.price, gstPercent: p.gst_rate, unit: p.unit || 'Piece',
    stock: p.stock_quantity ?? 0, lowStockThreshold: p.min_stock_level ?? 5,
  };
}

function toLocalInvoice(inv: Invoice): LocalInvoice {
  return {
    id: inv.id, tenant_id: inv.userId, invoice_number: inv.invoiceNumber,
    invoice_date: inv.date, customer_id: inv.customerId, customer_name: inv.customerName,
    customer_gst: inv.customerGst || '', customer_address: inv.customerAddress || '',
    customer_state: inv.customerState || '', customer_state_code: inv.customerStateCode || '',
    vehicle_number: inv.vehicleNumber || '', eway_bill: inv.ewayBillNumber || '',
    place_of_supply: inv.placeOfSupply || '',
    subtotal: inv.totalAmount, cgst_total: inv.totalCgst, sgst_total: inv.totalSgst,
    igst_total: inv.totalIgst, discount_total: 0, round_off: inv.roundOff,
    grand_total: inv.grandTotal, is_inter_state: inv.isInterState,
    status: inv.status, paid_amount: inv.paidAmount, notes: '',
    created_by: inv.createdBy?.id, created_by_name: inv.createdBy?.name,
    created_by_role: inv.createdBy?.role,
    is_deleted: false, created_at: inv.createdBy?.timestamp || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalInvoice(inv: LocalInvoice): Invoice {
  return {
    id: inv.id, userId: inv.tenant_id, invoiceNumber: inv.invoice_number,
    date: inv.invoice_date, customerId: inv.customer_id || '',
    customerName: inv.customer_name, customerGst: inv.customer_gst || '',
    customerAddress: inv.customer_address || '',
    customerState: inv.customer_state || '', customerStateCode: inv.customer_state_code || '',
    vehicleNumber: inv.vehicle_number || '', ewayBillNumber: inv.eway_bill || '',
    items: [], // loaded separately
    totalAmount: inv.subtotal || 0, totalGst: (inv.cgst_total || 0) + (inv.sgst_total || 0) + (inv.igst_total || 0),
    totalCgst: inv.cgst_total || 0, totalSgst: inv.sgst_total || 0, totalIgst: inv.igst_total || 0,
    grandTotal: inv.grand_total, roundOff: inv.round_off || 0,
    isInterState: inv.is_inter_state || false, placeOfSupply: inv.place_of_supply || '',
    status: (inv.status as any) || 'pending', paidAmount: inv.paid_amount || 0,
    createdBy: {
      id: inv.created_by || '', name: inv.created_by_name || '',
      role: (inv.created_by_role as any) || 'user', timestamp: inv.created_at,
    },
  };
}

function toLocalPayment(p: Payment): LocalPayment {
  return {
    id: p.id, tenant_id: p.userId, customer_id: p.customerId,
    invoice_id: p.invoiceId || undefined, amount: p.amount,
    payment_date: p.date, payment_mode: p.mode, reference_number: '',
    notes: p.note || '', is_deleted: false,
    created_at: p.timestamp || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalPayment(p: LocalPayment): Payment {
  return {
    id: p.id, userId: p.tenant_id, customerId: p.customer_id || '',
    amount: p.amount, date: p.payment_date,
    mode: (p.payment_mode as any) || 'Cash', invoiceId: p.invoice_id,
    note: p.notes || '', timestamp: p.created_at,
  };
}

function toLocalPurchase(p: PurchaseEntry): LocalPurchase {
  return {
    id: p.id, tenant_id: p.userId, supplier_name: p.supplierName,
    supplier_gst: p.supplierGstin || '', invoice_number: p.invoiceNumber,
    invoice_date: p.invoiceDate, taxable_amount: p.taxableAmount,
    igst: p.igst, cgst: p.cgst, sgst: p.sgst,
    total: p.taxableAmount + p.igst + p.cgst + p.sgst,
    description: p.description || '', is_deleted: false,
    created_at: p.timestamp || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalPurchase(p: LocalPurchase): PurchaseEntry {
  return {
    id: p.id, userId: p.tenant_id, supplierName: p.supplier_name,
    supplierGstin: p.supplier_gst || '', invoiceNumber: p.invoice_number,
    invoiceDate: p.invoice_date, taxableAmount: p.taxable_amount || 0,
    igst: p.igst || 0, cgst: p.cgst || 0, sgst: p.sgst || 0,
    description: p.description || '', timestamp: p.created_at,
  };
}

function toLocalInvoiceItem(item: import('@/lib/types').InvoiceItem, invoiceId: string): LocalInvoiceItem {
  const taxable = item.quantity * item.price;
  return {
    id: generateId(), invoice_id: invoiceId, product_id: item.productId,
    product_name: item.productName, hsn_code: item.hsn || '', quantity: item.quantity,
    rate: item.price, mrp: item.mrp, selling_price: item.sellingPrice,
    discount_percent: item.discount, taxable_amount: taxable,
    gst_rate: item.gstPercent, cgst_amount: taxable * item.gstPercent / 200,
    sgst_amount: taxable * item.gstPercent / 200, igst_amount: 0,
    total_amount: taxable + taxable * item.gstPercent / 100,
    unit: item.unit || 'Piece', created_at: nowISO(), updated_at: nowISO(),
  };
}

// ---- localStorage fallback for current user session ----
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
}
function saveToStorage(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Convert credit/debit notes
function toLocalCreditNote(cn: CreditNote): LocalCreditNote {
  return {
    id: cn.id, tenant_id: cn.userId, credit_note_number: cn.creditNoteNumber,
    credit_note_date: cn.date, original_invoice_id: cn.originalInvoiceId,
    original_invoice_number: cn.originalInvoiceNumber,
    customer_id: cn.customerId, customer_name: cn.customerName,
    reason: cn.reason, subtotal: cn.subtotal, cgst: cn.cgst, sgst: cn.sgst,
    igst: cn.igst, total: cn.total, status: cn.status,
    created_by: cn.createdBy?.id, created_by_name: cn.createdBy?.name,
    is_deleted: false, created_at: cn.createdBy?.timestamp || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalCreditNote(cn: LocalCreditNote): CreditNote {
  return {
    id: cn.id, userId: cn.tenant_id, creditNoteNumber: cn.credit_note_number,
    date: cn.credit_note_date, originalInvoiceId: cn.original_invoice_id || '',
    originalInvoiceNumber: cn.original_invoice_number,
    customerId: cn.customer_id || '', customerName: cn.customer_name,
    reason: cn.reason || '', items: [], subtotal: cn.subtotal || 0,
    cgst: cn.cgst || 0, sgst: cn.sgst || 0, igst: cn.igst || 0,
    total: cn.total || 0, isInterState: (cn.igst || 0) > 0,
    status: (cn.status as any) || 'active',
    createdBy: { id: cn.created_by || '', name: cn.created_by_name || '', role: 'user', timestamp: cn.created_at },
  };
}

function toLocalDebitNote(dn: DebitNote): LocalDebitNote {
  return {
    id: dn.id, tenant_id: dn.userId, debit_note_number: dn.debitNoteNumber,
    debit_note_date: dn.date, original_invoice_id: dn.originalInvoiceId,
    original_invoice_number: dn.originalInvoiceNumber,
    customer_id: dn.customerId, customer_name: dn.customerName,
    reason: dn.reason, amount: dn.total, subtotal: dn.subtotal,
    cgst: dn.cgst, sgst: dn.sgst, igst: dn.igst, total: dn.total,
    status: dn.status, created_by: dn.createdBy?.id,
    created_by_name: dn.createdBy?.name,
    is_deleted: false, created_at: dn.createdBy?.timestamp || nowISO(), updated_at: nowISO(),
  };
}

function fromLocalDebitNote(dn: LocalDebitNote): DebitNote {
  return {
    id: dn.id, userId: dn.tenant_id, debitNoteNumber: dn.debit_note_number,
    date: dn.debit_note_date, originalInvoiceId: dn.original_invoice_id || '',
    originalInvoiceNumber: dn.original_invoice_number,
    customerId: dn.customer_id || '', customerName: dn.customer_name,
    reason: dn.reason || '', items: [], subtotal: dn.subtotal || 0,
    cgst: dn.cgst || 0, sgst: dn.sgst || 0, igst: dn.igst || 0,
    total: dn.total || 0, isInterState: (dn.igst || 0) > 0,
    status: (dn.status as any) || 'active',
    createdBy: { id: dn.created_by || '', name: dn.created_by_name || '', role: 'user', timestamp: dn.created_at },
  };
}

// Supplier converters
function toLocalSupplier(s: Supplier): LocalSupplier {
  return {
    id: s.id, tenant_id: s.userId, name: s.name, phone: s.phone || '',
    email: s.email || '', gst_number: s.gstNumber || '', address: s.address || '',
    city: s.city || '', state: s.state || '', pin: s.pin || '',
    bank_name: s.bankName || '', bank_account: s.bankAccount || '', bank_ifsc: s.bankIfsc || '',
    opening_balance: s.openingBalance || 0, is_deleted: false,
    created_at: nowISO(), updated_at: nowISO(),
  };
}

function fromLocalSupplier(s: LocalSupplier): Supplier {
  return {
    id: s.id, userId: s.tenant_id, name: s.name, phone: s.phone || '',
    email: s.email || '', gstNumber: s.gst_number || '', address: s.address || '',
    city: s.city || '', state: s.state || '', pin: s.pin || '',
    bankName: s.bank_name || '', bankAccount: s.bank_account || '', bankIfsc: s.bank_ifsc || '',
    openingBalance: s.opening_balance || 0,
  };
}

function toLocalCnItem(item: import('@/lib/types').InvoiceItem, cnId: string): LocalCreditNoteItem {
  const taxable = item.quantity * item.price;
  return {
    id: generateId(), credit_note_id: cnId, product_id: item.productId,
    product_name: item.productName, hsn_code: item.hsn || '', quantity: item.quantity,
    rate: item.price, unit: item.unit || 'Piece', taxable_amount: taxable,
    gst_rate: item.gstPercent, cgst_amount: taxable * item.gstPercent / 200,
    sgst_amount: taxable * item.gstPercent / 200, igst_amount: 0,
    total_amount: taxable + taxable * item.gstPercent / 100,
    created_at: nowISO(), updated_at: nowISO(),
  };
}

interface AppState {
  currentUser: User | null;
  users: User[];
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  purchases: PurchaseEntry[];
  creditNotes: CreditNote[];
  debitNotes: DebitNote[];
  suppliers: Supplier[];
  setCurrentUser: (u: User | null) => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseEntry[]>>;
  setCreditNotes: React.Dispatch<React.SetStateAction<CreditNote[]>>;
  setDebitNotes: React.Dispatch<React.SetStateAction<DebitNote[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  dbReady: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserRaw] = useState<User | null>(() => loadFromStorage('bs_currentUser', null));
  const [users, setUsersRaw] = useState<User[]>(() => loadFromStorage('bs_users', initialUsers));
  const [customers, setCustomersRaw] = useState<Customer[]>(() => loadFromStorage('bs_customers', initialCustomers));
  const [products, setProductsRaw] = useState<Product[]>(() => loadFromStorage('bs_products', initialProducts));
  const [invoices, setInvoicesRaw] = useState<Invoice[]>(() => loadFromStorage('bs_invoices', initialInvoices));
  const [payments, setPaymentsRaw] = useState<Payment[]>(() => loadFromStorage('bs_payments', initialPayments));
  const [purchases, setPurchasesRaw] = useState<PurchaseEntry[]>(() => loadFromStorage('bs_purchases', initialPurchases));
  const [creditNotes, setCreditNotesRaw] = useState<CreditNote[]>(() => loadFromStorage('bs_creditNotes', []));
  const [debitNotes, setDebitNotesRaw] = useState<DebitNote[]>(() => loadFromStorage('bs_debitNotes', []));
  const [suppliers, setSuppliersRaw] = useState<Supplier[]>(() => loadFromStorage('bs_suppliers', []));
  const [dbReady, setDbReady] = useState(false);

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    async function loadFromDb() {
      try {
        const [localCustomers, localProducts, localInvoices, localPayments, localPurchases, localCreditNotes, localDebitNotes, localSuppliers] = await Promise.all([
          db.customers.filter(c => !c.is_deleted).toArray(),
          db.products.filter(p => !p.is_deleted).toArray(),
          db.invoices.filter(i => !i.is_deleted).toArray(),
          db.payments.filter(p => !p.is_deleted).toArray(),
          db.purchases.filter(p => !p.is_deleted).toArray(),
          db.credit_notes.filter(cn => !cn.is_deleted).toArray().catch(() => []),
          db.debit_notes.filter(dn => !dn.is_deleted).toArray().catch(() => []),
          db.suppliers.filter(s => !s.is_deleted).toArray().catch(() => []),
        ]);

        if (cancelled) return;

        if (localCustomers.length > 0) setCustomersRaw(localCustomers.map(fromLocalCustomer));
        if (localProducts.length > 0) setProductsRaw(localProducts.map(fromLocalProduct));
        if (localInvoices.length > 0) {
          const invs = await Promise.all(localInvoices.map(async inv => {
            const items = await db.invoice_items.where('invoice_id').equals(inv.id).toArray();
            const converted = fromLocalInvoice(inv);
            converted.items = items.map(it => ({
              productId: it.product_id || '', productName: it.product_name,
              hsn: it.hsn_code || '', quantity: it.quantity, mrp: it.mrp || it.rate,
              sellingPrice: it.selling_price || it.rate, price: it.rate,
              discount: it.discount_percent || 0, gstPercent: it.gst_rate || 18,
              unit: it.unit || 'Piece',
            }));
            return converted;
          }));
          setInvoicesRaw(invs);
        }
        if (localPayments.length > 0) setPaymentsRaw(localPayments.map(fromLocalPayment));
        if (localPurchases.length > 0) setPurchasesRaw(localPurchases.map(fromLocalPurchase));
        if (localCreditNotes.length > 0) {
          const cns = await Promise.all(localCreditNotes.map(async cn => {
            const items = await db.credit_note_items.where('credit_note_id').equals(cn.id).toArray().catch(() => []);
            const converted = fromLocalCreditNote(cn);
            converted.items = items.map(it => ({
              productId: it.product_id || '', productName: it.product_name,
              hsn: it.hsn_code || '', quantity: it.quantity, mrp: it.rate,
              sellingPrice: it.rate, price: it.rate, discount: 0,
              gstPercent: it.gst_rate || 0, unit: it.unit || 'Piece',
            }));
            return converted;
          }));
          setCreditNotesRaw(cns);
        }
        if (localDebitNotes.length > 0) setDebitNotesRaw(localDebitNotes.map(fromLocalDebitNote));
        if (localSuppliers.length > 0) setSuppliersRaw(localSuppliers.map(fromLocalSupplier));

        setDbReady(true);
      } catch (err) {
        console.warn('IndexedDB load failed, using localStorage fallback:', err);
        setDbReady(true);
      }
    }
    loadFromDb();
    return () => { cancelled = true; };
  }, []);

  // Seed IndexedDB with demo data if empty (first time)
  useEffect(() => {
    if (!dbReady) return;
    async function seedIfEmpty() {
      const count = await db.customers.count();
      if (count === 0) {
        // Seed demo data into IndexedDB
        await db.customers.bulkPut(initialCustomers.map(toLocalCustomer));
        await db.products.bulkPut(initialProducts.map(toLocalProduct));
        for (const inv of initialInvoices) {
          await db.invoices.put(toLocalInvoice(inv));
          for (const item of inv.items) {
            await db.invoice_items.put(toLocalInvoiceItem(item, inv.id));
          }
        }
        await db.payments.bulkPut(initialPayments.map(toLocalPayment));
        await db.purchases.bulkPut(initialPurchases.map(toLocalPurchase));
      }
    }
    seedIfEmpty();
  }, [dbReady]);

  // Start auto sync when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    // Use the user's id as tenant_id for demo; in real app use actual tenant_id
    const cleanup = startAutoSync(currentUser.id);
    return cleanup;
  }, [currentUser?.id]);

  // Persist currentUser to localStorage
  useEffect(() => { saveToStorage('bs_currentUser', currentUser); }, [currentUser]);

  // Wrap setters to also write to IndexedDB + sync queue
  const setCurrentUser = useCallback((u: User | null) => {
    setCurrentUserRaw(u);
  }, []);

  const setUsers: React.Dispatch<React.SetStateAction<User[]>> = useCallback((action) => {
    setUsersRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      saveToStorage('bs_users', next);
      return next;
    });
  }, []);

  const setCustomers: React.Dispatch<React.SetStateAction<Customer[]>> = useCallback((action) => {
    setCustomersRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      // Diff and save to IndexedDB
      const tenantId = currentUser?.id || '';
      for (const c of next) {
        const local = toLocalCustomer(c);
        db.customers.put(local).then(() => {
          const existing = prev.find(p => p.id === c.id);
          if (!existing) {
            queueSync('customers', c.id, 'CREATE', local);
          } else {
            queueSync('customers', c.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_customers', next);
      return next;
    });
  }, [currentUser?.id]);

  const setProducts: React.Dispatch<React.SetStateAction<Product[]>> = useCallback((action) => {
    setProductsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const p of next) {
        const local = toLocalProduct(p);
        db.products.put(local).then(() => {
          const existing = prev.find(x => x.id === p.id);
          if (!existing) {
            queueSync('products', p.id, 'CREATE', local);
          } else {
            queueSync('products', p.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_products', next);
      return next;
    });
  }, [currentUser?.id]);

  const setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>> = useCallback((action) => {
    setInvoicesRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const inv of next) {
        const local = toLocalInvoice(inv);
        db.invoices.put(local).then(async () => {
          // Save items
          const items = inv.items.map(it => toLocalInvoiceItem(it, inv.id));
          await db.invoice_items.where('invoice_id').equals(inv.id).delete();
          await db.invoice_items.bulkPut(items);

          const existing = prev.find(x => x.id === inv.id);
          if (!existing) {
            queueSync('invoices', inv.id, 'CREATE', local);
            for (const item of items) {
              queueSync('invoice_items', item.id, 'CREATE', item);
            }
          } else {
            queueSync('invoices', inv.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_invoices', next);
      return next;
    });
  }, [currentUser?.id]);

  const setPayments: React.Dispatch<React.SetStateAction<Payment[]>> = useCallback((action) => {
    setPaymentsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const p of next) {
        const local = toLocalPayment(p);
        db.payments.put(local).then(() => {
          const existing = prev.find(x => x.id === p.id);
          if (!existing) {
            queueSync('payments', p.id, 'CREATE', local);
          } else {
            queueSync('payments', p.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_payments', next);
      return next;
    });
  }, [currentUser?.id]);

  const setPurchases: React.Dispatch<React.SetStateAction<PurchaseEntry[]>> = useCallback((action) => {
    setPurchasesRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const p of next) {
        const local = toLocalPurchase(p);
        db.purchases.put(local).then(() => {
          const existing = prev.find(x => x.id === p.id);
          if (!existing) {
            queueSync('purchases', p.id, 'CREATE', local);
          } else {
            queueSync('purchases', p.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_purchases', next);
      return next;
    });
  }, [currentUser?.id]);

  const setCreditNotes: React.Dispatch<React.SetStateAction<CreditNote[]>> = useCallback((action) => {
    setCreditNotesRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const cn of next) {
        const local = toLocalCreditNote(cn);
        db.credit_notes.put(local).then(async () => {
          const items = cn.items.map(it => toLocalCnItem(it, cn.id));
          await db.credit_note_items.where('credit_note_id').equals(cn.id).delete().catch(() => {});
          if (items.length > 0) await db.credit_note_items.bulkPut(items);
          const existing = prev.find(x => x.id === cn.id);
          if (!existing) {
            queueSync('credit_notes', cn.id, 'CREATE', local);
            for (const item of items) queueSync('credit_note_items', item.id, 'CREATE', item);
          } else {
            queueSync('credit_notes', cn.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_creditNotes', next);
      return next;
    });
  }, [currentUser?.id]);

  const setDebitNotes: React.Dispatch<React.SetStateAction<DebitNote[]>> = useCallback((action) => {
    setDebitNotesRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const dn of next) {
        const local = toLocalDebitNote(dn);
        db.debit_notes.put(local).then(() => {
          const existing = prev.find(x => x.id === dn.id);
          if (!existing) {
            queueSync('debit_notes', dn.id, 'CREATE', local);
          } else {
            queueSync('debit_notes', dn.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_debitNotes', next);
      return next;
    });
  }, [currentUser?.id]);

  const setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>> = useCallback((action) => {
    setSuppliersRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      const tenantId = currentUser?.id || '';
      for (const s of next) {
        const local = toLocalSupplier(s);
        db.suppliers.put(local).then(() => {
          const existing = prev.find(x => x.id === s.id);
          if (!existing) {
            queueSync('suppliers', s.id, 'CREATE', local);
          } else {
            queueSync('suppliers', s.id, 'UPDATE', local);
          }
          triggerSync(tenantId);
        });
      }
      saveToStorage('bs_suppliers', next);
      return next;
    });
  }, [currentUser?.id]);

  return (
    <AppContext.Provider value={{
      currentUser, users, customers, products, invoices, payments, purchases,
      creditNotes, debitNotes, suppliers,
      setCurrentUser, setUsers, setCustomers, setProducts, setInvoices, setPayments, setPurchases,
      setCreditNotes, setDebitNotes, setSuppliers,
      dbReady,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
