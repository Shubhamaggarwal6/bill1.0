// Re-export from unified renderer for backward compatibility
import { generateInvoiceHTML, printDoc, invoiceToDocData, type UnifiedDocData } from './invoiceRenderer';
import type { Invoice, User } from './types';

export function printGSTInvoice(inv: Invoice, firm: User | null | undefined, copyType?: string) {
  const docData = invoiceToDocData(inv);
  printDoc(docData, { type: 'invoice', firm, copy: copyType });
}

export { generateInvoiceHTML, printDoc, invoiceToDocData };
