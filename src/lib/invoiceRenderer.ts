import { numberToWords } from '@/lib/subscription';
import type { Invoice, User, FirmSettings, CreditNote, DebitNote, InvoiceItem } from '@/lib/types';

const APP_NAME = 'BillSaathi';

const COPY_LABELS: Record<string, string> = {
  original: 'Original for Recipient',
  duplicate: 'Duplicate for Transporter',
  triplicate: 'Triplicate for Supplier',
};

export type DocType = 'invoice' | 'credit_note' | 'debit_note';

interface RenderOptions {
  type: DocType;
  copy?: string;
  firm?: User | null;
  /** For credit/debit notes, the original invoice number */
  againstInvoiceNumber?: string;
}

function getDocTitle(type: DocType): string {
  switch (type) {
    case 'credit_note': return 'CREDIT NOTE';
    case 'debit_note': return 'DEBIT NOTE';
    default: return 'TAX INVOICE';
  }
}

function getDocNumberLabel(type: DocType): string {
  switch (type) {
    case 'credit_note': return 'Credit Note No';
    case 'debit_note': return 'Debit Note No';
    default: return 'Invoice No';
  }
}

export interface UnifiedDocData {
  id: string;
  docNumber: string;
  date: string;
  customerName: string;
  customerGst?: string;
  customerAddress?: string;
  customerState?: string;
  customerStateCode?: string;
  vehicleNumber?: string;
  ewayBillNumber?: string;
  items: InvoiceItem[];
  totalAmount: number;
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  roundOff: number;
  isInterState: boolean;
  placeOfSupply: string;
  status: string;
  paidAmount?: number;
  reason?: string;
}

export function invoiceToDocData(inv: Invoice): UnifiedDocData {
  return {
    id: inv.id, docNumber: inv.invoiceNumber, date: inv.date,
    customerName: inv.customerName, customerGst: inv.customerGst,
    customerAddress: inv.customerAddress, customerState: inv.customerState,
    customerStateCode: inv.customerStateCode, vehicleNumber: inv.vehicleNumber,
    ewayBillNumber: inv.ewayBillNumber, items: inv.items,
    totalAmount: inv.totalAmount, totalGst: inv.totalGst,
    totalCgst: inv.totalCgst, totalSgst: inv.totalSgst, totalIgst: inv.totalIgst,
    grandTotal: inv.grandTotal, roundOff: inv.roundOff, isInterState: inv.isInterState,
    placeOfSupply: inv.placeOfSupply, status: inv.status, paidAmount: inv.paidAmount,
  };
}

export function creditNoteToDocData(cn: CreditNote): UnifiedDocData {
  return {
    id: cn.id, docNumber: cn.creditNoteNumber, date: cn.date,
    customerName: cn.customerName, items: cn.items,
    totalAmount: cn.subtotal, totalGst: cn.cgst + cn.sgst + cn.igst,
    totalCgst: cn.cgst, totalSgst: cn.sgst, totalIgst: cn.igst,
    grandTotal: cn.total, roundOff: 0, isInterState: cn.isInterState,
    placeOfSupply: '', status: cn.status, reason: cn.reason,
  };
}

export function debitNoteToDocData(dn: DebitNote): UnifiedDocData {
  return {
    id: dn.id, docNumber: dn.debitNoteNumber, date: dn.date,
    customerName: dn.customerName, items: dn.items,
    totalAmount: dn.subtotal, totalGst: dn.cgst + dn.sgst + dn.igst,
    totalCgst: dn.cgst, totalSgst: dn.sgst, totalIgst: dn.igst,
    grandTotal: dn.total, roundOff: 0, isInterState: dn.isInterState,
    placeOfSupply: '', status: dn.status, reason: dn.reason,
  };
}

/**
 * Single HTML renderer used by BOTH print and PDF.
 * Guarantees pixel-perfect match between print and PDF output.
 */
