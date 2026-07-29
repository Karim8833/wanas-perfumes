import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Wallet, LineChart, Crown, Flame, FileSpreadsheet, Landmark, ShoppingCart, ArrowLeft, BarChart2 } from 'lucide-react';
import { Order, SystemSettings, Role } from '../types';
import Purchases from './Purchases';
import CapitalAssets from './CapitalAssets';
import WeeklyReportModal from './WeeklyReportModal';
import ActivityLedger from './ActivityLedger';
import { useLanguage } from '../LanguageContext';

interface AccountingDashboardProps {
  orders: Order[];
  settings: SystemSettings;
  currentUserRole?: Role;
}

const AccountingDashboard: React.FC<AccountingDashboardProps> = ({ orders, settings, currentUserRole = 'Owner' }) => {
  const [view, setView] = useState<'dashboard'|'purchases'|'capital'|'activity'>('dashboard');
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const { t, language } = useLanguage();

  const soldOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    return orders
      .filter(o => o && o.status === 'Sold')
      .sort((a, b) => {
        const timeA = a.soldAt?.getTime() || a.createdAt?.getTime() || 0;
        const timeB = b.soldAt?.getTime() || b.createdAt?.getTime() || 0;
        return timeB - timeA;
      });
  }, [orders]);
  
  const stats = useMemo(() => {
    const revenue = soldOrders.reduce((sum, order) => sum + (order.totalOrderValue || 0), 0);
    
    let totalProductionCosts = 0;
    soldOrders.forEach(order => {
        let orderCost = 0;
        let hasNewLogic = false;

        if (order.items && Array.isArray(order.items)) {
           order.items.forEach(item => {
               if (item.calculatedCost !== undefined && item.calculatedCost > 0) {
                   orderCost += item.calculatedCost * (item.quantity || 1);
                   hasNewLogic = true;
               }
           });
        }

        if (hasNewLogic) {
            totalProductionCosts += orderCost;
        } else {
            // Legacy orders fallback
            const marginMultiplier = 1 + settings.profitMargin + settings.reinvestmentMargin;
            totalProductionCosts += (order.totalOrderValue || 0) / marginMultiplier;
        }
    });

    const netProfit = revenue - totalProductionCosts;
    const reinvestment = totalProductionCosts * settings.reinvestmentMargin; // Legacy compatibility

    return { revenue, profit: netProfit, reinvestment, totalProductionCosts };
  }, [soldOrders, settings]);

  const analytics = useMemo(() => {
    if (soldOrders.length === 0) return { topClient: null, bestSeller: null };

    const clientTotals = soldOrders.reduce((acc, order) => {
      const name = order.clientName || 'Unknown Client';
      acc[name] = (acc[name] || 0) + (order.totalOrderValue || 0);
      return acc;
    }, {} as Record<string, number>);

    const topClientName = Object.keys(clientTotals).sort((a, b) => clientTotals[b] - clientTotals[a])[0];

    // Accurate Best Seller iteration over every item quantity
    const perfumeCounts = soldOrders.reduce((acc, order) => {
      const items = (order.items && Array.isArray(order.items)) ? order.items : [];
      
      if (items.length === 0 && (order as any).perfumeName) {
         acc[(order as any).perfumeName] = (acc[(order as any).perfumeName] || 0) + 1;
      } else {
        items.forEach(item => {
          if (item && item.perfumeName) {
            acc[item.perfumeName] = (acc[item.perfumeName] || 0) + (item.quantity || 1);
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const bestSellerName = Object.keys(perfumeCounts).sort((a, b) => perfumeCounts[b] - perfumeCounts[a])[0];

    return {
      topClient: { name: topClientName, totalSpent: clientTotals[topClientName] },
      bestSeller: bestSellerName ? { name: bestSellerName, count: perfumeCounts[bestSellerName] } : null
    };
  }, [soldOrders]);

  // Helper: compute production cost for a single order from item data
  const getOrderCost = (order: Order): number => {
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const hasNewLogic = order.items.some(i => i.calculatedCost !== undefined && i.calculatedCost > 0);
      if (hasNewLogic) {
        return order.items.reduce((sum, i) => sum + (i.calculatedCost || 0) * (i.quantity || 1), 0);
      }
    }
    // Legacy fallback
    const marginMultiplier = 1 + settings.profitMargin + settings.reinvestmentMargin;
    return (order.totalOrderValue || 0) / marginMultiplier;
  };

  const handleExportExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      const { utils, writeFile } = xlsx;

      const data = soldOrders.map(order => {
        const sellingPrice = order.totalOrderValue || 0;
        const costPrice = getOrderCost(order);
        const liveMargin = sellingPrice - costPrice;

        let itemsSummary = '';
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
           itemsSummary = order.items.map(i => `${i.quantity || 1}x ${i.perfumeName} (${i.size})`).join(', ');
        } else if ((order as any).perfumeName) {
           itemsSummary = `1x ${(order as any).perfumeName} (${(order as any).size})`;
        }

        return {
          'Date': order.soldAt ? new Date(order.soldAt).toLocaleDateString() : (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'),
          'Client Name': order.clientName || 'Unknown',
          'Items': itemsSummary,
          'Selling Price (EGP)': Math.round(sellingPrice),
          'Cost Price (EGP)': Math.round(costPrice),
          'Live Margin (EGP)': Math.round(liveMargin)
        };
      });

      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Sales Ledger");
      const dateStr = new Date().toISOString().split('T')[0];
      writeFile(wb, `Wanas_Sales_Report_${dateStr}.xlsx`);
    } catch (e) {
      console.error("Excel Export Error: ", e);
      alert("Failed to export Excel. Please ensure the 'xlsx' library is installed.");
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2">
      {view === 'dashboard' ? (
        <>
          <div className="flex flex-wrap grow justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('accountingDashboard')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('financialOverview')}</p>
            </div>
            {currentUserRole === 'Owner' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                <button
                  onClick={() => setShowWeeklyReport(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 font-bold rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-900 shadow-sm"
                >
                  <BarChart2 className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{language === 'ar' ? 'تقرير الأسبوع' : 'Weekly Report'}</span>
                </button>
                <button
                  onClick={() => setView('capital')}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-500 font-bold rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-900 shadow-sm"
                >
                  <Landmark className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('capitalAssets')}</span>
                </button>
                <button
                  onClick={() => setView('purchases')}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 font-bold rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-900"
                >
                  <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('purchasesModule')}</span>
                </button>
                <button
                  onClick={() => setView('activity')}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-500 font-bold rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-900 shadow-sm"
                >
                  <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Activity Ledger</span>
                </button>
              </div>
            )}
          </div>

      {soldOrders.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-900 dark:text-amber-400 p-4 rounded-xl flex items-center mb-6">
          <TrendingUp className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">Your Accounting Dashboard is currently empty. Complete sales from the Order Management pipeline to populate financial analytics.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <LineChart className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wider">{t('totalRevenue')}</span>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{Math.round(stats.revenue)}</span>
            <span className="text-lg text-slate-500 dark:text-slate-400 mb-1">EGP</span>
          </div>
          <p className="text-sm text-slate-400 mt-2">{soldOrders.length} {t('cartsProcessed')}</p>
        </div>

        {/* Net Profit (Live Margin) */}
        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 shadow-sm border border-emerald-200 dark:border-emerald-800/50 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-emerald-600 dark:text-emerald-500" />
          </div>
          <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm uppercase tracking-wider">{t('netProfit')}</span>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
               {stats.profit > 0 ? '+' : ''}{Math.round(stats.profit)}
            </span>
            <span className="text-lg text-emerald-600/70 dark:text-emerald-400/70 mb-1 font-bold">EGP</span>
          </div>
          <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-2 font-medium">{t('revenueCosts')}</p>
        </div>

        {/* Total Cost */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Wallet className="w-24 h-24" />
          </div>
          <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 mb-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm uppercase tracking-wider">{t('totalCost')}</span>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{Math.round(stats.totalProductionCosts)}</span>
            <span className="text-lg text-slate-500 dark:text-slate-400 mb-1">EGP</span>
          </div>
          <p className="text-sm text-slate-400 mt-2">{t('sumProductionCosts')}</p>
        </div>
      </div>

      {/* Business Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Client */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 mb-2">
              <Crown className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase tracking-wider">{t('topClient')}</span>
            </div>
            {analytics.topClient ? (
              <>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{analytics.topClient.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('totalSpent')} <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.round(analytics.topClient.totalSpent)} {t('egp')}</span>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-400 dark:text-slate-500">N/A</h3>
                <p className="text-sm text-slate-500 dark:text-slate-600 mt-1">Not enough data</p>
              </>
            )}
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-full text-amber-500 opacity-80 flex-shrink-0">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>

        {/* Best-Selling Perfume */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 mb-2">
              <Flame className="w-5 h-5" />
              <span className="font-semibold text-sm uppercase tracking-wider">{t('bestSeller')}</span>
            </div>
            {analytics.bestSeller ? (
              <>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{analytics.bestSeller.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('sold')} <span className="font-semibold text-slate-700 dark:text-slate-300">{analytics.bestSeller.count}</span> {t('units')}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-slate-400 dark:text-slate-500">N/A</h3>
                <p className="text-sm text-slate-500 dark:text-slate-600 mt-1">Not enough data</p>
              </>
            )}
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-full text-rose-500 opacity-80 flex-shrink-0">
            <Flame className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
        </div>
      </div>
      
      {/* Recent Sales List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('recentSalesLedger')}</h3>
          {currentUserRole === 'Owner' && (
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-emerald-600 border border-emerald-500 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all bg-white dark:bg-slate-900 shadow-sm"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">{t('downloadExcel')}</span>
            </button>
          )}
        </div>
        <div className="overflow-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 relative">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">{t('client')}</th>
                <th className="px-6 py-4">{t('cartSummary')}</th>
                <th className="px-6 py-4">{t('sellingPrice')}</th>
                <th className="px-6 py-4 text-slate-500">{t('costPrice')}</th>
                <th className="px-6 py-4 text-emerald-600">{t('liveMargin')}</th>
              </tr>
            </thead>
            <tbody>
              {soldOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('noSalesYet')}</td>
                </tr>
              ) : (
                soldOrders.map(order => {
                  const sellingPrice = order.totalOrderValue || 0;
                  const costPrice = getOrderCost(order);
                  const liveMargin = sellingPrice - costPrice;

                  let totalItems = 1;
                  let itemsLabel = 'Legacy Item';

                  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                     totalItems = order.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
                     itemsLabel = order.items.map(i => i.perfumeName).join(', ');
                  } else if ((order as any).perfumeName) {
                     itemsLabel = (order as any).perfumeName;
                  }

                  return (
                    <tr key={order.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{order.clientName || 'Unknown'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{totalItems} {t('items')}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] truncate">{itemsLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{Math.round(sellingPrice)} EGP</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{Math.round(costPrice)} EGP</td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">{liveMargin >= 0 ? '+' : ''}{Math.round(liveMargin)} EGP</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {showWeeklyReport && (
        <WeeklyReportModal orders={orders} onClose={() => setShowWeeklyReport(false)} />
      )}
      </>
      ) : (
      <div className="h-full flex flex-col">
          <div className="mb-4">
             <button
                onClick={() => setView('dashboard')}
                className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
             >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Accounting</span>
             </button>
          </div>
          {view === 'purchases' ? <Purchases /> : view === 'capital' ? <CapitalAssets /> : <ActivityLedger orders={orders} />}
      </div>
      )}
    </div>
  );
};

export default AccountingDashboard;
