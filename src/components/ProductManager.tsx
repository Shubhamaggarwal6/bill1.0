import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, X, Pencil, Trash2, Upload, ArrowLeft } from 'lucide-react';
import BulkImportDialog from '@/components/BulkImportDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  stockOnly?: boolean;
}

const PRODUCT_COLUMNS = [
  { key: 'name', label: 'Product Name', required: true, type: 'string' as const },
  { key: 'hsn', label: 'HSN Code', type: 'string' as const, defaultValue: '' },
  { key: 'price', label: 'Price', required: true, type: 'number' as const },
  { key: 'gstPercent', label: 'GST %', type: 'number' as const, defaultValue: 18 },
  { key: 'unit', label: 'Unit', type: 'string' as const, defaultValue: 'Piece' },
  { key: 'stock', label: 'Stock', type: 'number' as const, defaultValue: 0 },
  { key: 'lowStockThreshold', label: 'Low Stock Alert', type: 'number' as const, defaultValue: 5 },
];

const PRODUCT_SAMPLE = [
  { name: 'Cement Bag 50kg', hsn: '2523', price: 380, gstPercent: 28, unit: 'Bag', stock: 100, lowStockThreshold: 20 },
  { name: 'TMT Bar 12mm', hsn: '7214', price: 55, gstPercent: 18, unit: 'Kg', stock: 500, lowStockThreshold: 50 },
];

export default function ProductManager({ stockOnly }: Props) {
  const { currentUser, products, setProducts } = useApp();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece', stock: 0, lowStockThreshold: 5 });
  const isMobile = useIsMobile();

  const userId = currentUser?.role === 'employee' ? currentUser?.parentUserId! : currentUser?.id!;
  const myProducts = products.filter(p => p.userId === userId);
  const filtered = myProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!form.name) return;
    if (editId) {
      setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...form } : p));
      setEditId(null);
    } else {
      setProducts(prev => [...prev, { id: 'p_' + Date.now(), userId, ...form }]);
    }
    setForm({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece', stock: 0, lowStockThreshold: 5 });
    setShowAdd(false);
  };

  const handleEdit = (id: string) => {
    const p = myProducts.find(pr => pr.id === id);
    if (!p) return;
    setForm({ name: p.name, hsn: p.hsn, price: p.price, gstPercent: p.gstPercent, unit: p.unit, stock: p.stock, lowStockThreshold: p.lowStockThreshold });
    setEditId(id);
    setShowAdd(true);
  };

  const handleDelete = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{stockOnly ? 'Stock Status' : 'Products'}</h2>
        {!stockOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}><Upload className="w-4 h-4 mr-1" /> {!isMobile && 'Bulk Import'}</Button>
            <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', hsn: '', price: 0, gstPercent: 18, unit: 'Piece', stock: 0, lowStockThreshold: 5 }); }}><Plus className="w-4 h-4 mr-1" /> {!isMobile && 'Product Add'}</Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Product search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="glass-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">HSN: {p.hsn || '-'} • {p.gstPercent}% GST</p>
                </div>
                <span className={p.stock <= p.lowStockThreshold ? 'badge-critical' : 'badge-success'}>
                  {p.stock} {p.unit}
                </span>
              </div>
              <div className="border-t mt-2 pt-2 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">₹{p.price.toLocaleString('en-IN')}/{p.unit}</p>
                {!stockOnly && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleEdit(p.id)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi product nahi mila</p>}
        </div>
      ) : (
        /* Desktop Table */
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground bg-muted/30">
              <th className="text-left py-2.5 px-3">Product</th>
              <th className="text-left py-2.5 px-3">HSN</th>
              <th className="text-left py-2.5 px-3">Price</th>
              <th className="text-left py-2.5 px-3">GST%</th>
              <th className="text-left py-2.5 px-3">Stock</th>
              {!stockOnly && <th className="text-left py-2.5 px-3">Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.hsn}</td>
                  <td className="py-2.5 px-3 text-foreground">₹{p.price.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{p.gstPercent}%</td>
                  <td className="py-2.5 px-3">
                    <span className={p.stock <= p.lowStockThreshold ? 'badge-critical' : 'badge-success'}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  {!stockOnly && (
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => handleEdit(p.id)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 text-critical" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Koi product nahi mila</p>}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className={isMobile ? 'fixed inset-0 z-50 bg-card flex flex-col' : 'fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4'}>
          {isMobile ? (
            <>
              <div className="mobile-modal-header">
                <button onClick={() => setShowAdd(false)}><ArrowLeft className="w-5 h-5" /></button>
                <h3 className="font-semibold">{editId ? 'Product Edit' : 'Naya Product'}</h3>
              </div>
              <div className="mobile-modal-content space-y-4">
                <Input placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="HSN Code" value={form.hsn} onChange={e => setForm({ ...form, hsn: e.target.value })} />
                <div><label className="text-xs text-muted-foreground">Price (₹)</label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">GST %</label><Input type="number" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Unit</label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Stock</label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Low Stock Alert</label><Input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} /></div>
              </div>
              <div className="mobile-modal-footer">
                <Button onClick={handleSave} className="w-full min-h-[48px]">{editId ? 'Update' : 'Save'}</Button>
              </div>
            </>
          ) : (
            <div className="glass-card w-full max-w-md p-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-foreground">{editId ? 'Product Edit' : 'Naya Product'}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-3">
                <Input placeholder="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="HSN Code" value={form.hsn} onChange={e => setForm({ ...form, hsn: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Price (₹)</label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">GST %</label><Input type="number" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">Unit</label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Stock</label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Low Stock Alert Threshold</label><Input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} /></div>
                <Button onClick={handleSave} className="w-full">{editId ? 'Update' : 'Save'}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <BulkImportDialog
        open={showBulk}
        onClose={() => setShowBulk(false)}
        title="Bulk Product Import"
        columns={PRODUCT_COLUMNS}
        sampleData={PRODUCT_SAMPLE}
        templateFileName="ProductTemplate"
        onImport={(rows) => {
          const newProducts = rows.map((r, i) => ({
            id: 'p_bulk_' + Date.now() + '_' + i,
            userId,
            name: r.name,
            hsn: r.hsn || '',
            price: Number(r.price) || 0,
            gstPercent: Number(r.gstPercent) || 18,
            unit: r.unit || 'Piece',
            stock: Number(r.stock) || 0,
            lowStockThreshold: Number(r.lowStockThreshold) || 5,
          }));
          setProducts(prev => [...prev, ...newProducts]);
        }}
      />
    </div>
  );
}
