import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { numberToWords, formatDate } from './subscription';
import type { Invoice, User, FirmSettings, Customer, Product, Payment, PurchaseEntry } from './types';

const INR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const safeName = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

// ===== INVOICE PDF =====
export function downloadInvoicePDF(inv: Invoice, firm: User | null | undefined, copyType?: string) {
  const fs: FirmSettings = firm?.firmSettings || {
    address: '', city: '', state: '', stateCode: '', pincode: '',
    bankName: '', accountNumber: '', ifscCode: '', branchName: '',
    invoicePrefix: 'INV', financialYearStart: 4,
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. E&OE',
    showBankDetails: true, showTerms: true, showEwayBill: false, invoiceCopyLabel: 'original',
  };

  const copies = copyType === 'all'
    ? ['Original for Recipient', 'Duplicate for Transporter', 'Triplicate for Supplier']
    : [copyType === 'duplicate' ? 'Duplicate for Transporter' : copyType === 'triplicate' ? 'Triplicate for Supplier' : 'Original for Recipient'];

  const doc = new jsPDF();

  copies.forEach((copyLabel, ci) => {
    if (ci > 0) doc.addPage();
    let y = 10;
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pw / 2, y, { align: 'center' }); y += 6;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`(${copyLabel})`, pw / 2, y, { align: 'center' }); y += 8;

    // Seller & Buyer
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('SELLER:', 14, y); doc.text('BUYER:', pw / 2 + 5, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const sellerLines = [
      firm?.firmName || '', `${fs.address}${fs.city ? ', ' + fs.city : ''}`,
      `${fs.state}${fs.pincode ? ' - ' + fs.pincode : ''}`,
      `GSTIN: ${firm?.gstNumber || 'N/A'}`, `Phone: ${firm?.phone || ''} | Email: ${firm?.email || ''}`,
      `State: ${fs.state} (${fs.stateCode})`
    ];
    const buyerLines = [
      inv.customerName, inv.customerAddress,
      `GSTIN: ${inv.customerGst || 'N/A'}`,
      `State: ${inv.customerState || ''} (${inv.customerStateCode || ''})`
    ];
    const maxLines = Math.max(sellerLines.length, buyerLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (sellerLines[i]) doc.text(sellerLines[i], 14, y);
      if (buyerLines[i]) doc.text(buyerLines[i], pw / 2 + 5, y);
      y += 4;
    }
    y += 2;

    // Invoice info
    doc.setDrawColor(100); doc.line(14, y, pw - 14, y); y += 5;
    doc.setFontSize(8);
    doc.text(`Invoice No: ${inv.invoiceNumber}`, 14, y);
    doc.text(`Date: ${formatDate(inv.date)}`, pw / 2 - 10, y);
    doc.text(`Place of Supply: ${inv.placeOfSupply || ''}`, pw - 14, y, { align: 'right' });
    y += 4;
    if (inv.vehicleNumber) { doc.text(`Vehicle: ${inv.vehicleNumber}`, 14, y); y += 4; }
    if (inv.ewayBillNumber) { doc.text(`E-Way Bill: ${inv.ewayBillNumber}`, 14, y); y += 4; }
    y += 2;

    // Items table
    const itemRows = inv.items.map((it, i) => {
      const taxable = it.price * it.quantity;
      const disc = it.mrp && it.mrp > it.price ? Math.round(((it.mrp - it.price) / it.mrp) * 100) + '%' : '-';
      return [i + 1, it.productName, it.hsn, it.quantity, it.unit, INR(it.mrp || it.price), INR(it.price), disc, INR(taxable)];
    });

    autoTable(doc, {
      startY: y,
      head: [['Sr', 'Description', 'HSN', 'Qty', 'Unit', 'MRP', 'Rate', 'Disc', 'Taxable']],
      body: itemRows,
      theme: 'grid',
      headStyles: { fillColor: [26, 35, 126], fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'center' }, 8: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // HSN-wise tax breakup
    const hsnBreakup: Record<string, { hsn: string; taxable: number; rate: number; cgst: number; sgst: number; igst: number }> = {};
    inv.items.forEach(it => {
      const key = `${it.hsn}_${it.gstPercent}`;
      const taxable = it.price * it.quantity;
      const gst = taxable * it.gstPercent / 100;
      if (!hsnBreakup[key]) hsnBreakup[key] = { hsn: it.hsn, taxable: 0, rate: it.gstPercent, cgst: 0, sgst: 0, igst: 0 };
      hsnBreakup[key].taxable += taxable;
      if (inv.isInterState) hsnBreakup[key].igst += gst;
      else { hsnBreakup[key].cgst += gst / 2; hsnBreakup[key].sgst += gst / 2; }
    });

    const taxHead = inv.isInterState
      ? [['HSN', 'Taxable', 'IGST Rate', 'IGST Amt']]
      : [['HSN', 'Taxable', 'CGST Rate', 'CGST Amt', 'SGST Rate', 'SGST Amt']];
    const taxRows = Object.values(hsnBreakup).map(h => inv.isInterState
      ? [h.hsn, INR(h.taxable), h.rate + '%', INR(h.igst)]
      : [h.hsn, INR(h.taxable), (h.rate / 2) + '%', INR(h.cgst), (h.rate / 2) + '%', INR(h.sgst)]
    );

    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(inv.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)', 14, y); y += 2;

    autoTable(doc, {
      startY: y,
      head: taxHead,
      body: taxRows,
      theme: 'grid',
      headStyles: { fillColor: [40, 53, 147], fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // Totals
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const totals = [
      `Taxable Value: ${INR(inv.totalAmount)}`,
      ...(inv.isInterState
        ? [`IGST: ${INR(inv.totalIgst)}`]
        : [`CGST: ${INR(inv.totalCgst)}`, `SGST: ${INR(inv.totalSgst)}`]),
      ...(inv.roundOff !== 0 ? [`Round Off: ${inv.roundOff > 0 ? '+' : ''}${inv.roundOff.toFixed(2)}`] : []),
    ];
    totals.forEach(t => { doc.text(t, pw - 14, y, { align: 'right' }); y += 4; });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(`GRAND TOTAL: ${INR(inv.grandTotal)}`, pw - 14, y, { align: 'right' }); y += 5;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
    doc.text(`${numberToWords(Math.round(inv.grandTotal))} Rupees Only`, pw - 14, y, { align: 'right' }); y += 8;

    // Bank Details
    if (fs.showBankDetails && fs.bankName) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text('Bank Details:', 14, y); y += 4;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text(`Bank: ${fs.bankName} | A/C: ${fs.accountNumber} | IFSC: ${fs.ifscCode} | Branch: ${fs.branchName}`, 14, y);
      y += 6;
    }

    // Authorised Signatory
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Authorised Signatory', pw - 14, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(firm?.firmName || '', pw - 14, y + 20, { align: 'right' });

    // Terms
    if (fs.showTerms && fs.termsAndConditions) {
      const termsY = Math.max(y + 2, doc.internal.pageSize.getHeight() - 30);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('Terms & Conditions:', 14, termsY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      const lines = fs.termsAndConditions.split('\n');
      lines.forEach((l, i) => doc.text(l, 14, termsY + 4 + i * 3));
    }
  });

  const custName = safeName(inv.customerName);
  doc.save(`Invoice_${inv.invoiceNumber}_${custName}_${inv.date}.pdf`);
}

// ===== EXCEL HELPERS =====
export function downloadExcel(data: any[], sheetName: string, fileName: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  XLSX.writeFile(wb, fileName + '.xlsx');
}

export function downloadMultiSheetExcel(sheets: { data: any[]; name: string }[], fileName: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ data, name }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  });
  XLSX.writeFile(wb, fileName + '.xlsx');
}

// ===== INVOICE EXCEL =====
export function downloadInvoiceExcel(inv: Invoice) {
  const details = [{
    'Invoice No': inv.invoiceNumber, Date: inv.date, Customer: inv.customerName,
    GSTIN: inv.customerGst || 'N/A', 'Place of Supply': inv.placeOfSupply,
    Subtotal: inv.totalAmount, CGST: inv.totalCgst, SGST: inv.totalSgst, IGST: inv.totalIgst,
    'Grand Total': inv.grandTotal, Status: inv.status,
  }];
  const items = inv.items.map((it, i) => ({
    Sr: i + 1, Product: it.productName, HSN: it.hsn, Qty: it.quantity, Unit: it.unit,
    MRP: it.mrp, Rate: it.price, 'Discount%': it.discount || 0,
    Taxable: it.price * it.quantity, 'GST%': it.gstPercent,
    'GST Amt': (it.price * it.quantity * it.gstPercent / 100).toFixed(2),
    Total: (it.price * it.quantity * (1 + it.gstPercent / 100)).toFixed(2),
  }));
  downloadMultiSheetExcel([
    { data: details, name: 'Invoice Details' },
    { data: items, name: 'Tax Breakup' },
  ], `Invoice_${inv.invoiceNumber}`);
}

// ===== BULK INVOICE EXCEL =====
export function downloadBulkInvoiceExcel(invoices: Invoice[], dateRange?: string) {
  const rows = invoices.map(i => ({
    'Invoice No': i.invoiceNumber, Date: i.date, Customer: i.customerName,
    GSTIN: i.customerGst || '', Taxable: i.totalAmount,
    CGST: i.totalCgst, SGST: i.totalSgst, IGST: i.totalIgst,
    Total: i.grandTotal, Status: i.status,
    'Created By': i.createdBy.name, Items: i.items.length,
  }));
  downloadExcel(rows, 'Invoices', `InvoiceList_${dateRange || 'All'}`);
}

// ===== GSTR-1 EXCEL (GSTN FORMAT) =====
export function downloadGSTR1Excel(invoices: Invoice[], firmUser: User | null | undefined) {
  const b2b = invoices.filter(i => i.customerGst);
  const b2c = invoices.filter(i => !i.customerGst);
  const b2cl = b2c.filter(i => i.isInterState && i.grandTotal > 250000);
  const b2cs = b2c.filter(i => !(i.isInterState && i.grandTotal > 250000));

  const b2bRows = b2b.map(i => ({
    'GSTIN of Receiver': i.customerGst, 'Receiver Name': i.customerName,
    'Invoice Number': i.invoiceNumber, 'Invoice Date': i.date, 'Invoice Value': i.grandTotal,
    'Place of Supply': i.placeOfSupply, 'Reverse Charge': 'N', 'Invoice Type': 'Regular',
    Rate: i.items[0]?.gstPercent || 0, 'Taxable Value': i.totalAmount,
    IGST: i.totalIgst, CGST: i.totalCgst, SGST: i.totalSgst, Cess: 0,
  }));

  const b2clRows = b2cl.map(i => ({
    'Invoice Number': i.invoiceNumber, 'Invoice Date': i.date, 'Invoice Value': i.grandTotal,
    'Place of Supply': i.placeOfSupply, Rate: i.items[0]?.gstPercent || 0,
    'Taxable Value': i.totalAmount, 'IGST Amount': i.totalIgst, 'Customer Name': i.customerName,
  }));

  // B2CS grouped by rate + state
  const b2csMap: Record<string, { place: string; rate: number; taxable: number; igst: number; cgst: number; sgst: number }> = {};
  b2cs.forEach(i => {
    const key = `${i.placeOfSupply}_${i.items[0]?.gstPercent || 0}`;
    if (!b2csMap[key]) b2csMap[key] = { place: i.placeOfSupply, rate: i.items[0]?.gstPercent || 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
    b2csMap[key].taxable += i.totalAmount;
    b2csMap[key].igst += i.totalIgst;
    b2csMap[key].cgst += i.totalCgst;
    b2csMap[key].sgst += i.totalSgst;
  });
  const b2csRows = Object.values(b2csMap).map(d => ({
    Type: 'OE', 'Place of Supply': d.place, Rate: d.rate,
    'Taxable Value': d.taxable, IGST: d.igst, CGST: d.cgst, SGST: d.sgst,
  }));

  // HSN
  const hsnMap: Record<string, any> = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    const key = `${it.hsn}_${it.gstPercent}`;
    const taxable = it.price * it.quantity;
    const gst = taxable * it.gstPercent / 100;
    if (!hsnMap[key]) hsnMap[key] = { HSN: it.hsn, Description: it.productName, UQC: it.unit, 'Total Qty': 0, 'Total Value': 0, Rate: it.gstPercent, 'Taxable Value': 0, IGST: 0, CGST: 0, SGST: 0 };
    hsnMap[key]['Total Qty'] += it.quantity;
    hsnMap[key]['Total Value'] += taxable + gst;
    hsnMap[key]['Taxable Value'] += taxable;
    if (inv.isInterState) hsnMap[key].IGST += gst;
    else { hsnMap[key].CGST += gst / 2; hsnMap[key].SGST += gst / 2; }
  }));

  // Summary
  const summary = [{
    'Total Invoices': invoices.length, 'Total Taxable': invoices.reduce((s, i) => s + i.totalAmount, 0),
    'Total IGST': invoices.reduce((s, i) => s + i.totalIgst, 0),
    'Total CGST': invoices.reduce((s, i) => s + i.totalCgst, 0),
    'Total SGST': invoices.reduce((s, i) => s + i.totalSgst, 0),
    'Total Value': invoices.reduce((s, i) => s + i.grandTotal, 0),
  }];

  const month = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  downloadMultiSheetExcel([
    { data: b2bRows, name: 'B2B' },
    { data: b2clRows, name: 'B2C Large' },
    { data: b2csRows, name: 'B2C Small' },
    { data: Object.values(hsnMap), name: 'HSN Summary' },
    { data: [{ Note: 'No nil/exempt supplies' }], name: 'Nil-Exempt' },
    { data: summary, name: 'Summary' },
  ], `GSTR1_${safeName(firmUser?.gstNumber || firmUser?.firmName || 'Report')}_${month}`);
}

