import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate, numberToWords } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Phone, MapPin, Building2, Calendar, Pencil, X, Eye, Printer, CreditCard, Plus } from 'lucide-react';
import type { Customer, Invoice, Payment } from '@/lib/types';

interface Props {
  customer: Customer;
  onBack: () => void;
  readOnly?: boolean;
}

export default function CustomerProfile({ customer, onBack, readOnly }: Props) {
  const { currentUser, users, invoices, payments, creditNotes, debitNotes, setInvoices, setPayments } = useApp();
  const [activeTab, setActiveTab] = useState<'invoices' | 'ledger'>('invoices');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash' as Payment['mode'], note: '' });

  const userId = currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!;

  const customerInvoices = useMemo(() => {
    let invs = invoices.filter(i => i.customerId === customer.id);
    if (dateFrom) invs = invs.filter(i => i.date >= dateFrom);
    if (dateTo) invs = invs.filter(i => i.date <= dateTo);
    return invs;
  }, [invoices, customer.id, dateFrom, dateTo]);

  const customerPayments = useMemo(() => {
    let pays = payments.filter(p => p.customerId === customer.id);
    if (dateFrom) pays = pays.filter(p => p.date >= dateFrom);
    if (dateTo) pays = pays.filter(p => p.date <= dateTo);
    return pays;
  }, [payments, customer.id, dateFrom, dateTo]);

  const totalPurchased = customerInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalCreditNotes = creditNotes.filter(cn => cn.customerId === customer.id && cn.status !== 'cancelled').reduce((s, cn) => s + cn.total, 0);
  const totalDebitNotesUnpaid = debitNotes.filter(dn => dn.customerId === customer.id && dn.status === 'active').reduce((s, dn) => s + dn.total, 0);
  const totalPaid = customerPayments.reduce((s, p) => s + p.amount, 0) +
    customerInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
  const totalPending = totalPurchased - totalPaid - totalCreditNotes;
  const lastPurchase = customerInvoices.length > 0 ? customerInvoices.sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const lastPurchaseDays = lastPurchase ? Math.ceil((Date.now() - new Date(lastPurchase.date).getTime()) / 86400000) : null;

  const allEmployees = users.filter(u => u.parentUserId === userId);

  const setQuickRange = (range: string) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    switch (range) {
      case 'this-month': setDateFrom(new Date(y, m, 1).toISOString().split('T')[0]); setDateTo(new Date(y, m + 1, 0).toISOString().split('T')[0]); break;
      case 'last-month': setDateFrom(new Date(y, m - 1, 1).toISOString().split('T')[0]); setDateTo(new Date(y, m, 0).toISOString().split('T')[0]); break;
      case 'this-quarter': { const qm = Math.floor(m / 3) * 3; setDateFrom(new Date(y, qm, 1).toISOString().split('T')[0]); setDateTo(new Date(y, qm + 3, 0).toISOString().split('T')[0]); break; }
      case 'this-year': setDateFrom(new Date(y, 0, 1).toISOString().split('T')[0]); setDateTo(new Date(y, 11, 31).toISOString().split('T')[0]); break;
      case 'all': setDateFrom(''); setDateTo(''); break;
    }
  };

  const handleAddPayment = () => {
    const amt = Number(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) return;
    setPayments(prev => [...prev, {
      id: 'pay_' + Date.now(), userId, customerId: customer.id,
      amount: amt, date: paymentForm.date, mode: paymentForm.mode,
      note: paymentForm.note, timestamp: new Date().toISOString(),
    }]);
    setShowPaymentModal(false);
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash', note: '' });
  };

  const handleStatusChange = (inv: Invoice, newStatus: Invoice['status']) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
    setShowStatusModal(null);
  };

  const customerCreditNotes = useMemo(() => {
    let cns = creditNotes.filter(cn => cn.customerId === customer.id && cn.status !== 'cancelled');
    if (dateFrom) cns = cns.filter(cn => cn.date >= dateFrom);
    if (dateTo) cns = cns.filter(cn => cn.date <= dateTo);
    return cns;
  }, [creditNotes, customer.id, dateFrom, dateTo]);

  const customerDebitNotes = useMemo(() => {
    let dns = debitNotes.filter(dn => dn.customerId === customer.id && dn.status !== 'cancelled');
    if (dateFrom) dns = dns.filter(dn => dn.date >= dateFrom);
    if (dateTo) dns = dns.filter(dn => dn.date <= dateTo);
    return dns;
  }, [debitNotes, customer.id, dateFrom, dateTo]);

  // Ledger entries
  const ledgerEntries = useMemo(() => {
    const entries: { date: string; description: string; debit: number; credit: number; type: 'invoice' | 'payment' | 'credit_note' | 'debit_note'; ref?: string }[] = [];
    customerInvoices.forEach(inv => {
      entries.push({ date: inv.date, description: inv.invoiceNumber, debit: inv.grandTotal, credit: 0, type: 'invoice' });
    });
    customerPayments.forEach(pay => {
      entries.push({ date: pay.date, description: `Payment (${pay.mode})${pay.note ? ' - ' + pay.note : ''}`, debit: 0, credit: pay.amount, type: 'payment' });
    });
    customerCreditNotes.forEach(cn => {
      entries.push({ date: cn.date, description: cn.creditNoteNumber, debit: 0, credit: cn.total, type: 'credit_note', ref: cn.originalInvoiceNumber ? `Against: ${cn.originalInvoiceNumber}` : undefined });
    });
    customerDebitNotes.forEach(dn => {
      entries.push({ date: dn.date, description: dn.debitNoteNumber, debit: dn.total, credit: 0, type: 'debit_note', ref: dn.originalInvoiceNumber ? `Balance: ${dn.originalInvoiceNumber}` : undefined });
    });
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [customerInvoices, customerPayments, customerCreditNotes, customerDebitNotes]);

  const firm = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;

  // Invoice detail modal
  if (viewInvoice) {
    const inv = viewInvoice;
    return (
      <div className="space-y-4 animate-fade-in">
        {readOnly && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-warning" />
            <span className="text-warning font-medium">👁️ Sirf dekhne ka mode — Read Only</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Wapas</Button>
          <h3 className="text-lg font-bold text-foreground">Invoice: {inv.invoiceNumber}</h3>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Date: <span className="text-foreground">{formatDate(inv.date)}</span></p>
              <p className="text-sm text-muted-foreground mt-1">
                {inv.createdBy.role === 'user' ? '👑' : '👷'} Banaya: <span className="text-foreground font-medium">{inv.createdBy.name}</span>
                <span className="text-xs text-muted-foreground ml-1">({inv.createdBy.role === 'user' ? 'Owner' : 'Employee'})</span>
              </p>
              {inv.createdBy.timestamp && (
                <p className="text-xs text-muted-foreground">Banane ka time: {new Date(inv.createdBy.timestamp).toLocaleString('hi-IN')}</p>
              )}
            </div>
            <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
              {inv.status === 'paid' ? '🟢 Paid' : inv.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">Customer:</span> <span className="text-foreground">{inv.customerName}</span></div>
            <div><span className="text-muted-foreground">GST:</span> <span className="text-foreground">{inv.customerGst || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{inv.customerAddress}</span></div>
            {inv.vehicleNumber && <div><span className="text-muted-foreground">Vehicle:</span> <span className="text-foreground">{inv.vehicleNumber}</span></div>}
          </div>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-2 text-left">#</th><th className="p-2 text-left">Product</th><th className="p-2">HSN</th>
                <th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Amount</th>
                <th className="p-2">GST%</th><th className="p-2">GST</th><th className="p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => {
                const amt = item.price * item.quantity;
                const gst = amt * item.gstPercent / 100;
                return (
                  <tr key={i} className="border-b">
                    <td className="p-2">{i + 1}</td><td className="p-2">{item.productName}</td><td className="p-2 text-center">{item.hsn}</td>
                    <td className="p-2 text-center">{item.quantity} {item.unit}</td><td className="p-2 text-center">₹{item.price}</td>
                    <td className="p-2 text-center">₹{amt.toLocaleString('en-IN')}</td><td className="p-2 text-center">{item.gstPercent}%</td>
                    <td className="p-2 text-center">₹{gst.toFixed(2)}</td><td className="p-2 text-center">₹{(amt + gst).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 text-right space-y-1">
            <p className="text-sm text-muted-foreground">Subtotal: ₹{inv.totalAmount.toLocaleString('en-IN')}</p>
            <p className="text-sm text-muted-foreground">GST: ₹{inv.totalGst.toLocaleString('en-IN')}</p>
            <p className="text-lg font-bold text-foreground">Grand Total: ₹{inv.grandTotal.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground italic">{numberToWords(Math.round(inv.grandTotal))} Rupees Only</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { /* print */ }}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => setShowStatusModal(inv)}>✏️ Status Badlo</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {readOnly && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4 text-warning" />
          <span className="text-warning font-medium">👁️ Sirf dekhne ka mode — Read Only</span>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Wapas</Button>

      {/* Profile Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">👤 {customer.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>
              {customer.gstNumber && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> GST: {customer.gstNumber}</span>}
              {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {customer.address}</span>}
              {customer.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Since: {formatDate(customer.createdAt)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Kharida</p>
          <p className="text-xl font-bold text-foreground">₹{totalPurchased.toLocaleString('en-IN')}</p>
          <p className="text-xs text-muted-foreground">(lifetime)</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="text-xl font-bold text-success">₹{totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className={`text-xl font-bold ${totalPending > 0 ? 'text-critical' : 'text-success'}`}>
            {totalPending > 0 ? `₹${totalPending.toLocaleString('en-IN')}` : 'Sab clear ✅'}
          </p>
          {totalPending > 0 && <p className="text-xs text-muted-foreground">(baaki hai)</p>}
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Last Purchase</p>
          <p className="text-xl font-bold text-foreground">{lastPurchaseDays !== null ? `${lastPurchaseDays} din pehle` : 'N/A'}</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="glass-card p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: 'Is Mahine', value: 'this-month' },
              { label: 'Pichle Mahine', value: 'last-month' },
              { label: 'Is Quarter', value: 'this-quarter' },
              { label: 'Is Saal', value: 'this-year' },
              { label: 'Sab', value: 'all' },
            ].map(r => (
              <Button key={r.value} size="sm" variant="outline" className="text-xs h-8" onClick={() => setQuickRange(r.value)}>{r.label}</Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={activeTab === 'invoices' ? 'default' : 'outline'} onClick={() => setActiveTab('invoices')}>Invoice List</Button>
        <Button size="sm" variant={activeTab === 'ledger' ? 'default' : 'outline'} onClick={() => setActiveTab('ledger')}>Ledger Statement</Button>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(true)} className="ml-auto">
            <Plus className="w-3 h-3 mr-1" /> Payment Add Karein
          </Button>
        )}
      </div>

      {/* Invoice Tab */}
      {activeTab === 'invoices' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Invoice No</th>
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-right py-2.5 px-3">Amount</th>
              <th className="text-right py-2.5 px-3">GST</th>
              <th className="text-right py-2.5 px-3">Total</th>
              <th className="text-center py-2.5 px-3">Status</th>
              <th className="text-left py-2.5 px-3">Banaya Kisne</th>
              <th className="text-left py-2.5 px-3">Action</th>
            </tr></thead>
            <tbody>
              {customerInvoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatDate(inv.date)}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">₹{inv.totalGst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
                      {inv.status === 'paid' ? '🟢 Paid' : inv.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${inv.createdBy.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                      {inv.createdBy.role === 'user' ? '👑' : '👷'} {inv.createdBy.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setViewInvoice(inv)}>👁️ Dekho</Button>
                      {!readOnly && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowStatusModal(inv)}>✏️</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customerInvoices.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi invoice nahi mila</p>}
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Description</th>
              <th className="text-right py-2.5 px-3">Debit (-)</th>
              <th className="text-right py-2.5 px-3">Credit (+)</th>
              <th className="text-right py-2.5 px-3">Balance</th>
            </tr></thead>
            <tbody>
              {(() => {
                let balance = 0;
                const rowBg: Record<string, string> = {
                  invoice: '',
                  payment: 'bg-blue-50 dark:bg-blue-950/20',
                  credit_note: 'bg-green-50 dark:bg-green-950/20',
                  debit_note: 'bg-red-50 dark:bg-red-950/20',
                };
                const typeIcon: Record<string, string> = {
                  invoice: '🧾',
                  payment: '💰',
                  credit_note: '📗',
                  debit_note: '📕',
                };
                return ledgerEntries.map((entry, i) => {
                  balance += entry.debit - entry.credit;
                  return (
                    <tr key={i} className={`border-b hover:bg-muted/30 transition-colors ${rowBg[entry.type] || ''}`}>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatDate(entry.date)}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-foreground">{typeIcon[entry.type]} {entry.description}</span>
                        {entry.ref && <p className="text-xs text-muted-foreground">{entry.ref}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-critical">{entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2.5 px-3 text-right text-success">{entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : ''}</td>
                      <td className={`py-2.5 px-3 text-right font-medium ${balance > 0 ? 'text-critical' : 'text-success'}`}>₹{Math.abs(balance).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-medium">
                <td className="py-2.5 px-3" colSpan={2}>Total</td>
                <td className="py-2.5 px-3 text-right text-critical">₹{ledgerEntries.reduce((s, e) => s + e.debit, 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-3 text-right text-success">₹{ledgerEntries.reduce((s, e) => s + e.credit, 0).toLocaleString('en-IN')}</td>
                <td className={`py-2.5 px-3 text-right font-bold ${totalPending > 0 ? 'text-critical' : 'text-success'}`}>
                  ₹{Math.abs(ledgerEntries.reduce((s, e) => s + e.debit - e.credit, 0)).toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
          {ledgerEntries.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi entry nahi</p>}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Add Karein</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input type="number" placeholder="Amount (₹)" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
              <Input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} />
              <Select value={paymentForm.mode} onValueChange={v => setPaymentForm({ ...paymentForm, mode: v as Payment['mode'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Note (optional)" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} />
              <Button onClick={handleAddPayment} className="w-full">Payment Save Karein</Button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">Status Badlo — {showStatusModal.invoiceNumber}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowStatusModal(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {(['paid', 'pending', 'partial'] as const).map(s => (
                <Button
                  key={s}
                  variant={showStatusModal.status === s ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleStatusChange(showStatusModal, s)}
                >
                  {s === 'paid' ? '🟢 Paid' : s === 'partial' ? '🟡 Partial' : '🔴 Pending'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