export function generateInvoiceHTML(doc: UnifiedDocData, opts: RenderOptions): string {
  const firm = opts.firm;
  const fs: FirmSettings = firm?.firmSettings || {
    address: '', city: '', state: '', stateCode: '', pincode: '',
    bankName: '', accountNumber: '', ifscCode: '', branchName: '',
    invoicePrefix: 'INV', financialYearStart: 4,
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Payment should be made to the mentioned account only.\n3. E&OE (Errors and Omissions Excepted)',
    showBankDetails: true, showTerms: true, showEwayBill: false, invoiceCopyLabel: 'original',
  };

  const copies = opts.copy === 'all'
    ? ['original', 'duplicate', 'triplicate']
    : [opts.copy || fs.invoiceCopyLabel || 'original'];

  const docTitle = getDocTitle(opts.type);
  const docNumLabel = getDocNumberLabel(opts.type);

  const itemRows = doc.items.map((it, i) => {
    const taxable = it.price * it.quantity;
    const gstAmt = taxable * it.gstPercent / 100;
    const discPct = it.mrp > it.price ? Math.round(((it.mrp - it.price) / it.mrp) * 100 * 100) / 100 : 0;
    return {
      ...it, index: i + 1, taxable, gstAmt, discPct,
      cgst: doc.isInterState ? 0 : gstAmt / 2,
      sgst: doc.isInterState ? 0 : gstAmt / 2,
      igst: doc.isInterState ? gstAmt : 0,
      totalWithTax: taxable + gstAmt,
    };
  });

  const totalTaxable = itemRows.reduce((s, i) => s + i.taxable, 0);
  const totalTax = doc.isInterState ? doc.totalIgst : (doc.totalCgst + doc.totalSgst);

  const pagesHtml = copies.map(copy => `
    <div class="page">
      <div class="header-row">
        <div class="brand">
          <div class="brand-icon">₹</div>
          <div>
            <div class="brand-name">${APP_NAME}</div>
            <div class="brand-tagline">Billing Made Easier</div>
          </div>
        </div>
        <div class="invoice-title">
          <h1>${docTitle}</h1>
        </div>
        <div class="copy-label">${COPY_LABELS[copy] || 'Original for Recipient'}<br/><strong>${doc.docNumber}</strong></div>
      </div>

      ${opts.againstInvoiceNumber ? `
      <div style="background:#f0f9ff;padding:4px 16px;border-bottom:1px solid #e5e7eb;font-size:10px;color:#1e40af;">
        Against Invoice: <strong>${opts.againstInvoiceNumber}</strong>
        ${doc.reason ? ` | Reason: <strong>${doc.reason}</strong>` : ''}
      </div>` : ''}

      <div class="firm-section">
        <div class="firm-details">
          <p class="firm-name">${firm?.firmName || APP_NAME}</p>
          <p>${fs.address}${fs.city ? ', ' + fs.city : ''}${fs.state ? ', ' + fs.state : ''}${fs.pincode ? ' - ' + fs.pincode : ''}</p>
          ${firm?.email ? `<p>${firm.email}</p>` : ''}
          ${firm?.gstNumber ? `<p>GSTIN: ${firm.gstNumber}</p>` : ''}
          ${firm?.phone ? `<p>Phone: ${firm.phone}</p>` : ''}
          <p>State: ${fs.state || ''} | Code: ${fs.stateCode || ''}</p>
        </div>
        <div class="invoice-meta">
          <div class="amount-due">Total: <strong>₹${doc.grandTotal.toLocaleString('en-IN')}</strong></div>
          <table class="meta-table">
            <tr><td>${docNumLabel}:</td><td><strong>${doc.docNumber}</strong></td></tr>
            <tr><td>Date:</td><td><strong>${doc.date}</strong></td></tr>
            ${doc.placeOfSupply ? `<tr><td>Place of Supply:</td><td><strong>${doc.placeOfSupply}</strong></td></tr>` : ''}
            ${doc.vehicleNumber ? `<tr><td>Vehicle No:</td><td><strong>${doc.vehicleNumber}</strong></td></tr>` : ''}
            ${doc.ewayBillNumber ? `<tr><td>E-Way Bill:</td><td><strong>${doc.ewayBillNumber}</strong></td></tr>` : ''}
          </table>
        </div>
      </div>

      <div class="client-section">
        <div class="client-box">
          <h4>Client Details</h4>
          <p class="client-name">${doc.customerName}</p>
          <p>${doc.customerAddress || ''}</p>
          ${doc.customerGst ? `<p>GSTIN: ${doc.customerGst}</p>` : ''}
          <p>State: ${doc.customerState || ''} | Code: ${doc.customerStateCode || ''}</p>
        </div>
        <div class="client-box">
          <h4>Ship To</h4>
          <p class="client-name">${doc.customerName}</p>
          <p>${doc.customerAddress || ''}</p>
          ${doc.vehicleNumber ? `<p>Vehicle No: ${doc.vehicleNumber}</p>` : ''}
        </div>
      </div>

      ${doc.items.length > 0 ? `
      <table class="items-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th class="desc-col">Item Description</th>
            <th>HSN/SAC</th>
            <th>Qty<br/>UoM</th>
            <th>Price (₹)</th>
            <th>Taxable Value (₹)</th>
            ${doc.isInterState
              ? '<th>IGST (₹)</th>'
              : '<th>CGST (₹)</th><th>SGST (₹)</th>'}
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows.map(it => `
            <tr>
              <td>${it.index}</td>
              <td class="desc-col">
                <strong>${it.productName}</strong>
                ${it.discPct > 0 ? `<br/><span class="sub-text">Disc: ${it.discPct}%</span>` : ''}
              </td>
              <td>${it.hsn}</td>
              <td>${it.quantity}<br/>${it.unit}</td>
              <td class="num">₹${it.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="num">₹${it.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              ${doc.isInterState
                ? `<td class="num">₹${it.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br/><span class="sub-text">${it.gstPercent}%</span></td>`
                : `<td class="num">₹${it.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br/><span class="sub-text">${it.gstPercent / 2}%</span></td>
                   <td class="num">₹${it.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br/><span class="sub-text">${it.gstPercent / 2}%</span></td>`}
              <td class="num"><strong>₹${it.totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="${doc.isInterState ? 4 : 4}"></td>
            <td class="num"><strong>Total</strong></td>
            <td class="num"><strong>₹${totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            ${doc.isInterState
              ? `<td class="num"><strong>₹${doc.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>`
              : `<td class="num"><strong>₹${doc.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                 <td class="num"><strong>₹${doc.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>`}
            <td class="num"><strong>₹${doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        </tfoot>
      </table>` : `
      <div style="padding:16px;text-align:center;font-size:11px;color:#666;">
        <p>Amount: <strong>₹${doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
        ${doc.reason ? `<p>Reason: ${doc.reason}</p>` : ''}
      </div>`}

      <div class="totals-section">
        ${fs.showBankDetails && fs.bankName ? `
        <div class="bank-details">
          <p><strong>Account Holder Name:</strong> ${firm?.firmName || ''}</p>
          <p><strong>Bank Name:</strong> ${fs.bankName}</p>
          <p><strong>Account Number:</strong> ${fs.accountNumber}</p>
          <p><strong>Branch Name:</strong> ${fs.branchName}</p>
          <p><strong>IFSC Code:</strong> ${fs.ifscCode}</p>
        </div>` : '<div></div>'}
        <div class="amount-summary">
          <table class="summary-table">
            <tr><td>Total Taxable Value</td><td class="num">₹${totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Total Tax Amount</td><td class="num">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            ${doc.roundOff !== 0 ? `<tr><td>Round Off</td><td class="num">₹${doc.roundOff > 0 ? '+' : ''}${doc.roundOff.toFixed(2)}</td></tr>` : ''}
            <tr class="grand"><td>Total Value (in figure)</td><td class="num">₹${doc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Total Value (in words)</td><td class="num words-val">₹ ${numberToWords(Math.round(doc.grandTotal))} Only</td></tr>
          </table>
        </div>
      </div>

      <div class="footer-section">
        ${fs.showTerms ? `
        <div class="terms">
          <h4>Terms & Conditions</h4>
          <p>${fs.termsAndConditions.replace(/\n/g, '<br/>')}</p>
        </div>` : '<div></div>'}
        <div class="signature-box">
          <p class="sig-line"><em>Signature</em></p>
          <p class="sig-company">For, ${firm?.firmName || APP_NAME}</p>
          <p class="sig-label">Authorised Signatory</p>
        </div>
      </div>

      <div class="app-footer">
        Generated by <strong>${APP_NAME}</strong> — billsaathi.lovable.app
      </div>
    </div>
  `).join('<div class="page-break"></div>');

  return `<html><head><title>${docTitle} ${doc.docNumber}</title>
  <style>
    @media print { .page-break { page-break-after: always; } @page { margin: 10mm; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; font-size: 11px; color: #333; }
    .page { border: 1.5px solid #2563eb; padding: 0; margin-bottom: 20px; max-width: 210mm; }
    .header-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1.5px solid #2563eb; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand-icon { width: 36px; height: 36px; background: #2563eb; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; }
    .brand-name { font-size: 16px; font-weight: 800; color: #2563eb; }
    .brand-tagline { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-title h1 { font-size: 20px; color: #2563eb; font-weight: 700; }
    .copy-label { text-align: right; font-size: 10px; color: #666; }
    .copy-label strong { font-size: 16px; color: #1e40af; display: block; }
    .firm-section { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #e5e7eb; }
    .firm-details { flex: 1; }
    .firm-name { font-size: 13px; font-weight: 700; color: #111; margin-bottom: 2px; }
    .firm-details p { font-size: 10px; margin: 1px 0; }
    .invoice-meta { text-align: right; }
    .amount-due { background: #2563eb; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; margin-bottom: 6px; display: inline-block; }
    .amount-due strong { font-size: 13px; }
    .meta-table { font-size: 10px; margin-left: auto; }
    .meta-table td { padding: 1px 4px; }
    .meta-table td:first-child { color: #666; text-align: right; }
    .client-section { display: flex; gap: 0; border-bottom: 1px solid #e5e7eb; }
    .client-box { flex: 1; padding: 10px 16px; }
    .client-box:first-child { border-right: 1px solid #e5e7eb; }
    .client-box h4 { font-size: 9px; color: #2563eb; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px; }
    .client-name { font-size: 12px; font-weight: 700; color: #111; }
    .client-box p { font-size: 10px; margin: 1px 0; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th { background: #2563eb; color: white; font-size: 9px; padding: 6px 4px; text-align: center; font-weight: 600; text-transform: uppercase; }
    .items-table td { border: 1px solid #e5e7eb; padding: 6px 4px; font-size: 10px; text-align: center; vertical-align: top; }
    .desc-col { text-align: left !important; min-width: 120px; }
    .num { text-align: right !important; font-variant-numeric: tabular-nums; }
    .sub-text { font-size: 8px; color: #666; }
    .total-row td { border-top: 2px solid #2563eb; background: #f8fafc; }
    .totals-section { display: flex; justify-content: space-between; padding: 10px 16px; border-top: 1px solid #e5e7eb; gap: 16px; }
    .bank-details { flex: 1; font-size: 10px; }
    .bank-details p { margin: 2px 0; }
    .amount-summary { flex: 1; }
    .summary-table { width: 100%; font-size: 10px; }
    .summary-table td { padding: 3px 6px; }
    .summary-table td:first-child { color: #555; }
    .summary-table .grand td { font-weight: 700; font-size: 12px; color: #111; border-top: 1px solid #2563eb; }
    .words-val { font-style: italic; font-size: 10px; color: #2563eb; }
    .footer-section { display: flex; justify-content: space-between; padding: 10px 16px; border-top: 1px solid #e5e7eb; }
    .terms { flex: 1; font-size: 9px; color: #666; }
    .terms h4 { font-size: 10px; color: #333; font-weight: 700; margin-bottom: 4px; }
    .signature-box { text-align: right; min-width: 150px; }
    .sig-line { font-size: 18px; color: #555; margin-bottom: 4px; }
    .sig-company { font-size: 10px; font-weight: 700; color: #333; }
    .sig-label { font-size: 9px; color: #666; margin-top: 2px; }
    .app-footer { text-align: center; font-size: 8px; color: #999; padding: 4px; border-top: 1px solid #e5e7eb; }
  </style></head><body>${pagesHtml}</body></html>`;
}

/** Print: opens new window with same HTML as PDF */
export function printDoc(doc: UnifiedDocData, opts: RenderOptions) {
  const html = generateInvoiceHTML(doc, opts);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

/** PDF: uses the same HTML rendered to canvas, then to PDF */
export async function downloadDocPDF(doc: UnifiedDocData, opts: RenderOptions) {
  const html = generateInvoiceHTML(doc, opts);
  
  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = 'auto';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) { document.body.removeChild(iframe); return; }
  
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
  
  // Wait for render
  await new Promise(r => setTimeout(r, 500));
  
  try {
    const html2canvas = (await import('html2canvas')).default;
    const pages = iframeDoc.querySelectorAll('.page');
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i] as HTMLElement, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
    
    const safeName = doc.customerName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const typePrefix = opts.type === 'credit_note' ? 'CreditNote' : opts.type === 'debit_note' ? 'DebitNote' : 'Invoice';
    pdf.save(`${typePrefix}_${doc.docNumber}_${safeName}.pdf`);
  } catch (err) {
    console.error('PDF generation failed, falling back to print:', err);
    printDoc(doc, opts);
  } finally {
    document.body.removeChild(iframe);
  }
}
