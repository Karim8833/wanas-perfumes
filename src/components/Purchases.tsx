import React, { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, CheckCircle2, AlertCircle, ShoppingCart, Search, PackageOpen, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Purchases() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Oil');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [totalCost, setTotalCost] = useState<number | ''>('');
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Autocomplete & Options State ─────────────────────────────────────────────
  const [options, setOptions] = useState<{name: string, stock?: number | null}[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    fetchOptions(category);
    setItemName('');
  }, [category]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOptions = async (cat: string) => {
    setOptionsLoading(true);
    setOptions([]);
    try {
      if (cat === 'Oil') {
        const { data } = await supabase.from('perfumes').select('name, stock_ml');
        if (data) setOptions(data.map(d => ({ name: d.name, stock: d.stock_ml })));
      } else if (cat === 'Bottles' || cat === 'Packaging') {
        const { data } = await supabase.from('bottles').select('size, stock_quantity');
        if (data) {
          if (cat === 'Packaging') {
            setOptions(data.filter(d => d.size === 'علبة').map(d => ({ name: d.size, stock: d.stock_quantity })));
          } else {
            setOptions(data.filter(d => d.size !== 'علبة').map(d => ({ name: d.size, stock: d.stock_quantity })));
          }
        }
      } else if (cat === 'Makhamria') {
        const { data } = await supabase.from('makhamria').select('name, stock_qty');
        if (data) setOptions(data.map(d => ({ name: d.name, stock: d.stock_qty })));
      } else if (cat === 'Assets') {
        const { data } = await supabase.from('assets').select('name');
        if (data) setOptions(data.map(d => ({ name: d.name, stock: null })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOptionsLoading(false);
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error: supaErr } = await supabase
        .from('purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      if (supaErr) throw supaErr;
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Fetch purchases error', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(itemName.toLowerCase()));
  const exactMatch = options.find(o => o.name.toLowerCase() === itemName.trim().toLowerCase());

  const handleQuantityChange = (val: string) => {
    const q = val === '' ? '' : Number(val);
    setQuantity(q);
    if (q !== '' && unitCost !== '') {
      setTotalCost(Number((q * Number(unitCost)).toFixed(2)));
    }
  };

  const handleUnitCostChange = (val: string) => {
    const u = val === '' ? '' : Number(val);
    setUnitCost(u);
    if (u !== '' && quantity !== '') {
      setTotalCost(Number((Number(quantity) * u).toFixed(2)));
    }
  };

  const handleTotalCostChange = (val: string) => {
    const t = val === '' ? '' : Number(val);
    setTotalCost(t);
    if (t !== '' && quantity !== '' && Number(quantity) > 0) {
      setUnitCost(Number((t / Number(quantity)).toFixed(2)));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || quantity === '' || totalCost === '') return;
    setSaving(true);
    setError(null);

    try {
      const itemNameTrimmed = itemName.trim();
      let inventoryError = null;
      const dbCategory = category === 'Packaging' ? 'Bottles' : category;

      // 1. Inventory Sync (Auto-Create / Update Items)
      if (dbCategory === 'Oil') {
          const { data: existingOil } = await supabase.from('perfumes').select('*').eq('name', itemNameTrimmed).maybeSingle();
          if (!existingOil) {
              const { error: err } = await supabase.from('perfumes').insert([{
                  name: itemNameTrimmed,
                  stock_ml: 0, // Initiated at 0; DB Trigger handles the exact +Quantity addition.
                  cost_price: Number(unitCost) || null
              }]);
              inventoryError = err;
          }
      } else if (dbCategory === 'Bottles') {
          const { data: existingBottle } = await supabase.from('bottles').select('*').eq('size', itemNameTrimmed).maybeSingle();
          if (!existingBottle) {
              const { error: err } = await supabase.from('bottles').insert([{
                  size: itemNameTrimmed,
                  stock_quantity: 0,
                  unit_price: Number(unitCost) || null
              }]);
              inventoryError = err;
          }
      } else if (dbCategory === 'Makhamria') {
          const { data: existingMak } = await supabase.from('makhamria').select('*').ilike('name', itemNameTrimmed).maybeSingle();
          if (!existingMak) {
              const { error: err } = await supabase.from('makhamria').insert([{
                  name: itemNameTrimmed,
                  stock_qty: Number(quantity),
                  cost_price: Number(unitCost) || null
              }]);
              inventoryError = err;
          } else {
              const newStock = (existingMak.stock_qty || 0) + Number(quantity);
              const { error: err } = await supabase.from('makhamria').update({
                  stock_qty: newStock,
                  cost_price: Number(unitCost) || existingMak.cost_price
              }).eq('id', existingMak.id);
              inventoryError = err;
          }
      } else if (dbCategory === 'Assets') {
          const { data: existingAsset } = await supabase.from('assets').select('*').eq('name', itemNameTrimmed).maybeSingle();
          if (!existingAsset) {
              const { error: err } = await supabase.from('assets').insert([{
                  name: itemNameTrimmed,
                  purchase_value: 0
              }]);
               inventoryError = err;
          }
      }

      if (inventoryError) {
         console.warn("Failed to update inventory table", inventoryError);
         throw new Error("Failed to auto-create/update Product: " + inventoryError.message);
      }

      // 2. Insert Purchase Log
      const { error: purchaseErr } = await supabase.from('purchases').insert([{
        purchase_date: date,
        item_name: itemNameTrimmed,
        category: dbCategory,
        quantity: Number(quantity),
        total_cost: Number(totalCost),
      }]);

      if (purchaseErr) throw purchaseErr;

      setSuccess(true);
      setItemName('');
      setQuantity('');
      setUnitCost('');
      setTotalCost('');
      fetchPurchases();
      // Refetch options to update stock indicator for next use via current DB state
      fetchOptions(category);
      setTimeout(() => setSuccess(false), 5000);

    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This will also update your inventory stock (automatic rollback).')) return;
    
    try {
      const { error: delErr } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;

      setSuccess(true);
      fetchPurchases();
      fetchOptions(category); // Refresh stock indicators
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete purchase');
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <ShoppingCart className="w-6 h-6 text-amber-600" />
          <span>Purchases Module</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Log new purchases and automate inventory updates.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-amber-500" /> Add New Purchase
        </h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm"
              required
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm"
            >
              <option value="Oil">Oil</option>
              <option value="Bottles">Bottles</option>
              <option value="Packaging">Packaging / Boxes</option>
              <option value="Makhamria">Makhamria (مخمرية)</option>
              <option value="Supplies">Supplies</option>
              <option value="Assets">Assets</option>
            </select>
          </div>
          
          <div className="lg:col-span-1 relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Item Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={itemName}
                onChange={e => {
                  setItemName(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={category === 'Bottles' ? '30ml, 50ml, etc.' : 'Item name...'}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm pr-9"
                required
                autoComplete="off"
              />
              {optionsLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
              {!optionsLoading && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
            </div>

            {/* Dropdown Menu */}
            {showDropdown && filteredOptions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                {filteredOptions.map((opt, i) => (
                  <li 
                    key={i} 
                    onClick={() => {
                      setItemName(opt.name);
                      setShowDropdown(false);
                    }}
                    className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                  >
                    <span>{opt.name}</span>
                    {opt.stock != null && <span className="text-xs font-bold text-slate-400">{opt.stock} {category === 'Oil' ? 'ml' : category === 'Makhamria' ? 'Pcs' : ''}</span>}
                  </li>
                ))}
              </ul>
            )}
            
            {/* Auto-updating Stock Indicator */}
            <div className="mt-2 min-h-[20px]">
               {itemName.trim() !== '' && (
                 <>
                   {exactMatch ? (
                     <span className="inline-flex items-center text-xs font-bold px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md">
                       <PackageOpen className="w-3 h-3 mr-1" />
                       {exactMatch.stock != null 
                         ? `Current Stock: ${exactMatch.stock} ${category === 'Oil' ? 'ml' : category === 'Makhamria' ? 'Pcs' : ''}`
                         : 'Existing Item'}
                     </span>
                   ) : (
                     <span className="inline-flex items-center text-xs font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md">
                       <Plus className="w-3 h-3 mr-1" />
                       New Item
                     </span>
                   )}
                 </>
               )}
            </div>
          </div>
          
          <div className="lg:col-span-1 border-t lg:border-t-0 pt-2 lg:pt-0">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Quantity {category === 'Oil' ? '(ml)' : category === 'Makhamria' ? '(Pcs / عدد)' : ''}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => handleQuantityChange(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm"
              required
            />
          </div>
          <div className="lg:col-span-1 pt-2 lg:pt-0">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Unit Cost</label>
            <input
              type="number"
              value={unitCost}
              onChange={e => handleUnitCostChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm"
            />
          </div>
          <div className="lg:col-span-1 pt-2 lg:pt-0">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Total Cost (EGP)</label>
            <input
              type="number"
              value={totalCost}
              onChange={e => handleTotalCostChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-600 outline-none text-sm"
              required
            />
          </div>
          
          <div className="lg:col-span-6 flex justify-end mt-2">
             <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center transition-colors disabled:opacity-50"
             >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                Log Purchase
             </button>
          </div>
        </form>

        {error && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        )}
        {success && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg animate-in fade-in">
                <CheckCircle2 className="w-5 h-5" /> Action Successful & Inventory Updated!
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
           <h3 className="font-bold text-slate-800 dark:text-slate-100">Purchase History</h3>
        </div>
        <div className="overflow-auto max-h-[400px]">
           <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
             <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
               <tr>
                 <th className="px-6 py-4">Date</th>
                 <th className="px-6 py-4">Category</th>
                 <th className="px-6 py-4">Item Name</th>
                 <th className="px-6 py-4 text-right">Quantity</th>
                 <th className="px-6 py-4 text-right">Total Cost</th>
                 <th className="px-6 py-4 text-center text-xs uppercase tracking-wider">Delete</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {loading ? (
                   <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
               ) : purchases.length === 0 ? (
                   <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No purchases found.</td></tr>
               ) : (
                purchases.map(p => (
                   <tr key={p.id || Math.random()} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                     <td className="px-6 py-4">{p.purchase_date}</td>
                     <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${
                         p.category === 'Oil' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                         p.category === 'Bottles' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                         p.category === 'Assets' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                         'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                       }`}>
                          {p.category}
                       </span>
                     </td>
                     <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{p.item_name}</td>
                     <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                       {p.quantity} {p.category === 'Oil' ? 'ml' : ''}
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-red-500">
                       -{Number(p.total_cost).toFixed(2)} EGP
                     </td>
                     <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete Purchase Log"
                        >
                          <Trash2 size={16} />
                        </button>
                     </td>
                   </tr>
                ))
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
