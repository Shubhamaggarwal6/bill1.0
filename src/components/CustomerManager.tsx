import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, X, Upload } from 'lucide-react';
import type { Customer } from '@/lib/types';
import CustomerProfile from '@/components/CustomerProfile';
import BulkImportDialog from '@/components/BulkImportDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft } from 'lucide-react';

const CUSTOMER_COLUMNS = [
  { key: 'name', label: 'Name', required: true, type: 'string' as const },
  { key: 'phone', label: 'Phone', type: 'string' as const, defaultValue: '' },
  { key: 'gstNumber', label: 'GST Number', type: 'string' as const, defaultValue: '' },
  { key: 'address', label: 'Address', type: 'string' as const, defaultValue: '' },
  { key: 'city', label: 'City', type: 'string' as const, defaultValue: '' },
  { key: 'state', label: 'State', type: 'string' as const, defaultValue: '' },
  { key: 'pincode', label: 'Pincode', type: 'string' as const, defaultValue: '' },
];

const CUSTOMER_SAMPLE = [
  { name: 'Ajay Kumar', phone: '9876543210', gstNumber: '27AABCU9603R1ZM', address: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { name: 'Priya Sharma', phone: '9123456789', gstNumber: '', address: '45 Lajpat Nagar', city: 'Delhi', state: 'Delhi', pincode: '110024' },
];

interface Props {
  readOnly?: boolean;
  filterUserId?: string;
}

export default function CustomerManager({ readOnly, filterUserId }: Props) {
  const { currentUser, customers, invoices, setCustomers } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [viewProfile, setViewProfile] = useState<Customer | null>(null);
  const [newCust, setNewCust] = useState({ name: '', phone: '', gstNumber: '', address: '' });
  const isMobile = useIsMobile();

  const userId = filterUserId || (currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!);
  const myCustomers = customers.filter(c => c.userId === userId);
  const filtered = myCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const handleAdd = () => {
    if (!newCust.name) return;
    setCustomers(prev => [...prev, { id: 'c_' + Date.now(), userId, ...newCust, createdAt: new Date().toISOString().split('T')[0] }]);
    setNewCust({ name: '', phone: '', gstNumber: '', address: '' });
    setShowAdd(false);
  };

  if (viewProfile) {
    return <CustomerProfile customer={viewProfile} onBack={() => setViewProfile(null)} readOnly={readOnly} />;
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Customers</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}><Upload className="w-4 h-4 mr-1" /> {!isMobile && 'Bulk Import'}</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> {!isMobile && 'Customer Add'}</Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Naam ya phone se search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(c => {
            const custInvoices = invoices.filter(i => i.customerId === c.id);
            const pending = custInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.grandTotal, 0);
            return (
              <div key={c.id} className="glass-card p-3 active:bg-muted/50" onClick={() => setViewProfile(c)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <span className={pending > 0 ? 'badge-critical' : 'badge-success'}>
                    {pending > 0 ? `₹${pending.toLocaleString('en-IN')}` : '✅ Clear'}
                  </span>
                </div>
                <div className="border-t mt-2 pt-2 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground truncate">{c.address || 'No address'}</p>
                  <Button size="sm" variant="ghost" className="text-xs h-7 shrink-0" onClick={(e) => { e.stopPropagation(); setViewProfile(c); }}>Profile →</Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi customer nahi mila</p>}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Naam</th>
              <th className="text-left py-2.5 px-3">Phone</th>
              <th className="text-left py-2.5 px-3">GST</th>
              <th className="text-left py-2.5 px-3">Address</th>
              <th className="text-left py-2.5 px-3">Outstanding</th>
              <th className="text-left py-2.5 px-3">Action</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => {
                const custInvoices = invoices.filter(i => i.customerId === c.id);
                const pending = custInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.grandTotal, 0);
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewProfile(c)}>
                    <td className="py-2.5 px-3 font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.phone}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{c.gstNumber || '-'}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{c.address}</td>
                    <td className="py-2.5 px-3">
                      <span className={pending > 0 ? 'text-critical font-medium' : 'text-success'}>
                        {pending > 0 ? `₹${pending.toLocaleString('en-IN')}` : '✅ Clear'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setViewProfile(c); }}>Profile →</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi customer nahi mila</p>}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className={isMobile ? 'fixed inset-0 z-50 bg-card flex flex-col' : 'fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4'}>
          {isMobile ? (
            <>
              <div className="mobile-modal-header">
                <button onClick={() => setShowAdd(false)}><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="font-semibold">Naya Customer</h3>
              </div>
              <div className="mobile-modal-content space-y-4">
                <Input placeholder="Naam" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                <Input placeholder="Phone" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                <Input placeholder="GST Number (optional)" value={newCust.gstNumber} onChange={e => setNewCust({ ...newCust, gstNumber: e.target.value })} />
                <Input placeholder="Address" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
              </div>
              <div className="mobile-modal-footer">
                <Button onClick={handleAdd} className="w-full min-h-[48px]">Save</Button>
              </div>
            </>
          ) : (
            <div className="glass-card w-full max-w-md p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Naya Customer</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Naam" value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                <Input placeholder="Phone" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                <Input placeholder="GST Number (optional)" value={newCust.gstNumber} onChange={e => setNewCust({ ...newCust, gstNumber: e.target.value })} />
                <Input placeholder="Address" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
                <Button onClick={handleAdd} className="w-full">Save</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <BulkImportDialog
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Bulk Customer Import"
        columns={CUSTOMER_COLUMNS}
        sampleData={CUSTOMER_SAMPLE}
        templateFileName="CustomerTemplate"
        onImport={(rows) => {
          const newCustomers = rows.map((r, i) => ({
            id: 'c_bulk_' + Date.now() + '_' + i,
            userId,
            name: r.name,
            phone: r.phone || '',
            gstNumber: r.gstNumber || '',
            address: r.address || '',
            city: r.city || '',
            state: r.state || '',
            pincode: r.pincode || '',
            createdAt: new Date().toISOString().split('T')[0],
          }));
          setCustomers(prev => [...prev, ...newCustomers]);
        }}
      />
    </div>
  );
}
