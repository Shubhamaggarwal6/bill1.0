import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/subscription';
import { printDoc, downloadDocPDF, creditNoteToDocData } from '@/lib/invoiceRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { FileText, Download, Printer, Search, Plus, X, ArrowLeft } from 'lucide-react';
import type { CreditNote, InvoiceItem, Invoice } from '@/lib/types';

export default function CreditNotesList() {
  const { currentUser, users, invoices, products, setProducts, creditNotes, setCreditNotes } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  // Manual form state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [cnDate, setCnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, { checked: boolean; qty: number; rate: number }>>({});
  const [miscItems, setMiscItems] = useState<{ description: string; amount: number; gstRate: number }[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const userId = currentUser?.role === 'employee' ? currentUser.parentUserId! : currentUser?.id!;
  const myCreditNotes = creditNotes.filter(cn => cn.userId === userId);

  const filtered = myCreditNotes.filter(cn => {
    if (statusFilter !== 'all' && cn.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return cn.creditNoteNumber.toLowerCase().includes(q) || cn.customerName.toLowerCase().includes(q);
    }
    return true;
  });

  const firm = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;
  const totalAmount = filtered.reduce((s, cn) => s + cn.total, 0);
  const myInvoices = invoices.filter(i => i.userId === userId);
  const selectedInvoice = myInvoices.find(i => i.id === selectedInvoiceId);

  const filteredInvoices = myInvoices.filter(i => {
    if (!invoiceSearch) return true;
    const q = invoiceSearch.toLowerCase();
    return i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q);
  }).slice(0, 10);

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
      : status === 'adjusted' ? 'bg-primary/10 text-primary' 
      : 'bg-muted text-muted-foreground';
    const label = status === 'active' ? 'Active' : status === 'adjusted' ? 'Adjusted' : 'Cancelled';
    return <span className={`${cls} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>{label}</span>;
  };

  const handlePrint = (cn: CreditNote) => {
    printDoc(creditNoteToDocData(cn), { type: 'credit_note', firm, againstInvoiceNumber: cn.originalInvoiceNumber });
  };
  const handlePDF = async (cn: CreditNote) => {
    await downloadDocPDF(creditNoteToDocData(cn), { type: 'credit_note', firm, againstInvoiceNumber: cn.originalInvoiceNumber });
  };

  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoiceId(inv.id);
    setInvoiceSearch(inv.invoiceNumber + ' - ' + inv.customerName);
    const prods: Record<number, { checked: boolean; qty: number; rate: number }> = {};
    inv.items.forEach((it, i) => { prods[i] = { checked: false, qty: it.quantity, rate: it.price }; });
    setSelectedProducts(prods);
  };

  const getCnSummary = () => {
    let subtotal = 0;
    let gst = 0;
    if (selectedInvoice) {
      Object.entries(selectedProducts).forEach(([idx, p]) => {
        if (p.checked) {
          const item = selectedInvoice.items[Number(idx)];
          const taxable = p.qty * p.rate;
          subtotal += taxable;
          gst += taxable * item.gstPercent / 100;
        }
      });
    }
    miscItems.forEach(m => { subtotal += m.amount; gst += m.amount * m.gstRate / 100; });
    return { subtotal, gst, total: subtotal + gst };
  };

  const saveCreditNote = () => {
    if (!selectedInvoice) return;
    const summary = getCnSummary();
    if (summary.total <= 0) return;

    const cnItems: InvoiceItem[] = [];
    if (selectedInvoice) {
      Object.entries(selectedProducts).forEach(([idx, p]) => {
        if (p.checked) {
          const item = selectedInvoice.items[Number(idx)];
          cnItems.push({ ...item, quantity: p.qty, price: p.rate, sellingPrice: p.rate, mrp: item.mrp });
        }
      });
    }
    miscItems.filter(m => m.amount > 0).forEach(m => {
      cnItems.push({ productId: '', productName: m.description || 'Miscellaneous', hsn: '', quantity: 1, mrp: m.amount, sellingPrice: m.amount, price: m.amount, discount: 0, gstPercent: m.gstRate, unit: 'Piece' });
    });

    const isInterState = selectedInvoice.isInterState;
    const year = new Date().getFullYear();
    const cnNumber = `CN-${year}-${String(myCreditNotes.length + 1).padStart(4, '0')}`;

    const cn: CreditNote = {
      id: crypto.randomUUID(), userId, creditNoteNumber: cnNumber, date: cnDate,
      originalInvoiceId: selectedInvoice.id, originalInvoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId, customerName: selectedInvoice.customerName,
      reason, items: cnItems, subtotal: summary.subtotal,
      cgst: isInterState ? 0 : summary.gst / 2, sgst: isInterState ? 0 : summary.gst / 2,
      igst: isInterState ? summary.gst : 0, total: summary.total, isInterState,
      status: 'active',
      createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };

    // Update inventory for returned products
    setProducts(prev => prev.map(p => {
      const returned = cnItems.find(ci => ci.productId === p.id && ci.productId !== '');
      if (returned) return { ...p, stock: p.stock + returned.quantity };
      return p;
    }));

    setCreditNotes(prev => [...prev, cn]);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedInvoiceId('');
    setInvoiceSearch('');
    setCnDate(new Date().toISOString().split('T')[0]);
    setSelectedProducts({});
    setMiscItems([]);
    setReason('');
    setNotes('');
  };

  if (showForm) {
    const summary = getCnSummary();
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetForm}><ArrowLeft className="w-4 h-4" /></Button>
          <h2 className="text-lg font-bold text-foreground">New Credit Note</h2>
        </div>

        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Select Invoice</label>
            <Input value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setSelectedInvoiceId(''); }}
              placeholder="Search by invoice no or customer..." />
            {!selectedInvoiceId && invoiceSearch && (
              <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto bg-card">
                {filteredInvoices.map(inv => (
                  <button key={inv.id} onClick={() => handleSelectInvoice(inv)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between">
                    <span className="text-foreground">{inv.invoiceNumber} - {inv.customerName}</span>
                    <span className="text-muted-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Date</label>
            <Input type="date" value={cnDate} onChange={e => setCnDate(e.target.value)} />
          </div>

          {selectedInvoice && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Products (select items to return)</label>
              <div className="space-y-2">
                {selectedInvoice.items.map((item, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${selectedProducts[i]?.checked ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedProducts[i]?.checked || false}
                        onChange={e => setSelectedProducts(prev => ({ ...prev, [i]: { ...prev[i], checked: e.target.checked } }))}
                        className="rounded" />
                      <span className="text-sm font-medium text-foreground">{item.productName}</span>
                      <span className="text-xs text-muted-foreground ml-auto">Orig: {item.quantity} {item.unit} @ ₹{item.price}</span>
                    </label>
                    {selectedProducts[i]?.checked && (
                      <div className="flex gap-2 mt-2 ml-6">
                        <div>
                          <label className="text-xs text-muted-foreground">Qty</label>
                          <Input type="number" value={selectedProducts[i]?.qty || ''} className="w-20 h-8 text-sm"
                            onChange={e => setSelectedProducts(prev => ({ ...prev, [i]: { ...prev[i], qty: Number(e.target.value) } }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Rate</label>
                          <Input type="number" value={selectedProducts[i]?.rate || ''} className="w-24 h-8 text-sm"
                            onChange={e => setSelectedProducts(prev => ({ ...prev, [i]: { ...prev[i], rate: Number(e.target.value) } }))} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Miscellaneous Items</label>
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
                <Button variant="ghost" size="sm" onClick={() => setMiscItems(prev => prev.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setMiscItems(prev => [...prev, { description: '', amount: 0, gstRate: 0 }])}>
              <Plus className="w-3 h-3 mr-1" /> Add Row
            </Button>
          </div>

          <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
        </div>

        <div className="glass-card p-3 text-right text-sm space-y-1">
          <p className="text-muted-foreground">Subtotal: <strong className="text-foreground">₹{summary.subtotal.toLocaleString('en-IN')}</strong></p>
          <p className="text-muted-foreground">GST: <strong className="text-foreground">₹{summary.gst.toLocaleString('en-IN')}</strong></p>
          <p className="text-foreground font-bold text-base">Total: ₹{summary.total.toLocaleString('en-IN')}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveCreditNote} className="flex-1" disabled={!selectedInvoice || summary.total <= 0}>Save Credit Note</Button>
          <Button variant="outline" onClick={resetForm}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg md:text-xl font-bold text-foreground">📋 Credit Notes</h2>
        <Button size="sm" className="min-h-[36px]" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Credit Note</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search credit notes..." className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card text-foreground text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="adjusted">Adjusted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Abhi koi credit note nahi hai</p>
          <p className="text-xs text-muted-foreground mt-1">Create credit notes from the chatbot or use the + button above</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map(cn => (
              <div key={cn.id} className="glass-card p-3 md:p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{cn.creditNoteNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{cn.customerName} • {formatDate(cn.date)}</p>
                  {cn.originalInvoiceNumber && <p className="text-xs text-muted-foreground">Against: {cn.originalInvoiceNumber}</p>}
                  {cn.reason && <p className="text-xs text-muted-foreground">{cn.reason}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-bold text-foreground">₹{cn.total.toLocaleString('en-IN')}</p>
                  {statusBadge(cn.status)}
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePrint(cn)}><Printer className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePDF(cn)}><Download className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card p-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Total: {filtered.length} credit notes</span>
            <span className="font-bold text-foreground">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </>
      )}
    </div>
  );
}
