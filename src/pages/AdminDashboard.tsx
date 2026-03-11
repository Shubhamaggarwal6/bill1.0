import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getSubscriptionStatus, formatDate, addDuration } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText, AlertTriangle, TrendingUp, LogOut, Plus, RefreshCw, X, Eye } from 'lucide-react';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import AdminUserProfile from '@/components/AdminUserProfile';
import type { PlanType, SubscriptionDuration, User } from '@/lib/types';

export default function AdminDashboard() {
  const { users, invoices, setUsers, setCurrentUser } = useApp();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showRenew, setShowRenew] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [renewDuration, setRenewDuration] = useState<SubscriptionDuration>('1month');
  const [renewCustomDate, setRenewCustomDate] = useState('');

  const [newUser, setNewUser] = useState({
    username: '', password: '', firmName: '', gstNumber: '', email: '', phone: '',
    plan: 'Basic' as PlanType, maxEmployees: 2,
    duration: '1month' as SubscriptionDuration, customEnd: '',
  });

  const businessUsers = users.filter(u => u.role === 'user');
  const activeUsers = businessUsers.filter(u => u.active && getSubscriptionStatus(u.subscriptionEnd).status !== 'expired');
  const expiringUsers = businessUsers.filter(u => getSubscriptionStatus(u.subscriptionEnd).status === 'critical');
  const expiredUsers = businessUsers.filter(u => getSubscriptionStatus(u.subscriptionEnd).status === 'expired');
  const totalRevenue = invoices.reduce((s, i) => s + i.grandTotal, 0);

  const handleCreateUser = () => {
    const today = new Date().toISOString().split('T')[0];
    const endDate = newUser.duration === 'custom' ? newUser.customEnd : addDuration(today, newUser.duration);
    const id = 'user_' + Date.now();
    setUsers(prev => [...prev, {
      id, username: newUser.username, password: newUser.password, role: 'user' as const,
      firmName: newUser.firmName, gstNumber: newUser.gstNumber, email: newUser.email,
      phone: newUser.phone, plan: newUser.plan, maxEmployees: newUser.maxEmployees,
      subscriptionStart: today, subscriptionEnd: endDate, active: true, showStockToEmployees: false,
    }]);
    setShowCreateUser(false);
    setNewUser({ username: '', password: '', firmName: '', gstNumber: '', email: '', phone: '', plan: 'Basic', maxEmployees: 2, duration: '1month', customEnd: '' });
  };

  const handleRenew = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const newEnd = renewDuration === 'custom' ? renewCustomDate : addDuration(u.subscriptionEnd, renewDuration);
      return { ...u, subscriptionEnd: newEnd };
    }));
    setUsers(prev => prev.map(u => {
      if (u.parentUserId !== userId) return u;
      const parent = prev.find(p => p.id === userId);
      return parent ? { ...u, subscriptionEnd: parent.subscriptionEnd } : u;
    }));
    setShowRenew(null);
  };

  const toggleActive = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-bold text-foreground truncate">BillSaathi Admin</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Super Admin Panel</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentUser(null)} className="text-xs md:text-sm">
          <LogOut className="w-4 h-4 mr-1 md:mr-2" /> <span className="hidden sm:inline">Logout</span>
        </Button>
      </header>

      <main className="p-3 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
        {viewUser ? (
          <AdminUserProfile user={viewUser} onBack={() => setViewUser(null)} />
        ) : (<>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Total Users</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">{businessUsers.length}</p>
          </div>
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Active Users</p>
            <p className="text-lg md:text-2xl font-bold text-success">{activeUsers.length}</p>
          </div>
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Expiring Soon</p>
            <p className="text-lg md:text-2xl font-bold text-critical">{expiringUsers.length}</p>
          </div>
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Expired</p>
            <p className="text-lg md:text-2xl font-bold text-expired">{expiredUsers.length}</p>
          </div>
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Invoices</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">{invoices.length}</p>
          </div>
          <div className="stat-card !p-3 md:!p-5">
            <p className="text-[10px] md:text-xs text-muted-foreground">Revenue</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Expiry Alerts */}
        {(expiringUsers.length > 0 || expiredUsers.length > 0) && (
          <div className="glass-card p-4 md:p-5">
            <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-warning" /> Expiry Alerts
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {expiringUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-critical mb-2">🔴 7 din mein expire:</p>
                  {expiringUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
                      <span className="text-foreground truncate">{u.firmName}</span>
                      <SubscriptionBadge endDate={u.subscriptionEnd} compact />
                    </div>
                  ))}
                </div>
              )}
              {expiredUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-expired mb-2">⛔ Expired:</p>
                  {expiredUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
                      <span className="text-foreground truncate">{u.firmName}</span>
                      <SubscriptionBadge endDate={u.subscriptionEnd} compact />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="glass-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5" /> Sabhi Users
            </h2>
            <Button size="sm" onClick={() => setShowCreateUser(true)}>
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Naya User</span>
            </Button>
          </div>

          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-xs md:text-sm min-w-[640px]">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-2">Firm Name</th>
                  <th className="text-left py-2 px-2">Username</th>
                  <th className="text-left py-2 px-2">Plan</th>
                  <th className="text-left py-2 px-2">Emp</th>
                  <th className="text-left py-2 px-2">Start → End</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businessUsers.map(u => (
                  <tr key={u.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-2 font-medium text-foreground">{u.firmName}</td>
                    <td className="py-2 px-2 text-muted-foreground">{u.username}</td>
                    <td className="py-2 px-2"><span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{u.plan}</span></td>
                    <td className="py-2 px-2 text-muted-foreground">{users.filter(e => e.parentUserId === u.id).length}/{u.maxEmployees}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.subscriptionStart)} → {formatDate(u.subscriptionEnd)}</td>
                    <td className="py-2 px-2"><SubscriptionBadge endDate={u.subscriptionEnd} compact /></td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewUser(u)} className="text-xs h-7 px-2">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(u.id)} className="text-xs h-7 px-2">
                          {u.active ? '🟢' : '🔴'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowRenew(u.id)} className="text-xs h-7 px-2">
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
            <div className="glass-card w-full max-w-lg p-4 md:p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-semibold text-foreground">Naya User Banayein</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateUser(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                <Input placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                <Input placeholder="Firm Name" value={newUser.firmName} onChange={e => setNewUser({ ...newUser, firmName: e.target.value })} className="sm:col-span-2" />
                <Input placeholder="GST Number" value={newUser.gstNumber} onChange={e => setNewUser({ ...newUser, gstNumber: e.target.value })} />
                <Input placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <Input placeholder="Phone" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                <Select value={newUser.plan} onValueChange={v => setNewUser({ ...newUser, plan: v as PlanType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basic">Basic</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-xs text-muted-foreground">Max Employees</label>
                  <Input type="number" value={newUser.maxEmployees} onChange={e => setNewUser({ ...newUser, maxEmployees: Number(e.target.value) })} />
                </div>
                <Select value={newUser.duration} onValueChange={v => setNewUser({ ...newUser, duration: v as SubscriptionDuration })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {newUser.duration === 'custom' && (
                  <Input type="date" value={newUser.customEnd} onChange={e => setNewUser({ ...newUser, customEnd: e.target.value })} />
                )}
                {newUser.duration !== 'custom' && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    End: {addDuration(new Date().toISOString().split('T')[0], newUser.duration)}
                  </div>
                )}
              </div>
              <Button onClick={handleCreateUser} className="w-full mt-4">User Banayein</Button>
            </div>
          </div>
        )}

        {/* Renew Modal */}
        {showRenew && (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
            <div className="glass-card w-full max-w-sm p-4 md:p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-semibold text-foreground">Subscription Renew</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRenew(null)}><X className="w-4 h-4" /></Button>
              </div>
              {(() => {
                const u = users.find(u => u.id === showRenew);
                if (!u) return null;
                const newEnd = renewDuration === 'custom' ? renewCustomDate : addDuration(u.subscriptionEnd, renewDuration);
                return (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">Current End: <span className="text-foreground font-medium">{formatDate(u.subscriptionEnd)}</span></p>
                    <Select value={renewDuration} onValueChange={v => setRenewDuration(v as SubscriptionDuration)}>
                      <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1month">1 Month (+30 din)</SelectItem>
                        <SelectItem value="3months">3 Months (+90 din)</SelectItem>
                        <SelectItem value="6months">6 Months (+180 din)</SelectItem>
                        <SelectItem value="1year">1 Year (+365 din)</SelectItem>
                        <SelectItem value="custom">Custom Date</SelectItem>
                      </SelectContent>
                    </Select>
                    {renewDuration === 'custom' && (
                      <Input type="date" value={renewCustomDate} onChange={e => setRenewCustomDate(e.target.value)} className="mb-3" />
                    )}
                    <p className="text-sm text-muted-foreground mb-4">New End: <span className="text-success font-medium">{newEnd ? formatDate(newEnd) : 'Date select karein'}</span></p>
                    <Button onClick={() => handleRenew(showRenew)} className="w-full">Confirm Renew</Button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        </>)}
      </main>
    </div>
  );
}
