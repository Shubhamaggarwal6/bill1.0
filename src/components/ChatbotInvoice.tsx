import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { numberToWords } from '@/lib/subscription';
import { getStateFromGST } from '@/lib/types';
import { printDoc, downloadDocPDF, invoiceToDocData, creditNoteToDocData, debitNoteToDocData, type UnifiedDocData } from '@/lib/invoiceRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Printer, Pencil, Trash2, RotateCcw, Home, FileText, Download, Share2, ArrowLeft, Plus, Package, Car, User, Hash } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer, Product, InvoiceItem, Invoice, Payment, CreditNote, DebitNote } from '@/lib/types';

// State machine
type ChatStep =
  | 'select-customer' | 'confirm-customer'
  | 'new-customer-name' | 'new-customer-phone' | 'new-customer-gst' | 'new-customer-address'
  | 'vehicle' | 'add-product' | 'product-selling-price' | 'product-discount' | 'product-quantity'
  | 'new-product-name' | 'new-product-hsn' | 'new-product-price' | 'new-product-gst' | 'new-product-unit'
  | 'more-products'
  // NEW: Payment mode flow
  | 'payment-mode' | 'payment-ref'
  // CN flow steps (strict state machine)
  | 'cn-select-customer' | 'cn-confirm-customer' | 'cn-select-invoice'
  | 'cn-return-type' | 'cn-select-products'
  | 'cn-product-qty' | 'cn-product-rate'
  | 'cn-more-products' // asked once only
  | 'cn-search-product' | 'cn-manual-product-qty' | 'cn-manual-product-rate'
  | 'cn-amount' | 'cn-amount-gst'
  | 'cn-misc-amount' | 'cn-misc-reason' | 'cn-misc-gst'
  | 'cn-extra-misc' | 'cn-extra-misc-desc' | 'cn-extra-misc-gst'
  | 'cn-note' | 'cn-confirm'
  // Post-invoice credit note prompt
  | 'ask-credit-note';

type PanelMode = 'chat' | 'preview' | 'edit' | 'done' | 'cn-preview' | 'cn-done';

interface Message {
  from: 'bot' | 'user';
  text: string;
  options?: string[];
  optionKeys?: string[];
}

