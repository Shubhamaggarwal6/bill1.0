import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PurchaseEntry, PurchaseProduct } from '@/lib/types';
import { formatDate } from '@/lib/subscription';
import { Plus, Search, X, Download, ArrowLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductRow {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  unit: string;
  hsn: string;
  gstPercent: number;
}

const emptyProductRow = (): ProductRow => ({
  productId: '', productName: '', quantity: 1, rate: 0, unit: 'Piece', hsn: '', gstPercent: 18,
});

function SupplierAutocomplete({
  value, onChange, onSelect, suppliers,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (name: string, gstin: string) => void;
  suppliers: { name: string; gstNumber: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = value
    ? suppliers.filter(s => s.name.toLowerCase().includes(value.toLowerCase()))
    : suppliers;

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Supplier Name"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground"
              onClick={() => { onSelect(s.name, s.gstNumber); setOpen(false); }}
            >
              <span className="font-medium">{s.name}</span>
              {s.gstNumber && <span className="text-xs text-muted-foreground ml-2">({s.gstNumber})</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductAutocomplete({
  value, onChange, onSelect, products, onCreateNew,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: { id: string; name: string; unit: string; hsn: string; gstPercent: number; price: number }) => void;
  products: { id: string; name: string; unit: string; hsn: string; gstPercent: number; price: number }[];
  onCreateNew: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = value
    ? products.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
    : products;

  const exactMatch = products.some(p => p.name.toLowerCase() === value.toLowerCase());

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Product Name"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground"
              onClick={() => { onSelect(p); setOpen(false); }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{p.unit} • ₹{p.price}</span>
            </button>
          ))}
          {value.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-primary font-medium border-t"
              onClick={() => { onCreateNew(value.trim()); setOpen(false); }}
            >
              <Plus className="w-3 h-3 inline mr-1" /> Naya Product banao: "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PurchaseRegister() {
  const { currentUser, purchases, setPurchases, suppliers, products, setProducts } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState({
    supplierName: '', supplierGstin: '', invoiceNumber: '', invoiceDate: '',
    taxableAmount: 0, igst: 0, cgst: 0, sgst: 0, description: '',
  });
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductForm, setNewProductForm] = useState({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece', stock: 0, lowStockThreshold: 5 });
  const [pendingRowIndex, setPendingRowIndex] = useState<number | null>(null);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const userId = currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!;
  const mySuppliers = suppliers.filter(s => s.userId === userId);
  const myProducts = products.filter(p => p.userId === userId);

  let myPurchases = purchases.filter(p => p.userId === userId);
  if (dateFrom) myPurchases = myPurchases.filter(p => p.invoiceDate >= dateFrom);
  if (dateTo) myPurchases = myPurchases.filter(p => p.invoiceDate <= dateTo);
  if (search) {
    const q = search.toLowerCase();
    myPurchases = myPurchases.filter(p =>
      p.supplierName.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q)
    );
  }

  const totalTaxable = myPurchases.reduce((s, p) => s + p.taxableAmount, 0);
  const totalIgst = myPurchases.reduce((s, p) => s + p.igst, 0);
  const totalCgst = myPurchases.reduce((s, p) => s + p.cgst, 0);
  const totalSgst = myPurchases.reduce((s, p) => s + p.sgst, 0);

  const handleSupplierSelect = (name: string, gstin: string) => {
    setForm(f => ({ ...f, supplierName: name, supplierGstin: gstin }));
  };

  const addProductRow = () => {
    setProductRows(prev => [...prev, emptyProductRow()]);
  };

  const updateProductRow = (index: number, updates: Partial<ProductRow>) => {
    setProductRows(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const removeProductRow = (index: number) => {
    setProductRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, p: { id: string; name: string; unit: string; hsn: string; gstPercent: number; price: number }) => {
    updateProductRow(index, {
      productId: p.id,
      productName: p.name,
      unit: p.unit,
      hsn: p.hsn,
      gstPercent: p.gstPercent,
      rate: p.price,
    });
  };

  const handleCreateNewProduct = (name: string, rowIndex: number) => {
    setNewProductName(name);
    setNewProductForm({ name, hsn: '', price: 0, gstPercent: 18, unit: 'Piece', stock: 0, lowStockThreshold: 5 });
    setPendingRowIndex(rowIndex);
    setShowNewProduct(true);
  };

  const saveNewProduct = () => {
    if (!newProductForm.name) return;
    const newProd = { id: 'p_' + crypto.randomUUID(), userId, ...newProductForm };
    setProducts(prev => [...prev, newProd]);
    if (pendingRowIndex !== null) {
      updateProductRow(pendingRowIndex, {
        productId: newProd.id,
        productName: newProd.name,
        unit: newProd.unit,
        hsn: newProd.hsn,
        gstPercent: newProd.gstPercent,
        rate: newProd.price,
      });
    }
    setShowNewProduct(false);
    setPendingRowIndex(null);
    setNewProductName('');
  };

  const handleSave = () => {
    if (!form.supplierName) return;

    const purchaseProducts: PurchaseProduct[] = productRows
      .filter(r => r.productName)
      .map(r => ({
        productId: r.productId,
        productName: r.productName,
        quantity: r.quantity,
        rate: r.rate,
        unit: r.unit,
        hsn: r.hsn,
        gstPercent: r.gstPercent,
      }));

    const entry: PurchaseEntry = {
      id: 'pur_' + crypto.randomUUID(),
      userId,
      ...form,
      products: purchaseProducts.length > 0 ? purchaseProducts : undefined,
      timestamp: new Date().toISOString(),
    };
    setPurchases(prev => [...prev, entry]);

    // Update stock for each product
    if (purchaseProducts.length > 0) {
      setProducts(prev => prev.map(p => {
        const purchasedItem = purchaseProducts.find(pp => pp.productId === p.id);
        if (purchasedItem) {
          return { ...p, stock: p.stock + purchasedItem.quantity };
        }
        return p;
      }));
    }

    setForm({ supplierName: '', supplierGstin: '', invoiceNumber: '', invoiceDate: '', taxableAmount: 0, igst: 0, cgst: 0, sgst: 0, description: '' });
    setProductRows([]);
    setShowAdd(false);
  };

  const exportExcel = () => {
    const rows = [
      ['Date', 'Supplier', 'GSTIN', 'Invoice No', 'Taxable', 'IGST', 'CGST', 'SGST', 'Total', 'Products', 'Description'],
      ...myPurchases.map(p => [
        p.invoiceDate, p.supplierName, p.supplierGstin, p.invoiceNumber,
        p.taxableAmount, p.igst, p.cgst, p.sgst,
        p.taxableAmount + p.igst + p.cgst + p.sgst,
        p.products ? p.products.map(pp => `${pp.productName} x${pp.quantity}`).join('; ') : '',
        p.description,
      ]),
      ['TOTAL', '', '', '', totalTaxable, totalIgst, totalCgst, totalSgst, totalTaxable + totalIgst + totalCgst + totalSgst, '', ''],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'PurchaseRegister.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const renderProductsSection = () => (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">📦 Products Purchased</p>
        <Button type="button" size="sm" variant="outline" onClick={addProductRow} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Product Add
        </Button>
      </div>
      {productRows.map((row, index) => (
        <div key={index} className="glass-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Product #{index + 1}</span>
            <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeProductRow(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <ProductAutocomplete
            value={row.productName}
            onChange={v => updateProductRow(index, { productName: v, productId: '' })}
            onSelect={p => handleProductSelect(index, p)}
            products={myProducts.map(p => ({ id: p.id, name: p.name, unit: p.unit, hsn: p.hsn, gstPercent: p.gstPercent, price: p.price }))}
            onCreateNew={name => handleCreateNewProduct(name, index)}
          />
          <div className={isMobile ? "grid grid-cols-2 gap-2" : "grid grid-cols-4 gap-2"}>
            <div>
              <label className="text-xs text-muted-foreground">Quantity</label>
              <Input type="number" value={row.quantity || ''} onChange={e => updateProductRow(index, { quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rate (₹)</label>
              <Input type="number" value={row.rate || ''} onChange={e => updateProductRow(index, { rate: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Unit</label>
              <Input value={row.unit} onChange={e => updateProductRow(index, { unit: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">HSN</label>
              <Input value={row.hsn} readOnly className="bg-muted/30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderNewProductModal = () => (
    showNewProduct && (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">🆕 Naya Product</h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowNewProduct(false); setPendingRowIndex(null); }}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-3">
            <Input placeholder="Product Name *" value={newProductForm.name} onChange={e => setNewProductForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="HSN Code" value={newProductForm.hsn} onChange={e => setNewProductForm(f => ({ ...f, hsn: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Price (₹)</label><Input type="number" value={newProductForm.price || ''} onChange={e => setNewProductForm(f => ({ ...f, price: Number(e.target.value) }))} /></div>
              <div><label className="text-xs text-muted-foreground">GST %</label><Input type="number" value={newProductForm.gstPercent} onChange={e => setNewProductForm(f => ({ ...f, gstPercent: Number(e.target.value) }))} /></div>
              <div><label className="text-xs text-muted-foreground">Unit</label><Input value={newProductForm.unit} onChange={e => setNewProductForm(f => ({ ...f, unit: e.target.value }))} /></div>
              <div><label className="text-xs text-muted-foreground">Stock</label><Input type="number" value={newProductForm.stock || ''} onChange={e => setNewProductForm(f => ({ ...f, stock: Number(e.target.value) }))} /></div>
            </div>
            <Button onClick={saveNewProduct} className="w-full">💾 Save Product & Link</Button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">📦 Purchase Register</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportExcel}><Download className="w-4 h-4 mr-1" /> {!isMobile && 'CSV'}</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> {!isMobile && 'Purchase Add'}</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Supplier ya invoice search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {!isMobile && (
          <>
            <div><label className="text-xs text-muted-foreground">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
            <div><label className="text-xs text-muted-foreground">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="block border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="stat-card"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-lg font-bold text-foreground">{myPurchases.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">Taxable</p><p className="text-lg font-bold text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">CGST</p><p className="text-lg font-bold text-foreground">₹{totalCgst.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">SGST</p><p className="text-lg font-bold text-foreground">₹{totalSgst.toLocaleString('en-IN')}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">IGST</p><p className="text-lg font-bold text-foreground">₹{totalIgst.toLocaleString('en-IN')}</p></div>
      </div>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {myPurchases.map(p => (
            <div key={p.id} className="glass-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.supplierName}</p>
                  <p className="text-xs text-muted-foreground">{p.invoiceNumber ? `${p.invoiceNumber} • ` : ''}{formatDate(p.invoiceDate)}</p>
                </div>
                <p className="text-sm font-bold text-foreground shrink-0">₹{(p.taxableAmount + p.igst + p.cgst + p.sgst).toLocaleString('en-IN')}</p>
              </div>
              <div className="border-t mt-2 pt-2 flex gap-3 text-[10px] text-muted-foreground">
                <span>Tax: ₹{p.taxableAmount.toLocaleString('en-IN')}</span>
                {p.cgst > 0 && <span>CGST: ₹{p.cgst}</span>}
                {p.sgst > 0 && <span>SGST: ₹{p.sgst}</span>}
                {p.igst > 0 && <span>IGST: ₹{p.igst}</span>}
              </div>
              {p.products && p.products.length > 0 && (
                <div className="border-t mt-2 pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    📦 {p.products.map(pp => `${pp.productName} x${pp.quantity}`).join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
          {myPurchases.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi purchase entry nahi mili</p>}
        </div>
      ) : (
        /* Desktop Table */
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3 w-8"></th>
              <th className="text-left py-2.5 px-3">Date</th>
              <th className="text-left py-2.5 px-3">Supplier</th>
              <th className="text-left py-2.5 px-3">GSTIN</th>
              <th className="text-left py-2.5 px-3">Invoice No</th>
              <th className="text-left py-2.5 px-3">Taxable</th>
              <th className="text-left py-2.5 px-3">IGST</th>
              <th className="text-left py-2.5 px-3">CGST</th>
              <th className="text-left py-2.5 px-3">SGST</th>
              <th className="text-left py-2.5 px-3">Total</th>
              <th className="text-left py-2.5 px-3">Products</th>
            </tr></thead>
            <tbody>
              {myPurchases.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3">
                      {p.products && p.products.length > 0 && (
                        <button onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)} className="text-muted-foreground hover:text-foreground">
                          {expandedPurchase === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(p.invoiceDate)}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{p.supplierName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">{p.supplierGstin || '-'}</td>
                    <td className="py-2.5 px-3 text-foreground">{p.invoiceNumber || '-'}</td>
                    <td className="py-2.5 px-3 text-foreground">₹{p.taxableAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-foreground">₹{p.igst.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-foreground">₹{p.cgst.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-foreground">₹{p.sgst.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">₹{(p.taxableAmount + p.igst + p.cgst + p.sgst).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">
                      {p.products && p.products.length > 0
                        ? `${p.products.length} item${p.products.length > 1 ? 's' : ''}`
                        : '-'}
                    </td>
                  </tr>
                  {expandedPurchase === p.id && p.products && p.products.length > 0 && (
                    <tr className="bg-muted/20">
                      <td colSpan={11} className="px-8 py-2">
                        <table className="w-full text-xs">
                          <thead><tr className="text-muted-foreground">
                            <th className="text-left py-1 px-2">Product</th>
                            <th className="text-left py-1 px-2">Qty</th>
                            <th className="text-left py-1 px-2">Rate</th>
                            <th className="text-left py-1 px-2">Unit</th>
                            <th className="text-left py-1 px-2">HSN</th>
                            <th className="text-left py-1 px-2">GST%</th>
                          </tr></thead>
                          <tbody>
                            {p.products.map((pp, i) => (
                              <tr key={i} className="text-foreground">
                                <td className="py-1 px-2 font-medium">{pp.productName}</td>
                                <td className="py-1 px-2">{pp.quantity}</td>
                                <td className="py-1 px-2">₹{pp.rate.toLocaleString('en-IN')}</td>
                                <td className="py-1 px-2">{pp.unit}</td>
                                <td className="py-1 px-2">{pp.hsn || '-'}</td>
                                <td className="py-1 px-2">{pp.gstPercent}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {myPurchases.length > 0 && (
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-2.5 px-3"></td>
                  <td colSpan={4} className="py-2.5 px-3 text-foreground">TOTAL</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalTaxable.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalIgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalCgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{totalSgst.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{(totalTaxable + totalIgst + totalCgst + totalSgst).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3"></td>
                </tr>
              )}
            </tbody>
          </table>
          {myPurchases.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi purchase entry nahi mili</p>}
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAdd && (
        <div className={isMobile ? 'fixed inset-0 z-50 bg-card flex flex-col' : 'fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4'}>
          {isMobile ? (
            <>
              <div className="mobile-modal-header">
                <button onClick={() => setShowAdd(false)}><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="font-semibold">Nayi Purchase Entry</h3>
              </div>
              <div className="mobile-modal-content space-y-4">
                <SupplierAutocomplete
                  value={form.supplierName}
                  onChange={v => setForm({ ...form, supplierName: v })}
                  onSelect={handleSupplierSelect}
                  suppliers={mySuppliers.map(s => ({ name: s.name, gstNumber: s.gstNumber }))}
                />
                <Input placeholder="Supplier GSTIN" value={form.supplierGstin} onChange={e => setForm({ ...form, supplierGstin: e.target.value })} />
                <Input placeholder="Invoice Number" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                <div><label className="text-xs text-muted-foreground">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full border rounded-md px-3 py-3 text-base bg-card text-foreground" /></div>
                <div><label className="text-xs text-muted-foreground">Taxable Amount (₹)</label><Input type="number" value={form.taxableAmount || ''} onChange={e => setForm({ ...form, taxableAmount: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">IGST (₹)</label><Input type="number" value={form.igst || ''} onChange={e => setForm({ ...form, igst: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">CGST (₹)</label><Input type="number" value={form.cgst || ''} onChange={e => setForm({ ...form, cgst: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">SGST (₹)</label><Input type="number" value={form.sgst || ''} onChange={e => setForm({ ...form, sgst: Number(e.target.value) })} /></div>
                <Input placeholder="Description / Product" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                {renderProductsSection()}
              </div>
              <div className="mobile-modal-footer">
                <Button onClick={handleSave} className="w-full min-h-[48px]">💾 Save Purchase</Button>
              </div>
            </>
          ) : (
            <div className="glass-card w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">➕ Nayi Purchase Entry</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <SupplierAutocomplete
                  value={form.supplierName}
                  onChange={v => setForm({ ...form, supplierName: v })}
                  onSelect={handleSupplierSelect}
                  suppliers={mySuppliers.map(s => ({ name: s.name, gstNumber: s.gstNumber }))}
                />
                <Input placeholder="Supplier GSTIN" value={form.supplierGstin} onChange={e => setForm({ ...form, supplierGstin: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Invoice Number" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
                  <div><label className="text-xs text-muted-foreground">Invoice Date</label><input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-card text-foreground" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Taxable Amount (₹)</label><Input type="number" value={form.taxableAmount || ''} onChange={e => setForm({ ...form, taxableAmount: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground">IGST (₹)</label><Input type="number" value={form.igst || ''} onChange={e => setForm({ ...form, igst: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">CGST (₹)</label><Input type="number" value={form.cgst || ''} onChange={e => setForm({ ...form, cgst: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">SGST (₹)</label><Input type="number" value={form.sgst || ''} onChange={e => setForm({ ...form, sgst: Number(e.target.value) })} /></div>
                </div>
                <Input placeholder="Description / Product" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                {renderProductsSection()}
                <Button onClick={handleSave} className="w-full">💾 Save Purchase</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {renderNewProductModal()}
    </div>
  );
}
