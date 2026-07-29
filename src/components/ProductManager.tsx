import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Search, Loader2, AlertCircle, CheckCircle2,
  Package, Pencil, X, RefreshCw, Plus, ShoppingBag, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Sparkles
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Perfume, Makhamria } from '../types';

interface Bottle {
  id: number;
  size: string;
  stock_quantity: number;
  unit_price?: number;
}

interface Asset {
  id: number;
  name: string;
  purchase_value: number;
}

// ── Edit Makhamria Modal ────────────────────────────────────────────────────────

interface EditMakhamriaModalProps {
  item: Makhamria;
  onClose: () => void;
  onSaved: () => void;
}

const EditMakhamriaModal: React.FC<EditMakhamriaModalProps> = ({ item, onClose, onSaved }) => {
  const [name, setName] = useState(item.name);
  const [sellingPrice, setSellingPrice] = useState<number | ''>(item.selling_price ?? '');
  const [costPrice, setCostPrice] = useState<number | ''>(item.cost_price ?? '');
  const [stockQty, setStockQty] = useState<number | ''>(item.stock_qty ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: supaErr } = await supabase
        .from('makhamria')
        .update({
          name: name.trim(),
          selling_price: sellingPrice === '' ? null : Number(sellingPrice),
          cost_price: costPrice === '' ? null : Number(costPrice),
          stock_qty: stockQty === '' ? null : Number(stockQty),
        })
        .eq('id', item.id);

      if (supaErr) throw supaErr;
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to update makhamria:', err);
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setSaving(true);
    try {
      const { error: supaErr } = await supabase.from('makhamria').delete().eq('id', item.id);
      if (supaErr) throw supaErr;
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete item.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    marginTop: 4,
    padding: '10px 14px',
    border: '1px solid #f43f5e',
    borderRadius: 10,
    fontSize: 14,
    boxSizing: 'border-box',
    background: '#1f1216',
    color: '#ffe4e6',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #241217, #130a0d)',
          border: '1px solid #e11d48',
          borderRadius: 16,
          padding: 28,
          width: 420,
          maxWidth: '94vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#881337', borderRadius: 8, padding: '6px 8px' }}>
              <Pencil size={16} color="#fda4af" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffe4e6' }}>Edit Makhamria (مخمرية)</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9f1239' }}>
            <X size={20} />
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selling Price (EGP)</span>
            <input
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
              placeholder="0"
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Price (EGP)</span>
            <input
              type="number"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
              placeholder="0"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock (Pcs / عدد)</span>
          <input
            type="number"
            value={stockQty}
            onChange={e => setStockQty(e.target.value === '' ? '' : Number(e.target.value))}
            style={inputStyle}
            placeholder="0"
          />
        </label>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 13, marginBottom: 14, background: '#3f0000', borderRadius: 8, padding: '8px 12px' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: '#991b1b', color: '#fef2f2', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            Delete
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: 10,
                border: '1px solid #881337', background: 'transparent',
                cursor: 'pointer', fontSize: 14, color: '#fb7185', fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: saving ? '#881337' : 'linear-gradient(135deg, #e11d48, #be123c)',
                color: '#fff1f2', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, opacity: saving ? 0.8 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ── Edit Modal ──────────────────────────────────────────────────────────────────