export default function ChatbotInvoice() {
  const { currentUser, users, customers, products, invoices, payments, setCustomers, setProducts, setInvoices, setPayments, creditNotes, debitNotes, setCreditNotes, setDebitNotes } = useApp();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<ChatStep>('select-customer');
  const [panelMode, setPanelMode] = useState<PanelMode>('chat');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCust, setNewCust] = useState({ name: '', phone: '', gstNumber: '', address: '' });
  const [vehicle, setVehicle] = useState('');
  const [ewayBill, setEwayBill] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<InvoiceItem>>({});
  const [newProd, setNewProd] = useState({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece' });
  const [suggestions, setSuggestions] = useState<(Customer | Product)[]>([]);
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<Invoice[]>([]);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<Invoice | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [startChoice, setStartChoice] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [docType, setDocType] = useState<'invoice' | 'credit-note'>('invoice');
  
  // Payment mode on done screen
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState('');
  
  // Payment status on done screen — UI only until finalized
  const [donePaymentStatus, setDonePaymentStatus] = useState<'paid' | 'partial' | 'pending'>('paid');
  const [partialAmountInput, setPartialAmountInput] = useState('');
  const [paymentFinalized, setPaymentFinalized] = useState(false);
  const [createdDebitNote, setCreatedDebitNote] = useState<DebitNote | null>(null);
  
  // CN flow state
  const [cnCustomer, setCnCustomer] = useState<Customer | null>(null);
  const [cnInvoice, setCnInvoice] = useState<Invoice | null>(null);
  const [cnReturnType, setCnReturnType] = useState<'product' | 'amount' | 'both' | 'misc' | null>(null);
  const [cnProductsQueue, setCnProductsQueue] = useState<{item: InvoiceItem, origQty: number, origRate: number}[]>([]);
  const [cnProductsDone, setCnProductsDone] = useState<InvoiceItem[]>([]);
  const [cnCurrentProductIndex, setCnCurrentProductIndex] = useState(0);
  const [cnMoreProductsAsked, setCnMoreProductsAsked] = useState(false); // FLAG: prevents repeat
  const [cnManualProducts, setCnManualProducts] = useState<InvoiceItem[]>([]);
  const [cnCurrentManualProduct, setCnCurrentManualProduct] = useState<Partial<InvoiceItem>>({});
  const [cnAmount, setCnAmount] = useState(0);
  const [cnAmountGst, setCnAmountGst] = useState(0);
  const [cnMiscAmount, setCnMiscAmount] = useState(0);
  const [cnMiscReason, setCnMiscReason] = useState('');
  const [cnMiscGst, setCnMiscGst] = useState(0);
  const [cnNote, setCnNote] = useState('');
  const [cnItems, setCnItems] = useState<InvoiceItem[]>([]);
  const [lastCreatedCN, setLastCreatedCN] = useState<CreditNote | null>(null);
  // Temp storage for product qty/rate during CN flow
  const [cnTempQty, setCnTempQty] = useState(0);

  const userId = currentUser?.role === 'employee' ? currentUser.parentUserId! : currentUser?.id!;
  const myCustomers = customers.filter(c => c.userId === userId);
  const myProducts = products.filter(p => p.userId === userId);
  const myInvoices = invoices.filter(i => i.userId === userId);

  useEffect(() => {
    if (!initialized) {
      setMessages([{
        from: 'bot',
        text: '🙏 ' + t('chatWelcome'),
        options: ['🧾 Invoice Banao', '📋 Credit Note Banao'],
        optionKeys: ['startInvoice', 'startCreditNote'],
      }]);
      setInitialized(true);
    }
  }, [t, initialized]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (panelMode === 'chat') inputRef.current?.focus(); }, [step, panelMode]);

  const addMsg = (from: 'bot' | 'user', text: string, options?: string[], optionKeys?: string[]) => {
    setMessages(prev => [...prev, { from, text, options, optionKeys }]);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if ((step === 'select-customer' || step === 'cn-select-customer') && value.trim().length >= 1) {
      const q = value.toLowerCase();
      setSuggestions(myCustomers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.gstNumber && c.gstNumber.toLowerCase().includes(q))).slice(0, 5));
    } else if ((step === 'add-product' || step === 'cn-search-product' || step === 'new-product-name') && value.trim().length >= 1) {
      const q = value.toLowerCase();
      setSuggestions(myProducts.filter(p => p.name.toLowerCase().includes(q) || p.hsn.toLowerCase().includes(q)).slice(0, 5));
    } else if (step === 'cn-select-invoice' && value.trim().length >= 1) {
      const q = value.toLowerCase();
      const custInvoices = cnCustomer ? myInvoices.filter(i => i.customerId === cnCustomer.id) : myInvoices;
      setInvoiceSuggestions(custInvoices.filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q)).slice(0, 5));
    } else {
      setSuggestions([]);
      setInvoiceSuggestions([]);
    }
  };

  const selectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setSuggestions([]);
    setInput('');
    addMsg('user', cust.name);
    if (docType === 'credit-note') {
      setCnCustomer(cust);
      addMsg('bot', `✅ ${cust.name} selected.\n\nKaunsi invoice ke against hai?\n(Enter dabao skip karne ke liye)`);
      setStep('cn-select-invoice');
    } else {
      addMsg('bot', `${t('chatCustomerFound')} ${cust.name}, ${cust.phone}${cust.gstNumber ? ', GST: ' + cust.gstNumber : ''}`,
        [t('btnYesConfirm'), t('btnNoChange')], ['btnYesConfirm', 'btnNoChange']);
      setStep('confirm-customer');
    }
  };

  const selectProduct = (p: Product) => {
    if (step === 'cn-search-product') {
      setCnCurrentManualProduct({ productId: p.id, productName: p.name, hsn: p.hsn, mrp: p.price, gstPercent: p.gstPercent, unit: p.unit });
      setSuggestions([]);
      setInput('');
      addMsg('user', p.name);
      addMsg('bot', `"${p.name}" kitni wapas aayi?\n(Enter = full stock)`);
      setStep('cn-manual-product-qty');
      return;
    }
    setCurrentItem({ productId: p.id, productName: p.name, hsn: p.hsn, mrp: p.price, gstPercent: p.gstPercent, unit: p.unit });
    setSuggestions([]);
    setInput('');
    addMsg('user', p.name);
    addMsg('bot', t('chatStockInfo', { name: p.name, price: String(p.price), unit: p.unit, stock: String(p.stock) }) + '\n' + t('sellingPrice'));
    setStep('product-selling-price');
  };

  const selectInvoiceForCN = (inv: Invoice) => {
    setCnInvoice(inv);
    setInvoiceSuggestions([]);
    setInput('');
    addMsg('user', inv.invoiceNumber);
    addMsg('bot', `✅ ${inv.invoiceNumber} select hua\n${inv.customerName} — ₹${inv.grandTotal.toLocaleString('en-IN')}\n\nKya return/adjust karna hai?`,
      ['📦 Product Wapas', '💰 Amount Adjust', '📦+💰 Dono', '📝 Miscellaneous Only'],
      ['cnProduct', 'cnAmount', 'cnBoth', 'cnMisc']);
    setStep('cn-return-type');
  };

  const goToPreview = () => { setPanelMode('preview'); };

  const handleStartOption = (opt: string, optKey?: string) => {
    addMsg('user', opt);
    setStartChoice(true);
    if (optKey === 'startInvoice') {
      setDocType('invoice');
      addMsg('bot', t('chatWelcome') + '\n' + t('chatSearchCustomer'), [t('btnOldCustomer'), t('btnNewCustomer')], ['btnOldCustomer', 'btnNewCustomer']);
      return;
    }
    if (optKey === 'startCreditNote') {
      setDocType('credit-note');
      addMsg('bot', 'Kis customer ke liye credit note banana hai?\nCustomer search karein:');
      setStep('cn-select-customer');
      return;
    }
    if (optKey === 'btnOldCustomer' || opt === t('btnOldCustomer')) {
      addMsg('bot', t('chatSearchCustomer'));
      setStep('select-customer');
    } else if (optKey === 'btnNewCustomer' || opt === t('btnNewCustomer')) {
      addMsg('bot', t('chatAskName'));
      setStep('new-customer-name');
    }
  };

  const handleOptionClick = (opt: string, optKey?: string) => {
    if (!startChoice || optKey === 'startInvoice' || optKey === 'startCreditNote' || optKey === 'btnOldCustomer' || optKey === 'btnNewCustomer') {
      if (!startChoice && !['startInvoice', 'startCreditNote'].includes(optKey || '')) {
        handleStartOption(opt, optKey);
        return;
      }
      handleStartOption(opt, optKey);
      return;
    }

    addMsg('user', opt);

    if (step === 'confirm-customer') {
      if (optKey === 'btnYesConfirm' || opt === t('btnYesConfirm')) {
        addMsg('bot', t('chatAskVehicle'));
        setStep('vehicle');
      } else {
        setSelectedCustomer(null);
        addMsg('bot', t('chatSearchCustomer'));
        setStep('select-customer');
      }
      return;
    }
    if (step === 'more-products') {
      if (optKey === 'btnYesAdd' || opt === t('btnYesAdd')) {
        addMsg('bot', t('chatAskProduct'));
        setStep('add-product');
      } else {
        // User said no more products — IMMEDIATELY show preview
        goToPreview();
      }
      return;
    }
    
    // Payment mode selection (6 options)
    if (step === 'payment-mode') {
      const modeMap: Record<string, string> = {
        '💵 Cash': 'Cash', '📱 UPI': 'UPI', '🏦 NEFT': 'NEFT',
        '🏦 RTGS': 'RTGS', '🧾 Cheque': 'Cheque', '⏳ Baad Mein / Credit': 'Credit',
      };
      const mode = modeMap[opt] || opt;
      setSelectedPaymentMode(mode);
      if (mode === 'Credit') {
        // Directly finalize as pending
        setDonePaymentStatus('pending');
        finalizeInvoicePayment('pending', 0, 'Credit', '');
      } else {
        addMsg('bot', 'Reference number? (Enter = skip)');
        setStep('payment-ref');
      }
      return;
    }

    // CN return type
    if (step === 'cn-return-type') {
      if (optKey === 'cnProduct') { setCnReturnType('product'); startCnProductSelection(); }
      else if (optKey === 'cnAmount') { setCnReturnType('amount'); addMsg('bot', 'Kitna amount adjust karna hai?'); setStep('cn-amount'); }
      else if (optKey === 'cnBoth') { setCnReturnType('both'); startCnProductSelection(); }
      else if (optKey === 'cnMisc') { setCnReturnType('misc'); addMsg('bot', 'Miscellaneous amount kitna hai?'); setStep('cn-misc-amount'); }
      return;
    }
    
    // GST rate selection for CN amount
    if (step === 'cn-amount-gst') {
      const gstMap: Record<string, number> = { '0%': 0, '5%': 5, '12%': 12, '18%': 18, '28%': 28, 'No GST': 0 };
      const gst = gstMap[opt] ?? 0;
      setCnAmountGst(gst);
      addMsg('bot', 'Koi aur miscellaneous amount add karna hai?\n(Enter = nahi)');
      setStep('cn-extra-misc');
      return;
    }
    
    // CN more products asked ONCE
    if (step === 'cn-more-products') {
      if (optKey === 'cnMoreProduct' || opt === 'Haan') {
        // Let user search more products
        addMsg('bot', 'Product ka naam likhein:');
        setStep('cn-search-product');
      } else {
        // No more products — move forward
        movePastCnProducts();
      }
      return;
    }
    
    // CN manual product "Aur product add karna hai?"
    if (step === 'cn-manual-product-rate') {
      // This is handled in handleSend
      return;
    }

    // Post-invoice credit note prompt
    if (step === 'ask-credit-note') {
      if (optKey === 'cnYes') {
        setDocType('credit-note');
        setCnCustomer({ id: lastCreatedInvoice!.customerId, userId, name: lastCreatedInvoice!.customerName, phone: '', gstNumber: lastCreatedInvoice!.customerGst, address: lastCreatedInvoice!.customerAddress });
        setCnInvoice(lastCreatedInvoice);
        addMsg('bot', 'Kya return/adjust karna hai?',
          ['📦 Product Wapas', '💰 Amount Adjust', '📦+💰 Dono', '📝 Miscellaneous Only'],
          ['cnProduct', 'cnAmount', 'cnBoth', 'cnMisc']);
        setStep('cn-return-type');
      }
      return;
    }

    if (optKey === 'btnNewCustomer' || opt === t('btnNewCustomer')) { addMsg('bot', t('chatAskName')); setStep('new-customer-name'); return; }
    if (optKey === 'chatTryAgain' || opt === t('chatTryAgain')) { addMsg('bot', t('chatSearchCustomer')); setStep('select-customer'); return; }
    if (optKey === 'chatAddNewProduct' || opt === t('chatAddNewProduct')) { addMsg('bot', t('chatNewProductName')); setStep('new-product-name'); return; }
    if (optKey === 'chatNoAdd' || opt === t('chatNoAdd')) { addMsg('bot', t('chatAskProduct')); setStep('add-product'); return; }
    if (step === 'select-customer' || step === 'cn-select-customer') {
      const name = opt.split(' (')[0];
      const cust = myCustomers.find(c => c.name === name);
      if (cust) selectCustomer(cust);
      return;
    }
    if (step === 'add-product' || step === 'cn-search-product' || step === 'new-product-name') {
      const pName = opt.split(' (₹')[0];
      const p = myProducts.find(pr => pr.name === pName);
      if (p) selectProduct(p);
      return;
    }
  };

  // CN flow helpers
  const startCnProductSelection = () => {
    if (cnInvoice && cnInvoice.items.length > 0) {
      const productList = cnInvoice.items.map((it, i) => `${i + 1}. ${it.productName} (${it.quantity} ${it.unit} @ ₹${it.price})`).join('\n');
      addMsg('bot', `Products select karein (numbers comma-separated, e.g. 1,3):\n${productList}`);
      setStep('cn-select-products');
    } else {
      addMsg('bot', 'Product ka naam likhein:');
      setStep('cn-search-product');
    }
  };

  // After all products done, move to next step based on type
  const movePastCnProducts = () => {
    if (cnReturnType === 'both') {
      addMsg('bot', 'Kitna extra amount adjust karna hai? (Enter = skip)');
      setStep('cn-amount');
    } else {
      addMsg('bot', 'Koi aur miscellaneous amount add karna hai?\n(Enter = nahi)');
      setStep('cn-extra-misc');
    }
  };

  const handleSend = () => {
    const text = input.trim();
    const skippableSteps: ChatStep[] = ['vehicle', 'new-customer-gst', 'new-customer-address', 'new-product-hsn', 'add-product', 'product-selling-price', 'product-discount', 'product-quantity',
      'cn-product-rate', 'cn-product-qty', 'cn-amount', 'cn-amount-gst', 'cn-misc-reason', 'cn-misc-gst', 'cn-note',
      'cn-select-invoice', 'cn-extra-misc', 'cn-extra-misc-desc', 'cn-extra-misc-gst', 'cn-manual-product-qty', 'cn-manual-product-rate',
      'payment-ref'];
    if (!text && !skippableSteps.includes(step)) return;
    setInput('');
    setSuggestions([]);
    setInvoiceSuggestions([]);
    if (text) addMsg('user', text);
    else addMsg('user', '(skip)');

    switch (step) {
      // ===== INVOICE FLOW =====
      case 'select-customer': {
        const matches = myCustomers.filter(c => c.name.toLowerCase().includes(text.toLowerCase()));
        if (matches.length === 1) selectCustomer(matches[0]);
        else if (matches.length > 1) addMsg('bot', t('chatWhichCustomer'), matches.map(c => `${c.name} (${c.phone})`));
        else addMsg('bot', t('chatCustomerNotFound'), [t('btnNewCustomer'), t('chatTryAgain')], ['btnNewCustomer', 'chatTryAgain']);
        break;
      }
      case 'new-customer-name': setNewCust(prev => ({ ...prev, name: text })); addMsg('bot', t('chatAskPhone')); setStep('new-customer-phone'); break;
      case 'new-customer-phone': setNewCust(prev => ({ ...prev, phone: text })); addMsg('bot', t('chatAskGST')); setStep('new-customer-gst'); break;
      case 'new-customer-gst': setNewCust(prev => ({ ...prev, gstNumber: text })); addMsg('bot', t('chatAskAddress')); setStep('new-customer-address'); break;
      case 'new-customer-address': {
        const custId = crypto.randomUUID();
        const cust: Customer = { id: custId, userId, name: newCust.name, phone: newCust.phone, gstNumber: newCust.gstNumber, address: text };
        setCustomers(prev => [...prev, cust]);
        setSelectedCustomer(cust);
        setNewCust({ name: '', phone: '', gstNumber: '', address: '' });
        if (docType === 'credit-note') {
          setCnCustomer(cust);
          addMsg('bot', `✅ ${cust.name} saved.\n\nKaunsi invoice ke against hai?\n(Enter dabao skip karne ke liye)`);
          setStep('cn-select-invoice');
        } else {
          addMsg('bot', t('customerSaved', { name: cust.name }) + '\n' + t('chatAskVehicle'));
          setStep('vehicle');
        }
        break;
      }
      case 'vehicle': setVehicle(text); addMsg('bot', t('chatAskProduct')); setStep('add-product'); break;
      case 'add-product': {
        // Allow skipping product selection - go to preview if items exist, otherwise ask again
        if (!text) {
          if (items.length > 0) {
            addMsg('bot', 'Product skip kar diya. Invoice preview dekhein?', [t('btnYesAdd'), t('btnNoMakeInvoice')], ['btnYesAdd', 'btnNoMakeInvoice']);
            setStep('more-products');
          } else {
            addMsg('bot', 'Koi product add nahi kiya. Koi product batayein ya invoice cancel karein?', [t('chatAddNewProduct'), t('btnCancelAll')], ['chatAddNewProduct', 'btnCancelAll']);
          }
          break;
        }
        const matches = myProducts.filter(p => p.name.toLowerCase().includes(text.toLowerCase()));
        if (matches.length === 1) selectProduct(matches[0]);
        else if (matches.length > 1) addMsg('bot', t('chatWhichCustomer'), matches.map(p => `${p.name} (₹${p.price})`));
        else addMsg('bot', t('chatProductNotFound'), [t('chatAddNewProduct'), t('chatNoAdd')], ['chatAddNewProduct', 'chatNoAdd']);
        break;
      }
      case 'product-selling-price': {
        const mrp = currentItem.mrp || 0;
        let sellingPrice = mrp;
        if (!text) {
          // Skip = use MRP as the selling price
          setCurrentItem(prev => ({ ...prev, sellingPrice: mrp }));
          addMsg('bot', `MRP price use kar raha hoon: ₹${mrp}/${currentItem.unit || 'Piece'}\n` + t('chatAskDiscount'));
          setStep('product-discount');
          break;
        }
        const sp = Number(text); if (isNaN(sp) || sp <= 0) { addMsg('bot', t('chatCorrectPrice')); return; } sellingPrice = sp;
        const discountFromMrp = mrp > 0 && sellingPrice < mrp ? Math.round(((mrp - sellingPrice) / mrp) * 100 * 100) / 100 : 0;
        setCurrentItem(prev => ({ ...prev, sellingPrice }));
        let msg = t('chatSellingPrice', { price: String(sellingPrice), unit: currentItem.unit || 'Piece' });
        if (discountFromMrp > 0) msg += '\n' + t('chatMrpDiscount', { pct: String(discountFromMrp) });
        msg += '\n' + t('chatAskDiscount');
        addMsg('bot', msg);
        setStep('product-discount');
        break;
      }
      case 'product-discount': {
        // Allow skipping discount - use 0% discount and continue to quantity
        let discountPct = 0;
        if (text) { const d = Number(text); if (isNaN(d) || d < 0 || d > 100) { addMsg('bot', t('chatCorrectDiscount')); return; } discountPct = d; }
        const sellingPrice = currentItem.sellingPrice || currentItem.mrp || 0;
        const finalPrice = Math.round(sellingPrice * (1 - discountPct / 100) * 100) / 100;
        setCurrentItem(prev => ({ ...prev, discount: discountPct, price: finalPrice }));
        let msg = t('chatFinalPrice', { price: String(finalPrice), unit: currentItem.unit || 'Piece' });
        if (currentItem.mrp && finalPrice < currentItem.mrp) {
          const totalDisc = Math.round(((currentItem.mrp - finalPrice) / currentItem.mrp) * 100 * 100) / 100;
          msg += '\n' + t('chatTotalMrpOff', { pct: String(totalDisc), mrp: String(currentItem.mrp) });
        }
        msg += '\n' + t('chatAskQty');
        addMsg('bot', msg);
        setStep('product-quantity');
        break;
      }
      case 'product-quantity': {
        // Allow skipping this product completely (user pressed Enter without quantity)
        if (!text) {
          setCurrentItem({});
          addMsg('bot', 'Yeh product skip kar diya. Koi aur product batayein?');
          setStep('add-product');
          break;
        }
        const qty = Number(text);
        if (isNaN(qty) || qty <= 0) { addMsg('bot', t('chatCorrectQty')); return; }
        const item: InvoiceItem = { ...currentItem as InvoiceItem, quantity: qty };
        setItems(prev => [...prev, item]);
        setCurrentItem({});
        addMsg('bot', t('productAdded', { name: item.productName, qty: String(qty) }) + '\n' + t('chatMoreProduct'),
          [t('btnYesAdd'), t('btnNoMakeInvoice')], ['btnYesAdd', 'btnNoMakeInvoice']);
        setStep('more-products');
        break;
      }
      case 'new-product-name': setNewProd(prev => ({ ...prev, name: text })); addMsg('bot', t('chatNewProductHSN')); setStep('new-product-hsn'); break;
      case 'new-product-hsn': setNewProd(prev => ({ ...prev, hsn: text })); addMsg('bot', t('chatNewProductPrice')); setStep('new-product-price'); break;
      case 'new-product-price': {
        const price = Number(text);
        if (isNaN(price) || price <= 0) { addMsg('bot', t('chatCorrectPrice')); return; }
        setNewProd(prev => ({ ...prev, price }));
        addMsg('bot', t('chatNewProductGST'));
        setStep('new-product-gst');
        break;
      }
      case 'new-product-gst': {
        const gst = text ? Number(text) : 18;
        setNewProd(prev => ({ ...prev, gstPercent: gst }));
        addMsg('bot', t('chatNewProductUnit'));
        setStep('new-product-unit');
        break;
      }
      case 'new-product-unit': {
        const unit = text || 'Piece';
        const prodId = crypto.randomUUID();
        const prod: Product = { id: prodId, userId, name: newProd.name, hsn: newProd.hsn, price: newProd.price, gstPercent: newProd.gstPercent, unit, stock: 0, lowStockThreshold: 5 };
        setProducts(prev => [...prev, prod]);
        setCurrentItem({ productId: prod.id, productName: prod.name, hsn: prod.hsn, mrp: prod.price, gstPercent: prod.gstPercent, unit: prod.unit });
        setNewProd({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece' });
        addMsg('bot', t('chatProductSaved', { name: prod.name, price: String(prod.price), unit: prod.unit }) + '\n' + t('chatAskSellingPrice'));
        setStep('product-selling-price');
        break;
      }
      
      // Payment reference number
      case 'payment-ref': {
        setPaymentRef(text);
        // Now finalize with paid status
        setDonePaymentStatus('paid');
        finalizeInvoicePayment('paid', 0, selectedPaymentMode, text);
        break;
      }

      // ===== CREDIT NOTE FLOW =====
      case 'cn-select-customer': {
        const matches = myCustomers.filter(c => c.name.toLowerCase().includes(text.toLowerCase()));
        if (matches.length === 1) selectCustomer(matches[0]);
        else if (matches.length > 1) addMsg('bot', 'Kaun sa customer?', matches.map(c => `${c.name} (${c.phone})`));
        else addMsg('bot', 'Customer nahi mila.', [t('btnNewCustomer'), t('chatTryAgain')], ['btnNewCustomer', 'chatTryAgain']);
        break;
      }
      case 'cn-select-invoice': {
        if (!text) {
          setCnInvoice(null);
          addMsg('bot', 'Kya return/adjust karna hai?',
            ['📦 Product Wapas', '💰 Amount Adjust', '📦+💰 Dono', '📝 Miscellaneous Only'],
            ['cnProduct', 'cnAmount', 'cnBoth', 'cnMisc']);
          setStep('cn-return-type');
        } else {
          const custInvoices = cnCustomer ? myInvoices.filter(i => i.customerId === cnCustomer.id) : myInvoices;
          const matches = custInvoices.filter(i => i.invoiceNumber.toLowerCase().includes(text.toLowerCase()) || i.customerName.toLowerCase().includes(text.toLowerCase()));
          if (matches.length === 1) {
            selectInvoiceForCN(matches[0]);
          } else if (matches.length > 1) {
            addMsg('bot', 'Kaunsi invoice? Neeche se select karein:');
            setInvoiceSuggestions(matches.slice(0, 5));
          } else {
            addMsg('bot', 'Invoice nahi mili. Phir se try karein ya Enter dabao skip karne ke liye.');
          }
        }
        break;
      }
      case 'cn-select-products': {
        const indices = text.split(',').map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n));
        const inv = cnInvoice;
        if (!inv) return;
        const validIndices = indices.filter(i => i >= 0 && i < inv.items.length);
        if (validIndices.length === 0) { addMsg('bot', 'Sahi number daalein (1 se ' + inv.items.length + ')'); return; }
        
        // Build products queue
        const queue = validIndices.map(idx => ({
          item: inv.items[idx],
          origQty: inv.items[idx].quantity,
          origRate: inv.items[idx].price,
        }));
        setCnProductsQueue(queue);
        setCnCurrentProductIndex(0);
        setCnProductsDone([]);
        
        const first = queue[0];
        addMsg('bot', `"${first.item.productName}" kitni wapas aayi?\nOriginal: ${first.origQty} ${first.item.unit}\n(Enter = full quantity)`);
        setStep('cn-product-qty');
        break;
      }
      case 'cn-product-qty': {
        const current = cnProductsQueue[cnCurrentProductIndex];
        if (!current) return;
        const qty = text ? Number(text) : current.origQty;
        if (isNaN(qty) || qty <= 0 || qty > current.origQty) { addMsg('bot', `0 se ${current.origQty} ke beech mein daalein`); return; }
        setCnTempQty(qty);
        addMsg('bot', `Rate kya hogi?\nOriginal rate: ₹${current.origRate}\n(Enter = original rate)`);
        setStep('cn-product-rate');
        break;
      }
      case 'cn-product-rate': {
        const current = cnProductsQueue[cnCurrentProductIndex];
        if (!current) return;
        const rate = text ? Number(text) : current.origRate;
        if (isNaN(rate) || rate <= 0) { addMsg('bot', 'Sahi rate daalein'); return; }
        
        // Add to done list
        const doneItem: InvoiceItem = {
          productId: current.item.productId, productName: current.item.productName,
          hsn: current.item.hsn, quantity: cnTempQty, mrp: current.item.mrp,
          sellingPrice: rate, price: rate, discount: 0,
          gstPercent: current.item.gstPercent, unit: current.item.unit,
        };
        setCnProductsDone(prev => [...prev, doneItem]);
        
        const nextIdx = cnCurrentProductIndex + 1;
        if (nextIdx < cnProductsQueue.length) {
          // More products in queue
          setCnCurrentProductIndex(nextIdx);
          const next = cnProductsQueue[nextIdx];
          addMsg('bot', `"${next.item.productName}" kitni wapas aayi?\nOriginal: ${next.origQty} ${next.item.unit}\n(Enter = full quantity)`);
          setStep('cn-product-qty');
        } else if (!cnMoreProductsAsked) {
          // All queue done, ask "more products?" ONCE
          setCnMoreProductsAsked(true);
          addMsg('bot', 'Aur koi product wapas karna hai?', ['Haan', 'Nahi'], ['cnMoreProduct', 'cnNoMoreProduct']);
          setStep('cn-more-products');
        } else {
          // Already asked, move forward
          movePastCnProducts();
        }
        break;
      }
      case 'cn-search-product': {
        const matches = myProducts.filter(p => p.name.toLowerCase().includes(text.toLowerCase()));
        if (matches.length === 1) selectProduct(matches[0]);
        else if (matches.length > 1) addMsg('bot', 'Kaun sa product?', matches.slice(0, 5).map(p => `${p.name} (₹${p.price})`));
        else addMsg('bot', 'Product nahi mila. Phir se try karein.');
        break;
      }
      case 'cn-manual-product-qty': {
        const p = cnCurrentManualProduct;
        const qty = text ? Number(text) : 1;
        if (isNaN(qty) || qty <= 0) { addMsg('bot', 'Sahi quantity daalein'); return; }
        setCnCurrentManualProduct(prev => ({ ...prev, quantity: qty }));
        addMsg('bot', `Rate kya hogi?\n(Original: ₹${p.mrp || 0} — Enter = same rate)`);
        setStep('cn-manual-product-rate');
        break;
      }
      case 'cn-manual-product-rate': {
        const p = cnCurrentManualProduct;
        const rate = text ? Number(text) : (p.mrp || 0);
        if (isNaN(rate) || rate <= 0) { addMsg('bot', 'Sahi rate daalein'); return; }
        const item: InvoiceItem = {
          productId: p.productId || '', productName: p.productName || '',
          hsn: p.hsn || '', quantity: cnCurrentManualProduct.quantity || 1,
          mrp: p.mrp || rate, sellingPrice: rate, price: rate,
          discount: 0, gstPercent: p.gstPercent || 18, unit: p.unit || 'Piece',
        };
        setCnProductsDone(prev => [...prev, item]);
        setCnManualProducts(prev => [...prev, item]);
        setCnCurrentManualProduct({});
        
        // If more products not asked yet, ask once
        if (!cnMoreProductsAsked) {
          setCnMoreProductsAsked(true);
          addMsg('bot', `✅ ${item.productName} added.\nAur koi product wapas karna hai?`, ['Haan', 'Nahi'], ['cnMoreProduct', 'cnNoMoreProduct']);
          setStep('cn-more-products');
        } else {
          // Already asked, move forward
          movePastCnProducts();
        }
        break;
      }
      case 'cn-amount': {
        const amt = text ? Number(text) : 0;
        if (text && (isNaN(amt) || amt < 0)) { addMsg('bot', 'Sahi amount daalein'); return; }
        setCnAmount(amt);
        if (amt > 0) {
          addMsg('bot', 'GST lagega? Rate select karein:', ['0%', '5%', '12%', '18%', '28%', 'No GST']);
          setStep('cn-amount-gst');
        } else {
          addMsg('bot', 'Koi aur miscellaneous amount add karna hai?\n(Enter = nahi)');
          setStep('cn-extra-misc');
        }
        break;
      }
      case 'cn-misc-amount': {
        const amt = Number(text);
        if (isNaN(amt) || amt <= 0) { addMsg('bot', 'Sahi amount daalein'); return; }
        setCnMiscAmount(amt);
        addMsg('bot', 'Description? (Enter = skip)');
        setStep('cn-misc-reason');
        break;
      }
      case 'cn-misc-reason': {
        setCnMiscReason(text);
        addMsg('bot', 'GST lagega? (Enter = nahi)\nOptions: 0, 5, 12, 18, 28');
        setStep('cn-misc-gst');
        break;
      }
      case 'cn-misc-gst': {
        const gst = text ? Number(text) : 0;
        setCnMiscGst(gst);
        addMsg('bot', 'Koi aur miscellaneous amount add karna hai?\n(Enter = nahi)');
        setStep('cn-extra-misc');
        break;
      }
      case 'cn-extra-misc': {
        if (!text) {
          addMsg('bot', 'Koi note likhna hai? (Enter = skip)');
          setStep('cn-note');
        } else {
          const amt = Number(text);
          if (isNaN(amt) || amt <= 0) { addMsg('bot', 'Amount ya Enter daalein'); return; }
          setCnMiscAmount(prev => prev + amt);
          addMsg('bot', 'Description? (Enter = skip)');
          setStep('cn-extra-misc-desc');
        }
        break;
      }
      case 'cn-extra-misc-desc': {
        if (text) setCnMiscReason(prev => prev ? prev + ', ' + text : text);
        addMsg('bot', 'GST rate? (Enter = no GST)');
        setStep('cn-extra-misc-gst');
        break;
      }
      case 'cn-extra-misc-gst': {
        const gst = text ? Number(text) : 0;
        if (text && !isNaN(gst)) setCnMiscGst(gst);
        addMsg('bot', 'Koi note likhna hai? (Enter = skip)');
        setStep('cn-note');
        break;
      }
      case 'cn-note': {
        setCnNote(text);
        buildCnItems();
        setPanelMode('cn-preview');
        break;
      }
    }
  };

  const buildCnItems = () => {
    const builtItems: InvoiceItem[] = [...cnProductsDone];
    
    // Amount adjustment
    if (cnAmount > 0) {
      builtItems.push({
        productId: '', productName: 'Amount Adjustment', hsn: '',
        quantity: 1, mrp: cnAmount, sellingPrice: cnAmount, price: cnAmount,
        discount: 0, gstPercent: cnAmountGst, unit: 'Piece',
      });
    }
    
    // Misc
    if (cnMiscAmount > 0) {
      builtItems.push({
        productId: '', productName: cnMiscReason || 'Miscellaneous', hsn: '',
        quantity: 1, mrp: cnMiscAmount, sellingPrice: cnMiscAmount, price: cnMiscAmount,
        discount: 0, gstPercent: cnMiscGst, unit: 'Piece',
      });
    }
    
    setCnItems(builtItems);
  };

  const getCnTotals = () => {
    const subtotal = cnItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const gst = cnItems.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent / 100), 0);
    const isInterState = cnInvoice?.isInterState || false;
    return {
      subtotal, gst, total: subtotal + gst, isInterState,
      cgst: isInterState ? 0 : gst / 2,
      sgst: isInterState ? 0 : gst / 2,
      igst: isInterState ? gst : 0,
    };
  };

  const generateNoteNumber = (prefix: string, existingNotes: { id: string }[]) => {
    const year = new Date().getFullYear();
    const count = existingNotes.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  };

  const createCreditNote = () => {
    if (!cnCustomer) return;
    const totals = getCnTotals();
    const cnNumber = generateNoteNumber('CN', creditNotes);
    
    const cn: CreditNote = {
      id: crypto.randomUUID(), userId, creditNoteNumber: cnNumber,
      date: new Date().toISOString().split('T')[0],
      originalInvoiceId: cnInvoice?.id || '', originalInvoiceNumber: cnInvoice?.invoiceNumber || '',
      customerId: cnCustomer.id, customerName: cnCustomer.name,
      reason: cnMiscReason || cnNote || 'Credit Note',
      items: cnItems, subtotal: totals.subtotal,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst,
      total: totals.total, isInterState: totals.isInterState,
      status: 'active',
      createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };
    
    // Update inventory — add back returned products
    const productItems = cnItems.filter(ci => ci.productId && ci.productId !== '');
    if (productItems.length > 0) {
      setProducts(prev => prev.map(p => {
        const returnedItem = productItems.find(ci => ci.productId === p.id);
        if (returnedItem) return { ...p, stock: p.stock + returnedItem.quantity };
        return p;
      }));
    }
    
    setCreditNotes(prev => [...prev, cn]);
    setLastCreatedCN(cn);
    setPanelMode('cn-done');
  };

  const createSilentDebitNote = (inv: Invoice, balanceDue: number, reason: string) => {
    const dnNumber = generateNoteNumber('DN', debitNotes);
    const dn: DebitNote = {
      id: crypto.randomUUID(), userId, debitNoteNumber: dnNumber,
      date: new Date().toISOString().split('T')[0],
      originalInvoiceId: inv.id, originalInvoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId, customerName: inv.customerName,
      reason, items: [], subtotal: balanceDue, cgst: 0, sgst: 0, igst: 0,
      total: balanceDue, isInterState: false, status: 'active',
      createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };
    setDebitNotes(prev => [...prev, dn]);
    return dn;
  };

  // ---- Invoice creation ----
  const createInvoice = () => {
    if (items.length === 0) return;
    const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const totalGst = items.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent) / 100, 0);
    const firmUser = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;
    const sellerStateCode = firmUser?.firmSettings?.stateCode || firmUser?.gstNumber?.substring(0, 2) || '';
    const buyerStateCode = selectedCustomer?.stateCode || (selectedCustomer?.gstNumber ? selectedCustomer.gstNumber.substring(0, 2) : sellerStateCode);
    const isInterState = sellerStateCode !== buyerStateCode;
    const totalCgst = isInterState ? 0 : totalGst / 2;
    const totalSgst = isInterState ? 0 : totalGst / 2;
    const totalIgst = isInterState ? totalGst : 0;
    const rawGrand = totalAmount + totalGst;
    const grandTotal = Math.round(rawGrand);
    const roundOff = Math.round((grandTotal - rawGrand) * 100) / 100;
    const buyerState = getStateFromGST(selectedCustomer?.gstNumber || '');
    const sellerState = getStateFromGST(firmUser?.gstNumber || '');
    const invNum = `${firmUser?.firmSettings?.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(invoices.filter(i => i.userId === userId).length + 1).padStart(4, '0')}`;
    const invoice: Invoice = {
      id: crypto.randomUUID(), userId, invoiceNumber: invNum, date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomer?.id || '', customerName: selectedCustomer?.name || '',
      customerGst: selectedCustomer?.gstNumber || '', customerAddress: selectedCustomer?.address || '',
      customerState: buyerState?.name || selectedCustomer?.state || '', customerStateCode: buyerState?.code || selectedCustomer?.stateCode || '',
      vehicleNumber: vehicle, ewayBillNumber: ewayBill, items,
      totalAmount, totalGst, totalCgst, totalSgst, totalIgst, grandTotal, roundOff,
      isInterState, placeOfSupply: buyerState?.name || '',
      status: 'pending', paidAmount: 0,
      createdBy: { id: currentUser!.id, name: currentUser!.firmName || currentUser!.username, role: currentUser!.role, timestamp: new Date().toISOString() },
    };
    
    // Reduce inventory
    setProducts(prev => prev.map(p => {
      const soldItem = items.find(it => it.productId === p.id);
      if (soldItem) return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
      return p;
    }));
    
    setInvoices(prev => [...prev, invoice]);
    setLastCreatedInvoice(invoice);
    
    // Ask payment mode
    addMsg('bot', 'Payment kaise liya?',
      ['💵 Cash', '📱 UPI', '🏦 NEFT', '🏦 RTGS', '🧾 Cheque', '⏳ Baad Mein / Credit']);
    setStep('payment-mode');
    // Stay in chat panel for payment mode selection
    setPanelMode('chat');
  };

  // Finalize invoice payment and move to done screen
  const finalizeInvoicePayment = (status: 'paid' | 'partial' | 'pending', partialAmt: number, mode: string, ref: string) => {
    const inv = lastCreatedInvoice;
    if (!inv) return;
    
    if (status === 'paid') {
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid', paidAmount: inv.grandTotal } : i));
      const payment: Payment = {
        id: crypto.randomUUID(), userId, customerId: inv.customerId, invoiceId: inv.id,
        amount: inv.grandTotal, date: new Date().toISOString().split('T')[0],
        mode: (mode as Payment['mode']) || 'Cash', note: `${inv.invoiceNumber}${ref ? ' Ref: ' + ref : ''}`,
        timestamp: new Date().toISOString(),
      };
      setPayments(prev => [...prev, payment]);
      setDonePaymentStatus('paid');
    } else {
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'pending', paidAmount: 0 } : i));
      const dn = createSilentDebitNote(inv, inv.grandTotal, 'Payment pending');
      setCreatedDebitNote(dn);
      setDonePaymentStatus('pending');
      toast.success(`✅ ${dn.debitNoteNumber} ban gayi`);
    }
    
    setSelectedPaymentMode(mode);
    setPaymentRef(ref);
    setPaymentFinalized(true);
    setPanelMode('done');
  };

  // Re-finalize when user changes payment status on done screen
  const finalizePaymentStatus = () => {
    if (paymentFinalized) return;
    const inv = lastCreatedInvoice;
    if (!inv) return;
    setPaymentFinalized(true);

    if (donePaymentStatus === 'paid') {
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid', paidAmount: inv.grandTotal } : i));
    } else if (donePaymentStatus === 'partial') {
      const amt = Number(partialAmountInput) || 0;
      if (amt > 0 && amt < inv.grandTotal) {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'partial', paidAmount: amt } : i));
        const payment: Payment = {
          id: crypto.randomUUID(), userId, customerId: inv.customerId, invoiceId: inv.id,
          amount: amt, date: new Date().toISOString().split('T')[0],
          mode: (selectedPaymentMode as Payment['mode']) || 'Cash',
          note: `Partial payment for ${inv.invoiceNumber}`, timestamp: new Date().toISOString(),
        };
        setPayments(prev => [...prev, payment]);
        const balance = inv.grandTotal - amt;
        const dn = createSilentDebitNote(inv, balance, 'Partial payment — balance due');
        setCreatedDebitNote(dn);
        toast.success(`✅ ${dn.debitNoteNumber} ban gayi`);
      }
    } else {
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'pending', paidAmount: 0 } : i));
      const dn = createSilentDebitNote(inv, inv.grandTotal, 'Payment pending');
      setCreatedDebitNote(dn);
      toast.success(`✅ ${dn.debitNoteNumber} ban gayi`);
    }
  };

  const handleNewInvoice = () => {
    if (!paymentFinalized) finalizePaymentStatus();
    setTimeout(resetChat, 100);
  };

  const handleDashboard = () => {
    if (!paymentFinalized) finalizePaymentStatus();
    setTimeout(resetChat, 100);
  };

  const resetChat = () => {
    setMessages([{
      from: 'bot', text: '🙏 ' + t('chatWelcome'),
      options: ['🧾 Invoice Banao', '📋 Credit Note Banao'],
      optionKeys: ['startInvoice', 'startCreditNote'],
    }]);
    setStep('select-customer'); setPanelMode('chat'); setStartChoice(false);
    setSelectedCustomer(null); setNewCust({ name: '', phone: '', gstNumber: '', address: '' });
    setVehicle(''); setEwayBill(''); setItems([]); setCurrentItem({});
    setSuggestions([]); setInvoiceSuggestions([]); setEditField(null); setEditInput('');
    setLastCreatedInvoice(null); setDocType('invoice');
    setSelectedPaymentMode(''); setPaymentRef('');
    setDonePaymentStatus('paid'); setPartialAmountInput('');
    setPaymentFinalized(false); setCreatedDebitNote(null);
    setCnCustomer(null); setCnInvoice(null);
    setCnReturnType(null); setCnProductsQueue([]); setCnProductsDone([]);
    setCnCurrentProductIndex(0); setCnMoreProductsAsked(false);
    setCnAmount(0); setCnAmountGst(0); setCnMiscAmount(0); setCnMiscReason(''); setCnMiscGst(0);
    setCnNote(''); setCnItems([]); setCnManualProducts([]); setCnCurrentManualProduct({});
    setLastCreatedCN(null); setCnTempQty(0);
  };

  const firm = currentUser?.role === 'employee' ? users.find(u => u.id === currentUser.parentUserId) : currentUser;

  const printInvoice = () => {
    const inv = lastCreatedInvoice;
    if (!inv) return;
    printDoc(invoiceToDocData(inv), { type: 'invoice', firm });
  };

  const downloadPDF = async () => {
    const inv = lastCreatedInvoice;
    if (!inv) return;
    await downloadDocPDF(invoiceToDocData(inv), { type: 'invoice', firm });
  };

  const getPlaceholder = (): string => {
    switch (step) {
      case 'select-customer': case 'cn-select-customer': return t('phCustomerSearch');
      case 'new-customer-name': return t('phCustomerName');
      case 'new-customer-phone': return t('phPhone');
      case 'new-customer-gst': return t('phGST');
      case 'new-customer-address': return t('phAddress');
      case 'vehicle': return t('phVehicle');
      case 'add-product': case 'cn-search-product': return t('phProduct') + ' (Enter = skip)';
      case 'product-selling-price': return t('phSellingPrice') + ' (Enter = use MRP price)';
      case 'product-discount': return t('phDiscount') + ' (Enter = 0%)';
      case 'product-quantity': return t('phQty') + ' (Enter = skip product)';
      case 'new-product-name': return t('phProductName');
      case 'new-product-hsn': return t('phHSN');
      case 'new-product-price': return t('phPrice');
      case 'new-product-gst': return t('phGSTRate');
      case 'new-product-unit': return t('phUnit');
      case 'payment-ref': return 'Reference no. (Enter = skip)';
      case 'cn-select-invoice': return 'Invoice no. ya Enter to skip';
      case 'cn-select-products': return 'e.g. 1,2,3';
      case 'cn-product-qty': case 'cn-manual-product-qty': return 'Quantity (Enter = full)';
      case 'cn-product-rate': case 'cn-manual-product-rate': return 'Rate (Enter = original)';
      case 'cn-amount': return 'Amount ₹';
      case 'cn-misc-amount': case 'cn-extra-misc': return 'Amount ₹ (Enter = skip)';
      case 'cn-misc-reason': case 'cn-extra-misc-desc': return 'Description (Enter = skip)';
      case 'cn-misc-gst': case 'cn-extra-misc-gst': return 'GST % (Enter = 0)';
      case 'cn-note': return 'Note (Enter = skip)';
      default: return t('phType');
    }
  };

  const noInputSteps: ChatStep[] = ['confirm-customer', 'more-products', 'payment-mode', 'cn-return-type', 'cn-more-products', 'ask-credit-note', 'cn-amount-gst'];
  const showInput = panelMode === 'chat' && startChoice && !noInputSteps.includes(step);

  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalGst = items.reduce((s, i) => s + (i.price * i.quantity * i.gstPercent) / 100, 0);
  const grandTotal = Math.round(totalAmount + totalGst);

  // Edit handlers
  const handleEditAction = (action: string) => {
    setEditField(action); setEditInput('');
    if (action === 'vehicle') setEditInput(vehicle);
    else if (action === 'eway') setEditInput(ewayBill);
  };
  const applyEdit = () => {
    if (editField === 'vehicle') setVehicle(editInput);
    else if (editField === 'eway') setEwayBill(editInput);
    setEditField(null); setEditInput('');
  };
  const removeProduct = (index: number) => { setItems(prev => prev.filter((_, i) => i !== index)); };

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <h2 className="text-xl font-bold text-foreground mb-4">{t('chatbotTitle')}</h2>

      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* PREVIEW PANEL */}
        {panelMode === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto p-3 space-y-3 flex-1" style={{ maxHeight: '60vh', WebkitOverflowScrolling: 'touch' as any }}>
              <div className="border border-primary/30 rounded-lg overflow-hidden bg-card text-foreground text-xs">
                <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">₹</div>
                    <div>
                      <p className="font-bold text-sm text-primary">BillSaathi</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Billing Made Easier</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-primary">TAX INVOICE</p>
                  <p className="text-[9px] text-muted-foreground">Preview</p>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-muted/50 text-[10px]">
                  <div>
                    <p className="font-bold text-xs">{currentUser?.firmName || 'BillSaathi'}</p>
                    {currentUser?.gstNumber && <p>GSTIN: {currentUser.gstNumber}</p>}
                  </div>
                  <div className="text-right">
                    <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[9px] inline-block">
                      Amount: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <p>Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></p>
                    {vehicle && <p>Vehicle: <strong>{vehicle}</strong></p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 border-b border-muted/50">
                  <div className="px-4 py-2 border-r border-muted/50">
                    <p className="text-[8px] text-primary font-bold uppercase tracking-wide mb-1">Client Details</p>
                    <p className="font-bold text-xs">{selectedCustomer?.name || 'N/A'}</p>
                    {selectedCustomer?.gstNumber && <p className="text-[10px]">GSTIN: {selectedCustomer.gstNumber}</p>}
                  </div>
                  <div className="px-4 py-2">
                    <p className="text-[8px] text-primary font-bold uppercase tracking-wide mb-1">Ship To</p>
                    <p className="font-bold text-xs">{selectedCustomer?.name || 'N/A'}</p>
                  </div>
                </div>
                <table className="w-full text-[10px]">
                  <thead><tr className="bg-primary text-primary-foreground">
                    <th className="px-2 py-1.5 text-left">S.No</th><th className="px-2 py-1.5 text-left">Item</th>
                    <th className="px-2 py-1.5 text-center">Qty</th><th className="px-2 py-1.5 text-right">Rate</th>
                    <th className="px-2 py-1.5 text-right">GST</th><th className="px-2 py-1.5 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {items.map((it, i) => {
                      const taxable = it.price * it.quantity;
                      const gstAmt = taxable * it.gstPercent / 100;
                      return (
                        <tr key={i} className="border-b border-muted/30">
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td className="px-2 py-1.5 font-medium">{it.productName}</td>
                          <td className="px-2 py-1.5 text-center">{it.quantity} {it.unit}</td>
                          <td className="px-2 py-1.5 text-right">₹{it.price.toLocaleString('en-IN')}</td>
                          <td className="px-2 py-1.5 text-right">{it.gstPercent}%</td>
                          <td className="px-2 py-1.5 text-right font-bold">₹{(taxable + gstAmt).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-primary/30 bg-muted/20">
                    <td colSpan={3} className="px-2 py-1.5 text-right font-bold">Total</td>
                    <td className="px-2 py-1.5 text-right font-bold">₹{totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-1.5 text-right font-bold">₹{totalGst.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-1.5 text-right font-bold text-primary">₹{grandTotal.toLocaleString('en-IN')}</td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            <div className="shrink-0 border-t p-3 space-y-2 bg-card">
              <div className="flex gap-2">
                <Button onClick={createInvoice} className="flex-1 min-h-[48px]" disabled={items.length === 0}>✅ {t('btnCreateInvoice')}</Button>
                <Button variant="outline" onClick={() => setPanelMode('edit')} className="min-h-[48px]">✏️ {t('btnEditInvoice')}</Button>
              </div>
              <Button variant="ghost" className="w-full text-destructive min-h-[44px]" onClick={resetChat}>{t('btnCancelAll')}</Button>
            </div>
          </div>
        )}

        {/* CN PREVIEW PANEL */}
        {panelMode === 'cn-preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto p-3 space-y-3 flex-1" style={{ maxHeight: '60vh', WebkitOverflowScrolling: 'touch' as any }}>
              <div className="border border-emerald-500/30 rounded-lg overflow-hidden bg-card text-foreground text-xs">
                <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">CREDIT NOTE PREVIEW</p>
                </div>
                <div className="px-4 py-2 text-[10px] border-b border-muted/50 bg-muted/20">
                  <p>Customer: <strong>{cnCustomer?.name}</strong></p>
                  {cnInvoice && <p>Against: <strong>{cnInvoice.invoiceNumber}</strong></p>}
                </div>
                {cnItems.length > 0 && (
                  <table className="w-full text-[10px]">
                    <thead><tr className="bg-emerald-600 text-white">
                      <th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">Item</th>
                      <th className="px-2 py-1.5 text-center">Qty</th><th className="px-2 py-1.5 text-right">Rate</th>
                      <th className="px-2 py-1.5 text-right">GST%</th><th className="px-2 py-1.5 text-right">Amount</th>
                    </tr></thead>
                    <tbody>
                      {cnItems.map((it, i) => {
                        const taxable = it.price * it.quantity;
                        const gstAmt = taxable * it.gstPercent / 100;
                        return (
                          <tr key={i} className="border-b border-muted/30">
                            <td className="px-2 py-1.5">{i + 1}</td>
                            <td className="px-2 py-1.5 font-medium">{it.productName}</td>
                            <td className="px-2 py-1.5 text-center">{it.quantity} {it.unit}</td>
                            <td className="px-2 py-1.5 text-right">₹{it.price.toLocaleString('en-IN')}</td>
                            <td className="px-2 py-1.5 text-right">{it.gstPercent}%</td>
                            <td className="px-2 py-1.5 text-right font-bold">₹{(taxable + gstAmt).toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <div className="px-4 py-2 text-right text-[10px] border-t border-muted/50">
                  {(() => { const t = getCnTotals(); return (<>
                    <p>Subtotal: <strong>₹{t.subtotal.toLocaleString('en-IN')}</strong></p>
                    {t.isInterState ? <p>IGST: ₹{t.igst.toLocaleString('en-IN')}</p> : <><p>CGST: ₹{t.cgst.toLocaleString('en-IN')}</p><p>SGST: ₹{t.sgst.toLocaleString('en-IN')}</p></>}
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">Total Credit: ₹{t.total.toLocaleString('en-IN')}</p>
                  </>); })()}
                </div>
              </div>
            </div>
            <div className="shrink-0 border-t p-3 space-y-2 bg-card">
              <div className="flex gap-2">
                <Button onClick={createCreditNote} className="flex-1 min-h-[48px] bg-emerald-600 hover:bg-emerald-700">✅ Credit Note Banao</Button>
                <Button variant="outline" onClick={() => { setPanelMode('chat'); }} className="min-h-[48px]">✏️ Kuch Badlein</Button>
              </div>
            </div>
          </div>
        )}

        {/* CN DONE PANEL */}
        {panelMode === 'cn-done' && lastCreatedCN && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">✅ Credit Note Ban Gayi!</h3>
              <p className="text-sm text-muted-foreground">{lastCreatedCN.creditNoteNumber}</p>
              <p className="text-sm text-muted-foreground">Customer: {lastCreatedCN.customerName}</p>
              <p className="text-xl font-bold text-emerald-600">₹{lastCreatedCN.total.toLocaleString('en-IN')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => {
                if (lastCreatedCN) printDoc(creditNoteToDocData(lastCreatedCN), { type: 'credit_note', firm });
              }} className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <Printer className="w-5 h-5" /><span className="text-[10px]">🖨️ Print</span>
              </Button>
              <Button variant="outline" onClick={async () => {
                if (lastCreatedCN) await downloadDocPDF(creditNoteToDocData(lastCreatedCN), { type: 'credit_note', firm });
              }} className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <Download className="w-5 h-5" /><span className="text-[10px]">📄 PDF</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <FileText className="w-5 h-5" /><span className="text-[10px]">📊 Excel</span>
              </Button>
            </div>
            <Button onClick={resetChat} className="w-full min-h-[48px]">🏠 Dashboard</Button>
          </div>
        )}

        {/* EDIT PANEL */}
        {panelMode === 'edit' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-lg font-bold text-foreground">✏️ {t('chatWhatToEdit')}</h3>
            {!editField ? (
              <div className="space-y-2">
                <button onClick={() => handleEditAction('customer')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left min-h-[48px]">
                  <User className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{t('btnChangeCustomer')}</p><p className="text-xs text-muted-foreground">{selectedCustomer?.name || 'N/A'}</p></div>
                </button>
                <button onClick={() => handleEditAction('vehicle')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left min-h-[48px]">
                  <Car className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{t('btnChangeVehicle')}</p><p className="text-xs text-muted-foreground">{vehicle || 'N/A'}</p></div>
                </button>
                <button onClick={() => handleEditAction('eway')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left min-h-[48px]">
                  <Hash className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{t('btnChangeEway')}</p><p className="text-xs text-muted-foreground">{ewayBill || 'N/A'}</p></div>
                </button>
                <button onClick={() => handleEditAction('add-product')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left min-h-[48px]">
                  <Plus className="w-5 h-5 text-primary" />
                  <div><p className="text-sm font-medium text-foreground">{t('btnAddProduct')}</p></div>
                </button>
                <button onClick={() => handleEditAction('remove-product')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left min-h-[48px]">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <div><p className="text-sm font-medium text-foreground">{t('btnRemoveProduct')}</p><p className="text-xs text-muted-foreground">{items.length} {t('products')}</p></div>
                </button>
              </div>
            ) : editField === 'customer' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('chatSelectCustomer')}</p>
                <Input value={editInput} onChange={e => setEditInput(e.target.value)} placeholder={t('phCustomerSearch')} />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {myCustomers.filter(c => !editInput || c.name.toLowerCase().includes(editInput.toLowerCase()) || c.phone.includes(editInput)).slice(0, 8).map(c => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setEditField(null); setEditInput(''); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditField(null)} className="min-h-[44px]"><ArrowLeft className="w-4 h-4 mr-1" /> {t('btnBack')}</Button>
              </div>
            ) : editField === 'vehicle' || editField === 'eway' ? (
              <div className="space-y-3">
                <Input value={editInput} onChange={e => setEditInput(e.target.value)} placeholder={editField === 'vehicle' ? 'DL01AB1234' : 'E-Way Bill No.'} />
                <div className="flex gap-2">
                  <Button onClick={applyEdit} className="flex-1 min-h-[44px]">{t('btnSave')}</Button>
                  <Button variant="ghost" onClick={() => setEditField(null)} className="min-h-[44px]"><ArrowLeft className="w-4 h-4 mr-1" /> {t('btnBack')}</Button>
                </div>
              </div>
            ) : editField === 'add-product' ? (
              <div className="space-y-2">
                <Button onClick={() => { setPanelMode('chat'); addMsg('bot', t('chatAskProduct')); setStep('add-product'); setEditField(null); }} className="w-full min-h-[44px]">{t('btnProductAddChat')}</Button>
                <Button variant="ghost" onClick={() => setEditField(null)} className="w-full min-h-[44px]"><ArrowLeft className="w-4 h-4 mr-1" /> {t('btnBack')}</Button>
              </div>
            ) : editField === 'remove-product' ? (
              <div className="space-y-2">
                {items.length === 0 ? <p className="text-sm text-muted-foreground">{t('noData')}</p> : items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-foreground">{it.productName} × {it.quantity}</span>
                    <Button size="sm" variant="destructive" onClick={() => removeProduct(i)} className="min-h-[36px]"><Trash2 className="w-3 h-3 mr-1" /> {t('delete')}</Button>
                  </div>
                ))}
                <Button variant="ghost" onClick={() => setEditField(null)} className="w-full min-h-[44px]"><ArrowLeft className="w-4 h-4 mr-1" /> {t('btnBack')}</Button>
              </div>
            ) : null}
            {!editField && <Button variant="outline" onClick={() => setPanelMode('preview')} className="w-full min-h-[48px]">{t('btnBackToReview')}</Button>}
          </div>
        )}

        {/* DONE PANEL — Invoice */}
        {panelMode === 'done' && lastCreatedInvoice && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">✅ Invoice Done!</h3>
              <p className="text-sm text-muted-foreground">Invoice No: {lastCreatedInvoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">Customer: {lastCreatedInvoice.customerName}</p>
              <p className="text-xl font-bold text-foreground">₹{lastCreatedInvoice.grandTotal.toLocaleString('en-IN')}</p>
              {selectedPaymentMode && <p className="text-sm text-muted-foreground">Payment: {selectedPaymentMode} ✓</p>}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={printInvoice} className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <Printer className="w-5 h-5" /><span className="text-[10px]">🖨️ Print</span>
              </Button>
              <Button variant="outline" onClick={downloadPDF} className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <Download className="w-5 h-5" /><span className="text-[10px]">📄 PDF</span>
              </Button>
              <Button variant="outline" onClick={async () => {
                const { downloadInvoiceExcel } = await import('@/lib/exportUtils');
                downloadInvoiceExcel(lastCreatedInvoice);
              }} className="flex flex-col items-center gap-1 min-h-[64px] py-3">
                <FileText className="w-5 h-5" /><span className="text-[10px]">📊 Excel</span>
              </Button>
            </div>

            <Button variant="outline" className="w-full min-h-[44px]" onClick={() => {
              const inv = lastCreatedInvoice;
              const text = `Invoice: ${inv.invoiceNumber}%0ACustomer: ${inv.customerName}%0AAmount: ₹${inv.grandTotal.toLocaleString('en-IN')}%0ADate: ${inv.date}`;
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}>
              <Share2 className="w-4 h-4 mr-2" /> 📱 Share WhatsApp
            </Button>

            {/* Payment Status Section — can change and then save */}
            <div className="glass-card p-3 space-y-3">
              <p className="text-sm font-semibold text-foreground text-center">── Payment Status ──</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={donePaymentStatus === 'paid' ? 'default' : 'outline'}
                  className={`min-h-[44px] text-xs ${donePaymentStatus === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  onClick={() => { setDonePaymentStatus('paid'); setPaymentFinalized(false); setCreatedDebitNote(null); }}
                >✅ Paid</Button>
                <Button
                  variant={donePaymentStatus === 'partial' ? 'default' : 'outline'}
                  className={`min-h-[44px] text-xs ${donePaymentStatus === 'partial' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                  onClick={() => { setDonePaymentStatus('partial'); setPaymentFinalized(false); setCreatedDebitNote(null); }}
                >⚡ Partial</Button>
                <Button
                  variant={donePaymentStatus === 'pending' ? 'default' : 'outline'}
                  className={`min-h-[44px] text-xs ${donePaymentStatus === 'pending' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => { setDonePaymentStatus('pending'); setPaymentFinalized(false); setCreatedDebitNote(null); }}
                >⏳ Not Now</Button>
              </div>
              
              {donePaymentStatus === 'partial' && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={partialAmountInput}
                    onChange={e => setPartialAmountInput(e.target.value)}
                    placeholder="Kitna payment mila?"
                  />
                  <p className="text-xs text-muted-foreground text-center">⚡ Debit note auto-banega balance ke liye</p>
                </div>
              )}

              {donePaymentStatus === 'pending' && (
                <p className="text-xs text-muted-foreground text-center">⏳ Debit note auto-banega full amount ke liye</p>
              )}

              {/* Explicit save button for payment status so user controls when it is finalized */}
              <Button
                className="w-full min-h-[40px] mt-1"
                variant={paymentFinalized ? 'outline' : 'default'}
                onClick={() => {
                  // Allow re-finalizing if user changed status after first save
                  setPaymentFinalized(false);
                  finalizePaymentStatus();
                }}
              >
                {paymentFinalized ? '✅ Payment Status Saved' : '💾 Save Payment Status'}
              </Button>

              {/* Always offer credit note option, for Paid / Partial / Not Now */}
              <div className="text-center space-y-2 pt-2 border-t border-muted">
                <p className="text-xs text-muted-foreground">Kya credit note banana hai?</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!paymentFinalized) finalizePaymentStatus();
                    setDocType('credit-note');
                    setCnCustomer({ id: lastCreatedInvoice!.customerId, userId, name: lastCreatedInvoice!.customerName, phone: '', gstNumber: lastCreatedInvoice!.customerGst, address: lastCreatedInvoice!.customerAddress });
                    setCnInvoice(lastCreatedInvoice);
                    addMsg('bot', 'Kya return/adjust karna hai?',
                      ['📦 Product Wapas', '💰 Amount Adjust', '📦+💰 Dono', '📝 Miscellaneous Only'],
                      ['cnProduct', 'cnAmount', 'cnBoth', 'cnMisc']);
                    setStep('cn-return-type');
                    setPanelMode('chat');
                  }} className="min-h-[36px]">Haan</Button>
                  <Button size="sm" variant="ghost" className="min-h-[36px]">Nahi</Button>
                </div>
              </div>
            </div>

            {/* Show created debit note info after finalization */}
            {paymentFinalized && createdDebitNote && (
              <div className="glass-card p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {donePaymentStatus === 'partial' ? '⚡' : '⏳'} Debit Note Created
                </p>
                <p className="text-xs text-muted-foreground">
                  {createdDebitNote.debitNoteNumber} • {donePaymentStatus === 'partial' ? `Balance: ₹${createdDebitNote.total.toLocaleString('en-IN')}` : `₹${createdDebitNote.total.toLocaleString('en-IN')} Pending`}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    await downloadDocPDF(debitNoteToDocData(createdDebitNote), { type: 'debit_note', firm });
                  }} className="min-h-[36px]">📄 PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    printDoc(debitNoteToDocData(createdDebitNote), { type: 'debit_note', firm });
                  }} className="min-h-[36px]">🖨️ Print</Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleNewInvoice} className="flex-1 min-h-[48px]">➕ New Invoice</Button>
              <Button variant="ghost" className="flex-1 min-h-[44px] text-muted-foreground" onClick={handleDashboard}>🏠 Dashboard</Button>
            </div>
          </div>
        )}

        {/* CHAT PANEL */}
        {panelMode === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-line ${msg.from === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {msg.text}
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.options.map((opt, j) => (
                          <button key={opt} onClick={() => handleOptionClick(opt, msg.optionKeys?.[j])}
                            className="px-3 py-1.5 bg-card border rounded-lg text-xs font-medium hover:bg-muted transition-colors text-foreground">
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Invoice suggestions for CN flow */}
            {invoiceSuggestions.length > 0 && step === 'cn-select-invoice' && (
              <div className="border-t bg-card px-3 py-2 space-y-1 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground font-medium mb-1">Invoices:</p>
                {invoiceSuggestions.map(inv => (
                  <button key={inv.id} onClick={() => selectInvoiceForCN(inv)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors border border-muted mb-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{inv.invoiceNumber}</span>
                      <span className="text-sm font-bold text-foreground">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">{inv.customerName} • {inv.date}</span>
                      <span className={`text-xs ${inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{inv.status}</span>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setInput(''); setInvoiceSuggestions([]); handleSend(); }}
                  className="w-full text-center px-3 py-2.5 rounded-lg hover:bg-muted transition-colors border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                  ⏭️ Invoice Nahi Hai / Skip
                </button>
              </div>
            )}

            {suggestions.length > 0 && (step === 'select-customer' || step === 'add-product' || step === 'cn-select-customer' || step === 'cn-search-product' || step === 'new-product-name') && (
              <div className="border-t bg-card px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  {(step === 'select-customer' || step === 'cn-select-customer') ? t('customers') + ':' : t('products') + ':'}
                </p>
                {(step === 'select-customer' || step === 'cn-select-customer') && (suggestions as Customer[]).map(c => (
                  <button key={c.id} onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}{c.gstNumber ? ` • ${c.gstNumber}` : ''}</span>
                  </button>
                ))}
                {(step === 'add-product' || step === 'cn-search-product' || step === 'new-product-name') && (suggestions as Product[]).map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-muted-foreground">₹{p.price} • {t('stock')}: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}

            {showInput && (
              <div className="border-t p-3 flex gap-2">
                <Input ref={inputRef} value={input} onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} placeholder={getPlaceholder()} className="flex-1" />
                <Button size="sm" onClick={handleSend}><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
