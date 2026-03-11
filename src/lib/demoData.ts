import { User, Customer, Product, Invoice, Payment, PurchaseEntry, DEFAULT_FIRM_SETTINGS } from './types';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

function daysFromNow(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
function daysAgo(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
function daysAgoISO(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const initialUsers: User[] = [
  {
    id: 'admin1', username: 'admin', password: 'admin123', role: 'admin',
    firmName: 'BillSaathi HQ', gstNumber: '', email: 'admin@billsaathi.com', phone: '9999999999',
    plan: 'Enterprise', maxEmployees: 0, subscriptionStart: daysAgo(30), subscriptionEnd: daysFromNow(335),
    active: true, showStockToEmployees: false,
  },
  {
    id: 'user1', username: 'rajesh', password: 'rajesh123', role: 'user',
    firmName: 'Rajesh Traders', gstNumber: '27AABCU9603R1ZM', email: 'rajesh@traders.com', phone: '9876543210',
    plan: 'Pro', maxEmployees: 5, subscriptionStart: daysAgo(25), subscriptionEnd: daysFromNow(5),
    active: true, showStockToEmployees: true,
    firmSettings: {
      ...DEFAULT_FIRM_SETTINGS,
      address: 'Shop No. 45, Market Road',
      city: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '411001',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      branchName: 'MG Road Branch',
    },
  },
  {
    id: 'user2', username: 'sunita', password: 'sunita123', role: 'user',
    firmName: 'Sunita Electronics', gstNumber: '07CQZPS3762Q1ZV', email: 'sunita@electronics.com', phone: '9876543211',
    plan: 'Basic', maxEmployees: 2, subscriptionStart: daysAgo(10), subscriptionEnd: daysFromNow(200),
    active: true, showStockToEmployees: false,
    firmSettings: {
      ...DEFAULT_FIRM_SETTINGS,
      address: '78 Nehru Place',
      city: 'New Delhi',
      state: 'Delhi',
      stateCode: '07',
      pincode: '110019',
    },
  },
  {
    id: 'emp1', username: 'mohan', password: 'mohan123', role: 'employee',
    firmName: 'Rajesh Traders', gstNumber: '', email: 'mohan@traders.com', phone: '9876543212',
    plan: 'Pro', maxEmployees: 0, subscriptionStart: daysAgo(25), subscriptionEnd: daysFromNow(5),
    active: true, parentUserId: 'user1', showStockToEmployees: false,
  },
];

export const initialCustomers: Customer[] = [
  { id: 'c1', userId: 'user1', name: 'Amit Kumar', phone: '9123456789', gstNumber: '27AAACM5346P1ZH', address: 'Shop 12, MG Road', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411002', createdAt: daysAgo(20) },
  { id: 'c2', userId: 'user1', name: 'Priya Sharma', phone: '9234567890', gstNumber: '', address: '45 Station Road', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', createdAt: daysAgo(15) },
  { id: 'c3', userId: 'user2', name: 'Vikram Singh', phone: '9345678901', gstNumber: '07AAACV1234B1ZX', address: '78 Nehru Place', city: 'Delhi', state: 'Delhi', stateCode: '07', createdAt: daysAgo(8) },
];

export const initialProducts: Product[] = [
  { id: 'p1', userId: 'user1', name: 'Tata Steel Rod 12mm', hsn: '7214', price: 4500, gstPercent: 18, unit: 'Quintal', stock: 50, lowStockThreshold: 10 },
  { id: 'p2', userId: 'user1', name: 'ACC Cement 50kg', hsn: '2523', price: 380, gstPercent: 28, unit: 'Bag', stock: 200, lowStockThreshold: 30 },
  { id: 'p3', userId: 'user1', name: 'Birla TMT Bar 8mm', hsn: '7214', price: 5200, gstPercent: 18, unit: 'Quintal', stock: 8, lowStockThreshold: 10 },
  { id: 'p4', userId: 'user2', name: 'Samsung LED TV 43"', hsn: '8528', price: 32000, gstPercent: 18, unit: 'Piece', stock: 15, lowStockThreshold: 5 },
  { id: 'p5', userId: 'user2', name: 'Havells Wire 1.5mm', hsn: '8544', price: 1800, gstPercent: 18, unit: 'Coil', stock: 3, lowStockThreshold: 5 },
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv1', userId: 'user1', invoiceNumber: 'INV-2024-0001', date: daysAgo(2),
    customerId: 'c1', customerName: 'Amit Kumar', customerGst: '27AAACM5346P1ZH',
    customerAddress: 'Shop 12, MG Road, Pune', customerState: 'Maharashtra', customerStateCode: '27',
    vehicleNumber: 'MH12AB1234',
    items: [
      { productId: 'p1', productName: 'Tata Steel Rod 12mm', hsn: '7214', quantity: 5, mrp: 4500, sellingPrice: 4500, price: 4500, discount: 0, gstPercent: 18, unit: 'Quintal' },
      { productId: 'p2', productName: 'ACC Cement 50kg', hsn: '2523', quantity: 50, mrp: 400, sellingPrice: 380, price: 380, discount: 5, gstPercent: 28, unit: 'Bag' },
    ],
    totalAmount: 41500, totalGst: 9370, totalCgst: 4685, totalSgst: 4685, totalIgst: 0,
    grandTotal: 50870, roundOff: 0, isInterState: false, placeOfSupply: 'Maharashtra',
    status: 'paid', paidAmount: 50870,
    createdBy: { id: 'user1', name: 'Rajesh Traders', role: 'user', timestamp: daysAgoISO(2) },
  },
  {
    id: 'inv2', userId: 'user1', invoiceNumber: 'INV-2024-0002', date: todayStr,
    customerId: 'c2', customerName: 'Priya Sharma', customerGst: '',
    customerAddress: '45 Station Road, Mumbai', customerState: 'Maharashtra', customerStateCode: '27',
    vehicleNumber: '',
    items: [
      { productId: 'p2', productName: 'ACC Cement 50kg', hsn: '2523', quantity: 100, mrp: 400, sellingPrice: 380, price: 380, discount: 5, gstPercent: 28, unit: 'Bag' },
    ],
    totalAmount: 38000, totalGst: 10640, totalCgst: 5320, totalSgst: 5320, totalIgst: 0,
    grandTotal: 48640, roundOff: 0, isInterState: false, placeOfSupply: 'Maharashtra',
    status: 'pending', paidAmount: 0,
    createdBy: { id: 'user1', name: 'Rajesh Traders', role: 'user', timestamp: new Date().toISOString() },
  },
  {
    id: 'inv3', userId: 'user1', invoiceNumber: 'INV-2024-0003', date: daysAgo(5),
    customerId: 'c1', customerName: 'Amit Kumar', customerGst: '27AAACM5346P1ZH',
    customerAddress: 'Shop 12, MG Road, Pune', customerState: 'Maharashtra', customerStateCode: '27',
    vehicleNumber: 'MH12CD5678',
    items: [
      { productId: 'p3', productName: 'Birla TMT Bar 8mm', hsn: '7214', quantity: 3, mrp: 5500, sellingPrice: 5200, price: 5200, discount: 0, gstPercent: 18, unit: 'Quintal' },
    ],
    totalAmount: 15600, totalGst: 2808, totalCgst: 1404, totalSgst: 1404, totalIgst: 0,
    grandTotal: 18408, roundOff: 0, isInterState: false, placeOfSupply: 'Maharashtra',
    status: 'partial', paidAmount: 10000,
    createdBy: { id: 'emp1', name: 'Mohan', role: 'employee', timestamp: daysAgoISO(5) },
  },
];

export const initialPayments: Payment[] = [
  { id: 'pay1', userId: 'user1', customerId: 'c1', amount: 50870, date: daysAgo(1), mode: 'Bank Transfer', note: 'Full payment for INV-2024-0001', timestamp: daysAgoISO(1) },
  { id: 'pay2', userId: 'user1', customerId: 'c1', amount: 10000, date: daysAgo(3), mode: 'UPI', note: 'Partial payment for INV-2024-0003', timestamp: daysAgoISO(3) },
];

export const initialPurchases: PurchaseEntry[] = [
  {
    id: 'pur1', userId: 'user1', supplierName: 'Tata Steel Ltd', supplierGstin: '27AAACT2727Q1ZW',
    invoiceNumber: 'TS-2024-5001', invoiceDate: daysAgo(10), taxableAmount: 200000,
    igst: 0, cgst: 18000, sgst: 18000, description: 'Steel Rod 12mm - 50 Quintal',
    timestamp: daysAgoISO(10),
  },
];
