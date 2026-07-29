import React, { useMemo, useState } from 'react';
import { Users, Phone, MapPin, Star, Package, FileSpreadsheet, Pencil, DollarSign, ShoppingBag, List } from 'lucide-react';
import { Order, Role } from '../types';
import { supabase } from '../supabaseClient';

interface CustomerDatabaseProps {
  orders: Order[];
  currentUserRole?: Role;
  onRefresh?: () => void;
  dbCustomers?: any[];
}

interface CustomerStats {
  id: string; // The UUID from the customers table
  name: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalItemsBought: number;
  totalSpent: number;
  perfumes: Record<string, number>;
  sizes: Record<string, number>;
  favoritePerfume?: string;
  favoriteSize?: string;
  isLegacy?: boolean; // If not found in customers table
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
interface EditModalProps {
  customer: CustomerStats;
  onClose: () => void;
  onSaved: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ customer, onClose, onSaved }) => {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone === 'N/A' ? '' : customer.phone);
  const [address, setAddress] = useState(customer.address === 'N/A' ? '' : customer.address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: supabaseError } = await supabase
        .from('customers')
        .update({ name, phone, address })
        .eq('id', customer.id);

      if (supabaseError) throw supabaseError;

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 12, padding: 24, width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Edit Customer</h2>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Phone</span>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Address</span>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </label>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Button (holds its own modal open/close state) ─────────────────────────
interface EditCustomerButtonProps {
  customer: CustomerStats;
  onSaved?: () => void;
}