interface EditModalProps {
  perfume: Perfume;
  onClose: () => void;
  onSaved: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ perfume, onClose, onSaved }) => {
  const [name, setName] = useState(perfume.name);
  const [basePrice, setBasePrice] = useState<number | ''>(perfume.base_price ?? '');
  const [costPrice, setCostPrice] = useState<number | ''>(perfume.cost_price ?? '');
  const [stockMl, setStockMl] = useState<number | ''>(perfume.stock_ml ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { error: supaErr } = await supabase
        .from('perfumes')
        .update({
          name: name.trim(),
          base_price: basePrice === '' ? null : Number(basePrice),
          cost_price: costPrice === '' ? null : Number(costPrice),
          stock_ml: stockMl === '' ? null : Number(stockMl),
        })
        .eq('id', perfume.id);

      if (supaErr) throw supaErr;
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to update perfume:', err);
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    marginTop: 4,
    padding: '10px 14px',
    border: '1px solid #d97706',
    borderRadius: 10,
    fontSize: 14,
    boxSizing: 'border-box',
    background: '#1e1b0e',
    color: '#fef3c7',
    outline: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1c1a0e, #111007)',
          border: '1px solid #b45309',
          borderRadius: 16,
          padding: 28,
          width: 420,
          maxWidth: '94vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#78350f', borderRadius: 8, padding: '6px 8px' }}>
              <Pencil size={16} color="#fbbf24" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fef3c7' }}>Edit Perfume</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e' }}>
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Price (EGP)</span>
            <input
              type="number"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value === '' ? '' : Number(new Date().getTime() === 0 ? '' : e.target.value))}
              style={inputStyle}
              placeholder="0"
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Price (EGP)</span>
            <input
              type="number"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
              style={inputStyle}
              placeholder="0"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock (ml)</span>
          <input
            type="number"
            value={stockMl}
            onChange={e => setStockMl(e.target.value === '' ? '' : Number(e.target.value))}
            style={inputStyle}
            placeholder="0"
          />
        </label>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 13, marginBottom: 14, background: '#3f0000', borderRadius: 8, padding: '8px 12px' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid #78350f', background: 'transparent',
              cursor: 'pointer', fontSize: 14, color: '#d97706', fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: saving ? '#92400e' : 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#fff8e1', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700, opacity: saving ? 0.8 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────────

