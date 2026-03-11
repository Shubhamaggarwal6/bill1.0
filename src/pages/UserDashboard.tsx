import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSubscriptionStatus, formatDate } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import ChatbotInvoice from '@/components/ChatbotInvoice';
import CustomerManager from '@/components/CustomerManager';
import ProductManager from '@/components/ProductManager';
import ReportsPanel from '@/components/ReportsPanel';
import EmployeeManager from '@/components/EmployeeManager';
import SettingsPanel from '@/components/SettingsPanel';
import InvoiceList from '@/components/InvoiceList';
import PurchaseRegister from '@/components/PurchaseRegister';
import CreditNotesList from '@/components/CreditNotesList';
import DebitNotesList from '@/components/DebitNotesList';
import SupplierManager from '@/components/SupplierManager';
import CollectionsList from '@/components/CollectionsList';
import InvoiceDetailModal from '@/components/InvoiceDetailModal';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard, MessageSquare, Users, Package, BarChart3,
  UserPlus, Settings, LogOut, FileText, AlertTriangle, ClipboardList, ShoppingCart, Menu, X, CreditCard, Receipt, Factory, Wallet
} from 'lucide-react';

type Tab = 'dashboard' | 'chatbot' | 'invoices' | 'collections' | 'credit-notes' | 'debit-notes' | 'customers' | 'products' | 'suppliers' | 'reports' | 'employees' | 'settings' | 'purchases';

