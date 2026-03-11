export type Role = 'admin' | 'user' | 'employee';
export type PlanType = 'Basic' | 'Pro' | 'Enterprise';
export type SubscriptionDuration = '1month' | '3months' | '6months' | '1year' | 'custom';

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export function getStateFromGST(gst: string): { code: string; name: string } | null {
  if (!gst || gst.length < 2) return null;
  const code = gst.substring(0, 2);
  return INDIAN_STATES.find(s => s.code === code) || null;
}

export interface FirmSettings {
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  invoicePrefix: string;
  financialYearStart: number; // month 4 = April
  termsAndConditions: string;
  showBankDetails: boolean;
  showTerms: boolean;
  showEwayBill: boolean;
  invoiceCopyLabel: 'original' | 'duplicate' | 'triplicate' | 'all';
}

export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  address: '',
  city: '',
  state: 'Maharashtra',
  stateCode: '27',
  pincode: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branchName: '',
  invoicePrefix: 'INV',
  financialYearStart: 4,
  termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. E&OE (Errors and Omissions Excepted)',
  showBankDetails: true,
  showTerms: true,
  showEwayBill: false,
  invoiceCopyLabel: 'original',
};

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  firmName: string;
  gstNumber: string;
  email: string;
  phone: string;
  plan: PlanType;
  maxEmployees: number;
  subscriptionStart: string;
  subscriptionEnd: string;
  active: boolean;
  parentUserId?: string;
  showStockToEmployees: boolean;
  firmSettings?: FirmSettings;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  gstNumber: string;
  address: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  hsn: string;
  price: number;
  gstPercent: number;
  unit: string;
  stock: number;
  lowStockThreshold: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  hsn: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  price: number;
  discount: number;
  gstPercent: number;
  unit: string;
}

export interface InvoiceCreator {
  id: string;
  name: string;
  role: Role;
  timestamp: string;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerGst: string;
  customerAddress: string;
  customerState?: string;
  customerStateCode?: string;
  vehicleNumber: string;
  ewayBillNumber?: string;
  items: InvoiceItem[];
  totalAmount: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  roundOff: number;
  isInterState: boolean;
  placeOfSupply: string;
  status: 'paid' | 'pending' | 'partial';
  paidAmount: number;
  createdBy: InvoiceCreator;
}

export interface Payment {
  id: string;
  userId: string;
  customerId: string;
  amount: number;
  date: string;
  mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'RTGS' | 'Cheque';
  invoiceId?: string;
  note: string;
  timestamp: string;
}

export interface PurchaseProduct {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  unit: string;
  hsn: string;
  gstPercent: number;
}

export interface PurchaseEntry {
  id: string;
  userId: string;
  supplierName: string;
  supplierGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableAmount: number;
  igst: number;
  cgst: number;
  sgst: number;
  description: string;
  timestamp: string;
  products?: PurchaseProduct[];
}

export interface CreditNote {
  id: string;
  userId: string;
  creditNoteNumber: string;
  date: string;
  originalInvoiceId: string;
  originalInvoiceNumber?: string;
  customerId: string;
  customerName: string;
  reason: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  isInterState: boolean;
  status: 'active' | 'adjusted' | 'cancelled';
  createdBy?: InvoiceCreator;
}

export interface DebitNote {
  id: string;
  userId: string;
  debitNoteNumber: string;
  date: string;
  originalInvoiceId: string;
  originalInvoiceNumber?: string;
  customerId: string;
  customerName: string;
  reason: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  isInterState: boolean;
  status: 'active' | 'paid' | 'cancelled';
  createdBy?: InvoiceCreator;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  openingBalance: number;
}

export interface SubscriptionStatus {
  status: 'active' | 'warning' | 'critical' | 'expired';
  color: string;
  label: string;
  daysLeft: number;
}