// ===== GSTR-3B PDF =====
export function downloadGSTR3BPDF(
  firmUser: User | null | undefined,
  totals: { taxable: number; igst: number; cgst: number; sgst: number },
  itc: { igst: number; cgst: number; sgst: number }
) {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('GSTR-3B Summary', 105, y, { align: 'center' }); y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${firmUser?.firmName || ''} | GSTIN: ${firmUser?.gstNumber || ''}`, 105, y, { align: 'center' }); y += 10;

  // 3.1
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('3.1 — Outward Taxable Supplies', 14, y); y += 3;
  autoTable(doc, {
    startY: y,
    head: [['Nature of Supply', 'Taxable Value', 'IGST', 'CGST', 'SGST']],
    body: [
      ['(a) Outward taxable', INR(totals.taxable), INR(totals.igst), INR(totals.cgst), INR(totals.sgst)],
      ['(b) Zero rated', INR(0), INR(0), INR(0), INR(0)],
      ['(c) Nil rated/Exempt', INR(0), '—', '—', '—'],
    ],
    theme: 'grid', headStyles: { fillColor: [26, 35, 126], fontSize: 8 }, bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 4 ITC
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('4 — Input Tax Credit', 14, y); y += 3;
  autoTable(doc, {
    startY: y,
    head: [['', 'IGST', 'CGST', 'SGST']],
    body: [
      ['(A) ITC Available', INR(itc.igst), INR(itc.cgst), INR(itc.sgst)],
      ['(B) ITC Reversed', INR(0), INR(0), INR(0)],
      ['(C) Net ITC', INR(itc.igst), INR(itc.cgst), INR(itc.sgst)],
    ],
    theme: 'grid', headStyles: { fillColor: [40, 53, 147], fontSize: 8 }, bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // 5 Net Tax
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('5 — Tax Payable', 14, y); y += 3;
  autoTable(doc, {
    startY: y,
    head: [['', 'IGST', 'CGST', 'SGST']],
    body: [
      ['Tax on outward', INR(totals.igst), INR(totals.cgst), INR(totals.sgst)],
      ['Less: ITC', INR(itc.igst), INR(itc.cgst), INR(itc.sgst)],
      ['Net Payable', INR(Math.max(0, totals.igst - itc.igst)), INR(Math.max(0, totals.cgst - itc.cgst)), INR(Math.max(0, totals.sgst - itc.sgst))],
    ],
    theme: 'grid', headStyles: { fillColor: [26, 35, 126], fontSize: 8 }, bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.text('Yeh summary hai. Final filing GSTN portal par karein.', 14, doc.internal.pageSize.getHeight() - 10);
  doc.text(`Generated by BillSaathi on ${new Date().toLocaleString('hi-IN')}`, 14, doc.internal.pageSize.getHeight() - 6);

  const month = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  doc.save(`GSTR3B_${safeName(firmUser?.gstNumber || 'Report')}_${month}.pdf`);
}

// ===== MONTHLY REPORT EXCEL =====
export function downloadMonthlyExcel(
  invoices: Invoice[], customers: Customer[], products: Product[],
  payments: Payment[], firmUser: User | null | undefined
) {
  const totalTaxable = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalGst = invoices.reduce((s, i) => s + i.totalGst, 0);
  const totalValue = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const summary = [{
    'Total Invoices': invoices.length, 'Taxable Value': totalTaxable,
    'Total GST': totalGst, 'Invoice Value': totalValue,
    'Amount Received': totalPaid, Outstanding: totalValue - totalPaid,
  }];

  // Rate-wise
  const rateMap: Record<number, { count: number; taxable: number; cgst: number; sgst: number; igst: number }> = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    if (!rateMap[it.gstPercent]) rateMap[it.gstPercent] = { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    const t = it.price * it.quantity; const g = t * it.gstPercent / 100;
    rateMap[it.gstPercent].taxable += t;
    if (inv.isInterState) rateMap[it.gstPercent].igst += g;
    else { rateMap[it.gstPercent].cgst += g / 2; rateMap[it.gstPercent].sgst += g / 2; }
  }));
  invoices.forEach(inv => { const r = inv.items[0]?.gstPercent; if (r !== undefined && rateMap[r]) rateMap[r].count++; });
  const rateRows = Object.entries(rateMap).map(([r, d]) => ({
    'GST Rate': r + '%', Invoices: d.count, Taxable: d.taxable,
    CGST: d.cgst.toFixed(0), SGST: d.sgst.toFixed(0), IGST: d.igst.toFixed(0),
    'Total Tax': (d.cgst + d.sgst + d.igst).toFixed(0),
  }));

  // Customer-wise
  const custRows = customers.map(c => {
    const ci = invoices.filter(i => i.customerId === c.id);
    if (!ci.length) return null;
    const t = ci.reduce((s, i) => s + i.totalAmount, 0);
    const tax = ci.reduce((s, i) => s + i.totalGst, 0);
    const cp = payments.filter(p => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
    return { Customer: c.name, GSTIN: c.gstNumber || '-', Invoices: ci.length, Taxable: t, Tax: tax, Total: t + tax, Paid: cp, Pending: t + tax - cp };
  }).filter(Boolean);

  // Invoice detail
  const invRows = invoices.map(i => ({
    'Invoice No': i.invoiceNumber, Date: i.date, Customer: i.customerName, GSTIN: i.customerGst || '',
    Taxable: i.totalAmount, CGST: i.totalCgst, SGST: i.totalSgst, IGST: i.totalIgst,
    Total: i.grandTotal, Status: i.status, 'Created By': i.createdBy.name,
  }));

  const month = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  downloadMultiSheetExcel([
    { data: summary, name: 'Executive Summary' },
    { data: rateRows, name: 'Rate-wise Summary' },
    { data: custRows as any[], name: 'Customer-wise' },
    { data: invRows, name: 'Invoice Detail' },
  ], `MonthlyReport_${safeName(firmUser?.firmName || 'Report')}_${month}`);
}

// ===== STOCK REPORT =====
export function downloadStockExcel(products: Product[]) {
  const rows = products.map(p => ({
    Product: p.name, HSN: p.hsn, Unit: p.unit, Price: p.price,
    'GST%': p.gstPercent, 'Current Stock': p.stock,
    'Min Level': p.lowStockThreshold,
    Alert: p.stock === 0 ? '🔴 OUT OF STOCK' : p.stock <= p.lowStockThreshold ? '🟡 LOW STOCK' : '🟢 OK',
  }));
  downloadExcel(rows, 'Stock Report', `StockReport_${new Date().toISOString().split('T')[0]}`);
}

// ===== OUTSTANDING EXCEL =====
export function downloadOutstandingExcel(
  customers: Customer[], invoices: Invoice[], payments: Payment[]
) {
  const rows = customers.map(c => {
    const ci = invoices.filter(i => i.customerId === c.id);
    const cp = payments.filter(p => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
    const total = ci.reduce((s, i) => s + i.grandTotal, 0);
    const pending = total - cp;
    if (pending <= 0) return null;
    const oldest = ci.filter(i => i.status !== 'paid').sort((a, b) => a.date.localeCompare(b.date))[0];
    const days = oldest ? Math.ceil((Date.now() - new Date(oldest.date).getTime()) / 86400000) : 0;
    return { Customer: c.name, Phone: c.phone, GSTIN: c.gstNumber || '-', 'Oldest Invoice': oldest?.invoiceNumber || '', Days: days, 'Amount Due': pending };
  }).filter(Boolean);
  downloadExcel(rows as any[], 'Outstanding', `Outstanding_${new Date().toISOString().split('T')[0]}`);
}

// ===== PURCHASE REGISTER EXCEL =====
export function downloadPurchaseExcel(purchases: PurchaseEntry[]) {
  const rows = purchases.map(p => ({
    Date: p.invoiceDate, Supplier: p.supplierName, GSTIN: p.supplierGstin,
    'Invoice No': p.invoiceNumber, Taxable: p.taxableAmount,
    IGST: p.igst, CGST: p.cgst, SGST: p.sgst,
    Total: p.taxableAmount + p.igst + p.cgst + p.sgst, Description: p.description,
  }));
  downloadExcel(rows, 'Purchases', `PurchaseRegister_${new Date().toISOString().split('T')[0]}`);
}

// ===== CUSTOMER LEDGER PDF =====
export function downloadLedgerPDF(
  customer: Customer, invoices: Invoice[], payments: Payment[],
  firmUser: User | null | undefined
) {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT STATEMENT', 105, y, { align: 'center' }); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`${firmUser?.firmName || ''} | GSTIN: ${firmUser?.gstNumber || ''}`, 105, y, { align: 'center' }); y += 10;

  doc.setFontSize(9);
  doc.text(`Customer: ${customer.name}`, 14, y); y += 4;
  doc.text(`Phone: ${customer.phone} | GSTIN: ${customer.gstNumber || 'N/A'}`, 14, y); y += 4;
  doc.text(`Address: ${customer.address}`, 14, y); y += 8;

  // Build ledger entries
  const entries: { date: string; desc: string; debit: number; credit: number }[] = [];
  const ci = invoices.filter(i => i.customerId === customer.id);
  const cp = payments.filter(p => p.customerId === customer.id);
  ci.forEach(i => entries.push({ date: i.date, desc: `Invoice ${i.invoiceNumber}`, debit: i.grandTotal, credit: 0 }));
  cp.forEach(p => entries.push({ date: p.date, desc: `Payment (${p.mode})`, debit: 0, credit: p.amount }));
  entries.sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const rows = entries.map(e => {
    balance += e.debit - e.credit;
    return [formatDate(e.date), e.desc, e.debit ? INR(e.debit) : '', e.credit ? INR(e.credit) : '', INR(balance)];
  });

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Debit', 'Credit', 'Balance']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [26, 35, 126], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  doc.setFontSize(9);
  doc.text(`Total Debit: ${INR(totalDebit)}  |  Total Credit: ${INR(totalCredit)}  |  Closing Balance: ${INR(balance)}`, 14, y);

  doc.save(`Ledger_${safeName(customer.name)}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ===== FULL DATA BACKUP =====
export async function downloadFullBackup(
  firm: User, users: User[], customers: Customer[], products: Product[],
  invoices: Invoice[], payments: Payment[], purchases: PurchaseEntry[],
  onProgress?: (step: number, total: number) => void
) {
  const zip = new JSZip();
  const total = 9;

  // 1. Firm Info
  onProgress?.(1, total);
  const firmData = [{
    'Firm Name': firm.firmName, GSTIN: firm.gstNumber, Email: firm.email, Phone: firm.phone,
    Plan: firm.plan, 'Subscription End': firm.subscriptionEnd,
    Address: firm.firmSettings?.address || '', City: firm.firmSettings?.city || '',
    State: firm.firmSettings?.state || '', Bank: firm.firmSettings?.bankName || '',
  }];
  zip.file('01_Firm_Info.xlsx', generateXlsxBuffer([{ data: firmData, name: 'Firm Details' }]));

  // 2. Products
  onProgress?.(2, total);
  const prodData = products.map(p => ({
    ID: p.id, Name: p.name, HSN: p.hsn, Price: p.price, 'GST%': p.gstPercent,
    Unit: p.unit, Stock: p.stock, 'Min Stock': p.lowStockThreshold,
  }));
  zip.file('02_Products.xlsx', generateXlsxBuffer([{ data: prodData, name: 'Products' }]));

  // 3. Customers
  onProgress?.(3, total);
  const custData = customers.map(c => ({
    ID: c.id, Name: c.name, Phone: c.phone, GSTIN: c.gstNumber, Address: c.address,
    City: c.city || '', State: c.state || '',
  }));
  zip.file('03_Customers.xlsx', generateXlsxBuffer([{ data: custData, name: 'Customers' }]));

  // 4. Invoices
  onProgress?.(4, total);
  const invMaster = invoices.map(i => ({
    'Invoice No': i.invoiceNumber, Date: i.date, 'Customer ID': i.customerId,
    Customer: i.customerName, Subtotal: i.totalAmount, CGST: i.totalCgst, SGST: i.totalSgst,
    IGST: i.totalIgst, Total: i.grandTotal, Status: i.status, 'Created By': i.createdBy.name,
    Vehicle: i.vehicleNumber,
  }));
  const invItems: any[] = [];
  invoices.forEach(inv => inv.items.forEach((it, idx) => {
    invItems.push({
      'Invoice No': inv.invoiceNumber, Sr: idx + 1, 'Product ID': it.productId,
      Product: it.productName, HSN: it.hsn, Qty: it.quantity, Unit: it.unit,
      MRP: it.mrp, Rate: it.price, 'Disc%': it.discount || 0,
      Taxable: it.price * it.quantity, 'GST%': it.gstPercent,
    });
  }));
  zip.file('04_Invoices.xlsx', generateXlsxBuffer([
    { data: invMaster, name: 'Invoice Master' },
    { data: invItems, name: 'Invoice Items' },
  ]));

  // 5. Payments
  onProgress?.(5, total);
  const payData = payments.map(p => ({
    Date: p.date, 'Customer ID': p.customerId, Amount: p.amount,
    Mode: p.mode, 'Invoice ID': p.invoiceId || '', Note: p.note,
  }));
  zip.file('05_Payments.xlsx', generateXlsxBuffer([{ data: payData, name: 'Payments' }]));

  // 6. Employees
  onProgress?.(6, total);
  const employees = users.filter(u => u.parentUserId === firm.id);
  const empData = employees.map(e => ({
    ID: e.id, Name: e.username, Active: e.active ? 'Yes' : 'No',
    'Invoices Made': invoices.filter(i => i.createdBy.id === e.id).length,
  }));
  zip.file('06_Employees.xlsx', generateXlsxBuffer([{ data: empData.length ? empData : [{ Note: 'No employees' }], name: 'Employees' }]));

  // 7. Purchases
  onProgress?.(7, total);
  const purData = purchases.map(p => ({
    Date: p.invoiceDate, Supplier: p.supplierName, GSTIN: p.supplierGstin,
    'Invoice No': p.invoiceNumber, Taxable: p.taxableAmount,
    IGST: p.igst, CGST: p.cgst, SGST: p.sgst, Description: p.description,
  }));
  zip.file('07_Purchase_Register.xlsx', generateXlsxBuffer([{ data: purData.length ? purData : [{ Note: 'No purchases' }], name: 'Purchases' }]));

  // 8. README
  onProgress?.(8, total);
  zip.file('README.txt', `BillSaathi Data Backup
Firm: ${firm.firmName}
GSTIN: ${firm.gstNumber}
Backup Date: ${new Date().toLocaleString('hi-IN')}

Files:
01_Firm_Info.xlsx — Firm details and settings
02_Products.xlsx — All products with stock levels
03_Customers.xlsx — All customers
04_Invoices.xlsx — All invoices (Master + Line Items)
05_Payments.xlsx — All payments received
06_Employees.xlsx — Employee list
07_Purchase_Register.xlsx — Purchase entries for ITC

To restore: Upload this ZIP in Settings > Data Backup > Restore
`);

  onProgress?.(9, total);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `BillSaathi_Backup_${safeName(firm.firmName)}_${new Date().toISOString().split('T')[0]}.zip`);
}

