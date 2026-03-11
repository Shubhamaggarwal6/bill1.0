import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/subscription';
import { printDoc, downloadDocPDF, debitNoteToDocData } from '@/lib/invoiceRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileText, Download, Printer, Search, Plus, X, ArrowLeft } from 'lucide-react';
import type { DebitNote, InvoiceItem } from '@/lib/types';

export default function DebitNotesList() {
  const { currentUser, users, invoices, customers, debitNotes, setDebitNotes } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  // Manual form state
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [dnDate, setDnDate] = useState(new Date().toISOString().split('T')[0]);
  const [dnItems, setDnItems] = useState<{ description: string; amount: number; gstRate: number }[]>([{ description: '', amount: 0, gstRate: 0 }]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const userId = currentUser?.role === 'employee' ? currentUser.parentUserId! : currentUser?.id!;
  const myDebitNotes = debitNotes.filter(dn => dn.userId === userId);
  const myCustomers = customers.filter(c => c.userId === userId);
  const myInvoices = invoices.filter(i => i.userId === userId);

  const filtered = myDebitNotes.filter(dn => {
    if (statusFilter !== 'all' && dn.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return dn.debitNoteNumber.toLowerCase().includes(q) || dn.customerName.toLowerCase().includes(q);
    }
    return true;
  });

  const firm = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;
  const totalAmount = filtered.reduce((s, dn) => s + dn.total, 0);

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-muted text-muted-foreground';
    const label = status === 'active' ? 'Active' : status === 'paid' ? 'Paid' : 'Cancelled';
    return <span className={`${cls} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>{label}</span>;
  };

  const handlePrint = (dn: DebitNote) => {
    printDoc(debitNoteToDocData(dn), { type: 'debit_note', firm, againstInvoiceNumber: dn.originalInvoiceNumber });
  };
  const handlePDF = async (dn: DebitNote) => {
    await downloadDocPDF(debitNoteToDocData(dn), { type: 'debit_note', firm, againstInvoiceNumber: dn.originalInvoiceNumber });
  };

  const getDnSummary = () => {
    let subtotal = 0;
    let gst = 0;
    dnItems.forEach(m => { subtotal += m.amount; gst += m.amount * m.gstRate / 100; });
    return { subtotal, gst, total: subtotal + gst };
  };

  const saveDebitNote = () => {
    const selectedCustomer = myCustomers.find(c => c.id === customerId);
    if (!selectedCustomer) return;
    const summary = getDnSummary();
    if (summary.total <= 0) return;

    const linkedInv = myInvoices.find(i => i.id === linkedInvoiceId);
    const year = new Date().getFullYear();
    const dnNumber = `DN-${year}-${String(myDebitNotes.length + 1).padStart(4, '0')}`;

    const items: InvoiceItem[] = dnItems.filter(m => m.amount > 0).map(m => ({
      productId: '', productName: m.description || 'Debit', hsn: '', quantity: 1,
      mrp: m.amount, sellingPrice: m.amount, price: m.amount, discount: 0,
      gstPercent: m.gstRate, unit: 'Piece',
    }));

    const dn: DebitNote = {
      id: crypto.randomUUID(), userId, debitNoteNumber: dnNumber, date: dnDate,
      originalInvoiceId: linkedInvoiceId || '', originalInvoiceNumber: linkedInv?.invoiceNumber,
      customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      reason, items, subtotal: summary.subtotal,
      cgst: summary.gst / 2, sgst: summary.gst / 2, igst: 0,
      total: summary.total, isInterState: false, status: 'active',
      createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };

    setDebitNotes(prev => [...prev, dn]);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setCustomerId(''); setCustomerSearch(''); setLinkedInvoiceId(''); setInvoiceSearch('');
    setDnDate(new Date().toISOString().split('T')[0]);
    setDnItems([{ description: '', amount: 0, gstRate: 0 }]);
    setReason(''); setNotes('');
  };

  if (showForm) {
    const summary = getDnSummary();
    const filteredCustomers = myCustomers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
    const filteredInvoices = myInvoices.filter(i => !invoiceSearch || i.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) || i.customerName.toLowerCase().includes(invoiceSearch.toLowerCase())).slice(0, 8);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetForm}><ArrowLeft className="w-4 h-4" /></Button>
          <h2 className="text-lg font-bold text-foreground">New Debit Note</h2>
        </div>

        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Customer</label>
            <Input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setCustomerId(''); }}
              placeholder="Search customer..." />
            {!customerId && customerSearch && (
              <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card">
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground">{c.name} <span className="text-muted-foreground">{c.phone}</span></button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Link to Invoice (optional)</label>
            <Input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setLinkedInvoiceId(''); }}
              placeholder="Search invoice..." />
            {!linkedInvoiceId && invoiceSearch && (
              <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card">
                {filteredInvoices.map(inv => (
                  <button key={inv.id} onClick={() => { setLinkedInvoiceId(inv.id); setInvoiceSearch(inv.invoiceNumber); }}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground">{inv.invoiceNumber} - {inv.customerName}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Date</label>
            <Input type="date" value={dnDate} onChange={e => setDnDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Items</label>
            {dnItems.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2 items-end">
                <Input placeholder="Description" value={m.description} className="flex-1"
                  onChange={e => setDnItems(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <Input type="number" placeholder="₹" value={m.amount || ''} className="w-24"
                  onChange={e => setDnItems(prev => prev.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} />
                <select value={m.gstRate} className="px-2 py-2 border rounded text-sm bg-card text-foreground w-20"
                  onChange={e => setDnItems(prev => prev.map((x, j) => j === i ? { ...x, gstRate: Number(e.target.value) } : x))}>
                  <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option>
                  <option value={18}>18%</option><option value={28}>28%</option>
                </select>
                {dnItems.length > 1 && <Button variant="ghost" size="sm" onClick={() => setDnItems(prev => prev.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setDnItems(prev => [...prev, { description: '', amount: 0, gstRate: 0 }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Row
            </Button>
          </div>

          <Input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
        </div>

        <div className="glass-card p-3 text-right text-sm space-y-1">
          <p className="text-muted-foreground">Subtotal: <strong className="text-foreground">₹{summary.subtotal.toLocaleString('en-IN')}</strong></p>
          <p className="text-muted-foreground">GST: <strong className="text-foreground">₹{summary.gst.toLocaleString('en-IN')}</strong></p>
          <p className="text-foreground font-bold text-base">Total: ₹{summary.total.toLocaleString('en-IN')}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveDebitNote} className="flex-1" disabled={!customerId || summary.total <= 0}>Save Debit Note</Button>
          <Button variant="outline" onClick={resetForm}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg md:text-xl font-bold text-foreground">📋 Debit Notes</h2>
        <Button size="sm" className="min-h-[36px]" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Debit Note</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search debit notes..." className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card text-foreground text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Abhi koi debit note nahi hai</p>
          <p className="text-xs text-muted-foreground mt-1">Debit notes are auto-created for partial/pending payments</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map(dn => (
              <div key={dn.id} className="glass-card p-3 md:p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dn.debitNoteNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{dn.customerName} • {formatDate(dn.date)}</p>
                  {dn.originalInvoiceNumber && <p className="text-xs text-muted-foreground">Against: {dn.originalInvoiceNumber}</p>}
                  {dn.reason && <p className="text-xs text-muted-foreground">{dn.reason}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-bold text-foreground">₹{dn.total.toLocaleString('en-IN')}</p>
                  {statusBadge(dn.status)}
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePrint(dn)}><Printer className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePDF(dn)}><Download className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Total: {filtered.length} debit notes</span>
            <span className="font-bold text-foreground">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </>
      )}
    </div>
  );
}
