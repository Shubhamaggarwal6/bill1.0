import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { numberToWords, formatDate } from '@/lib/subscription';
import { printGSTInvoice } from '@/lib/invoicePrint';
import { downloadInvoicePDF, downloadInvoiceExcel } from '@/lib/exportUtils';
import { Button } from '@/components/ui/button';
import { X, Printer, FileText, FileSpreadsheet, Share2, Pencil } from 'lucide-react';
import type { Invoice, Payment } from '@/lib/types';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  readOnly?: boolean;
  onStatusChange?: (inv: Invoice) => void;
  onPayment?: (inv: Invoice) => void;
}

export default function InvoiceDetailModal({ invoice: inv, onClose, readOnly, onStatusChange, onPayment }: Props) {
  const { users, payments } = useApp();
  const { t } = useLanguage();
  const firm = users.find(u => u.id === inv.userId);
  const invPayments = payments.filter(p => p.invoiceId === inv.id);

  const shareWhatsApp = () => {
    const text = `*${t('taxInvoice')}*\n${t('invoiceNo')}: ${inv.invoiceNumber}\n${t('customer')}: ${inv.customerName}\n${t('grandTotal')}: ₹${inv.grandTotal.toLocaleString('en-IN')}\n${t('status')}: ${inv.status}\nDate: ${formatDate(inv.date)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // HSN breakup
  const hsnBreakup: Record<string, { hsn: string; desc: string; taxable: number; rate: number; cgst: number; sgst: number; igst: number }> = {};
  inv.items.forEach(it => {
    const key = `${it.hsn}_${it.gstPercent}`;
    const taxable = it.price * it.quantity;
    const gst = taxable * it.gstPercent / 100;
    if (!hsnBreakup[key]) hsnBreakup[key] = { hsn: it.hsn, desc: it.productName, taxable: 0, rate: it.gstPercent, cgst: 0, sgst: 0, igst: 0 };
    hsnBreakup[key].taxable += taxable;
    if (inv.isInterState) hsnBreakup[key].igst += gst;
    else { hsnBreakup[key].cgst += gst / 2; hsnBreakup[key].sgst += gst / 2; }
  });

  const fs = firm?.firmSettings;

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-2 md:p-6">
      <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl border my-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <h2 className="text-lg font-bold text-foreground">{t('invoiceDetail')}: {inv.invoiceNumber}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-4 md:p-6 space-y-5">
          {/* Professional Invoice Layout */}
          <div className="border-2 border-primary/20 rounded-lg overflow-hidden" style={{ fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
            {/* Tax Invoice Header */}
            <div className="bg-primary text-primary-foreground text-center py-3">
              <h3 className="text-lg font-bold tracking-wide">{t('taxInvoice')}</h3>
              <p className="text-xs opacity-80">
                {inv.isInterState ? t('interState') : t('intraState')}
              </p>
            </div>

            {/* Seller / Buyer */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b">
              <div className="p-4 border-r border-b md:border-b-0">
                <p className="text-xs font-semibold text-primary uppercase mb-1">{t('sellerDetails')}</p>
                <p className="font-bold text-foreground">{firm?.firmName || ''}</p>
                <p className="text-xs text-muted-foreground">{fs?.address}{fs?.city ? ', ' + fs.city : ''}</p>
                <p className="text-xs text-muted-foreground">{fs?.state}{fs?.pincode ? ' - ' + fs.pincode : ''}</p>
                <p className="text-xs text-muted-foreground">GSTIN: {firm?.gstNumber || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{t('state')}: {fs?.state} ({fs?.stateCode})</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-primary uppercase mb-1">{t('buyerDetails')}</p>
                <p className="font-bold text-foreground">{inv.customerName}</p>
                <p className="text-xs text-muted-foreground">{inv.customerAddress}</p>
                <p className="text-xs text-muted-foreground">GSTIN: {inv.customerGst || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{t('state')}: {inv.customerState || ''} ({inv.customerStateCode || ''})</p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2 border-b bg-muted/20 text-xs">
              <span><strong>{t('invoiceNo')}:</strong> {inv.invoiceNumber}</span>
              <span><strong>Date:</strong> {formatDate(inv.date)}</span>
              <span><strong>{t('placeOfSupply')}:</strong> {inv.placeOfSupply || ''}</span>
              {inv.vehicleNumber && <span><strong>{t('vehicle')}:</strong> {inv.vehicleNumber}</span>}
              {inv.ewayBillNumber && <span><strong>{t('ewayBill')}:</strong> {inv.ewayBillNumber}</span>}
              <span>{t('reverseCharge')}</span>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2 text-left">Sr</th>
                    <th className="p-2 text-left">{t('description')}</th>
                    <th className="p-2 text-center">HSN</th>
                    <th className="p-2 text-center">{t('qty')}</th>
                    <th className="p-2 text-center">{t('unit')}</th>
                    <th className="p-2 text-right">MRP</th>
                    <th className="p-2 text-right">{t('rate')}</th>
                    <th className="p-2 text-center">{t('discount')}</th>
                    <th className="p-2 text-right">{t('taxableAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((it, i) => {
                    const taxable = it.price * it.quantity;
                    const discPct = it.mrp && it.mrp > it.price ? Math.round(((it.mrp - it.price) / it.mrp) * 100 * 100) / 100 : 0;
                    return (
                      <tr key={i} className={`border-b ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center font-mono text-muted-foreground">{it.hsn}</td>
                        <td className="p-2 text-center">{it.quantity}</td>
                        <td className="p-2 text-center">{it.unit}</td>
                        <td className="p-2 text-right">₹{(it.mrp || it.price).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">₹{it.price.toLocaleString('en-IN')}</td>
                        <td className="p-2 text-center">{discPct > 0 ? discPct + '%' : '-'}</td>
                        <td className="p-2 text-right font-medium">₹{taxable.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* HSN Tax Breakup */}
            <div className="px-4 py-2 border-t">
              <p className="text-xs font-semibold text-primary mb-1">{t('taxBreakup')} — {inv.isInterState ? t('interState') : t('intraState')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/80 text-primary-foreground">
                      <th className="p-1.5 text-left">HSN</th>
                      <th className="p-1.5 text-right">{t('taxableAmount')}</th>
                      {inv.isInterState
                        ? <><th className="p-1.5 text-center">IGST Rate</th><th className="p-1.5 text-right">IGST Amt</th></>
                        : <><th className="p-1.5 text-center">CGST Rate</th><th className="p-1.5 text-right">CGST Amt</th><th className="p-1.5 text-center">SGST Rate</th><th className="p-1.5 text-right">SGST Amt</th></>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(hsnBreakup).map((h, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1.5 font-mono">{h.hsn}</td>
                        <td className="p-1.5 text-right">₹{h.taxable.toLocaleString('en-IN')}</td>
                        {inv.isInterState
                          ? <><td className="p-1.5 text-center">{h.rate}%</td><td className="p-1.5 text-right">₹{h.igst.toFixed(2)}</td></>
                          : <><td className="p-1.5 text-center">{h.rate / 2}%</td><td className="p-1.5 text-right">₹{h.cgst.toFixed(2)}</td><td className="p-1.5 text-center">{h.rate / 2}%</td><td className="p-1.5 text-right">₹{h.sgst.toFixed(2)}</td></>
                        }
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t text-right space-y-0.5 text-sm">
              <p className="text-muted-foreground">{t('subtotal')}: ₹{inv.totalAmount.toLocaleString('en-IN')}</p>
              {inv.isInterState
                ? <p className="text-muted-foreground">IGST: ₹{(inv.totalIgst || inv.totalGst).toLocaleString('en-IN')}</p>
                : <>
                    <p className="text-muted-foreground">CGST: ₹{(inv.totalCgst || inv.totalGst / 2).toLocaleString('en-IN')}</p>
                    <p className="text-muted-foreground">SGST: ₹{(inv.totalSgst || inv.totalGst / 2).toLocaleString('en-IN')}</p>
                  </>
              }
              {inv.roundOff !== 0 && <p className="text-muted-foreground">{t('roundOff')}: ₹{inv.roundOff > 0 ? '+' : ''}{inv.roundOff?.toFixed(2)}</p>}
              <div className="bg-primary/10 rounded-lg p-2 mt-2 inline-block">
                <p className="text-xl font-bold text-primary">{t('grandTotal')}: ₹{inv.grandTotal.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-xs text-muted-foreground italic mt-1">{numberToWords(Math.round(inv.grandTotal))} {t('rupeesOnly')}</p>
            </div>

            {/* Bank Details + Signatory */}
            <div className="border-t px-4 py-3 flex justify-between items-start gap-4">
              {fs?.showBankDetails && fs?.bankName ? (
                <div className="text-xs">
                  <p className="font-semibold text-primary mb-1">{t('bankDetailsLabel')}</p>
                  <p className="text-muted-foreground">Bank: {fs.bankName}</p>
                  <p className="text-muted-foreground">A/C: {fs.accountNumber}</p>
                  <p className="text-muted-foreground">IFSC: {fs.ifscCode}</p>
                  <p className="text-muted-foreground">Branch: {fs.branchName}</p>
                </div>
              ) : <div />}
              <div className="text-right text-xs">
                <p className="text-muted-foreground">{t('authorisedSignatory')}</p>
                <div className="h-8" />
                <p className="font-bold text-foreground">{firm?.firmName || ''}</p>
              </div>
            </div>

            {/* Created by + Footer */}
            <div className="border-t px-4 py-2 flex justify-between items-center text-xs text-muted-foreground bg-muted/20">
              <span>
                {inv.createdBy?.role === 'user' ? '👑' : '👷'} {t('createdBy')}: {inv.createdBy?.name}
                {inv.createdBy?.timestamp && ` • ${new Date(inv.createdBy.timestamp).toLocaleString('hi-IN')}`}
              </span>
              <span className="italic">{t('computerGenerated')}</span>
            </div>
          </div>

          {/* Payment History */}
          {(invPayments.length > 0 || (inv.paidAmount || 0) > 0) && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">{t('paymentHistory')}</h4>
              {invPayments.map(p => (
                <div key={p.id} className="flex justify-between text-xs bg-muted/30 rounded px-3 py-1.5 mb-1">
                  <span className="text-foreground">₹{p.amount.toLocaleString('en-IN')} — {p.mode}</span>
                  <span className="text-muted-foreground">{formatDate(p.date)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm mt-2 font-medium">
                <span className="text-foreground">{t('paidLabel')}: ₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</span>
                <span className="text-destructive">{t('remaining2')}: ₹{Math.max(0, inv.grandTotal - (inv.paidAmount || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t('status')}:</span>
            <span className={inv.status === 'paid' ? 'badge-success' : inv.status === 'partial' ? 'badge-warning' : 'badge-critical'}>
              {inv.status === 'paid' ? '🟢 Paid' : inv.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" className="h-12 text-sm" onClick={() => downloadInvoicePDF(inv, firm)}>
              <FileText className="w-4 h-4 mr-2" /> {t('downloadPDF')}
            </Button>
            <Button variant="outline" className="h-12 text-sm" onClick={() => downloadInvoiceExcel(inv)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> {t('downloadExcel')}
            </Button>
            <Button variant="outline" className="h-12 text-sm" onClick={() => printGSTInvoice(inv, firm)}>
              <Printer className="w-4 h-4 mr-2" /> {t('printInvoice')}
            </Button>
            <Button variant="outline" className="h-12 text-sm" onClick={shareWhatsApp}>
              <Share2 className="w-4 h-4 mr-2" /> {t('shareWhatsApp')}
            </Button>
          </div>

          {!readOnly && (
            <div className="flex gap-2 flex-wrap">
              {onStatusChange && <Button size="sm" variant="outline" onClick={() => onStatusChange(inv)}><Pencil className="w-4 h-4 mr-1" /> {t('changeStatus')}</Button>}
              {onPayment && <Button size="sm" variant="outline" onClick={() => onPayment(inv)}>💰 {t('addPayment')}</Button>}
              <Button size="sm" variant="outline" onClick={() => printGSTInvoice(inv, firm, 'all')}>
                <Printer className="w-4 h-4 mr-1" /> {t('copies3')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