// ===== CA PACKAGE =====
export async function downloadCAPackage(
  invoices: Invoice[], customers: Customer[], products: Product[],
  payments: Payment[], purchases: PurchaseEntry[],
  firmUser: User | null | undefined,
  totals: { taxable: number; igst: number; cgst: number; sgst: number },
  itc: { igst: number; cgst: number; sgst: number },
  onProgress?: (step: number, total: number) => void
) {
  const zip = new JSZip();
  const total = 6;

  // 1. GSTR-1
  onProgress?.(1, total);
  zip.file(`GSTR1.xlsx`, generateGSTR1Buffer(invoices, firmUser));

  // 2. GSTR-3B
  onProgress?.(2, total);
  // Generate GSTR-3B as text summary
  const gstr3bText = `GSTR-3B Summary\n${firmUser?.firmName} | ${firmUser?.gstNumber}\n\n3.1 Outward: Taxable=${INR(totals.taxable)} IGST=${INR(totals.igst)} CGST=${INR(totals.cgst)} SGST=${INR(totals.sgst)}\n4. ITC: IGST=${INR(itc.igst)} CGST=${INR(itc.cgst)} SGST=${INR(itc.sgst)}\n5. Net: IGST=${INR(Math.max(0, totals.igst - itc.igst))} CGST=${INR(Math.max(0, totals.cgst - itc.cgst))} SGST=${INR(Math.max(0, totals.sgst - itc.sgst))}`;
  zip.file('GSTR3B_Summary.txt', gstr3bText);

  // 3. Outstanding
  onProgress?.(3, total);
  const outRows = customers.map(c => {
    const ci = invoices.filter(i => i.customerId === c.id);
    const cp = payments.filter(p => p.customerId === c.id).reduce((s, p) => s + p.amount, 0);
    const total = ci.reduce((s, i) => s + i.grandTotal, 0);
    const pending = total - cp;
    if (pending <= 0) return null;
    return { Customer: c.name, Phone: c.phone, GSTIN: c.gstNumber || '-', 'Amount Due': pending };
  }).filter(Boolean);
  zip.file('Outstanding_Debtors.xlsx', generateXlsxBuffer([{ data: outRows.length ? outRows as any[] : [{ Note: 'No outstanding' }], name: 'Outstanding' }]));

  // 4. Purchase Register
  onProgress?.(4, total);
  const purData = purchases.map(p => ({
    Date: p.invoiceDate, Supplier: p.supplierName, GSTIN: p.supplierGstin,
    'Invoice No': p.invoiceNumber, Taxable: p.taxableAmount,
    IGST: p.igst, CGST: p.cgst, SGST: p.sgst,
  }));
  zip.file('Purchase_Register.xlsx', generateXlsxBuffer([{ data: purData.length ? purData : [{ Note: 'No purchases' }], name: 'Purchases' }]));

  // 5. HSN Summary
  onProgress?.(5, total);
  const hsnMap: Record<string, any> = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    const key = `${it.hsn}_${it.gstPercent}`;
    const taxable = it.price * it.quantity;
    const gst = taxable * it.gstPercent / 100;
    if (!hsnMap[key]) hsnMap[key] = { HSN: it.hsn, Description: it.productName, UQC: it.unit, Qty: 0, Taxable: 0, Rate: it.gstPercent + '%', IGST: 0, CGST: 0, SGST: 0 };
    hsnMap[key].Qty += it.quantity;
    hsnMap[key].Taxable += taxable;
    if (inv.isInterState) hsnMap[key].IGST += gst;
    else { hsnMap[key].CGST += gst / 2; hsnMap[key].SGST += gst / 2; }
  }));
  zip.file('HSN_Summary.xlsx', generateXlsxBuffer([{ data: Object.values(hsnMap), name: 'HSN' }]));

  // 6. README
  onProgress?.(6, total);
  zip.file('README.txt', `CA Package — ${firmUser?.firmName}\nGenerated: ${new Date().toLocaleString('hi-IN')}\n\nContents:\n- GSTR1.xlsx\n- GSTR3B_Summary.txt\n- Outstanding_Debtors.xlsx\n- Purchase_Register.xlsx\n- HSN_Summary.xlsx`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const month = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  saveAs(blob, `CAPackage_${safeName(firmUser?.firmName || 'Package')}_${month}.zip`);
}

