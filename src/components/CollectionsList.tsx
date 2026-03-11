import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CollectionsList() {
  const { currentUser, payments, invoices, customers } = useApp();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const isMobile = useIsMobile();

  const userId = currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!;
  const today = new Date().toISOString().split('T')[0];

  const myPayments = useMemo(() => {
    let pays = payments.filter(p => p.userId === userId);
    if (dateFrom) pays = pays.filter(p => p.date >= dateFrom);
    if (dateTo) pays = pays.filter(p => p.date <= dateTo);
    if (modeFilter) pays = pays.filter(p => p.mode === modeFilter);
    if (search) {
      const q = search.toLowerCase();
      pays = pays.filter(p => {
        const cust = customers.find(c => c.id === p.customerId);
        const inv = invoices.find(i => i.id === p.invoiceId);
        return (cust?.name.toLowerCase().includes(q)) || (inv?.invoiceNumber.toLowerCase().includes(q)) || p.note.toLowerCase().includes(q);
      });
    }
    return pays.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [payments, userId, dateFrom, dateTo, modeFilter, search, customers, invoices]);

  const todayPayments = payments.filter(p => p.userId === userId && p.date === today);
  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthPayments = payments.filter(p => p.userId === userId && p.date.startsWith(thisMonth));
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);

  const modeBreakdown = useMemo(() => {
    const modes: Record<string, number> = {};
    todayPayments.forEach(p => { modes[p.mode] = (modes[p.mode] || 0) + p.amount; });
    return modes;
  }, [todayPayments]);

  const modeIcons: Record<string, string> = { Cash: '💵', UPI: '📱', 'Bank Transfer': '🏦', NEFT: '🏦', RTGS: '🏦', Cheque: '🧾' };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Customer', 'Invoice', 'Amount', 'Mode', 'Reference', 'Note'],
      ...myPayments.map(p => {
        const cust = customers.find(c => c.id === p.customerId);
        const inv = invoices.find(i => i.id === p.invoiceId);
        return [p.date, cust?.name || '', inv?.invoiceNumber || '', p.amount, p.mode, '', p.note];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Collections.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">💰 Collections</h2>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Today's Collection</p>
          <p className="text-xl font-bold text-foreground">₹{todayTotal.toLocaleString('en-IN')}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-xl font-bold text-foreground">₹{monthTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Mode breakdown */}
      {Object.keys(modeBreakdown).length > 0 && (
        <div className="glass-card p-3">
          <p className="text-xs text-muted-foreground mb-2">Today by Mode:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(modeBreakdown).map(([mode, amt]) => (
              <div key={mode} className="flex items-center gap-1.5 text-sm">
                <span>{modeIcons[mode] || '💳'}</span>
                <span className="text-muted-foreground">{mode}:</span>
                <span className="font-medium text-foreground">₹{amt.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Customer / Invoice search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {!isMobile && (
          <>
            <div><label className="text-xs text-muted-foreground">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
            <div><label className="text-xs text-muted-foreground">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
          </>
        )}
        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-card text-foreground">
          <option value="">All Modes</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="RTGS">RTGS</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>

      {/* List */}
      {isMobile ? (
        <div className="space-y-2">
          {myPayments.map(p => {
            const cust = customers.find(c => c.id === p.customerId);
            const inv = invoices.find(i => i.id === p.invoiceId);
            return (
              <div key={p.id} className="glass-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{cust?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{inv?.invoiceNumber || ''} • {formatDate(p.date)}</p>
                    <p className="text-xs text-muted-foreground">{modeIcons[p.mode] || ''} {p.mode}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground shrink-0">₹{p.amount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            );
          })}
          {myPayments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi collection nahi mili</p>}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Customer</th>
              <th className="text-left py-2.5 px-3">Invoice</th>
              <th className="text-right py-2.5 px-3">Amount</th>
              <th className="text-left py-2.5 px-3">Mode</th>
              <th className="text-left py-2.5 px-3">Note</th>
            </tr></thead>
            <tbody>
              {myPayments.map(p => {
                const cust = customers.find(c => c.id === p.customerId);
                const inv = invoices.find(i => i.id === p.invoiceId);
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{formatDate(p.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{cust?.name || 'Unknown'}</td>
                    <td className="py-2.5 px-3 text-foreground text-xs">{inv?.invoiceNumber || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-foreground">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-foreground text-xs">{modeIcons[p.mode] || ''} {p.mode}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs truncate max-w-[150px]">{p.note || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {myPayments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi collection nahi mili</p>}
        </div>
      )}
    </div>
  );
}
