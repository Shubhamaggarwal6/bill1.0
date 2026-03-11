import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, FileText, Users, Package, UserPlus } from 'lucide-react';
import type { User } from '@/lib/types';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import InvoiceList from '@/components/InvoiceList';
import CustomerManager from '@/components/CustomerManager';

interface Props {
  user: User;
  onBack: () => void;
}

type AdminTab = 'info' | 'invoices' | 'customers' | 'products' | 'employees';

export default function AdminUserProfile({ user, onBack }: Props) {
  const { invoices, customers, products, users } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('info');

  const userInvoices = invoices.filter(i => i.userId === user.id);
  const userCustomers = customers.filter(c => c.userId === user.id);
  const userProducts = products.filter(p => p.userId === user.id);
  const userEmployees = users.filter(u => u.parentUserId === user.id);
  const totalRevenue = userInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const pendingAmount = userInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.grandTotal, 0);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'User Info', icon: <FileText className="w-4 h-4" /> },
    { id: 'invoices', label: `Invoices (${userInvoices.length})`, icon: <FileText className="w-4 h-4" /> },
    { id: 'customers', label: `Customers (${userCustomers.length})`, icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: `Products (${userProducts.length})`, icon: <Package className="w-4 h-4" /> },
    { id: 'employees', label: `Employees (${userEmployees.length})`, icon: <UserPlus className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
        <Eye className="w-4 h-4 text-warning" />
        <span className="text-warning font-medium">👁️ Sirf dekhne ka mode — Admin view (Read Only)</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Wapas</Button>
        <h2 className="text-lg font-bold text-foreground">{user.firmName} — {user.username}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(tab => (
          <Button key={tab.id} size="sm" variant={activeTab === tab.id ? 'default' : 'outline'} className="text-xs"
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon}
            <span className="ml-1">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* TAB 1: Info */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Invoices</p><p className="text-xl font-bold text-foreground">{userInvoices.length}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-warning">₹{pendingAmount.toLocaleString('en-IN')}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Customers</p><p className="text-xl font-bold text-foreground">{userCustomers.length}</p></div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">User Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Firm:</span> <span className="text-foreground">{user.firmName}</span></div>
              <div><span className="text-muted-foreground">Username:</span> <span className="text-foreground">{user.username}</span></div>
              <div><span className="text-muted-foreground">GST:</span> <span className="text-foreground">{user.gstNumber || 'N/A'}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{user.email}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{user.phone}</span></div>
              <div><span className="text-muted-foreground">Plan:</span> <span className="text-foreground">{user.plan}</span></div>
              <div><span className="text-muted-foreground">Max Employees:</span> <span className="text-foreground">{user.maxEmployees}</span></div>
              <div><span className="text-muted-foreground">Subscription:</span> <SubscriptionBadge endDate={user.subscriptionEnd} compact /></div>
              <div><span className="text-muted-foreground">Start:</span> <span className="text-foreground">{formatDate(user.subscriptionStart)}</span></div>
              <div><span className="text-muted-foreground">End:</span> <span className="text-foreground">{formatDate(user.subscriptionEnd)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Invoices */}
      {activeTab === 'invoices' && (
        <InvoiceList readOnly filterUserId={user.id} />
      )}

      {/* TAB 3: Customers */}
      {activeTab === 'customers' && (
        <CustomerManager readOnly filterUserId={user.id} />
      )}

      {/* TAB 4: Products */}
      {activeTab === 'products' && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Products ({userProducts.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="text-left py-2">Naam</th><th className="text-left py-2">HSN</th>
                <th className="text-left py-2">Price</th><th className="text-left py-2">Stock</th><th className="text-left py-2">GST%</th>
              </tr></thead>
              <tbody>
                {userProducts.map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 text-foreground">{p.name}</td>
                    <td className="py-2 text-muted-foreground">{p.hsn}</td>
                    <td className="py-2 text-muted-foreground">₹{p.price}</td>
                    <td className="py-2 text-muted-foreground">{p.stock} {p.unit}</td>
                    <td className="py-2 text-muted-foreground">{p.gstPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Employees */}
      {activeTab === 'employees' && (
        <div className="space-y-3">
          {userEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Koi employee nahi hai</p>
          ) : (
            userEmployees.map(emp => {
              const empInvoices = invoices.filter(i => i.createdBy.id === emp.id);
              const thisMonth = new Date();
              const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
              const thisMonthInvoices = empInvoices.filter(i => i.date >= monthStart);
              const lastInv = empInvoices.length > 0 ? empInvoices.sort((a, b) => b.date.localeCompare(a.date))[0] : null;
              const lastDays = lastInv ? Math.ceil((Date.now() - new Date(lastInv.date).getTime()) / 86400000) : null;

              return (
                <div key={emp.id} className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        👷 {emp.username}
                        <span className={emp.active ? 'badge-success' : 'badge-critical'}>{emp.active ? 'Active 🟢' : 'Inactive 🔴'}</span>
                      </p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>Total invoices banaye: {empInvoices.length}</p>
                        <p>Is mahine: {thisMonthInvoices.length}</p>
                        <p>Last invoice: {lastDays !== null ? `${lastDays} din pehle` : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