// ===== HELPERS =====
function generateXlsxBuffer(sheets: { data: any[]; name: string }[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ data, name }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
  });
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
}

function generateGSTR1Buffer(invoices: Invoice[], firmUser: User | null | undefined): Uint8Array {
  const b2b = invoices.filter(i => i.customerGst);
  const b2bRows = b2b.map(i => ({
    'GSTIN of Receiver': i.customerGst, 'Receiver Name': i.customerName,
    'Invoice Number': i.invoiceNumber, 'Invoice Date': i.date, 'Invoice Value': i.grandTotal,
    'Place of Supply': i.placeOfSupply, 'Taxable Value': i.totalAmount,
    IGST: i.totalIgst, CGST: i.totalCgst, SGST: i.totalSgst,
  }));

  const hsnMap: Record<string, any> = {};
  invoices.forEach(inv => inv.items.forEach(it => {
    const key = `${it.hsn}_${it.gstPercent}`;
    const taxable = it.price * it.quantity;
    const gst = taxable * it.gstPercent / 100;
    if (!hsnMap[key]) hsnMap[key] = { HSN: it.hsn, Description: it.productName, UQC: it.unit, Qty: 0, 'Total Value': 0, Rate: it.gstPercent + '%', Taxable: 0, IGST: 0, CGST: 0, SGST: 0 };
    hsnMap[key].Qty += it.quantity;
    hsnMap[key]['Total Value'] += taxable + gst;
    hsnMap[key].Taxable += taxable;
    if (inv.isInterState) hsnMap[key].IGST += gst;
    else { hsnMap[key].CGST += gst / 2; hsnMap[key].SGST += gst / 2; }
  }));

  return generateXlsxBuffer([
    { data: b2bRows.length ? b2bRows : [{ Note: 'No B2B invoices' }], name: 'B2B' },
    { data: Object.values(hsnMap), name: 'HSN Summary' },
  ]);
}
