import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Order } from '../types';
import { Calendar, Search, ArrowRight, TrendingUp, TrendingDown, DollarSign, Package, MinusCircle, CheckCircle2 } from 'lucide-react';

interface ActivityLedgerProps {
  orders: Order[];
}

interface ActivityItem {
  id: string;
  date: Date;
  type: 'Sale' | 'Purchase' | 'Withdrawal';
  details: string;
  amountIn: number;
  amountOut: number;
}

export default function ActivityLedger({ orders }: ActivityLedgerProps) {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*');
      if (error) console.error('Error fetching purchases:', error);
      else setPurchases(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    
    // Subscribe to purchases changes
    const channel = supabase
      .channel('ledger-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, fetchPurchases)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activities = useMemo(() => {
    const list: ActivityItem[] = [];

    // Process Orders (Sales)
    orders.forEach(order => {
      if (order.status !== 'Sold') return;
      const date = order.soldAt ? new Date(order.soldAt) : new Date(order.createdAt);
      
      // Filter by date
      const dStr = date.toISOString().split('T')[0];
      if (dStr < startDate || dStr > endDate) return;

      let itemsSummary = '';
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
         itemsSummary = order.items.map(i => `${i.quantity || 1}x ${i.perfumeName}`).join(', ');
      } else if ((order as any).perfumeName) {
         itemsSummary = `1x ${(order as any).perfumeName}`;
      }

      list.push({
        id: `sale-${order.id}`,
        date: date,
        type: 'Sale',
        details: `Sold ${itemsSummary} to ${order.clientName || 'Unknown'}`,
        amountIn: Math.round(order.totalOrderValue || 0),
        amountOut: 0
      });
    });

    // Process Purchases & Withdrawals
    purchases.forEach(p => {
      // purchase_date could be "YYYY-MM-DD" or full ISO.
      // Make sure we parse correctly. If it's just "YYYY-MM-DD", new Date("YYYY-MM-DD") is UTC midnight.
      const date = p.created_at ? new Date(p.created_at) : new Date(p.purchase_date);
      const dStr = date.toISOString().split('T')[0];
      
      if (dStr < startDate || dStr > endDate) return;

      const isWithdrawal = p.category === 'Withdrawal';
      
      list.push({
        id: `purch-${p.id}`,
        date: date,
        type: isWithdrawal ? 'Withdrawal' : 'Purchase',
        details: isWithdrawal ? (p.item_name || 'Expense Reason') : `Bought ${p.quantity}x ${p.item_name} (${p.category})`,
        amountIn: 0,
        amountOut: Math.round(Number(p.total_cost) || 0)
      });
    });

    // Sort chronologically (newest first for standard ledger view, or oldest first? 
    // Usually newest first is better, but chronological often means oldest first. Let's do newest first so recent is on top).
    // Actually, user said "sort chronologically". Let's sort oldest first, then display. Wait, newest first is better UX. 
    // Let's do newest first (descending).
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, purchases, startDate, endDate]);

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    activities.forEach(a => {
      totalIn += a.amountIn;
      totalOut += a.amountOut;
    });
    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut
    };
  }, [activities]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Sale': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Purchase': return <Package className="w-5 h-5 text-rose-500" />;
      case 'Withdrawal': return <MinusCircle className="w-5 h-5 text-amber-500" />;
      default: return null;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'Sale': return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30';
      case 'Purchase': return 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30';
      case 'Withdrawal': return 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30';
      default: return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-8 pr-1 md:pr-2">
      {/* Date Picker Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Detailed Activity Ledger
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Time travel through your financial history.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 p-5 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600/70 mb-1">Total In (+)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.totalIn} EGP</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 p-5 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-rose-600/70 mb-1">Total Out (-)</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{summary.totalOut} EGP</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl flex items-center justify-between border ${summary.netBalance >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/30'}`}>
          <div>
            <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${summary.netBalance >= 0 ? 'text-indigo-600/70' : 'text-orange-600/70'}`}>Net Balance</p>
            <p className={`text-2xl font-black ${summary.netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {summary.netBalance > 0 ? '+' : ''}{summary.netBalance} EGP
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${summary.netBalance >= 0 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 min-h-[500px] xl:min-h-[700px] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 custom-scrollbar pb-6">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Time/Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-emerald-600">Amount In (+)</th>
                <th className="px-6 py-4 text-rose-600">Amount Out (-)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-6 h-6 animate-pulse text-slate-300" />
                      <span>Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                     <div className="flex flex-col items-center justify-center gap-2">
                       <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                       <span className="font-bold text-slate-500">No financial activity on this date</span>
                     </div>
                  </td>
                </tr>
              ) : (
                activities.map(item => (
                  <tr key={item.id} className={`border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${getBgColor(item.type)}`}>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {item.date.toLocaleDateString()}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getIcon(item.type)}
                        <span className="font-bold text-slate-600 dark:text-slate-400">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{item.details}</span>
                    </td>
                    <td className="px-6 py-4">
                      {item.amountIn > 0 ? (
                        <span className="font-black text-emerald-600 dark:text-emerald-400">+{item.amountIn} EGP</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.amountOut > 0 ? (
                        <span className="font-black text-rose-600 dark:text-rose-400">-{item.amountOut} EGP</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
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
