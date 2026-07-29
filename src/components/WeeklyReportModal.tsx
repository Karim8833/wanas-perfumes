import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, DollarSign, Target, Droplet, Users, AlertTriangle, FileText, Loader2, Sparkles, BarChart2 } from 'lucide-react';
import { Order } from '../types';
import { supabase } from '../supabaseClient';

interface WeeklyReportModalProps {
  orders: Order[];
  onClose: () => void;
}

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ orders, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [lowStockWarning, setLowStockWarning] = useState<{name: string, stock: number}[]>([]);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch purchases for expenses
        const { data: purchases } = await supabase
          .from('purchases')
          .select('total_cost, purchase_date')
          .gte('purchase_date', sevenDaysAgo.toISOString().split('T')[0]);
        
        let expenses = 0;
        if (purchases && purchases.length > 0) {
           expenses = purchases.reduce((acc, p) => acc + (Number(p.total_cost) || 0), 0);
        }
        setTotalExpenses(expenses);

        // Fetch low stock products
        const { data: perfumes } = await supabase
          .from('perfumes')
          .select('name, stock_ml')
          .lt('stock_ml', 15)
          .not('stock_ml', 'is', null);

        if (perfumes) {
          setLowStockWarning(perfumes.map(p => ({ name: p.name, stock: p.stock_ml })));
        }
      } catch (e) {
        console.error('Error fetching report data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reportData = useMemo(() => {
    const thisWeekOrders = orders.filter(o => o.status === 'Sold' && o.soldAt && new Date(o.soldAt) >= sevenDaysAgo);
    const lastWeekOrders = orders.filter(o => o.status === 'Sold' && o.soldAt && new Date(o.soldAt) >= fourteenDaysAgo && new Date(o.soldAt) < sevenDaysAgo);

    const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0);
    const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0);

    const trendObj = {
      isUp: thisWeekRevenue >= lastWeekRevenue,
      percent: lastWeekRevenue === 0 ? 100 : ((Math.abs(thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
    };

    let totalMlConsumed = 0;
    const perfumeSales: Record<string, number> = {};
    const customerSales: Record<string, number> = {};

    thisWeekOrders.forEach(order => {
       customerSales[order.clientName || 'Unknown'] = (customerSales[order.clientName || 'Unknown'] || 0) + (order.totalOrderValue || 0);
       
       if (order.items && Array.isArray(order.items)) {
         order.items.forEach(item => {
            const qty = item.quantity || 1;
            // Roughly estimate oil consumed based on size (30ml = 8ml, 50ml = 15ml, 100ml = 30ml)
            let perBottleMl = 15;
            if (item.size === '30ml') perBottleMl = 8;
            if (item.size === '100ml') perBottleMl = 30;

            if (item.isMix && item.ingredients) {
               item.ingredients.forEach(ing => {
                 perfumeSales[ing.perfumeName] = (perfumeSales[ing.perfumeName] || 0) + (ing.amountMl * qty);
                 totalMlConsumed += (ing.amountMl * qty);
               });
            } else if (item.perfumeName) {
               perfumeSales[item.perfumeName] = (perfumeSales[item.perfumeName] || 0) + (perBottleMl * qty);
               totalMlConsumed += (perBottleMl * qty);
            }
         });
       } else if ((order as any).perfumeName) { // Legacy order fallback
         perfumeSales[(order as any).perfumeName] = (perfumeSales[(order as any).perfumeName] || 0) + 15;
         totalMlConsumed += 15;
       }
    });

    const topCustomer = Object.keys(customerSales).sort((a,b) => customerSales[b] - customerSales[a])[0] || 'N/A';
    const topCustomerSpent = topCustomer !== 'N/A' ? customerSales[topCustomer] : 0;

    const topOils = Object.entries(perfumeSales)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 3);

    const aov = thisWeekOrders.length > 0 ? (thisWeekRevenue / thisWeekOrders.length) : 0;

    return {
      revenue: thisWeekRevenue,
      orderCount: thisWeekOrders.length,
      aov,
      topCustomer: { name: topCustomer, spent: topCustomerSpent },
      topOils,
      totalMlConsumed,
      trend: trendObj
    };
  }, [orders]);

  // AI Advice string
  const aiInsights = useMemo(() => {
    if (reportData.revenue === 0) return "It's been a slow week. Consider reaching out to your past top customers with a fresh marketing promo!";
    if (reportData.trend.isUp && reportData.trend.percent > 20) return `Incredible growth! You're up ${reportData.trend.percent.toFixed(0)}% from last week. Keep doubling down on your top-selling products.`;
    if (lowStockWarning.length > 3) return "Inventory Alert: You have several oils running critically low this week. Prioritize restocking to prevent blocked sales.";
    if (reportData.aov < 100 && reportData.revenue > 0) return "Order volumes are good, but your Average Order Value is low. Try offering bundles or 'Buy 2 Get 1' discounts!";
    if (!reportData.trend.isUp && reportData.trend.percent > 20) return "Slower week than usual. It might be time to run a targeted social media ad highlighting your top-sellers.";
    return "Operations are running smoothly! Maintain your current strategy and continue tracking stock levels aggressively.";
  }, [reportData, lowStockWarning]);

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 shadow-2xl" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-800 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
         
         <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Weekly Performance Report</h2>
                 <p className="text-xs text-slate-500 dark:text-slate-400">Analysis of the last 7 days</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
         </div>

         {loading ? (
             <div className="flex flex-col items-center justify-center py-32 text-blue-500">
               <Loader2 className="w-10 h-10 animate-spin mb-4" />
               <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide animate-pulse">Compiling Report...</p>
             </div>
         ) : (
           <div className="p-6 space-y-6">
             
             {/* AI Tip Bar */}
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl flex gap-4">
                 <div className="mt-1 flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full text-blue-600 dark:text-blue-400 h-fit">
                    <Sparkles className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">AI Business Insight</h4>
                    <p className="text-sm font-medium text-blue-900/80 dark:text-blue-200/80">{aiInsights}</p>
                 </div>
             </div>

             {/* Financial Metrics */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                       <DollarSign className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-wider">Revenue</span>
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{reportData.revenue.toFixed(0)} <span className="text-sm font-bold text-slate-400">EGP</span></div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 mb-2">
                       <BarChart2 className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-500">{totalExpenses.toFixed(0)} <span className="text-sm font-bold text-rose-500/50">EGP</span></div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 mb-2">
                       <Target className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-wider">Avg Order</span>
                    </div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{reportData.aov.toFixed(1)} <span className="text-sm font-bold text-slate-400">EGP</span></div>
                    <span className="text-xs text-slate-400">{reportData.orderCount} orders total</span>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all hover:bg-white dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2 text-indigo-500 mb-2">
                       <TrendingUp className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-wider">Growth Trend</span>
                    </div>
                    <div className={`text-2xl font-black ${reportData.trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                       {reportData.trend.isUp ? '+' : '-'}{reportData.trend.percent.toFixed(0)}%
                    </div>
                    <span className="text-xs text-slate-400">Vs previous week</span>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Performance */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-6 relative">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Droplet className="w-5 h-5"/></div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Product Performance</h3>
                   </div>
                   
                   <div className="mb-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Oil Consumed</p>
                      <div className="text-xl font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 inline-block px-3 py-1 rounded-lg">~ {reportData.totalMlConsumed.toFixed(0)} ml</div>
                   </div>

                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Top 3 Best-Selling Oils</p>
                   <div className="space-y-3">
                     {reportData.topOils.length === 0 ? <p className="text-sm text-slate-500">No data available.</p> : reportData.topOils.map((arr, i) => (
                        <div key={i} className="flex justify-between items-center text-sm font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                          <span className="text-slate-700 dark:text-slate-300"><span className="text-amber-500 mr-2">#{i+1}</span>{arr[0]}</span>
                          <span className="text-slate-500 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-xs">{arr[1].toFixed(0)} ml eq.</span>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="space-y-6">
                   {/* Top Customer */}
                   <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><Users className="w-5 h-5"/></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Customer Insights</h3>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Highest Spender (Last 7 Days)</p>
                      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 p-4 rounded-xl flex justify-between items-center">
                         <span className="font-bold text-purple-900 dark:text-purple-200 truncate">{reportData.topCustomer.name}</span>
                         <span className="text-purple-600 font-bold bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-md text-sm">{reportData.topCustomer.spent.toFixed(0)} EGP</span>
                      </div>
                   </div>

                   {/* Low Stock Warning */}
                   <div className="border border-red-100 dark:border-red-900/30 rounded-2xl p-6 bg-red-50/50 dark:bg-red-950/10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg"><AlertTriangle className="w-5 h-5"/></div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Low Stock Limit Reached</h3>
                      </div>
                      <div className="max-h-32 overflow-y-auto custom-scrollbar">
                        {lowStockWarning.length === 0 ? <p className="text-sm font-medium text-emerald-600 dark:text-emerald-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2"/>All inventories are healthy!</p> : (
                          <div className="flex flex-wrap gap-2">
                             {lowStockWarning.map((item, i) => (
                               <span key={i} className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md shadow-sm">
                                 {item.name} ({item.stock}ml)
                               </span>
                             ))}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
             </div>

           </div>
         )}
      </div>
    </div>
  );
};

export default WeeklyReportModal;
