import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate, numberToWords } from '@/lib/subscription';
import { printGSTInvoice } from '@/lib/invoicePrint';
import { downloadInvoicePDF, downloadInvoiceExcel, downloadBulkInvoiceExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Eye, Printer, X, Trash2, Pencil, Download, FileText, FileSpreadsheet, Plus, MessageSquare } from 'lucide-react';
import type { Invoice, InvoiceItem, Payment } from '@/lib/types';
import ManualInvoiceForm from '@/components/ManualInvoiceForm';

interface Props {
  readOnly?: boolean;
  filterUserId?: string;
  filterEmployeeId?: string;
}

export default function InvoiceList({ readOnly, filterUserId, filterEmployeeId }: Props) {
  const { currentUser, users, invoices, setInvoices, payments, setPayments, products, setProducts } = useApp();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);
  const [editVehicle, setEditVehicle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [paymentModal, setPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<Payment['mode']>('Cash');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showManualForm, setShowManualForm] = useState(false);

  const userId = filterUserId || (currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!);
  const allEmployees = users.filter(u => u.parentUserId === userId);
  const owner = users.find(u => u.id === userId);

  const filtered = useMemo(() => {
    let invs = invoices.filter(i => i.userId === userId);
    if (filterEmployeeId) invs = invs.filter(i => i.createdBy.id === filterEmployeeId);
    if (search) {
      const q = search.toLowerCase();
      invs = invs.filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    }
    if (dateFrom) invs = invs.filter(i => i.date >= dateFrom);
    if (dateTo) invs = invs.filter(i => i.date <= dateTo);
    if (statusFilter !== 'all') invs = invs.filter(i => i.status === statusFilter);
    if (creatorFilter !== 'all') invs = invs.filter(i => i.createdBy.id === creatorFilter);
    return invs;
  }, [invoices, userId, filterEmployeeId, search, dateFrom, dateTo, statusFilter, creatorFilter]);

  const totalAmount = filtered.reduce((s, i) => s + i.grandTotal, 0);
  const paidAmount = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
  const pendingAmount = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + i.grandTotal, 0);

  const setQuickRange = (range: string) => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    const fmt = (dt: Date) => dt.toISOString().split('T')[0];
    switch (range) {
      case 'aaj': setDateFrom(fmt(now)); setDateTo(fmt(now)); break;
      case 'kal': { const yd = new Date(y, m, d - 1); setDateFrom(fmt(yd)); setDateTo(fmt(yd)); break; }
      case 'is-hafte': { const mon = new Date(now); mon.setDate(d - now.getDay()); setDateFrom(fmt(mon)); setDateTo(fmt(now)); break; }
      case 'pichhle-hafte': { const s = new Date(now); s.setDate(d - now.getDay() - 7); const e = new Date(s); e.setDate(s.getDate() + 6); setDateFrom(fmt(s)); setDateTo(fmt(e)); break; }
      case 'is-mahine': setDateFrom(new Date(y, m, 1).toISOString().split('T')[0]); setDateTo(new Date(y, m + 1, 0).toISOString().split('T')[0]); break;
      case 'pichhle-mahine': setDateFrom(new Date(y, m - 1, 1).toISOString().split('T')[0]); setDateTo(new Date(y, m, 0).toISOString().split('T')[0]); break;
      case 'is-saal': setDateFrom(new Date(y, 0, 1).toISOString().split('T')[0]); setDateTo(fmt(now)); break;
      case 'sab': setDateFrom(''); setDateTo(''); break;
    }
  };

  const handleStatusChange = (inv: Invoice, newStatus: Invoice['status']) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus } : i));
    setShowStatusModal(null);
  };

  const handleDelete = (inv: Invoice) => {
    // Restore stock
    setProducts(prev => prev.map(p => {
      const item = inv.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock + item.quantity } : p;
    }));
    // Remove invoice and associated payments
    setInvoices(prev => prev.filter(i => i.id !== inv.id));
    setPayments(prev => prev.filter(p => p.invoiceId !== inv.id));
    setDeleteConfirm(null);
    setViewInvoice(null);
  };

  const startEdit = (inv: Invoice) => {
    setEditInvoice(inv);
    setEditItems(inv.items.map(i => ({ ...i })));
    setEditVehicle(inv.vehicleNumber);
  };

  const recalcInvoice = (items: InvoiceItem[], inv: Invoice): Partial<Invoice> => {
    const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalGst = items.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent) / 100, 0);
    const rawGrand = totalAmount + totalGst;
    const grandTotal = Math.round(rawGrand);
    const roundOff = Math.round((grandTotal - rawGrand) * 100) / 100;
    const totalCgst = inv.isInterState ? 0 : totalGst / 2;
    const totalSgst = inv.isInterState ? 0 : totalGst / 2;
    const totalIgst = inv.isInterState ? totalGst : 0;
    return { totalAmount, totalGst, totalCgst, totalSgst, totalIgst, grandTotal, roundOff };
  };

  const saveEdit = () => {
    if (!editInvoice) return;
    const calcs = recalcInvoice(editItems, editInvoice);
    // Restore old stock, deduct new
    setProducts(prev => {
      let updated = [...prev];
      for (const oldItem of editInvoice.items) {
        updated = updated.map(p => p.id === oldItem.productId ? { ...p, stock: p.stock + oldItem.quantity } : p);
      }
      for (const newItem of editItems) {
        updated = updated.map(p => p.id === newItem.productId ? { ...p, stock: Math.max(0, p.stock - newItem.quantity) } : p);
      }
      return updated;
    });
    setInvoices(prev => prev.map(i => i.id === editInvoice.id ? { ...i, ...calcs, items: editItems, vehicleNumber: editVehicle } : i));
    if (viewInvoice?.id === editInvoice.id) {
      setViewInvoice({ ...editInvoice, ...calcs as any, items: editItems, vehicleNumber: editVehicle });
    }
    setEditInvoice(null);
  };

  const handleAddPayment = () => {
    if (!paymentModal) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    const payment: Payment = {
      id: 'pay_' + Date.now(),
      userId,
      customerId: paymentModal.customerId,
      invoiceId: paymentModal.id,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      mode: paymentMode,
      note: `Payment for ${paymentModal.invoiceNumber}`,
      timestamp: new Date().toISOString(),
    };
    setPayments(prev => [...prev, payment]);
    const newPaid = (paymentModal.paidAmount || 0) + amt;
    const newStatus = newPaid >= paymentModal.grandTotal ? 'paid' as const : 'partial' as const;
    setInvoices(prev => prev.map(i => i.id === paymentModal.id ? { ...i, status: newStatus, paidAmount: newPaid } : i));
    if (viewInvoice?.id === paymentModal.id) {
      setViewInvoice(prev => prev ? { ...prev, status: newStatus, paidAmount: newPaid } : null);
    }
    setPaymentModal(null);
    setPaymentAmount('');
    setPaymentMode('Cash');
  };

  const invoicePayments = (invId: string) => payments.filter(p => p.invoiceId === invId);

  const firm = owner || currentUser;

  // Invoice detail view
  if (viewInvoice) {
    const inv = viewInvoice;
    const invPayments = invoicePayments(inv.id);
    return (
      <div className="space-y-3 md:space-y-4 animate-fade-in">
        {readOnly && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 md:px-4 py-2 flex items-center gap-2 text-xs md:text-sm">
            <Eye className="w-4 h-4 text-warning" />
            <span className="text-warning font-medium">👁️ Admin View</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)} className="text-xs md:text-sm">← Wapas</Button>
        <div className="glass-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">Invoice: {inv.invoiceNumber}</h3>
              <p className="text-sm text-muted-foreground">Date: {formatDate(inv.date)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {inv.createdBy.role === 'user' ? '👑' : '👷'} Banaya: <span className="font-medium text-foreground">{inv.createdBy.name}</span>
                ({inv.createdBy.role === 'user' ? 'Owner' : 'Employee'})
              </p>
              {inv.createdBy.timestamp && <p className="text-xs text-muted-foreground">Time: {new Date(inv.createdBy.timestamp).toLocaleString('hi-IN')}</p>}
            </div>
            <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
              {inv.status === 'paid' ? '🟢 Paid' : inv.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="text-muted-foreground">Customer:</span> <span className="text-foreground">{inv.customerName}</span></div>
            <div><span className="text-muted-foreground">GST:</span> <span className="text-foreground">{inv.customerGst || 'N/A'}</span></div>
            <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{inv.customerAddress}</span></div>
            {inv.vehicleNumber && <div><span className="text-muted-foreground">Vehicle:</span> <span className="text-foreground">{inv.vehicleNumber}</span></div>}
          </div>
          <table className="w-full text-sm border">
            <thead><tr className="bg-primary text-primary-foreground">
              <th className="p-2 text-left">#</th><th className="p-2 text-left">Product</th><th className="p-2">HSN</th>
              <th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Amount</th>
              <th className="p-2">GST%</th><th className="p-2">GST</th><th className="p-2">Total</th>
            </tr></thead>
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
            {inv.isInterState
              ? <p className="text-sm text-muted-foreground">IGST: ₹{(inv.totalIgst || inv.totalGst).toLocaleString('en-IN')}</p>
              : <>
                  <p className="text-sm text-muted-foreground">CGST: ₹{(inv.totalCgst || inv.totalGst / 2).toLocaleString('en-IN')}</p>
                  <p className="text-sm text-muted-foreground">SGST: ₹{(inv.totalSgst || inv.totalGst / 2).toLocaleString('en-IN')}</p>
                </>
            }
            {inv.roundOff !== 0 && <p className="text-sm text-muted-foreground">Round Off: ₹{inv.roundOff > 0 ? '+' : ''}{inv.roundOff?.toFixed(2)}</p>}
            <p className="text-lg font-bold text-foreground">Grand Total: ₹{inv.grandTotal.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground italic">{numberToWords(Math.round(inv.grandTotal))} Rupees Only</p>
          </div>

          {/* Payment History */}
          {(invPayments.length > 0 || inv.paidAmount > 0) && (
            <div className="mt-4 border-t pt-3">
              <h4 className="text-sm font-semibold text-foreground mb-2">💰 Payment History</h4>
              {invPayments.length > 0 ? (
                <div className="space-y-1">
                  {invPayments.map(p => (
                    <div key={p.id} className="flex justify-between text-xs bg-muted/30 rounded px-3 py-1.5">
                      <span className="text-foreground">₹{p.amount.toLocaleString('en-IN')} — {p.mode}</span>
                      <span className="text-muted-foreground">{formatDate(p.date)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Paid: ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</p>
              )}
              <div className="flex justify-between text-sm mt-2 font-medium">
                <span className="text-foreground">Paid: ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</span>
                <span className="text-destructive">Baaki: ₹{Math.max(0, inv.grandTotal - (inv.paidAmount || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2 flex-wrap text-xs md:text-sm">
            <Button size="sm" variant="outline" onClick={() => {
              const firm = users.find(u => u.id === inv.userId);
              printGSTInvoice(inv, firm);
            }}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            <Button size="sm" variant="outline" className="bg-destructive/10 text-destructive border-destructive/20" onClick={() => {
              const firm = users.find(u => u.id === inv.userId);
              downloadInvoicePDF(inv, firm);
            }}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20" onClick={() => downloadInvoiceExcel(inv)}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const firm = users.find(u => u.id === inv.userId);
              printGSTInvoice(inv, firm, 'all');
            }}><Printer className="w-4 h-4 mr-1" /> 3 Copies</Button>
            {!readOnly && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowStatusModal(inv)}>✏️ Status</Button>
                <Button size="sm" variant="outline" onClick={() => startEdit(inv)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setPaymentModal(inv)}>💰 Payment Add</Button>
                <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(inv)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setViewInvoice(null)}>❌ Close</Button>
          </div>
        </div>

        {/* Modals rendered below */}
        {renderStatusModal()}
        {renderDeleteModal()}
        {renderEditModal()}
        {renderPaymentModal()}
      </div>
    );
  }

  // --- Modal renderers ---
  function renderStatusModal() {
    if (!showStatusModal) return null;
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Status Badlo — {showStatusModal.invoiceNumber}</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowStatusModal(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {(['paid', 'pending', 'partial'] as const).map(s => (
              <Button key={s} variant={showStatusModal.status === s ? 'default' : 'outline'} className="w-full justify-start"
                onClick={() => handleStatusChange(showStatusModal, s)}>
                {s === 'paid' ? '🟢 Paid' : s === 'partial' ? '🟡 Partial' : '🔴 Pending'}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteModal() {
    if (!deleteConfirm) return null;
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">⚠️ Invoice Delete Karein?</h3>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}><X className="w-4 h-4" /></Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Kya aap sure hain ki <span className="font-bold text-foreground">{deleteConfirm.invoiceNumber}</span> delete karna hai?
            <br />Customer: {deleteConfirm.customerName} | Total: ₹{deleteConfirm.grandTotal.toLocaleString('en-IN')}
            <br /><span className="text-destructive text-xs">⚠️ Yeh action undo nahi hoga. Stock wapas aa jayega.</span>
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>
              <Trash2 className="w-4 h-4 mr-1" /> Haan, Delete Karo
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Nahi</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderEditModal() {
    if (!editInvoice) return null;
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">✏️ Invoice Edit — {editInvoice.invoiceNumber}</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditInvoice(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="mb-3">
            <label className="text-xs text-muted-foreground">Vehicle Number</label>
            <Input value={editVehicle} onChange={e => setEditVehicle(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-semibold">Products:</label>
            {editItems.map((item, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{item.productName}</span>
                  <Button size="sm" variant="ghost" className="text-destructive h-6" onClick={() => {
                    setEditItems(prev => prev.filter((_, idx) => idx !== i));
                  }}><Trash2 className="w-3 h-3" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Qty</label>
                    <Input type="number" value={item.quantity} className="h-7 text-xs"
                      onChange={e => {
                        const qty = Number(e.target.value) || 0;
                        setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: qty } : it));
                      }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Price (₹)</label>
                    <Input type="number" value={item.price} className="h-7 text-xs"
                      onChange={e => {
                        const price = Number(e.target.value) || 0;
                        setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, price } : it));
                      }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">GST %</label>
                    <Input type="number" value={item.gstPercent} className="h-7 text-xs"
                      onChange={e => {
                        const gst = Number(e.target.value) || 0;
                        setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, gstPercent: gst } : it));
                      }} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  Amount: ₹{(item.price * item.quantity).toLocaleString('en-IN')} + GST ₹{(item.price * item.quantity * item.gstPercent / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          {editItems.length > 0 && (
            <div className="mt-3 text-right text-sm">
              {(() => {
                const calcs = recalcInvoice(editItems, editInvoice);
                return (
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Subtotal: ₹{calcs.totalAmount?.toLocaleString('en-IN')}</p>
                    <p className="text-muted-foreground">GST: ₹{calcs.totalGst?.toLocaleString('en-IN')}</p>
                    <p className="font-bold text-foreground">Grand Total: ₹{calcs.grandTotal?.toLocaleString('en-IN')}</p>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button className="flex-1" onClick={saveEdit} disabled={editItems.length === 0}>✅ Save Changes</Button>
            <Button variant="outline" className="flex-1" onClick={() => setEditInvoice(null)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  function renderPaymentModal() {
    if (!paymentModal) return null;
    const remaining = paymentModal.grandTotal - (paymentModal.paidAmount || 0);
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">💰 Payment Add — {paymentModal.invoiceNumber}</h3>
            <Button variant="ghost" size="sm" onClick={() => setPaymentModal(null)}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grand Total:</span>
              <span className="text-foreground font-medium">₹{paymentModal.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="text-foreground">₹{(paymentModal.paidAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-muted-foreground">Baaki:</span>
              <span className="text-destructive">₹{remaining.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount (₹)</label>
              <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                placeholder={`Max ₹${remaining.toLocaleString('en-IN')}`} className="h-9" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Payment Mode</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(['Cash', 'UPI', 'Bank Transfer', 'RTGS', 'Cheque'] as const).map(mode => (
                  <Button key={mode} size="sm" variant={paymentMode === mode ? 'default' : 'outline'} className="text-xs h-8"
                    onClick={() => setPaymentMode(mode)}>
                    {mode === 'Cash' ? '💵' : mode === 'UPI' ? '📱' : mode === 'Cheque' ? '📝' : '🏦'} {mode}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleAddPayment}
              disabled={!paymentAmount || Number(paymentAmount) <= 0}>
              ✅ Payment Save Karo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showManualForm) {
    return <ManualInvoiceForm onClose={() => setShowManualForm(false)} />;
  }

  return (
    <div className="animate-fade-in space-y-3 md:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg md:text-xl font-bold text-foreground">📋 Invoices</h2>
        {!readOnly && (
          <Button size="sm" className="min-h-[36px]" onClick={() => setShowManualForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Manually Banao
          </Button>
        )}
      </div>

      {readOnly && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 md:px-4 py-2 flex items-center gap-2 text-xs md:text-sm">
          <Eye className="w-4 h-4 text-warning shrink-0" />
          <span className="text-warning font-medium">👁️ Admin View — Sirf dekhne ka mode</span>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-3 md:p-4 space-y-2 md:space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Invoice no ya customer search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 md:gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] md:text-xs text-muted-foreground">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] md:text-xs text-muted-foreground">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-24 md:w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          {!filterEmployeeId && (
            <Select value={creatorFilter} onValueChange={setCreatorFilter}>
              <SelectTrigger className="w-28 md:w-40 h-8 text-xs"><SelectValue placeholder="Kisne" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sabhi</SelectItem>
                {owner && <SelectItem value={owner.id}>👑 {owner.firmName}</SelectItem>}
                {allEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>👷 {emp.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { label: 'Aaj', value: 'aaj' }, { label: 'Kal', value: 'kal' },
            { label: 'Is Hafte', value: 'is-hafte' }, { label: 'Pichhle Hafte', value: 'pichhle-hafte' },
            { label: 'Is Mahine', value: 'is-mahine' }, { label: 'Pichhle Mahine', value: 'pichhle-mahine' },
            { label: 'Is Saal', value: 'is-saal' }, { label: 'Sab', value: 'sab' },
          ].map(r => (
            <Button key={r.value} size="sm" variant="ghost" className="text-[10px] md:text-xs h-6 md:h-7 px-2" onClick={() => setQuickRange(r.value)}>{r.label}</Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} invoices mili</p>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-primary font-medium self-center">{selectedIds.size} selected</span>
              <Button size="sm" variant="outline" className="text-xs h-7 bg-green-500/10 text-green-600 border-green-500/20" onClick={() => {
                const sel = filtered.filter(i => selectedIds.has(i.id));
                downloadBulkInvoiceExcel(sel, dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : undefined);
              }}><FileSpreadsheet className="w-3 h-3 mr-1" /> Export</Button>
            </>
          )}
          <Button size="sm" variant="outline" className="text-xs h-7 bg-green-500/10 text-green-600 border-green-500/20" onClick={() => downloadBulkInvoiceExcel(filtered)}>
            <Download className="w-3 h-3 mr-1" /> All Excel
          </Button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {filtered.map((inv) => (
          <div key={inv.id} className="glass-card p-3 cursor-pointer active:bg-muted/50" onClick={() => setViewInvoice(inv)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{inv.customerName}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(inv.date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</p>
                <span className={`text-[10px] ${inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}`}>
                  {inv.status === 'paid' ? '🟢 Paid' : inv.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
                </span>
              </div>
            </div>
            {inv.grandTotal - (inv.paidAmount || 0) > 0 && inv.status !== 'paid' && (
              <p className="text-[10px] text-destructive mt-1">Baaki: ₹{(inv.grandTotal - (inv.paidAmount || 0)).toLocaleString('en-IN')}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi invoice nahi mila</p>}
      </div>

      {/* Desktop Table View */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="py-2.5 px-2 w-8">
                <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedIds(new Set(filtered.map(i => i.id)));
                    else setSelectedIds(new Set());
                  }} />
              </th>
              <th className="text-left py-2.5 px-3">#</th>
              <th className="text-left py-2.5 px-3">Invoice No</th>
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Customer</th>
              <th className="text-right py-2.5 px-3">Total</th>
              <th className="text-right py-2.5 px-3">Paid</th>
              <th className="text-right py-2.5 px-3">Baaki</th>
              <th className="text-center py-2.5 px-3">Status</th>
              <th className="text-left py-2.5 px-3">Banaya</th>
              <th className="text-left py-2.5 px-3">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((inv, idx) => (
                <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewInvoice(inv)}>
                  <td className="py-2.5 px-2" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={(checked) => {
                      setSelectedIds(prev => { const next = new Set(prev); if (checked) next.add(inv.id); else next.delete(inv.id); return next; });
                    }} />
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatDate(inv.date)}</td>
                  <td className="py-2.5 px-3 text-foreground">{inv.customerName}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-foreground">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right text-sm text-destructive">₹{Math.max(0, inv.grandTotal - (inv.paidAmount || 0)).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
                      {inv.status === 'paid' ? '🟢' : inv.status === 'partial' ? '🟡' : '🔴'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${inv.createdBy.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-accent-foreground'}`}>
                      {inv.createdBy.role === 'user' ? '👑' : '👷'} {inv.createdBy.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setViewInvoice(inv)}>👁️</Button>
                      {!readOnly && (
                        <>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => startEdit(inv)}><Pencil className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setPaymentModal(inv)}>💰</Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => setDeleteConfirm(inv)}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi invoice nahi mila</p>}
      </div>

      {/* Summary Row */}
      <div className="glass-card p-3 md:p-4 flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm">
        <span className="text-muted-foreground">Total: <span className="font-bold text-foreground">{filtered.length}</span></span>
        <span className="text-muted-foreground">Amount: <span className="font-bold text-foreground">₹{totalAmount.toLocaleString('en-IN')}</span></span>
        <span className="text-muted-foreground">Paid: <span className="font-bold text-success">₹{paidAmount.toLocaleString('en-IN')}</span></span>
        <span className="text-muted-foreground">Pending: <span className="font-bold text-critical">₹{pendingAmount.toLocaleString('en-IN')}</span></span>
      </div>

      {/* All Modals */}
      {renderStatusModal()}
      {renderDeleteModal()}
      {renderEditModal()}
      {renderPaymentModal()}
    </div>
  );
}