const ProductManager: React.FC = () => {
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [makhamriaList, setMakhamriaList] = useState<Makhamria[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [makhamriaLoading, setMakhamriaLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null);
  const [selectedMakhamria, setSelectedMakhamria] = useState<Makhamria | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'base_price' | 'cost_price' | 'stock_ml', direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: 'name' | 'base_price' | 'cost_price' | 'stock_ml') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ── Add-new-product form state ─────────────────────────────────────────────
  const [productTypeToAdd, setProductTypeToAdd] = useState<'perfume' | 'makhamria'>('perfume');
  const [newName, setNewName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState<number | ''>('');
  const [newCostPrice, setNewCostPrice] = useState<number | ''>('');
  const [newStockMl, setNewStockMl] = useState<number | ''>('');
  const [addSaving, setAddSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Bottles & Assets state ───────────────────────────────────────
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bottlesLoading, setBottlesLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setAddError('Name is required.'); return; }
    setAddSaving(true);
    setAddError(null);
    try {
      if (productTypeToAdd === 'perfume') {
        const { error } = await supabase.from('perfumes').insert([{
          name: newName.trim(),
          base_price: newBasePrice === '' ? null : Number(newBasePrice),
          cost_price: newCostPrice === '' ? null : Number(newCostPrice),
          stock_ml: newStockMl === '' ? null : Number(newStockMl),
        }]);
        if (error) throw error;
        fetchPerfumes();
      } else {
        const { error } = await supabase.from('makhamria').insert([{
          name: newName.trim(),
          selling_price: newBasePrice === '' ? null : Number(newBasePrice),
          cost_price: newCostPrice === '' ? null : Number(newCostPrice),
          stock_qty: newStockMl === '' ? null : Number(newStockMl),
        }]);
        if (error) throw error;
        fetchMakhamria();
      }
      setAddSuccess(true);
      setNewName('');
      setNewBasePrice('');
      setNewCostPrice('');
      setNewStockMl('');
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add product.');
    } finally {
      setAddSaving(false);
    }
  };

  const fetchAdditional = useCallback(async () => {
    setBottlesLoading(true); setAssetsLoading(true);
    try {
       const [bRes, aRes] = await Promise.all([
          supabase.from('bottles').select('*').order('size'),
          supabase.from('assets').select('*').order('name')
       ]);
       if (!bRes.error) setBottles(bRes.data || []);
       if (!aRes.error) setAssets(aRes.data || []);
    } catch(e) { }
    finally {
       setBottlesLoading(false); setAssetsLoading(false);
    }
  }, []);

  const fetchMakhamria = useCallback(async () => {
    setMakhamriaLoading(true);
    try {
      const { data, error } = await supabase
        .from('makhamria')
        .select('*')
        .order('name', { ascending: true });
      if (!error) setMakhamriaList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setMakhamriaLoading(false);
    }
  }, []);

  const fetchPerfumes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('perfumes')
        .select('id, name, base_price, cost_price, stock_ml, created_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setPerfumes(data || []);
    } catch (err: any) {
      console.error('Failed to fetch perfumes:', err);
      setFetchError(err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPerfumes(); fetchMakhamria(); fetchAdditional(); }, [fetchPerfumes, fetchMakhamria, fetchAdditional]);

  const handleSaved = () => {
    setSaveSuccess(true);
    fetchPerfumes();
    fetchMakhamria();
    setTimeout(() => setSaveSuccess(false), 3000);
  };


  const sortedAndFiltered = [...perfumes]
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      let valA = a[key] ?? (key === 'name' ? '' : 0);
      let valB = b[key] ?? (key === 'name' ? '' : 0);

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const lowStockPerfumes = perfumes
    .filter(p => (p.stock_ml ?? 0) < 15)
    .sort((a, b) => (a.stock_ml || 0) - (b.stock_ml || 0));

  const fmt = (n?: number | null) =>
    n != null ? n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 inline-block pointer-events-none" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-amber-500 inline-block pointer-events-none" /> : <ArrowDown className="w-3 h-3 ml-1 text-amber-500 inline-block pointer-events-none" />;
  };

  return (
    <div className="w-full min-h-screen overflow-y-auto no-scrollbar space-y-5 pb-48">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-900/30 text-amber-500 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Products Manager</h2>
            <p className="text-sm text-slate-500">
              {loading ? 'Loading…' : `${perfumes.length} perfumes in database`}
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchPerfumes(); fetchAdditional(); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-amber-400 border border-amber-900/50 rounded-xl hover:bg-amber-900/20 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Save Success Toast ── */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={16} />
          Perfume updated successfully!
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search perfumes by name…"
          className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 outline-none transition-all text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Low Stock Alerts ── */}
      {lowStockPerfumes.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-5 shadow-lg shadow-red-900/10 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-900/50 text-red-500 rounded-xl relative">
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-red-400 text-sm tracking-wide uppercase">Restock Needed</h3>
              <p className="text-xs text-red-400/70">
                {lowStockPerfumes.length} {lowStockPerfumes.length === 1 ? 'oil is' : 'oils are'} currently low on stock (under 15ml).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 max-h-[160px] overflow-y-auto no-scrollbar pt-1 pr-2">
            {lowStockPerfumes.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPerfume(p)}
                className="flex items-center gap-2 pl-3 pr-2 py-2 bg-red-900/20 border border-red-900/30 rounded-xl cursor-pointer hover:bg-red-900/40 hover:scale-105 hover:border-red-900/60 shadow-sm transition-all"
                title="Click to manage stock"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-100">{p.name}</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-red-950/50 border border-red-900/50 text-red-400 rounded-md whitespace-nowrap ml-1">
                  {p.stock_ml} ml
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">

        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase">Perfume Inventory</h3>
          <span className="bg-amber-900/30 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
            {sortedAndFiltered.length} results
          </span>
        </div>

        <div className="max-h-[400px] overflow-y-auto no-scrollbar border border-gray-800 rounded-lg">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
              <p className="text-sm">Loading perfumes…</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <AlertCircle className="w-8 h-8 mb-3" />
              <p className="text-sm">{fetchError}</p>
              <button onClick={fetchPerfumes} className="mt-4 px-4 py-2 text-sm font-semibold bg-red-900/30 border border-red-800/50 rounded-xl hover:bg-red-900/50 transition-all">
                Retry
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-800/60 text-xs text-amber-500 uppercase tracking-widest border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-slate-800/80 transition-colors select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Name {getSortIcon('name')}</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-right cursor-pointer hover:bg-slate-800/80 transition-colors select-none" onClick={() => handleSort('base_price')}>
                    <div className="flex items-center justify-end">Selling Price {getSortIcon('base_price')}</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-right cursor-pointer hover:bg-slate-800/80 transition-colors select-none" onClick={() => handleSort('cost_price')}>
                    <div className="flex items-center justify-end">Cost Price {getSortIcon('cost_price')}</div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-right cursor-pointer hover:bg-slate-800/80 transition-colors select-none" onClick={() => handleSort('stock_ml')}>
                    <div className="flex items-center justify-end">Stock (ml) {getSortIcon('stock_ml')}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedAndFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <Tag className="w-10 h-10 text-slate-700 mb-3" />
                        <p className="text-slate-500 text-sm">
                          {search ? `No perfumes match "${search}"` : 'No perfumes found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedAndFiltered.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPerfume(p)}
                      className="hover:bg-amber-900/10 cursor-pointer transition-colors group"
                      title="Click to edit"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-8 rounded-full bg-amber-600/40 group-hover:bg-amber-500 transition-colors" />
                          <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.base_price != null ? (
                          <span className="font-bold text-emerald-400">{fmt(p.base_price)} EGP</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.cost_price != null ? (
                          <span className="text-red-400">{fmt(p.cost_price)} EGP</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.stock_ml != null ? (
                          <span className="font-semibold text-amber-400">{p.stock_ml.toLocaleString()} ml</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {selectedPerfume && (
        <EditModal
          perfume={selectedPerfume}
          onClose={() => setSelectedPerfume(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Edit Makhamria Modal ── */}
      {selectedMakhamria && (
        <EditMakhamriaModal
          item={selectedMakhamria}
          onClose={() => setSelectedMakhamria(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Section: Makhamria Inventory ── */}
      <div className="bg-slate-900 rounded-2xl border border-rose-900/50 shadow-xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-rose-900/40 flex items-center justify-between bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-900/50 text-rose-400 rounded-lg">
              <Sparkles size={16} />
            </div>
            <h3 className="font-bold text-rose-300 text-sm tracking-wide uppercase">Makhamria Inventory (مخمرية)</h3>
          </div>
          <span className="bg-rose-900/30 text-rose-400 text-xs font-bold px-3 py-1 rounded-full">
            {makhamriaList.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).length} items
          </span>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto no-scrollbar border border-rose-950/50">
          {makhamriaLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-rose-600" /></div>
          ) : makhamriaList.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No Makhamria products registered. Add below or via Purchases.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-400">
               <thead className="bg-rose-950/40 text-xs text-rose-400 uppercase tracking-widest border-b border-rose-900/40 sticky top-0 z-10">
                 <tr>
                   <th className="px-6 py-3">Name (اسم المخمرية)</th>
                   <th className="px-6 py-3 text-right">Selling Price (سعر البيع)</th>
                   <th className="px-6 py-3 text-right">Cost Price (التكلفة)</th>
                   <th className="px-6 py-3 text-right">Stock (Pcs / عدد)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {makhamriaList
                   .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
                   .map(m => (
                   <tr key={m.id} onClick={() => setSelectedMakhamria(m)} className="hover:bg-rose-900/10 cursor-pointer transition-colors group" title="Click to edit">
                     <td className="px-6 py-4 font-bold text-slate-200 group-hover:text-rose-300 transition-colors flex items-center gap-2">
                       <Sparkles size={14} className="text-rose-400" />
                       <span>{m.name}</span>
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-emerald-400">
                       {m.selling_price != null ? `${fmt(m.selling_price)} EGP` : '—'}
                     </td>
                     <td className="px-6 py-4 text-right text-red-400">
                       {m.cost_price != null ? `${fmt(m.cost_price)} EGP` : '—'}
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-rose-400">
                       {(m.stock_qty ?? 0).toLocaleString()} Pcs
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add New Product ── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/40 text-amber-400 rounded-lg">
              <Plus size={16} />
            </div>
            <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase">Add New Product Profile</h3>
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setProductTypeToAdd('perfume')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                productTypeToAdd === 'perfume'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Perfume Oil (زيت عطري)
            </button>
            <button
              type="button"
              onClick={() => setProductTypeToAdd('makhamria')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                productTypeToAdd === 'makhamria'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={12} />
              Makhamria (مخمرية)
            </button>
          </div>
        </div>

        <form onSubmit={handleAddNewProduct} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
              {productTypeToAdd === 'perfume' ? 'Perfume Name' : 'Makhamria Name (اسم المخمرية)'}
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={productTypeToAdd === 'perfume' ? 'e.g. Royal Oud' : 'e.g. مخمرية المسك الملكي'}
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 outline-none transition-all text-sm"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                {productTypeToAdd === 'perfume' ? 'Base Price (EGP)' : 'Selling Price (EGP)'}
              </label>
              <input
                type="number"
                min="0"
                value={newBasePrice}
                onChange={e => setNewBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Cost Price (EGP)</label>
              <input
                type="number"
                min="0"
                value={newCostPrice}
                onChange={e => setNewCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
                {productTypeToAdd === 'perfume' ? 'Initial Stock (ml)' : 'Initial Stock (Pcs / عدد)'}
              </label>
              <input
                type="number"
                min="0"
                value={newStockMl}
                onChange={e => setNewStockMl(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600 outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Feedback */}
          {addError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm font-medium">
              <AlertCircle size={15} />
              {addError}
            </div>
          )}
          {addSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/30 border border-emerald-800/50 rounded-xl text-emerald-400 text-sm font-medium animate-in fade-in duration-300">
              <CheckCircle2 size={15} />
              {productTypeToAdd === 'perfume' ? 'Perfume added successfully!' : 'Makhamria product added successfully!'}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={addSaving}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: addSaving ? '#92400e' : productTypeToAdd === 'perfume' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, #e11d48, #be123c)', color: '#fff8e1' }}
          >
            {addSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {addSaving ? 'Saving…' : productTypeToAdd === 'perfume' ? 'Save Perfume' : 'Save Makhamria'}
          </button>
        </form>
      </div>

      {/* ── Section 2: Bottles Inventory ── */}
      <div className="bg-slate-900 rounded-2xl border border-blue-900/50 shadow-xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-blue-900/40 flex items-center gap-3 bg-blue-950/30">
          <div className="p-2 bg-blue-900/50 text-blue-400 rounded-lg">
            <Package size={16} />
          </div>
          <h3 className="font-bold text-blue-300 text-sm tracking-wide uppercase">Section 2: Bottles Inventory</h3>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
          {bottlesLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : bottles.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No bottles registered. Add via Purchases.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-400">
               <thead className="bg-blue-950/40 text-xs text-blue-500 uppercase tracking-widest border-b border-blue-900/40 sticky top-0">
                 <tr>
                   <th className="px-6 py-3">Size Type</th>
                   <th className="px-6 py-3 text-right">Unit Price (EGP)</th>
                   <th className="px-6 py-3 text-right">Stock Quantity</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {bottles.map(b => (
                   <tr key={b.id} className="hover:bg-blue-900/10">
                     <td className="px-6 py-4 font-bold text-slate-200">{b.size}</td>
                     <td className="px-6 py-4 text-right">
                        {b.unit_price != null ? (
                          <span className="text-red-400 font-medium">{fmt(b.unit_price)} EGP</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-blue-400">{b.stock_quantity.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Section 3: Assets & Tools ── */}
      <div className="bg-slate-900 rounded-2xl border border-purple-900/50 shadow-xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-purple-900/40 flex items-center gap-3 bg-purple-950/30">
          <div className="p-2 bg-purple-900/50 text-purple-400 rounded-lg">
            <ShoppingBag size={16} />
          </div>
          <h3 className="font-bold text-purple-300 text-sm tracking-wide uppercase">Section 3: Assets & Tools</h3>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
          {assetsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
          ) : assets.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No assets registered. Add via Purchases.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-400">
               <thead className="bg-purple-950/40 text-xs text-purple-500 uppercase tracking-widest border-b border-purple-900/40 sticky top-0">
                 <tr>
                   <th className="px-6 py-3">Asset Name</th>
                   <th className="px-6 py-3 text-right">Purchase Value (EGP)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {assets.map(a => (
                   <tr key={a.id} className="hover:bg-purple-900/10">
                     <td className="px-6 py-4 font-bold text-slate-200">{a.name}</td>
                     <td className="px-6 py-4 text-right font-bold text-purple-400">{fmt(a.purchase_value)}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductManager;
