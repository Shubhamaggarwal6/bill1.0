import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Search, X, ArrowLeft, Download, Trash2, Eye } from 'lucide-react';
import type { Supplier } from '@/lib/types';

export default function SupplierManager() {
  const { currentUser, suppliers, setSuppliers, purchases } = useApp();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', gstNumber: '', address: '', city: '', state: '', pin: '',
    bankName: '', bankAccount: '', bankIfsc: '', openingBalance: 0,
  });

  const userId = currentUser?.role === 'employee' ? currentUser.parentUserId! : currentUser?.id!;
  const mySuppliers = suppliers.filter(s => s.userId === userId);
  const filtered = search
    ? mySuppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()) || s.gstNumber.toLowerCase().includes(search.toLowerCase()))
    : mySuppliers;

  const myPurchases = purchases.filter(p => p.userId === userId);

  const getSupplierTotal = (supplierName: string) => {
    return myPurchases.filter(p => p.supplierName === supplierName).reduce((s, p) => s + p.taxableAmount + p.igst + p.cgst + p.sgst, 0);
  };

  const getLastPurchaseDate = (supplierName: string) => {
    const sp = myPurchases.filter(p => p.supplierName === supplierName).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
    return sp.length > 0 ? sp[0].invoiceDate : null;
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const supplier: Supplier = {
      id: editingId || crypto.randomUUID(),
      userId,
      name: form.name, phone: form.phone, email: form.email,
      gstNumber: form.gstNumber, address: form.address, city: form.city,
      state: form.state, pin: form.pin,
      bankName: form.bankName, bankAccount: form.bankAccount, bankIfsc: form.bankIfsc,
      openingBalance: form.openingBalance,
    };
    if (editingId) {
      setSuppliers(prev => prev.map(s => s.id === editingId ? supplier : s));
    } else {
      setSuppliers(prev => [...prev, supplier]);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', gstNumber: '', address: '', city: '', state: '', pin: '', bankName: '', bankAccount: '', bankIfsc: '', openingBalance: 0 });
    setShowForm(false);
    setEditingId(null);
  };

  const editSupplier = (s: Supplier) => {
    setForm({
      name: s.name, phone: s.phone, email: s.email, gstNumber: s.gstNumber,
      address: s.address, city: s.city, state: s.state, pin: s.pin,
      bankName: s.bankName, bankAccount: s.bankAccount, bankIfsc: s.bankIfsc,
      openingBalance: s.openingBalance,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const viewingSupplier = viewingId ? mySuppliers.find(s => s.id === viewingId) : null;

  if (viewingSupplier) {
    const supplierPurchases = myPurchases.filter(p => p.supplierName === viewingSupplier.name);
    const totalPurchased = supplierPurchases.reduce((s, p) => s + p.taxableAmount + p.igst + p.cgst + p.sgst, 0);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setViewingId(null)} className="min-h-[36px]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-lg font-bold text-foreground">{viewingSupplier.name}</h2>
        </div>

        <div className="glass-card p-4 space-y-2">
          {viewingSupplier.gstNumber && <p className="text-sm text-muted-foreground">GST: {viewingSupplier.gstNumber}</p>}
          {viewingSupplier.phone && <p className="text-sm text-muted-foreground">📞 {viewingSupplier.phone}</p>}
          {viewingSupplier.email && <p className="text-sm text-muted-foreground">✉️ {viewingSupplier.email}</p>}
          {viewingSupplier.address && <p className="text-sm text-muted-foreground">📍 {viewingSupplier.address}{viewingSupplier.city ? `, ${viewingSupplier.city}` : ''}</p>}
          <div className="flex gap-4 pt-2">
            <div><p className="text-xs text-muted-foreground">Total Purchased</p><p className="text-lg font-bold text-foreground">₹{totalPurchased.toLocaleString('en-IN')}</p></div>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Purchase History</h3>
          {supplierPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {supplierPurchases.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate)).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.invoiceDate)}</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">₹{(p.taxableAmount + p.igst + p.cgst + p.sgst).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetForm} className="min-h-[36px]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-lg font-bold text-foreground">{editingId ? 'Edit' : 'Add'} Supplier</h2>
        </div>
        <div className="glass-card p-4 space-y-3">
          <Input placeholder="Supplier Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input placeholder="GST Number" value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} />
          <Input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input placeholder="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            <Input placeholder="PIN" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
          </div>
          <p className="text-xs font-medium text-muted-foreground pt-2">Bank Details</p>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Bank Name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
            <Input placeholder="Account No" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
            <Input placeholder="IFSC" value={form.bankIfsc} onChange={e => setForm(f => ({ ...f, bankIfsc: e.target.value }))} />
          </div>
          <Input type="number" placeholder="Opening Balance" value={form.openingBalance || ''} onChange={e => setForm(f => ({ ...f, openingBalance: Number(e.target.value) }))} />
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 min-h-[44px]">💾 Save Supplier</Button>
            <Button variant="outline" onClick={resetForm} className="min-h-[44px]">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-foreground">🏭 Suppliers</h2>
        <Button onClick={() => setShowForm(true)} size="sm" className="min-h-[36px]">
          <Plus className="w-4 h-4 mr-1" /> Add Supplier
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">No suppliers yet</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="mt-3 min-h-[36px]">
            <Plus className="w-4 h-4 mr-1" /> Add First Supplier
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const total = getSupplierTotal(s.name);
            const lastDate = getLastPurchaseDate(s.name);
            return (
              <div key={s.id} onClick={() => setViewingId(s.id)}
                className="glass-card p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.phone || ''}{s.gstNumber ? ` • ${s.gstNumber}` : ''}{s.city ? ` • ${s.city}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">₹{total.toLocaleString('en-IN')}</p>
                  {lastDate && <p className="text-xs text-muted-foreground">{formatDate(lastDate)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Total Suppliers: {filtered.length}</p>
      </div>
    </div>
  );
}
