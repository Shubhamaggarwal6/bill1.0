import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PurchaseEntry } from '@/lib/types';
import { formatDate } from '@/lib/subscription';
import { Plus, Search, X, Download, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PurchaseRegister() {
  const { currentUser, purchases, setPurchases } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState({
    supplierName: '', supplierGstin: '', invoiceNumber: '', invoiceDate: '',
    taxableAmount: 0, igst: 0, cgst: 0, sgst: 0, description: '',
  });
  const isMobile = useIsMobile();

  const userId = currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!;
  let myPurchases = purchases.filter(p => p.userId === userId);
  if (dateFrom) myPurchases = myPurchases.filter(p => p.invoiceDate >= dateFrom);
  if (dateTo) myPurchases = myPurchases.filter(p => p.invoiceDate <= dateTo);
  if (search) {
    const q = search.toLowerCase();
    myPurchases = myPurchases.filter(p =>
      p.supplierName.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q)
    );
  }

  const totalTaxable = myPurchases.reduce((s, p) => s + p.taxableAmount, 0);
  const totalIgst = myPurchases.reduce((s, p) => s + p.igst, 0);
  const totalCgst = myPurchases.reduce((s, p) => s + p.cgst, 0);
  const totalSgst = myPurchases.reduce((s, p) => s + p.sgst, 0);

  const handleSave = () => {
    if (!form.supplierName || !form.invoiceNumber) return;
    const entry: PurchaseEntry = {
      id: 'pur_' + Date.now(),
      userId,
      ...form,
      timestamp: new Date().toISOString(),
    };
    setPurchases(prev => [...prev, entry]);
    setForm({ supplierName: '', supplierGstin: '', invoiceNumber: '', invoiceDate: '', taxableAmount: 0, igst: 0, cgst: 0, sgst: 0, description: '' });
    setShowAdd(false);
  };

  const exportExcel = () => {
    const rows = [
      ['Date', 'Supplier', 'GSTIN', 'Invoice No', 'Taxable', 'IGST', 'CGST', 'SGST', 'Total', 'Description'],
      ...myPurchases.map(p => [
        p.invoiceDate, p.supplierName, p.supplierGstin, p.invoiceNumber,
        p.taxableAmount, p.igst, p.cgst, p.sgst,
        p.taxableAmount + p.igst + p.cgst + p.sgst, p.description,
      ]),
      ['TOTAL', '', '', '', totalTaxable, totalIgst, totalCgst, totalSgst, totalTaxable + totalIgst + totalCgst + totalSgst, ''],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'PurchaseRegister.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">📦 Purchase Register</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-1" /> {!isMobile && 'CSV'}</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> {!isMobile && 'Purchase Add'}</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Supplier ya invoice search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {!isMobile && (
          <>
            <div><label className="text-xs text-muted-foreground">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
            <div><label className="text-xs text-muted-foreground">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat-card"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-lg font-bold text-foreground">{myPurchases.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">Taxable</p><p className="text-lg font-bold text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">CGST</p><p className="text-lg font-bold text-foreground">₹{totalCgst.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">SGST</p><p className="text-lg font-bold text-foreground">₹{totalSgst.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">IGST</p><p className="text-lg font-bold text-foreground">₹{totalIgst.toLocaleString('en-IN')}</p></div>
      </div>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {myPurchases.map(p => (
            <div key={p.id} className="glass-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.supplierName}</p>
                  <p className="text-xs text-muted-foreground">{p.invoiceNumber} • {formatDate(p.invoiceDate)}</p>
                </div>
                <p className="text-sm font-bold text-foreground shrink-0">₹{(p.taxableAmount + p.igst + p.cgst + p.sgst).toLocaleString('en-IN')}</p>
              </div>
              <div className="border-t mt-2 pt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span>Tax: ₹{p.taxableAmount.toLocaleString('en-IN')}</span>
                {p.cgst > 0 && <span>CGST: ₹{p.cgst}</span>}
                {p.sgst > 0 && <span>SGST: ₹{p.sgst}</span>}
                {p.igst > 0 && <span>IGST: ₹{p.igst}</span>}
              </div>
            </div>
          ))}
          {myPurchases.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi purchase entry nahi mili</p>}
        </div>
      ) : (
        /* Desktop Table */
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Supplier</th>
              <th className="text-left py-2.5 px-3">GSTIN</th>
              <th className="text-left py-2.5 px-3">Invoice No</th>
              <th className="text-left py-2.5 px-3">Taxable</th>
              <th className="text-left py-2.5 px-3">IGST</th>
              <th className="text-left py-2.5 px-3">CGST</th>
              <th className="text-left py-2.5 px-3">SGST</th>
              <th className="text-left py-2.5 px-3">Total</th>
            </tr></thead>
            <tbody>
              {myPurchases.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(p.invoiceDate)}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">{p.supplierName}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{p.supplierGstin || '-'}</td>
                  <td className="py-2.5 px-3 text-foreground">{p.invoiceNumber}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{p.taxableAmount.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{p.igst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{p.cgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{p.sgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">₹{(p.taxableAmount + p.igst + p.cgst + p.sgst).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {myPurchases.length > 0 && (
                <tr className="bg-muted/50 font-semibold">
                  <td colSpan={4} className="py-2.5 px-3 text-foreground">TOTAL</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalIgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalCgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalSgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{(totalTaxable + totalIgst + totalCgst + totalSgst).toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </table>
          {myPurchases.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi purchase entry nahi mili</p>}
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAdd && (
        <div className={isMobile ? 'fixed inset-0 z-50 bg-card flex flex-col' : 'fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4'}>
          {isMobile ? (
            <>
              <div className="mobile-modal-header">
                <button onClick={() => setShowAdd(false)}><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="font-semibold">Nayi Purchase Entry</h3>
              </div>
              <div className="mobile-modal-content space-y-4">
                <Input placeholder="Supplier Name *" value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} />
                <Input placeholder="Supplier GSTIN" value={form.supplierGstin} onChange={e => setForm({ ...form, supplierGstin: e.target.value })} />
                <Input placeholder="Invoice Number *" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                <div><label className="text-xs text-muted-foreground">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full border rounded-md px-3 py-3 text-base bg-card text-foreground" /></div>
                <div><label className="text-xs text-muted-foreground">Taxable Amount (₹)</label><Input type="number" value={form.taxableAmount || ''} onChange={e => setForm({ ...form, taxableAmount: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">IGST (₹)</label><Input type="number" value={form.igst || ''} onChange={e => setForm({ ...form, igst: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">CGST (₹)</label><Input type="number" value={form.cgst || ''} onChange={e => setForm({ ...form, cgst: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">SGST (₹)</label><Input type="number" value={form.sgst || ''} onChange={e => setForm({ ...form, sgst: Number(e.target.value) })} /></div>
                <Input placeholder="Description / Product" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="mobile-modal-footer">
                <Button onClick={handleSave} className="w-full min-h-[48px]">💾 Save Purchase</Button>
              </div>
            </>
          ) : (
            <div className="glass-card w-full max-w-md p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">➕ Nayi Purchase Entry</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Supplier Name *" value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} />
                <Input placeholder="Supplier GSTIN" value={form.supplierGstin} onChange={e => setForm({ ...form, supplierGstin: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Invoice Number *" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                  <div><label className="text-xs text-muted-foreground">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Taxable Amount (₹)</label><Input type="number" value={form.taxableAmount || ''} onChange={e => setForm({ ...form, taxableAmount: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">IGST (₹)</label><Input type="number" value={form.igst || ''} onChange={e => setForm({ ...form, igst: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">CGST (₹)</label><Input type="number" value={form.cgst || ''} onChange={e => setForm({ ...form, cgst: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">SGST (₹)</label><Input type="number" value={form.sgst || ''} onChange={e => setForm({ ...form, sgst: Number(e.target.value) })} /></div>
                </div>
                <Input placeholder="Description / Product" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                <Button onClick={handleSave} className="w-full">💾 Save Purchase</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
