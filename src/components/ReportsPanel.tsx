import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  downloadGSTR1Excel, downloadGSTR3BPDF, downloadMonthlyExcel,
  downloadOutstandingExcel, downloadStockExcel, downloadPurchaseExcel, downloadCAPackage,
} from '@/lib/exportUtils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['hsl(232,80%,30%)', 'hsl(37,95%,55%)', 'hsl(142,70%,40%)', 'hsl(0,72%,51%)', 'hsl(230,10%,45%)'];

export default function ReportsPanel() {
  const { currentUser, users, invoices, products, customers, payments, purchases } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportTab, setReportTab] = useState<'overview' | 'gstr1' | 'gstr3b' | 'monthly' | 'outstanding' | 'profit'>('overview');
  const isMobile = useIsMobile();

  const userId = currentUser?.id!;
  const firmUser = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;

  let myInvoices = invoices.filter(i => i.userId === userId);
  if (dateFrom) myInvoices = myInvoices.filter(i => i.date >= dateFrom);
  if (dateTo) myInvoices = myInvoices.filter(i => i.date <= dateTo);
  const myProducts = products.filter(p => p.userId === userId);
  const myCustomers = customers.filter(c => c.userId === userId);
  const myPayments = payments.filter(p => p.userId === userId);
  const myPurchases = purchases.filter(p => p.userId === userId);

  const totalTaxable = myInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCgst = myInvoices.reduce((s, i) => s + (i.totalCgst || i.totalGst / 2), 0);
  const totalSgst = myInvoices.reduce((s, i) => s + (i.totalSgst || i.totalGst / 2), 0);
  const totalIgst = myInvoices.reduce((s, i) => s + (i.totalIgst || 0), 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  const totalInvValue = myInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = myPayments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalInvValue - totalPaid;

  const b2bInvoices = myInvoices.filter(i => i.customerGst);
  const b2cInvoices = myInvoices.filter(i => !i.customerGst);
  const b2clInvoices = b2cInvoices.filter(i => i.isInterState && i.grandTotal > 250000);
  const b2csInvoices = b2cInvoices.filter(i => !(i.isInterState && i.grandTotal > 250000));

  const dailySales = myInvoices.reduce((acc, inv) => {
    acc[inv.date] = (acc[inv.date] || 0) + inv.grandTotal;
    return acc;
  }, {} as Record<string, number>);
  const chartData = Object.entries(dailySales).sort().map(([date, total]) => ({ date: formatDate(date), total }));

  const rateWise: Record<number, { count: number; taxable: number; cgst: number; sgst: number; igst: number }> = {};
  myInvoices.forEach(inv => {
    inv.items.forEach(it => {
      if (!rateWise[it.gstPercent]) rateWise[it.gstPercent] = { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      const taxable = it.price * it.quantity;
      const gstAmt = taxable * it.gstPercent / 100;
      rateWise[it.gstPercent].taxable += taxable;
      if (inv.isInterState) rateWise[it.gstPercent].igst += gstAmt;
      else { rateWise[it.gstPercent].cgst += gstAmt / 2; rateWise[it.gstPercent].sgst += gstAmt / 2; }
    });
    if (!rateWise[inv.items[0]?.gstPercent]) return;
    rateWise[inv.items[0]?.gstPercent].count++;
  });

  const hsnSummary: Record<string, { hsn: string; desc: string; unit: string; qty: number; value: number; taxable: number; rate: number; cgst: number; sgst: number; igst: number }> = {};
  myInvoices.forEach(inv => inv.items.forEach(it => {
    const key = `${it.hsn}_${it.gstPercent}`;
    const taxable = it.price * it.quantity;
    const gst = taxable * it.gstPercent / 100;
    if (!hsnSummary[key]) hsnSummary[key] = { hsn: it.hsn, desc: it.productName, unit: it.unit, qty: 0, value: 0, taxable: 0, rate: it.gstPercent, cgst: 0, sgst: 0, igst: 0 };
    hsnSummary[key].qty += it.quantity;
    hsnSummary[key].value += taxable + gst;
    hsnSummary[key].taxable += taxable;
    if (inv.isInterState) hsnSummary[key].igst += gst;
    else { hsnSummary[key].cgst += gst / 2; hsnSummary[key].sgst += gst / 2; }
  }));

  const productCounts: Record<string, number> = {};
  myInvoices.forEach(inv => inv.items.forEach(item => { productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity; }));
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const customerTotals: Record<string, number> = {};
  myInvoices.forEach(inv => { customerTotals[inv.customerName] = (customerTotals[inv.customerName] || 0) + inv.grandTotal; });
  const topCustomers = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const outstandingByCustomer = myCustomers.map(c => {
    const custInvoices = myInvoices.filter(i => i.customerId === c.id);
    const custPayments = myPayments.filter(p => p.customerId === c.id);
    const totalBill = custInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = custPayments.reduce((s, p) => s + p.amount, 0);
    const pending = totalBill - totalPaid;
    const oldestPending = custInvoices.filter(i => i.status !== 'paid').sort((a, b) => a.date.localeCompare(b.date))[0];
    const daysOld = oldestPending ? Math.ceil((Date.now() - new Date(oldestPending.date).getTime()) / 86400000) : 0;
    return { ...c, totalBill, totalPaid, pending, daysOld, oldestInvoice: oldestPending?.invoiceNumber || '' };
  }).filter(c => c.pending > 0).sort((a, b) => b.pending - a.pending);

  const purchaseIgst = myPurchases.reduce((s, p) => s + p.igst, 0);
  const purchaseCgst = myPurchases.reduce((s, p) => s + p.cgst, 0);
  const purchaseSgst = myPurchases.reduce((s, p) => s + p.sgst, 0);

  const pieData = [
    { name: 'B2B', value: b2bInvoices.reduce((s, i) => s + i.grandTotal, 0) },
    { name: 'B2C', value: b2cInvoices.reduce((s, i) => s + i.grandTotal, 0) },
  ].filter(d => d.value > 0);

  const ratePieData = Object.entries(rateWise).map(([rate, d]) => ({
    name: `${rate}%`, value: d.cgst + d.sgst + d.igst,
  })).filter(d => d.value > 0);

  const agingPieData = [
    { name: '0-30 din', value: outstandingByCustomer.filter(c => c.daysOld <= 30).reduce((s, c) => s + c.pending, 0), color: 'hsl(142,70%,40%)' },
    { name: '31-60 din', value: outstandingByCustomer.filter(c => c.daysOld > 30 && c.daysOld <= 60).reduce((s, c) => s + c.pending, 0), color: 'hsl(37,95%,55%)' },
    { name: '61-90 din', value: outstandingByCustomer.filter(c => c.daysOld > 60 && c.daysOld <= 90).reduce((s, c) => s + c.pending, 0), color: 'hsl(0,72%,51%)' },
    { name: '90+ din', value: outstandingByCustomer.filter(c => c.daysOld > 90).reduce((s, c) => s + c.pending, 0), color: '#9e9e9e' },
  ].filter(d => d.value > 0);

  const [caProgress, setCaProgress] = useState<string | null>(null);

  const handleDownloadGSTR1 = () => downloadGSTR1Excel(myInvoices, firmUser);
  const handleDownloadGSTR3B = () => downloadGSTR3BPDF(firmUser, { taxable: totalTaxable, igst: totalIgst, cgst: totalCgst, sgst: totalSgst }, { igst: purchaseIgst, cgst: purchaseCgst, sgst: purchaseSgst });
  const handleDownloadMonthly = () => downloadMonthlyExcel(myInvoices, myCustomers, myProducts, myPayments, firmUser);
  const handleDownloadOutstanding = () => downloadOutstandingExcel(myCustomers, myInvoices, myPayments);
  const handleDownloadStock = () => downloadStockExcel(myProducts);
  const handleDownloadPurchases = () => downloadPurchaseExcel(myPurchases);
  const handleDownloadCA = async () => {
    setCaProgress('Taiyaar ho raha hai...');
    await downloadCAPackage(
      myInvoices, myCustomers, myProducts, myPayments, myPurchases, firmUser,
      { taxable: totalTaxable, igst: totalIgst, cgst: totalCgst, sgst: totalSgst },
      { igst: purchaseIgst, cgst: purchaseCgst, sgst: purchaseSgst },
      (step, total) => setCaProgress(`Files ban rahi hain: ${step}/${total}`)
    );
    setCaProgress('✅ Download ho gaya!');
    setTimeout(() => setCaProgress(null), 3000);
  };

  const reportTabs = [
    { id: 'overview' as const, label: '📊 Overview' },
    { id: 'profit' as const, label: '💰 P&L' },
    { id: 'gstr1' as const, label: '📋 GSTR-1' },
    { id: 'gstr3b' as const, label: '📋 GSTR-3B' },
    { id: 'monthly' as const, label: '📅 Monthly' },
    { id: 'outstanding' as const, label: '💰 Outstanding' },
  ];

  // Profit calculation
  const productProfitData = useMemo(() => {
    const productSales: Record<string, { name: string; hsn: string; qtySold: number; revenue: number; sellingRates: number[]; purchaseRate: number | null }> = {};
    myInvoices.forEach(inv => inv.items.forEach(it => {
      if (!productSales[it.productName]) {
        const prod = myProducts.find(p => p.name === it.productName);
        productSales[it.productName] = { name: it.productName, hsn: it.hsn, qtySold: 0, revenue: 0, sellingRates: [], purchaseRate: null };
      }
      productSales[it.productName].qtySold += it.quantity;
      productSales[it.productName].revenue += it.price * it.quantity;
      productSales[it.productName].sellingRates.push(it.price);
    }));
    // Try to find purchase rates from purchases
    myPurchases.forEach(p => {
      if (productSales[p.description]) {
        // approximate: taxable / assumed qty
      }
    });
    return Object.values(productSales).map(ps => {
      const avgSellingRate = ps.sellingRates.length > 0 ? ps.revenue / ps.qtySold : 0;
      // Find product to get last_purchase_rate
      const prod = myProducts.find(p => p.name === ps.name);
      const purchaseRate = ps.purchaseRate;
      const cost = purchaseRate !== null ? purchaseRate * ps.qtySold : null;
      const profit = cost !== null ? ps.revenue - cost : null;
      const margin = profit !== null && ps.revenue > 0 ? (profit / ps.revenue) * 100 : null;
      return { ...ps, avgSellingRate, avgPurchaseRate: purchaseRate, cost, profit, margin };
    }).sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));
  }, [myInvoices, myProducts, myPurchases]);

  const totalRevenuePL = productProfitData.reduce((s, p) => s + p.revenue, 0);
  const totalCost = productProfitData.filter(p => p.cost !== null).reduce((s, p) => s + (p.cost || 0), 0);
  const totalProfit = totalRevenuePL - totalCost;
  const totalMargin = totalRevenuePL > 0 ? (totalProfit / totalRevenuePL) * 100 : 0;

  // Monthly profit trend
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { revenue: number; cost: number }> = {};
    myInvoices.forEach(inv => {
      const m = inv.date.substring(0, 7); // YYYY-MM
      if (!months[m]) months[m] = { revenue: 0, cost: 0 };
      inv.items.forEach(it => {
        months[m].revenue += it.price * it.quantity;
      });
    });
    return Object.entries(months).sort().slice(-12).map(([month, d]) => ({
      month: month.substring(5), revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost,
    }));
  }, [myInvoices]);

  const chartHeight = isMobile ? 160 : 200;

  // Helper to wrap tables for mobile scroll
  const ScrollTable = ({ children }: { children: React.ReactNode }) => (
    isMobile ? <div className="overflow-x-auto -mx-4 px-4">{children}</div> : <>{children}</>
  );

  return (
    <div className="animate-fade-in space-y-4">
      <h2 className="text-xl font-bold text-foreground">📊 GST Reports</h2>

      {/* Report Tabs */}
      <div className="flex gap-2 flex-wrap">
        {reportTabs.map(t => (
          <button key={t.id} onClick={() => setReportTab(t.id)}
            className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors min-h-[44px] ${reportTab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Filter */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[100px]"><label className="text-xs text-muted-foreground">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="block w-full border rounded-md px-3 py-2 text-sm bg-card text-foreground" /></div>
        <div className="flex-1 min-w-[100px]"><label className="text-xs text-muted-foreground">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="block w-full border rounded-md px-3 py-2 text-sm bg-card text-foreground" /></div>
        <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0" onClick={() => { setDateFrom(''); setDateTo(''); }}>Reset</Button>
      </div>

      {/* OVERVIEW TAB */}
      {reportTab === 'overview' && (
        <div className="space-y-4">
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Total Invoices</p><p className="text-lg md:text-xl font-bold text-foreground">{myInvoices.length}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Taxable Value</p><p className="text-lg md:text-xl font-bold text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Total GST</p><p className="text-lg md:text-xl font-bold text-foreground">₹{totalGst.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Invoice Value</p><p className="text-lg md:text-xl font-bold text-foreground">₹{totalInvValue.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">CGST</p><p className="text-base md:text-lg font-bold text-foreground">₹{totalCgst.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">SGST</p><p className="text-base md:text-lg font-bold text-foreground">₹{totalSgst.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">IGST</p><p className="text-base md:text-lg font-bold text-foreground">₹{totalIgst.toLocaleString('en-IN')}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg md:text-xl font-bold" style={{ color: totalOutstanding > 0 ? 'hsl(var(--critical))' : 'hsl(var(--success))' }}>₹{totalOutstanding.toLocaleString('en-IN')}</p></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Daily Sales</h3>
              {chartData.length > 0 ? (
                <div className={isMobile ? 'overflow-x-auto -mx-4 px-4' : ''}>
                  <div style={{ minWidth: isMobile ? '400px' : 'auto' }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Sales']} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Koi data nahi</p>}
            </div>
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">B2B vs B2C</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={isMobile ? 55 : 70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Koi data nahi</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Rate-wise Tax</h3>
              {ratePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart>
                    <Pie data={ratePieData} cx="50%" cy="50%" outerRadius={isMobile ? 55 : 70} dataKey="value" label={({ name }) => name}>
                      {ratePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Koi data nahi</p>}
            </div>
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Outstanding Aging</h3>
              {agingPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart>
                    <Pie data={agingPieData} cx="50%" cy="50%" outerRadius={isMobile ? 55 : 70} dataKey="value" label={({ name }) => name}>
                      {agingPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sab clear hai ✅</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Products</h3>
              {topProducts.length === 0 ? <p className="text-sm text-muted-foreground">Koi data nahi</p> : (
                <div className="space-y-2">{topProducts.map(([name, qty], i) => (
                  <div key={name} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                    <span className="text-foreground truncate">{i + 1}. {name}</span><span className="badge-success shrink-0">{qty} sold</span>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Customers</h3>
              {topCustomers.length === 0 ? <p className="text-sm text-muted-foreground">Koi data nahi</p> : (
                <div className="space-y-2">{topCustomers.map(([name, total], i) => (
                  <div key={name} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                    <span className="text-foreground truncate">{i + 1}. {name}</span><span className="font-medium text-foreground shrink-0">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GSTR-1 TAB */}
      {reportTab === 'gstr1' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 min-h-[44px] md:min-h-0" onClick={handleDownloadGSTR1}><FileSpreadsheet className="w-4 h-4 mr-1" /> GSTR-1</Button>
            <Button size="sm" variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 min-h-[44px] md:min-h-0" onClick={handleDownloadGSTR3B}><FileText className="w-4 h-4 mr-1" /> GSTR-3B</Button>
            <Button size="sm" variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 min-h-[44px] md:min-h-0" onClick={handleDownloadMonthly}><FileSpreadsheet className="w-4 h-4 mr-1" /> Monthly</Button>
            <Button size="sm" variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 min-h-[44px] md:min-h-0" onClick={handleDownloadCA} disabled={!!caProgress}>
              <Package className="w-4 h-4 mr-1" /> {caProgress || 'CA Pkg'}
            </Button>
          </div>

          {/* B2B - Cards on mobile, table on desktop */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">B2B ({b2bInvoices.length} invoices)</h3>
            {isMobile ? (
              <div className="space-y-2">
                {b2bInvoices.map(i => (
                  <div key={i.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{i.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{i.customerGst}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0">₹{i.grandTotal.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{i.invoiceNumber} • {formatDate(i.date)}</p>
                  </div>
                ))}
                {b2bInvoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Koi B2B invoice nahi</p>}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground bg-muted/30">
                    <th className="text-left py-2 px-2">GSTIN</th><th className="text-left py-2 px-2">Receiver</th>
                    <th className="text-left py-2 px-2">Invoice No</th><th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Value</th><th className="text-left py-2 px-2">Taxable</th>
                    <th className="text-left py-2 px-2">IGST</th><th className="text-left py-2 px-2">CGST</th><th className="text-left py-2 px-2">SGST</th>
                  </tr></thead>
                  <tbody>
                    {b2bInvoices.map(i => (
                      <tr key={i.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 text-muted-foreground">{i.customerGst}</td>
                        <td className="py-2 px-2 font-medium text-foreground">{i.customerName}</td>
                        <td className="py-2 px-2 text-foreground">{i.invoiceNumber}</td>
                        <td className="py-2 px-2 text-muted-foreground">{formatDate(i.date)}</td>
                        <td className="py-2 px-2 text-foreground">₹{i.grandTotal.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-foreground">₹{i.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-foreground">₹{(i.totalIgst || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-foreground">₹{(i.totalCgst || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-foreground">₹{(i.totalSgst || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b2bInvoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Koi B2B invoice nahi</p>}
              </div>
            )}
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">B2C Large ({b2clInvoices.length})</h3>
            <p className="text-xs text-muted-foreground">Inter-state &gt; ₹2.5L</p>
            {b2clInvoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Koi B2CL invoice nahi</p>}
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">B2C Small ({b2csInvoices.length})</h3>
            <p className="text-xs text-muted-foreground">Summary: ₹{b2csInvoices.reduce((s, i) => s + i.grandTotal, 0).toLocaleString('en-IN')} total</p>
          </div>

          {/* HSN Summary */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">HSN Summary</h3>
            {isMobile ? (
              <div className="space-y-2">
                {Object.values(hsnSummary).map(h => (
                  <div key={h.hsn + h.rate} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.desc}</p>
                        <p className="text-[10px] text-muted-foreground">HSN: {h.hsn} • {h.rate}% GST</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">₹{h.value.toFixed(0)}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Qty: {h.qty} {h.unit} • Tax: ₹{h.taxable.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground bg-muted/30">
                    <th className="text-left py-2 px-2">HSN</th><th className="text-left py-2 px-2">Description</th>
                    <th className="text-left py-2 px-2">UQC</th><th className="text-left py-2 px-2">Qty</th>
                    <th className="text-left py-2 px-2">Value</th><th className="text-left py-2 px-2">Rate</th>
                    <th className="text-left py-2 px-2">Taxable</th><th className="text-left py-2 px-2">IGST</th>
                    <th className="text-left py-2 px-2">CGST</th><th className="text-left py-2 px-2">SGST</th>
                  </tr></thead>
                  <tbody>
                    {Object.values(hsnSummary).map(h => (
                      <tr key={h.hsn + h.rate} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium text-foreground">{h.hsn}</td>
                        <td className="py-2 px-2 text-foreground">{h.desc}</td>
                        <td className="py-2 px-2 text-muted-foreground">{h.unit}</td>
                        <td className="py-2 px-2 text-foreground">{h.qty}</td>
                        <td className="py-2 px-2 text-foreground">₹{h.value.toFixed(0)}</td>
                        <td className="py-2 px-2 text-muted-foreground">{h.rate}%</td>
                        <td className="py-2 px-2 text-foreground">₹{h.taxable.toFixed(0)}</td>
                        <td className="py-2 px-2 text-foreground">₹{h.igst.toFixed(0)}</td>
                        <td className="py-2 px-2 text-foreground">₹{h.cgst.toFixed(0)}</td>
                        <td className="py-2 px-2 text-foreground">₹{h.sgst.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSTR-3B TAB - Simplified cards on mobile */}
      {reportTab === 'gstr3b' && (
        <div className="space-y-4">
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">3.1 — Outward Supplies</h3>
            {isMobile ? (
              <div className="space-y-2">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Taxable Supply</p>
                  <p className="text-sm font-bold text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>IGST: ₹{totalIgst.toLocaleString('en-IN')}</span>
                    <span>CGST: ₹{totalCgst.toLocaleString('en-IN')}</span>
                    <span>SGST: ₹{totalSgst.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground bg-muted/30">
                  <th className="text-left py-2 px-3">Nature of Supply</th><th className="text-left py-2 px-3">Taxable Value</th>
                  <th className="text-left py-2 px-3">IGST</th><th className="text-left py-2 px-3">CGST</th><th className="text-left py-2 px-3">SGST</th>
                </tr></thead>
                <tbody>
                  <tr className="border-b"><td className="py-2 px-3 text-foreground">(a) Outward taxable supply</td>
                    <td className="py-2 px-3 font-medium text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{totalIgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{totalCgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{totalSgst.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">4 — ITC (Purchase Register)</h3>
            <div className={isMobile ? 'space-y-2' : ''}>
              {isMobile ? (
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Net ITC Available</p>
                  <div className="flex gap-3 mt-1 text-sm">
                    <span className="text-foreground font-medium">IGST: ₹{purchaseIgst.toLocaleString('en-IN')}</span>
                    <span className="text-foreground font-medium">CGST: ₹{purchaseCgst.toLocaleString('en-IN')}</span>
                    <span className="text-foreground font-medium">SGST: ₹{purchaseSgst.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground bg-muted/30">
                    <th className="text-left py-2 px-3"></th><th className="text-left py-2 px-3">IGST</th><th className="text-left py-2 px-3">CGST</th><th className="text-left py-2 px-3">SGST</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2 px-3 text-foreground">(A) ITC Available</td>
                      <td className="py-2 px-3 font-medium text-foreground">₹{purchaseIgst.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 font-medium text-foreground">₹{purchaseCgst.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 font-medium text-foreground">₹{purchaseSgst.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">5 — Net Tax Payable</h3>
            {isMobile ? (
              <div className="border rounded-lg p-3 bg-primary/5">
                <p className="text-xs text-muted-foreground">Net Tax Payable</p>
                <div className="flex gap-3 mt-1 text-sm font-bold">
                  <span className="text-primary">IGST: ₹{Math.max(0, totalIgst - purchaseIgst).toLocaleString('en-IN')}</span>
                  <span className="text-primary">CGST: ₹{Math.max(0, totalCgst - purchaseCgst).toLocaleString('en-IN')}</span>
                  <span className="text-primary">SGST: ₹{Math.max(0, totalSgst - purchaseSgst).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground bg-muted/30">
                  <th className="text-left py-2 px-3"></th><th className="text-left py-2 px-3">IGST</th><th className="text-left py-2 px-3">CGST</th><th className="text-left py-2 px-3">SGST</th>
                </tr></thead>
                <tbody>
                  <tr className="border-b"><td className="py-2 px-3 text-foreground">Tax on outward</td>
                    <td className="py-2 px-3 text-foreground">₹{totalIgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{totalCgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{totalSgst.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="border-b"><td className="py-2 px-3 text-foreground">Less: ITC</td>
                    <td className="py-2 px-3 text-foreground">₹{purchaseIgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{purchaseCgst.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-foreground">₹{purchaseSgst.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-primary/5"><td className="py-2 px-3 font-bold text-foreground">Net Tax Payable</td>
                    <td className="py-2 px-3 font-bold text-primary">₹{Math.max(0, totalIgst - purchaseIgst).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 font-bold text-primary">₹{Math.max(0, totalCgst - purchaseCgst).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 font-bold text-primary">₹{Math.max(0, totalSgst - purchaseSgst).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY TAB */}
      {reportTab === 'monthly' && (
        <div className="space-y-4">
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Rate-wise Tax Summary</h3>
            {isMobile ? (
              <div className="space-y-2">
                {Object.entries(rateWise).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, d]) => (
                  <div key={rate} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-foreground">{rate}% GST</p>
                      <p className="text-sm font-bold text-foreground">₹{(d.cgst + d.sgst + d.igst).toFixed(0)}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Taxable: ₹{d.taxable.toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground bg-muted/30">
                  <th className="text-left py-2 px-3">GST Rate</th><th className="text-left py-2 px-3">Taxable</th>
                  <th className="text-left py-2 px-3">CGST</th><th className="text-left py-2 px-3">SGST</th>
                  <th className="text-left py-2 px-3">IGST</th><th className="text-left py-2 px-3">Total Tax</th>
                </tr></thead>
                <tbody>
                  {Object.entries(rateWise).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, d]) => (
                    <tr key={rate} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium text-foreground">{rate}%</td>
                      <td className="py-2 px-3 text-foreground">₹{d.taxable.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-foreground">₹{d.cgst.toFixed(0)}</td>
                      <td className="py-2 px-3 text-foreground">₹{d.sgst.toFixed(0)}</td>
                      <td className="py-2 px-3 text-foreground">₹{d.igst.toFixed(0)}</td>
                      <td className="py-2 px-3 font-medium text-foreground">₹{(d.cgst + d.sgst + d.igst).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Customer-wise Summary</h3>
            {isMobile ? (
              <div className="space-y-2">
                {myCustomers.map(c => {
                  const custInv = myInvoices.filter(i => i.customerId === c.id);
                  if (custInv.length === 0) return null;
                  const taxable = custInv.reduce((s, i) => s + i.totalAmount, 0);
                  const tax = custInv.reduce((s, i) => s + i.totalGst, 0);
                  return (
                    <div key={c.id} className="border rounded-lg p-3">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-sm font-bold text-foreground shrink-0">₹{(taxable + tax).toLocaleString('en-IN')}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{custInv.length} invoices • Tax: ₹{tax.toLocaleString('en-IN')}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground bg-muted/30">
                  <th className="text-left py-2 px-3">Customer</th><th className="text-left py-2 px-3">GSTIN</th>
                  <th className="text-left py-2 px-3">Invoices</th><th className="text-left py-2 px-3">Taxable</th>
                  <th className="text-left py-2 px-3">Tax</th><th className="text-left py-2 px-3">Total</th>
                </tr></thead>
                <tbody>
                  {myCustomers.map(c => {
                    const custInv = myInvoices.filter(i => i.customerId === c.id);
                    if (custInv.length === 0) return null;
                    const taxable = custInv.reduce((s, i) => s + i.totalAmount, 0);
                    const tax = custInv.reduce((s, i) => s + i.totalGst, 0);
                    return (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{c.name}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{c.gstNumber || '-'}</td>
                        <td className="py-2 px-3 text-foreground">{custInv.length}</td>
                        <td className="py-2 px-3 text-foreground">₹{taxable.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-foreground">₹{tax.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 font-medium text-foreground">₹{(taxable + tax).toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* OUTSTANDING TAB */}
      {reportTab === 'outstanding' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0" onClick={handleDownloadOutstanding}><Download className="w-4 h-4 mr-1" /> Outstanding</Button>
            <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0" onClick={handleDownloadStock}><Download className="w-4 h-4 mr-1" /> Stock</Button>
            <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0" onClick={handleDownloadPurchases}><Download className="w-4 h-4 mr-1" /> Purchases</Button>
          </div>

          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Customer Outstanding</h3>
            {isMobile ? (
              <div className="space-y-2">
                {outstandingByCustomer.map(c => (
                  <div key={c.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.daysOld} din purana</p>
                      </div>
                      <p className="text-sm font-bold text-destructive shrink-0">₹{c.pending.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="border-t mt-2 pt-1 flex gap-3 text-[10px] text-muted-foreground">
                      <span>Bill: ₹{c.totalBill.toLocaleString('en-IN')}</span>
                      <span>Paid: ₹{c.totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
                {outstandingByCustomer.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sab clear hai ✅</p>}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground bg-muted/30">
                    <th className="text-left py-2 px-3">Customer</th><th className="text-left py-2 px-3">Total Bill</th>
                    <th className="text-left py-2 px-3">Paid</th><th className="text-left py-2 px-3">Pending</th>
                    <th className="text-left py-2 px-3">Days Old</th><th className="text-left py-2 px-3">Oldest Invoice</th>
                  </tr></thead>
                  <tbody>
                    {outstandingByCustomer.map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{c.name}</td>
                        <td className="py-2 px-3 text-foreground">₹{c.totalBill.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-foreground">₹{c.totalPaid.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 font-bold text-destructive">₹{c.pending.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-muted-foreground">{c.daysOld} din</td>
                        <td className="py-2 px-3 text-muted-foreground">{c.oldestInvoice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {outstandingByCustomer.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sab clear hai ✅</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROFIT & LOSS TAB */}
      {reportTab === 'profit' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-lg font-bold text-foreground">₹{totalRevenuePL.toLocaleString('en-IN')}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Cost of Goods</p><p className="text-lg font-bold text-foreground">₹{totalCost.toLocaleString('en-IN')}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Gross Profit</p><p className="text-lg font-bold" style={{ color: totalProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--critical))' }}>₹{totalProfit.toLocaleString('en-IN')}</p></div>
            <div className="stat-card"><p className="text-xs text-muted-foreground">Gross Margin</p><p className="text-lg font-bold" style={{ color: totalMargin >= 30 ? 'hsl(var(--success))' : totalMargin >= 10 ? 'hsl(37,95%,55%)' : 'hsl(var(--critical))' }}>{totalMargin.toFixed(1)}%</p></div>
          </div>

          {/* Monthly Profit Trend */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Revenue Trend</h3>
            {monthlyTrend.length > 0 ? (
              <div className={isMobile ? 'overflow-x-auto -mx-4 px-4' : ''}>
                <div style={{ minWidth: isMobile ? '400px' : 'auto' }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(232,80%,50%)" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="hsl(142,70%,40%)" name="Profit" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Koi data nahi</p>}
          </div>

          {/* Product-wise Profit Table */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Product-wise Profit</h3>
            {isMobile ? (
              <div className="space-y-2">
                {productProfitData.map(p => (
                  <div key={p.name} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.hsn} • {p.qtySold} sold</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">₹{p.revenue.toLocaleString('en-IN')}</p>
                        {p.margin !== null ? (
                          <span className={`text-[10px] font-medium ${p.margin >= 30 ? 'text-emerald-600' : p.margin >= 10 ? 'text-amber-600' : p.margin >= 0 ? 'text-red-500' : 'text-red-800'}`}>
                            {p.margin.toFixed(1)}% margin
                          </span>
                        ) : <span className="text-[10px] text-muted-foreground">N/A</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {productProfitData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Koi data nahi</p>}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-muted-foreground bg-muted/30">
                    <th className="text-left py-2 px-2">Product</th><th className="text-left py-2 px-2">HSN</th>
                    <th className="text-right py-2 px-2">Qty Sold</th><th className="text-right py-2 px-2">Avg Sell Rate</th>
                    <th className="text-right py-2 px-2">Avg Buy Rate</th><th className="text-right py-2 px-2">Revenue</th>
                    <th className="text-right py-2 px-2">Cost</th><th className="text-right py-2 px-2">Profit</th>
                    <th className="text-right py-2 px-2">Margin%</th>
                  </tr></thead>
                  <tbody>
                    {productProfitData.map(p => (
                      <tr key={p.name} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{p.hsn}</td>
                        <td className="py-2 px-2 text-right text-foreground">{p.qtySold}</td>
                        <td className="py-2 px-2 text-right text-foreground">₹{p.avgSellingRate.toFixed(0)}</td>
                        <td className="py-2 px-2 text-right text-foreground">{p.avgPurchaseRate !== null ? `₹${p.avgPurchaseRate.toFixed(0)}` : 'N/A'}</td>
                        <td className="py-2 px-2 text-right text-foreground">₹{p.revenue.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-right text-foreground">{p.cost !== null ? `₹${p.cost.toLocaleString('en-IN')}` : 'N/A'}</td>
                        <td className="py-2 px-2 text-right font-medium" style={{ color: p.profit !== null ? (p.profit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--critical))') : undefined }}>
                          {p.profit !== null ? `₹${p.profit.toLocaleString('en-IN')}` : 'N/A'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold" style={{ color: p.margin !== null ? (p.margin >= 30 ? 'hsl(142,70%,40%)' : p.margin >= 10 ? 'hsl(37,95%,55%)' : p.margin >= 0 ? 'hsl(0,72%,51%)' : 'hsl(0,50%,30%)') : undefined }}>
                          {p.margin !== null ? `${p.margin.toFixed(1)}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {productProfitData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Koi data nahi</p>}
              </div>
            )}
          </div>

          {/* Top 5 Profitable Products */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 by Profit</h3>
              {productProfitData.filter(p => p.profit !== null).slice(0, 5).map((p, i) => (
                <div key={p.name} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                  <span className="text-foreground truncate">{i + 1}. {p.name}</span>
                  <span className="font-medium shrink-0" style={{ color: (p.profit || 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--critical))' }}>₹{(p.profit || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
              {productProfitData.filter(p => p.profit !== null).length === 0 && <p className="text-sm text-muted-foreground">Purchase data needed</p>}
            </div>
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 by Margin %</h3>
              {productProfitData.filter(p => p.margin !== null).sort((a, b) => (b.margin || 0) - (a.margin || 0)).slice(0, 5).map((p, i) => (
                <div key={p.name} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                  <span className="text-foreground truncate">{i + 1}. {p.name}</span>
                  <span className="font-medium shrink-0" style={{ color: (p.margin || 0) >= 30 ? 'hsl(142,70%,40%)' : (p.margin || 0) >= 10 ? 'hsl(37,95%,55%)' : 'hsl(0,72%,51%)' }}>{(p.margin || 0).toFixed(1)}%</span>
                </div>
              ))}
              {productProfitData.filter(p => p.margin !== null).length === 0 && <p className="text-sm text-muted-foreground">Purchase data needed</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