const EditCustomerButton: React.FC<EditCustomerButtonProps> = ({ customer, onSaved }) => {
  const [open, setOpen] = useState(false);

  const handleSaved = () => {
    alert(`Customer "${customer.name}" updated successfully!`);
    onSaved?.();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Edit customer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}
      >
        <Pencil size={14} />
        Edit
      </button>
      {open && (
        <EditModal
          customer={customer}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

// ── Customer Profile Modal ─────────────────────────────────────────────────────
interface CustomerProfileModalProps {
  customer: CustomerStats;
  orders: Order[];
  onClose: () => void;
}

const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ customer, orders, onClose }) => {
  const customerOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.phone && customer.phone !== 'N/A' && order.phone === customer.phone) return true;
      if (order.clientName && order.clientName.toLowerCase() === customer.name.toLowerCase()) return true;
      return false;
    }).sort((a, b) => {
      const dateA = a.soldAt ? new Date(a.soldAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.soldAt ? new Date(b.soldAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [orders, customer]);

  const whatsappUrl = customer.phone !== 'N/A' 
    ? `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`
    : '#';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Dark/Gold theme */}
        <div className="bg-slate-900 border-b border-amber-900/30 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-amber-900/50 flex-shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-50 mb-1">{customer.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-amber-200/70">
                <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {customer.address}</span>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 flex gap-3 w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0">
            {customer.phone !== 'N/A' && (
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#25D366]/20"
              >
                WhatsApp
              </a>
            )}
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
           <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Spent (LTV)</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{Math.round(customer.totalSpent)} <span className="text-sm">EGP</span></p>
              </div>
           </div>
           
           <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Order Count</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{customerOrders.length}</p>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Star size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600/70 mb-1">Favorite Scent</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 truncate w-full" title={customer.favoritePerfume}>{customer.favoritePerfume}</p>
              </div>
           </div>
        </div>

        {/* Order History Table */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6 sm:p-8 pt-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <List size={20} className="text-amber-500" />
            Order History
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
             <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                   <tr>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Items</th>
                      <th className="px-6 py-4 font-semibold text-emerald-600">Total Price</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {customerOrders.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8">No order history found.</td></tr>
                  ) : (
                    customerOrders.map(order => {
                      const date = order.soldAt ? new Date(order.soldAt) : new Date(order.createdAt);
                      const itemsStr = order.items && order.items.length > 0 
                        ? order.items.map(i => `${i.quantity || 1}x ${i.perfumeName} (${i.size})`).join(', ')
                        : `${(order as any).perfumeName} (${(order as any).size})`;

                      return (
                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700 dark:text-slate-300">{date.toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                             {itemsStr}
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-500">
                             {Math.round(order.totalOrderValue || 0)} EGP
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${
                              order.status === 'Sold' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const CustomerDatabase: React.FC<CustomerDatabaseProps> = ({ orders, currentUserRole = 'Owner', onRefresh, dbCustomers }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);

  const soldOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders.filter(o => o.status === 'Sold');
  }, [orders]);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerStats>();

    // 1. Initialize from the actual customers table
    if (dbCustomers && Array.isArray(dbCustomers)) {
      dbCustomers.forEach((c: any) => {
        const id = c.id;
        map.set(id, {
          id,
          name: c.name || 'Unknown',
          phone: c.phone || 'N/A',
          address: c.address || 'N/A',
          totalPurchases: 0,
          totalItemsBought: 0,
          totalSpent: 0,
          perfumes: {},
          sizes: {},
          isLegacy: false
        });
      });
    }

    // 2. Aggregate stats from sold orders dynamically
    const finalCustomers = Array.from(map.values()).map(stats => {
      // Find all sold orders belonging to this specific customer
      const matchingOrders = soldOrders.filter(order => {
        if (!order) return false;
        // Match by phone if available (primary check)
        if (order.phone && stats.phone !== 'N/A' && order.phone === stats.phone) return true;
        // Match by name if phone not available or doesn't match
        if (order.clientName && order.clientName.toLowerCase() === stats.name.toLowerCase()) return true;
        return false;
      });

      const dynamicStats = {
        ...stats,
        totalPurchases: matchingOrders.length,
        totalSpent: matchingOrders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0),
        totalItemsBought: 0,
        perfumes: {} as Record<string, number>,
        sizes: {} as Record<string, number>
      };

      matchingOrders.forEach(order => {
        const items = (order.items && Array.isArray(order.items)) ? order.items : [];
        if (items.length === 0 && (order as any).perfumeName && (order as any).size) {
          items.push({
            perfumeName: (order as any).perfumeName,
            size: (order as any).size as any,
            quantity: 1,
            unitPrice: (order as any).sellingPrice || 0
          });
        }
        items.forEach(item => {
          if (!item) return;
          const qty = item.quantity || 1;
          dynamicStats.totalItemsBought += qty;
          if (item.perfumeName) dynamicStats.perfumes[item.perfumeName] = (dynamicStats.perfumes[item.perfumeName] || 0) + qty;
          if (item.size) dynamicStats.sizes[item.size] = (dynamicStats.sizes[item.size] || 0) + qty;
        });
      });

      const favoritePerfume = Object.keys(dynamicStats.perfumes).length > 0
        ? Object.keys(dynamicStats.perfumes).sort((a, b) => dynamicStats.perfumes[b] - dynamicStats.perfumes[a])[0]
        : 'Unknown';
      const favoriteSize = Object.keys(dynamicStats.sizes).length > 0
        ? Object.keys(dynamicStats.sizes).sort((a, b) => dynamicStats.sizes[b] - dynamicStats.sizes[a])[0]
        : 'Unknown';

      return { ...dynamicStats, favoritePerfume, favoriteSize };
    });

    // 3. Add any legacy "Sold" customers not present in the customer table
    // (This ensures we don't lose data from orders that didn't have a registered customer record)
    soldOrders.forEach(order => {
      const isRegistered = finalCustomers.some(c => 
        (order.phone && c.phone === order.phone) || 
        (order.clientName && c.name.toLowerCase() === order.clientName.toLowerCase())
      );

      if (!isRegistered) {
        const id = order.phone || (order.clientName ? order.clientName.toLowerCase() : 'unknown-legacy');
        if (!map.has(id)) {
          const items = (order.items && Array.isArray(order.items)) ? order.items : [];
          const itemsCount = items.reduce((s, i) => s + (i.quantity || 1), 0) || 1;
          
          const legacyStats = {
            id,
            name: order.clientName || 'Unregistered',
            phone: order.phone || 'N/A',
            address: order.address || 'N/A',
            totalPurchases: 1,
            totalItemsBought: itemsCount,
            totalSpent: order.totalOrderValue || 0,
            perfumes: {} as Record<string, number>,
            sizes: {} as Record<string, number>,
            favoritePerfume: items[0]?.perfumeName || 'Unknown',
            favoriteSize: items[0]?.size || 'Unknown',
            isLegacy: true
          };
          
          finalCustomers.push(legacyStats);
          // Mark as handled for this run
          map.set(id, legacyStats);
        }
      }
    });

    return finalCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [soldOrders, dbCustomers]);

  const handleExportExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      const { utils, writeFile } = xlsx;
      const data = customers.map(c => ({
        'Client Name': c.name,
        'Phone': c.phone || 'N/A',
        'Address': c.address || 'N/A',
        'Total Purchases': c.totalPurchases,
        'Total Spent (EGP)': Math.round(c.totalSpent),
        'Favorite Perfume': c.favoritePerfume,
        'Favorite Size': c.favoriteSize
      }));
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Customers');
      const dateStr = new Date().toISOString().split('T')[0];
      writeFile(wb, `Wanas_Customer_Database_${dateStr}.xlsx`);
    } catch (e) {
      console.error('Excel Export Error: ', e);
      alert("Failed to export Excel. Please ensure the 'xlsx' library is installed.");
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Customer Database</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage VIPs and view client insights</p>
        </div>
        <div className="flex space-x-3 items-center">
          {currentUserRole === 'Owner' && (
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-emerald-600 border border-emerald-500 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all bg-white dark:bg-slate-900 shadow-sm"
              title="Download Customer List"
            >
              <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Download Customer List</span>
            </button>
          )}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Customer Roster</h3>
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            {customers.length} VIPs
          </span>
        </div>
        <div className="overflow-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Client Information</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4 text-emerald-600">Total Spent</th>
                <th className="px-6 py-4">Preferences</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No customer data available yet</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Complete sales in the Order Management tab to build your actionable customer database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{customer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                          {customer.totalItemsBought} Units
                        </span>{' '}
                        across {customer.totalPurchases} Orders
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{customer.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-xs">{customer.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-500 tracking-wide">
                      {Math.round(customer.totalSpent)} EGP
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <span className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                          <Star className="w-3.5 h-3.5 text-amber-500 mr-2 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{customer.favoritePerfume}</span>
                        </span>
                        <span className="flex items-center text-xs text-slate-700 dark:text-slate-300">
                          <Package className="w-3.5 h-3.5 text-indigo-400 mr-2 flex-shrink-0" />
                          {customer.favoriteSize}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <EditCustomerButton customer={customer} onSaved={onRefresh} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerProfileModal 
          customer={selectedCustomer} 
          orders={orders} 
          onClose={() => setSelectedCustomer(null)} 
        />
      )}
    </div>
  );
};

export default CustomerDatabase;
