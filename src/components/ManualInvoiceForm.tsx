import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStateFromGST } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import type { Customer, Product, InvoiceItem, Invoice, Payment, DebitNote } from '@/lib/types';

interface Props {
  onClose: () => void;
}

export default function ManualInvoiceForm({ onClose }: Props) {
  const { currentUser, users, customers, products, invoices, setCustomers, setProducts, setInvoices, setPayments, debitNotes, setDebitNotes } = useApp();
  const { t } = useLanguage();

  const userId = currentUser?.role === 'employee' ? currentUser.parentUserId! : currentUser?.id!;
  const myCustomers = customers.filter(c => c.userId === userId);
  const myProducts = products.filter(p => p.userId === userId);

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [ewayBill, setEwayBill] = useState('');
  const [items, setItems] = useState<(InvoiceItem & { _productSearch?: string })[]>([]);
  const [miscItems, setMiscItems] = useState<{ description: string; amount: number; gstRate: number }[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'pending'>('paid');
  const [partialAmount, setPartialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearches, setProductSearches] = useState<Record<number, string>>({});

  const filteredCustomers = myCustomers.filter(c => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  }).slice(0, 8);

  const addItemRow = () => {
    setItems(prev => [...prev, { productId: '', productName: '', hsn: '', quantity: 1, mrp: 0, sellingPrice: 0, price: 0, discount: 0, gstPercent: 18, unit: 'Piece' }]);
  };

  const selectProductForRow = (rowIndex: number, product: Product) => {
    setItems(prev => prev.map((item, i) => i === rowIndex ? {
      ...item, productId: product.id, productName: product.name, hsn: product.hsn,
      mrp: product.price, sellingPrice: product.price, price: product.price,
      gstPercent: product.gstPercent, unit: product.unit,
    } : item));
    setProductSearches(prev => ({ ...prev, [rowIndex]: product.name }));
  };

  const getProductSuggestions = (search: string) => {
    if (!search) return [];
    return myProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  };

  // Calculations
  const itemSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const miscSubtotal = miscItems.reduce((s, m) => s + m.amount, 0);
  const subtotal = itemSubtotal + miscSubtotal;
  const itemGst = items.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent / 100), 0);
  const miscGst = miscItems.reduce((s, m) => s + (m.amount * m.gstRate / 100), 0);
  const totalGst = itemGst + miscGst;

  const firmUser = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;
  const sellerStateCode = firmUser?.firmSettings?.stateCode || firmUser?.gstNumber?.substring(0, 2) || '';
  const buyerStateCode = selectedCustomer?.stateCode || (selectedCustomer?.gstNumber ? selectedCustomer.gstNumber.substring(0, 2) : sellerStateCode);
  const isInterState = sellerStateCode !== buyerStateCode;

  const grandTotal = Math.round(subtotal + totalGst);

  const saveInvoice = () => {
    if (!selectedCustomer || items.length === 0) return;
    
    const allItems: InvoiceItem[] = [
      ...items.filter(i => i.productName),
      ...miscItems.filter(m => m.amount > 0).map(m => ({
        productId: '', productName: m.description || 'Miscellaneous', hsn: '',
        quantity: 1, mrp: m.amount, sellingPrice: m.amount, price: m.amount,
        discount: 0, gstPercent: m.gstRate, unit: 'Piece' as string,
      })),
    ];

    const totalCgst = isInterState ? 0 : totalGst / 2;
    const totalSgst = isInterState ? 0 : totalGst / 2;
    const totalIgst = isInterState ? totalGst : 0;
    const rawGrand = subtotal + totalGst;
    const gt = Math.round(rawGrand);
    const roundOff = Math.round((gt - rawGrand) * 100) / 100;

    const buyerState = getStateFromGST(selectedCustomer.gstNumber || '');
    const sellerState = getStateFromGST(firmUser?.gstNumber || '');
    const myInvoices = invoices.filter(i => i.userId === userId);
    const invNum = `${firmUser?.firmSettings?.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(myInvoices.length + 1).padStart(4, '0')}`;

    const paidAmt = paymentStatus === 'paid' ? gt : paymentStatus === 'partial' ? Number(partialAmount) || 0 : 0;

    const invoice: Invoice = {
      id: crypto.randomUUID(), userId, invoiceNumber: invNum, date: invDate,
      customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      customerGst: selectedCustomer.gstNumber, customerAddress: selectedCustomer.address,
      customerState: buyerState?.name || selectedCustomer.state || '',
      customerStateCode: buyerStateCode, vehicleNumber: vehicleNo, ewayBillNumber: ewayBill,
      items: allItems, totalAmount: subtotal, totalGst, totalCgst, totalSgst, totalIgst,
      grandTotal: gt, roundOff, isInterState,
      placeOfSupply: buyerState?.name || selectedCustomer.state || sellerState?.name || '',
      status: paymentStatus, paidAmount: paidAmt,
      createdBy: { id: currentUser!.id, name: currentUser!.role === 'employee' ? currentUser!.username : currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };

    setInvoices(prev => [...prev, invoice]);
    
    // Update stock
    setProducts(prev => prev.map(p => {
      const item = allItems.find(i => i.productId === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
    }));

    // Record payment
    if (paidAmt > 0) {
      const payment: Payment = {
        id: crypto.randomUUID(), userId, customerId: selectedCustomer.id, invoiceId: invoice.id,
        amount: paidAmt, date: invDate, mode: 'Cash',
        note: `${paymentStatus === 'paid' ? 'Full' : 'Partial'} payment for ${invNum}`,
        timestamp: new Date().toISOString(),
      };
      setPayments(prev => [...prev, payment]);
    }

    // Auto debit note for partial/pending
    if (paymentStatus === 'partial' || paymentStatus === 'pending') {
      const balance = gt - paidAmt;
      const year = new Date().getFullYear();
      const dnNumber = `DN-${year}-${String(debitNotes.length + 1).padStart(4, '0')}`;
      const dn: DebitNote = {
        id: crypto.randomUUID(), userId, debitNoteNumber: dnNumber, date: invDate,
        originalInvoiceId: invoice.id, originalInvoiceNumber: invNum,
        customerId: selectedCustomer.id, customerName: selectedCustomer.name,
        reason: paymentStatus === 'partial' ? 'Partial payment — balance due' : 'Payment pending',
        items: [], subtotal: balance, cgst: 0, sgst: 0, igst: 0, total: balance,
        isInterState: false, status: 'active',
        createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
      };
      setDebitNotes(prev => [...prev, dn]);
    }

    onClose();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
        <h2 className="text-lg font-bold text-foreground">✏️ Manual Invoice</h2>
      </div>

      <div className="glass-card p-4 space-y-4">
        {/* Customer */}
        <div className="relative">
          <label className="text-sm font-medium text-foreground">Customer *</label>
          <Input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder="Search customer..." />
          {selectedCustomer && <p className="text-xs text-muted-foreground mt-1">✅ {selectedCustomer.name} {selectedCustomer.phone ? `• ${selectedCustomer.phone}` : ''}</p>}
          {showCustomerDropdown && !selectedCustomer && customerSearch && (
            <div className="absolute z-10 w-full border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card shadow-lg">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground">{c.name} <span className="text-muted-foreground">{c.phone}</span></button>
              ))}
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="text-sm font-medium text-foreground">Date</label><Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} /></div>
          <div><label className="text-sm font-medium text-foreground">Vehicle No (optional)</label><Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="DL01AB1234" /></div>
          <div><label className="text-sm font-medium text-foreground">E-Way Bill (optional)</label><Input value={ewayBill} onChange={e => setEwayBill(e.target.value)} /></div>
        </div>

        {/* Products */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Products *</label>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input value={productSearches[i] || ''} onChange={e => {
                      setProductSearches(prev => ({ ...prev, [i]: e.target.value }));
                      if (!e.target.value) setItems(prev => prev.map((it, j) => j === i ? { ...it, productId: '', productName: '' } : it));
                    }} placeholder="Search product..." />
                    {productSearches[i] && !item.productId && (
                      <div className="absolute z-10 w-full border rounded-lg mt-1 max-h-32 overflow-y-auto bg-card shadow-lg">
                        {getProductSuggestions(productSearches[i]).map(p => (
                          <button key={p.id} onClick={() => selectProductForRow(i, p)}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground">{p.name} <span className="text-muted-foreground">₹{p.price}</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setItems(prev => prev.filter((_, j) => j !== i));
                    setProductSearches(prev => { const n = { ...prev }; delete n[i]; return n; });
                  }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
                {item.productId && (
                  <div className="grid grid-cols-4 gap-2">
                    <div><label className="text-[10px] text-muted-foreground">Qty</label><Input type="number" value={item.quantity}
                      onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, quantity: Number(e.target.value) } : it))} className="h-8 text-sm" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Rate</label><Input type="number" value={item.price}
                      onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, price: Number(e.target.value), sellingPrice: Number(e.target.value) } : it))} className="h-8 text-sm" /></div>
                    <div><label className="text-[10px] text-muted-foreground">Disc%</label><Input type="number" value={item.discount}
                      onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, discount: Number(e.target.value) } : it))} className="h-8 text-sm" /></div>
                    <div><label className="text-[10px] text-muted-foreground">GST%</label><Input type="number" value={item.gstPercent}
                      onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, gstPercent: Number(e.target.value) } : it))} className="h-8 text-sm" /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addItemRow} className="mt-2"><Plus className="w-3 h-3 mr-1" /> Add Product</Button>
        </div>

        {/* Misc */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Miscellaneous Charges</label>
          {miscItems.map((m, i) => (
            <div key={i} className="flex gap-2 mb-2 items-end">
              <Input placeholder="Description" value={m.description} className="flex-1"
                onChange={e => setMiscItems(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
              <Input type="number" placeholder="₹" value={m.amount || ''} className="w-24"
                onChange={e => setMiscItems(prev => prev.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} />
              <select value={m.gstRate} className="px-2 py-2 border rounded text-sm bg-card text-foreground w-20"
                onChange={e => setMiscItems(prev => prev.map((x, j) => j === i ? { ...x, gstRate: Number(e.target.value) } : x))}>
                <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option>
                <option value={18}>18%</option><option value={28}>28%</option>
              </select>
              <Button variant="ghost" size="sm" onClick={() => setMiscItems(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setMiscItems(prev => [...prev, { description: '', amount: 0, gstRate: 0 }])}>
            <Plus className="w-3 h-3 mr-1" /> Add Row
          </Button>
        </div>

        {/* Payment */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Payment Status</label>
          <div className="flex gap-2">
            {(['paid', 'partial', 'pending'] as const).map(s => (
              <Button key={s} variant={paymentStatus === s ? 'default' : 'outline'} size="sm"
                className={paymentStatus === s ? (s === 'paid' ? 'bg-emerald-600' : s === 'partial' ? 'bg-amber-600' : 'bg-red-600') : ''}
                onClick={() => setPaymentStatus(s)}>
                {s === 'paid' ? '✅ Paid' : s === 'partial' ? '⚡ Partial' : '⏳ Pending'}
              </Button>
            ))}
          </div>
          {paymentStatus === 'partial' && (
            <Input type="number" placeholder="Amount received" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} className="mt-2" />
          )}
        </div>

        <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
      </div>

      {/* Live Summary */}
      <div className="glass-card p-3 text-right text-sm space-y-1">
        <p className="text-muted-foreground">Subtotal: <strong className="text-foreground">₹{subtotal.toLocaleString('en-IN')}</strong></p>
        {isInterState ? (
          <p className="text-muted-foreground">IGST: <strong className="text-foreground">₹{totalGst.toLocaleString('en-IN')}</strong></p>
        ) : (
          <>
            <p className="text-muted-foreground">CGST: <strong className="text-foreground">₹{(totalGst / 2).toLocaleString('en-IN')}</strong></p>
            <p className="text-muted-foreground">SGST: <strong className="text-foreground">₹{(totalGst / 2).toLocaleString('en-IN')}</strong></p>
          </>
        )}
        <p className="text-foreground font-bold text-base">Grand Total: ₹{grandTotal.toLocaleString('en-IN')}</p>
      </div>

      <div className="flex gap-2">
        <Button onClick={saveInvoice} className="flex-1" disabled={!selectedCustomer || items.filter(i => i.productId).length === 0}>💾 Save Invoice</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
