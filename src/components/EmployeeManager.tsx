import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, ArrowLeft } from 'lucide-react';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import InvoiceList from '@/components/InvoiceList';
import { useIsMobile } from '@/hooks/use-mobile';

export default function EmployeeManager() {
  const { currentUser, users, invoices, setUsers } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [viewEmployeeInvoices, setViewEmployeeInvoices] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', email: '', phone: '' });
  const isMobile = useIsMobile();

  if (!currentUser) return null;

  const myEmployees = users.filter(u => u.parentUserId === currentUser.id);
  const canAdd = myEmployees.length < currentUser.maxEmployees;

  const handleAdd = () => {
    if (!form.username || !form.password) return;
    setUsers(prev => [...prev, {
      id: 'emp_' + Date.now(), username: form.username, password: form.password,
      role: 'employee' as const, firmName: currentUser.firmName, gstNumber: '',
      email: form.email, phone: form.phone, plan: currentUser.plan, maxEmployees: 0,
      subscriptionStart: currentUser.subscriptionStart, subscriptionEnd: currentUser.subscriptionEnd,
      active: true, parentUserId: currentUser.id, showStockToEmployees: false,
    }]);
    setForm({ username: '', password: '', email: '', phone: '' });
    setShowAdd(false);
  };

  const toggleActive = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  if (viewEmployeeInvoices) {
    const emp = myEmployees.find(e => e.id === viewEmployeeInvoices);
    return (
      <div className="animate-fade-in space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewEmployeeInvoices(null)}>← Wapas</Button>
        <h2 className="text-lg font-bold text-foreground">👷 {emp?.username} ki Invoices</h2>
        <InvoiceList filterEmployeeId={viewEmployeeInvoices} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Employees ({myEmployees.length}/{currentUser.maxEmployees})</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={!canAdd}>
          <Plus className="w-4 h-4 mr-1" /> {!isMobile && 'Employee Add'}
        </Button>
      </div>

      {!canAdd && <p className="text-sm text-warning">Maximum employee limit reach ho gaya hai ({currentUser.maxEmployees})</p>}

      <div className="space-y-3">
        {myEmployees.map(emp => {
          const empInvoices = invoices.filter(i => i.createdBy.id === emp.id);
          const thisMonth = new Date();
          const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
          const thisMonthInvoices = empInvoices.filter(i => i.date >= monthStart);
          const lastInv = empInvoices.length > 0 ? empInvoices.sort((a, b) => b.date.localeCompare(a.date))[0] : null;
          const lastDays = lastInv ? Math.ceil((Date.now() - new Date(lastInv.date).getTime()) / 86400000) : null;

          return (
            <div key={emp.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                    👷 {emp.username}
                    <span className={emp.active ? 'badge-success' : 'badge-critical'}>{emp.active ? 'Active 🟢' : 'Inactive 🔴'}</span>
                  </p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>📧 {emp.email || 'N/A'}</span>
                    <span>📞 {emp.phone || 'N/A'}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>Total: <span className="font-medium text-foreground">{empInvoices.length}</span></span>
                    <span>Month: <span className="font-medium text-foreground">{thisMonthInvoices.length}</span></span>
                    <span>Last: <span className="font-medium text-foreground">{lastDays !== null ? `${lastDays}d` : 'N/A'}</span></span>
                  </div>
                </div>
                {!isMobile && <SubscriptionBadge endDate={currentUser.subscriptionEnd} compact />}
              </div>
              <div className="border-t mt-2 pt-2 flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-xs h-8 min-h-[44px] md:min-h-0" onClick={() => toggleActive(emp.id)}>
                  {emp.active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 min-h-[44px] md:min-h-0" onClick={() => setViewEmployeeInvoices(emp.id)}>
                  Invoices →
                </Button>
              </div>
            </div>
          );
        })}
        {myEmployees.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi employee nahi hai</p>}
      </div>

      {showAdd && (
        <div className={isMobile ? 'fixed inset-0 z-50 bg-card flex flex-col' : 'fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4'}>
          {isMobile ? (
            <>
              <div className="mobile-modal-header">
                <button onClick={() => setShowAdd(false)}><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="font-semibold">Naya Employee</h3>
              </div>
              <div className="mobile-modal-content space-y-4">
                <Input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="mobile-modal-footer">
                <Button onClick={handleAdd} className="w-full min-h-[48px]">Employee Banayein</Button>
              </div>
            </>
          ) : (
            <div className="glass-card w-full max-w-md p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">Naya Employee</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Button onClick={handleAdd} className="w-full">Employee Banayein</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
