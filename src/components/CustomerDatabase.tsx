import React, { useMemo } from 'react';
import { Users, Phone, MapPin, Star, Package, FileSpreadsheet } from 'lucide-react';
import { Order, Role } from '../types';

interface CustomerDatabaseProps {
  orders: Order[];
  currentUserRole?: Role;
}

interface CustomerStats {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalPurchases: number; // Represents carts
  totalItemsBought: number; // Represents physical units
  totalSpent: number;
  perfumes: Record<string, number>;
  sizes: Record<string, number>;
}

const CustomerDatabase: React.FC<CustomerDatabaseProps> = ({ orders, currentUserRole = 'Owner' }) => {
  const soldOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders.filter(o => o.status === 'Sold');
  }, [orders]);

  const customers = useMemo(() => {
    if (!soldOrders || soldOrders.length === 0) return [];

    const map = new Map<string, CustomerStats>();

    soldOrders.forEach(order => {
      if (!order) return;
      
      // Group logically by phone, falling back to name
      const id = order.phone || (order.clientName ? order.clientName.toLowerCase() : 'unknown');
      
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: order.clientName || 'Unknown Client',
          phone: order.phone || 'N/A',
          address: order.address || 'N/A',
          totalPurchases: 0,
          totalItemsBought: 0,
          totalSpent: 0,
          perfumes: {},
          sizes: {}
        });
      }

      const stats = map.get(id)!;
      // Upgrade missing properties if an older order didn't have them but newer does
      if (order.phone && stats.phone === 'N/A') stats.phone = order.phone;
      if (order.address && stats.address === 'N/A') stats.address = order.address;
      
      stats.totalPurchases += 1;
      stats.totalSpent += (order.totalOrderValue || 0);
      
      // Safety Check: Legacy Handling or Missing Array mapping
      const items = (order.items && Array.isArray(order.items)) ? order.items : [];
      
      if (items.length === 0 && (order as any).perfumeName && (order as any).size) {
        items.push({
          perfumeName: (order as any).perfumeName,
          size: (order as any).size as any,
          quantity: 1,
          unitPrice: (order as any).sellingPrice || 0
        });
      }

      // Iterate securely over items array multiplying quantities
      items.forEach(item => {
        if (!item) return;
        const qty = item.quantity || 1;
        stats.totalItemsBought += qty;
        
        if (item.perfumeName) {
           stats.perfumes[item.perfumeName] = (stats.perfumes[item.perfumeName] || 0) + qty;
        }
        if (item.size) {
           stats.sizes[item.size] = (stats.sizes[item.size] || 0) + qty;
        }
      });
    });

    return Array.from(map.values()).map(stats => {
      const favoritePerfume = Object.keys(stats.perfumes).length > 0
        ? Object.keys(stats.perfumes).sort((a, b) => stats.perfumes[b] - stats.perfumes[a])[0]
        : 'Unknown';
        
      const favoriteSize = Object.keys(stats.sizes).length > 0
        ? Object.keys(stats.sizes).sort((a, b) => stats.sizes[b] - stats.sizes[a])[0]
        : 'Unknown';

      return {
        ...stats,
        favoritePerfume,
        favoriteSize
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [soldOrders]);

  const handleExportExcel = async () => {
    try {
      // Dynamic import to prevent static build crash on uninitialized libraries
      const xlsx = await import('xlsx');
      const { utils, writeFile } = xlsx;

      const data = customers.map(c => ({
        'Client Name': c.name,
        'Phone': c.phone || 'N/A',
        'Address': c.address || 'N/A',
        'Total Purchases': c.totalPurchases,
        'Total Spent (EGP)': c.totalSpent.toFixed(2),
        'Favorite Perfume': c.favoritePerfume,
        'Favorite Size': c.favoriteSize
      }));

      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Customers");
      const dateStr = new Date().toISOString().split('T')[0];
      writeFile(wb, `Wanas_Customer_Database_${dateStr}.xlsx`);
    } catch (e) {
      console.error("Excel Export Error: ", e);
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
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{customers.length} VIPs</span>
        </div>
        <div className="overflow-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Client Information</th>
                <th className="px-6 py-4">Contact Details</th>
                <th className="px-6 py-4 text-emerald-600">Total Spent</th>
                <th className="px-6 py-4">Preferences</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">No customer data available yet</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Complete sales in the Order Management tab to build your actionable customer database.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{customer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">{customer.totalItemsBought} Units</span> across {customer.totalPurchases} Orders
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
                      {customer.totalSpent.toFixed(2)} EGP
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <span className="flex items-center text-xs text-slate-700 dark:text-slate-300"><Star className="w-3.5 h-3.5 text-amber-500 mr-2 flex-shrink-0" /> <span className="truncate max-w-[150px]">{customer.favoritePerfume}</span></span>
                        <span className="flex items-center text-xs text-slate-700 dark:text-slate-300"><Package className="w-3.5 h-3.5 text-indigo-400 mr-2 flex-shrink-0" /> {customer.favoriteSize}</span>
                      </div>
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
};

export default CustomerDatabase;