export default function UserDashboard() {
  const { currentUser, users, invoices, products, customers, payments, setCurrentUser } = useApp();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const isMobile = useIsMobile();

  if (!currentUser) return null;

  const sub = getSubscriptionStatus(currentUser.subscriptionEnd);
  const myInvoices = invoices.filter(i => i.userId === currentUser.id);
  const myProducts = products.filter(p => p.userId === currentUser.id);
  const today = new Date().toISOString().split('T')[0];
  
  // Today only
  const todayInvoices = myInvoices.filter(i => i.date === today);
  const todaySales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const todayCount = todayInvoices.length;
  const todayPayments = payments.filter(p => p.userId === currentUser.id && p.date === today);
  const todayCollection = todayPayments.reduce((s, p) => s + p.amount, 0);
  const todayPaid = todayInvoices.filter(i => i.status === 'paid').length;

  // Monthly summary
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthInvoices = myInvoices.filter(i => i.date.startsWith(thisMonth));
  const monthRevenue = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const monthPending = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.grandTotal - (i.paidAmount || 0), 0);

  const lowStockProducts = myProducts.filter(p => p.stock <= p.lowStockThreshold);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'chatbot', label: t('createInvoice'), icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'invoices', label: t('invoices'), icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'collections', label: 'Collections', icon: <Wallet className="w-5 h-5" /> },
    { id: 'credit-notes', label: 'Credit Notes', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'debit-notes', label: 'Debit Notes', icon: <Receipt className="w-5 h-5" /> },
    { id: 'customers', label: t('customers'), icon: <Users className="w-5 h-5" /> },
    { id: 'products', label: t('products'), icon: <Package className="w-5 h-5" /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Factory className="w-5 h-5" /> },
    { id: 'purchases', label: t('purchases'), icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'reports', label: t('reports'), icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'employees', label: t('employees'), icon: <UserPlus className="w-5 h-5" /> },
    { id: 'settings', label: t('settings'), icon: <Settings className="w-5 h-5" /> },
  ];

  const bottomNavTabs = tabs.slice(0, 4);
  const moreTabs = tabs.slice(4);

  const switchTab = (id: Tab) => {
    setActiveTab(id);
    setSidebarOpen(false);
    setMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && !isMobile && (
        <div className="fixed inset-0 bg-foreground/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`fixed md:static inset-y-0 left-0 z-50 w-60 sidebar-gradient text-sidebar-foreground flex flex-col shrink-0 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-5 border-b border-sidebar-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-sm text-sidebar-accent-foreground truncate">{currentUser.firmName}</h1>
                <p className="text-xs text-sidebar-foreground/60">{currentUser.plan} {t('plan')}</p>
              </div>
            </div>
            <div className="mt-3">
              <SubscriptionBadge endDate={currentUser.subscriptionEnd} compact />
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50'
                }`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <button onClick={() => setCurrentUser(null)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors">
              <LogOut className="w-4 h-4" /> {t('logout')}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header — no sync badge */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 z-30 bg-card border-b flex items-center h-[60px] px-3" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">BillSaathi</span>
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1 text-center min-w-0 px-2">{currentUser.firmName.length > 20 ? currentUser.firmName.slice(0, 20) + '…' : currentUser.firmName}</p>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => switchTab('settings')} className="p-2 text-muted-foreground min-w-[32px] min-h-[32px] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>
        )}

        {sub.status === 'critical' && (
          <div className={`bg-warning/10 border-b border-warning/20 px-4 md:px-6 py-2 flex items-center gap-2 text-xs md:text-sm ${isMobile ? 'mt-[60px]' : ''}`}>
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <span className="text-warning font-medium">⚠️ {t('subscriptionWarning', { days: String(sub.daysLeft) })}</span>
          </div>
        )}

        <main className={`flex-1 overflow-auto ${isMobile ? 'pt-[60px] pb-[70px]' : 'p-6'}`}>
          <div className={isMobile ? 'p-3' : ''}>
            {activeTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg md:text-xl font-bold text-foreground">{t('dashboard')}</h2>
                
                {/* Today's stats */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">Aaj ki Bikri</p><p className="text-lg md:text-2xl font-bold text-foreground">₹{todaySales.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">Aaj ke Invoice</p><p className="text-lg md:text-2xl font-bold text-foreground">{todayCount}</p></div>
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">Aaj ka Collection</p><p className="text-lg md:text-2xl font-bold text-success">₹{todayCollection.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">Aaj ke Paid</p><p className="text-lg md:text-2xl font-bold text-foreground">{todayPaid}</p></div>
                </div>

                {/* Monthly summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">This Month Revenue</p><p className="text-lg font-bold text-foreground">₹{monthRevenue.toLocaleString('en-IN')}</p></div>
                  <div className="stat-card"><p className="text-[10px] md:text-xs text-muted-foreground">This Month Pending</p><p className="text-lg font-bold text-warning">₹{monthPending.toLocaleString('en-IN')}</p></div>
                </div>

                <div className="glass-card p-4 md:p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2">{t('subscriptionDetails')}</h3>
                  <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                    <div><p className="text-xs text-muted-foreground">{t('plan')}</p><p className="font-medium text-foreground text-sm">{currentUser.plan}</p></div>
                    <div><p className="text-xs text-muted-foreground">{t('endDate')}</p><p className="font-medium text-foreground text-sm">{formatDate(currentUser.subscriptionEnd)}</p></div>
                    <SubscriptionBadge endDate={currentUser.subscriptionEnd} compact />
                  </div>
                </div>

                {/* Recent Invoices — clickable */}
                <div className="glass-card p-4 md:p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{t('recentInvoices')}</h3>
                  {myInvoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noInvoicesYet')}</p>
                  ) : (
                    <div className="space-y-2">
                      {myInvoices.slice(-5).reverse().map(inv => (
                        <button key={inv.id} onClick={() => setViewInvoice(inv)}
                          className="w-full flex items-center justify-between py-2 border-b last:border-0 gap-2 hover:bg-muted/30 rounded px-1 transition-colors text-left">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {inv.customerName} • {formatDate(inv.date)}
                              {inv.createdBy?.timestamp && (
                                <span className="ml-1">• {new Date(inv.createdBy.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-medium text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</p>
                            <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
                              {inv.status === 'paid' ? t('paid') : inv.status === 'partial' ? t('partial') : t('pending')}
                            </span>
                          </div>
                        </button>
                      ))}
                      <button onClick={() => switchTab('invoices')} className="text-xs text-primary hover:underline w-full text-center pt-1">
                        Sab Invoices Dekho →
                      </button>
                    </div>
                  )}
                </div>

                {lowStockProducts.length > 0 && (
                  <div className="glass-card p-4 md:p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" /> {t('lowStockAlerts')}
                    </h3>
                    <div className="space-y-2">
                      {lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
                          <span className="text-foreground truncate">{p.name}</span>
                          <span className="badge-critical shrink-0">{p.stock} {p.unit} {t('remaining')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chatbot' && <ChatbotInvoice />}
            {activeTab === 'invoices' && <InvoiceList />}
            {activeTab === 'collections' && <CollectionsList />}
            {activeTab === 'credit-notes' && <CreditNotesList />}
            {activeTab === 'debit-notes' && <DebitNotesList />}
            {activeTab === 'customers' && <CustomerManager />}
            {activeTab === 'products' && <ProductManager />}
            {activeTab === 'suppliers' && <SupplierManager />}
            {activeTab === 'reports' && <ReportsPanel />}
            {activeTab === 'purchases' && <PurchaseRegister />}
            {activeTab === 'employees' && <EmployeeManager />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </main>
      </div>

      {/* Invoice detail modal from dashboard */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <>
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-around items-stretch h-[60px]">
              {bottomNavTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => switchTab(tab.id)}
                    className={`flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors min-h-[44px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isActive && <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-b" />}
                    {tab.icon}
                    <span className="text-[10px] leading-tight">{tab.label}</span>
                  </button>
                );
              })}
              <button onClick={() => setMoreOpen(true)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[44px] ${moreTabs.some(t => t.id === activeTab) ? 'text-primary' : 'text-muted-foreground'}`}>
                {moreTabs.some(t => t.id === activeTab) && <div className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-b" />}
                <Menu className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{t('more')}</span>
              </button>
            </div>
          </nav>

          {moreOpen && (
            <>
              <div className="fixed inset-0 bg-foreground/30 z-40 animate-fade-in" onClick={() => setMoreOpen(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-lg animate-in slide-in-from-bottom duration-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 pb-6">
                  {moreTabs.map(tab => (
                    <button key={tab.id} onClick={() => switchTab(tab.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl min-h-[44px] transition-colors ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                      {tab.icon}
                      <span className="text-xs font-medium">{tab.label}</span>
                    </button>
                  ))}
                  <button onClick={() => { setMoreOpen(false); setCurrentUser(null); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl text-muted-foreground hover:bg-muted min-h-[44px]">
                    <LogOut className="w-5 h-5" />
                    <span className="text-xs font-medium">{t('logout')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
