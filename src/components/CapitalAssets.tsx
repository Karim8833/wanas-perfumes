import { useState, useEffect, useCallback } from 'react';
import {
  Landmark, TrendingUp, Package, ShoppingBag, Save, Loader2, CheckCircle2,
  DollarSign, Activity, ArrowUpRight, ArrowDownRight, Edit2, X, Wallet,
  ShoppingCart, MinusCircle, Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CapitalAssets() {
  const [capital, setCapital] = useState<number | ''>('');
  const [savingCapital, setSavingCapital] = useState(false);
  const [capitalSuccess, setCapitalSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCapital, setModalCapital] = useState<number | ''>('');

  // Withdrawal modal state
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number | ''>('');
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  const [inventoryValue, setInventoryValue] = useState({ oils: 0, bottles: 0, assets: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [loadingValues, setLoadingValues] = useState(true);

  // Hover tooltip for Cash on Hand breakdown
  const [showCashBreakdown, setShowCashBreakdown] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingValues(true);

    let oilsSum = 0;
    let bottlesSum = 0;
    let assetsSum = 0;
    let revenueSum = 0;
    let purchasesSum = 0;
    let withdrawalsSum = 0;

    // 1. Fetch Capital + Withdrawals
    try {
      const capRes = await supabase
        .from('business_capital')
        .select('manual_capital, total_withdrawals')
        .eq('id', 1)
        .maybeSingle();
      if (capRes.error) {
        console.error('Error fetching business_capital:', capRes.error);
      } else if (capRes.data) {
        setCapital(capRes.data.manual_capital ?? 0);
        withdrawalsSum = Number(capRes.data.total_withdrawals) || 0;
      }
    } catch (e) {
      console.error('Exception fetching business_capital:', e);
    }

    // 2. Fetch Perfumes (Oils inventory value)
    try {
      const { data, error } = await supabase.from('perfumes').select('stock_ml, cost_price');
      if (error) console.error('Error fetching perfumes:', error);
      else if (data) oilsSum = data.reduce((sum, p) => sum + ((p.stock_ml || 0) * (p.cost_price || 0)), 0);
    } catch (e) {
      console.error('Exception fetching perfumes:', e);
    }

    // 3. Fetch Bottles
    try {
      const { data, error } = await supabase.from('bottles').select('stock_quantity, unit_price');
      if (error) console.error('Error fetching bottles:', error);
      else if (data) bottlesSum = data.reduce((sum, b) => sum + ((b.stock_quantity || 0) * (b.unit_price || 0)), 0);
    } catch (e) {
      console.error('Exception fetching bottles:', e);
    }

    // 4. Fetch Assets
    try {
      const { data, error } = await supabase.from('assets').select('purchase_value');
      if (error) console.error('Error fetching assets:', error);
      else if (data) assetsSum = data.reduce((sum, a) => sum + (a.purchase_value || 0), 0);
    } catch (e) {
      console.error('Exception fetching assets:', e);
    }

    // 5. Fetch Orders (Revenue from all sold orders)
    try {
      const { data, error } = await supabase.from('orders').select('total_order_value, revenue').eq('status', 'Sold');
      if (error) console.error('Error fetching orders (Total Revenue):', error);
      else if (data) revenueSum = data.reduce((sum, o) => sum + (Number(o.total_order_value) || Number(o.revenue) || 0), 0);
    } catch (e) {
      console.error('Exception fetching orders:', e);
    }

    // 6. Fetch Total Purchases (sum of all purchase costs) — the key cash outflow
    try {
      const { data, error } = await supabase.from('purchases').select('total_cost, category');
      if (error) console.error('Error fetching purchases:', error);
      else if (data) purchasesSum = data.filter(p => p.category !== 'Withdrawal').reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
    } catch (e) {
      console.error('Exception fetching purchases:', e);
    }

    setInventoryValue({ oils: oilsSum, bottles: bottlesSum, assets: assetsSum });
    setTotalRevenue(revenueSum);
    setTotalPurchases(purchasesSum);
    setTotalWithdrawals(withdrawalsSum);
    setLoadingValues(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time listener: whenever tables change, refresh data
  useEffect(() => {
    const channel = supabase
      .channel('purchases-cash-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfumes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bottles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleOpenModal = () => {
    setModalCapital(capital);
    setIsModalOpen(true);
  };

  const handleSaveCapital = async () => {
    if (modalCapital === '') return;
    setSavingCapital(true);
    try {
      const { error } = await supabase
        .from('business_capital')
        .upsert({ id: 1, manual_capital: Number(modalCapital) }, { onConflict: 'id' });
      if (error) throw error;
      setCapital(Number(modalCapital));
      setCapitalSuccess(true);
      setTimeout(() => { setCapitalSuccess(false); setIsModalOpen(false); fetchData(); }, 1500);
    } catch (e: any) {
      console.error('Save capital error:', e);
      alert('Error updating capital: ' + (e?.message || 'Unknown error.'));
    } finally {
      setSavingCapital(false);
    }
  };

  const handleSaveWithdrawal = async () => {
    if (withdrawalAmount === '' || Number(withdrawalAmount) <= 0) return;
    setSavingWithdrawal(true);
    try {
      // Fetch current total_withdrawals first
      const { data: capData } = await supabase
        .from('business_capital')
        .select('total_withdrawals')
        .eq('id', 1)
        .maybeSingle();

      const currentWithdrawals = Number(capData?.total_withdrawals) || 0;
      const newTotal = currentWithdrawals + Number(withdrawalAmount);

      const { error } = await supabase
        .from('business_capital')
        .upsert({ id: 1, total_withdrawals: newTotal }, { onConflict: 'id' });
      if (error) throw error;

      // Log withdrawal as a purchase with category 'Withdrawal'
      const { error: logError } = await supabase.from('purchases').insert([{
        purchase_date: new Date().toISOString(), // Use full ISO for activity ledger exact time sorting
        item_name: withdrawalNote || 'Expense / Withdrawal',
        category: 'Withdrawal',
        quantity: 1,
        total_cost: Number(withdrawalAmount),
      }]);
      if (logError) console.error('Log withdrawal error:', logError);

      setWithdrawalSuccess(true);
      setWithdrawalAmount('');
      setWithdrawalNote('');
      setTimeout(() => {
        setWithdrawalSuccess(false);
        setIsWithdrawalModalOpen(false);
        fetchData();
      }, 1500);
    } catch (e: any) {
      console.error('Save withdrawal error:', e);
      alert('Error recording expense: ' + (e?.message || 'Unknown error.'));
    } finally {
      setSavingWithdrawal(false);
    }
  };

  // ── Cash on Hand Formula ─────────────────────────────────────────────────────
  // Starting Capital is a reference figure only; actual drawer cash = Sales − Outflows
  const totalOutflow = totalPurchases + totalWithdrawals;
  const cashOnHand = totalRevenue - totalOutflow;

  const totalAssetInventory = inventoryValue.oils + inventoryValue.bottles + inventoryValue.assets;
  const totalAssetsAndCash = totalAssetInventory + totalRevenue;
  const netGrowth = totalAssetsAndCash - (Number(capital) || 0);
  const assetCoverage = capital && Number(capital) > 0 ? (totalAssetsAndCash / Number(capital)) * 100 : 0;

  const fmt = (n: number) => n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar pb-8 pr-1 md:pr-2">
      {/* Header & Net Growth */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            <span>Financial Health Dashboard</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Equity, Revenue and Asset valuation tracking.</p>
        </div>

        <div className={`px-8 py-4 rounded-3xl shadow-xl border flex flex-col items-end transition-all min-w-[240px] ${
          netGrowth >= 0
          ? 'bg-emerald-600 border-emerald-500 shadow-emerald-900/20'
          : 'bg-rose-600 border-rose-500 shadow-rose-900/20'
        }`}>
           <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Net Growth / Loss</span>
           <div className="flex items-center gap-2">
              {netGrowth >= 0 ? <ArrowUpRight className="text-white" size={24} /> : <ArrowDownRight className="text-white" size={24} />}
              <span className="text-2xl font-black text-white">{fmt(netGrowth)} <span className="text-xs font-normal opacity-80 uppercase">EGP</span></span>
           </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CASH ON HAND CARD — Gold Theme — Prominently placed
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl border border-yellow-500/30 cursor-default"
        style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 30%, #b45309 60%, #d97706 100%)' }}
        onMouseEnter={() => setShowCashBreakdown(true)}
        onMouseLeave={() => setShowCashBreakdown(false)}
      >
        {/* Decorative background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-48 h-48 rounded-full bg-amber-300/10 blur-2xl" />
        </div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Label and Icon */}
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-yellow-400/20 border border-yellow-300/30 backdrop-blur-sm">
                <Wallet size={28} className="text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-yellow-200/70 uppercase tracking-[0.25em]">الخزنة</span>
                  <span title="Hover for breakdown"><Info size={13} className="text-yellow-300/60" /></span>
                </div>
                <p className="text-yellow-100/80 text-sm font-medium mt-0.5">Cash on Hand</p>
              </div>
            </div>

            {/* Center: Amount */}
            <div className="flex flex-col items-start md:items-center">
              <span className={`text-4xl md:text-5xl font-black tracking-tight transition-all duration-300 ${
                cashOnHand >= 0 ? 'text-yellow-100' : 'text-rose-300'
              }`}>
                {loadingValues ? (
                  <Loader2 className="animate-spin text-yellow-200" size={36} />
                ) : (
                  fmt(cashOnHand)
                )}
              </span>
              <span className="text-yellow-300/60 text-xs font-bold uppercase tracking-widest mt-1">Egyptian Pound (EGP)</span>
            </div>

            {/* Right: Record Expense Button */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => setIsWithdrawalModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-yellow-300/40 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-100 font-bold text-sm transition-all duration-200 backdrop-blur-sm hover:scale-105 active:scale-95 shadow-lg"
              >
                <MinusCircle size={17} />
                Record Expense
              </button>
              <span className="text-[10px] text-yellow-200/40 uppercase tracking-wider">Rent, personal use, etc.</span>
            </div>
          </div>

          {/* ── Hover Breakdown ──────────────────────────────────────────────────── */}
          <div className={`mt-6 overflow-hidden transition-all duration-300 ${showCashBreakdown ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="border-t border-yellow-400/20 pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Inflow */}
              <div className="flex flex-col gap-1 bg-yellow-400/10 rounded-2xl p-4 border border-yellow-300/20">
                <span className="text-[10px] font-black text-yellow-200/50 uppercase tracking-widest">Total Sales Inflow</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-emerald-300 font-black text-xl">+{fmt(totalRevenue)}</span>
                  <span className="text-[10px] text-yellow-200/40 uppercase">EGP</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-yellow-200/60">
                    <span>Sales Revenue (Sold Orders)</span>
                    <span className="font-bold text-yellow-100/70">{fmt(totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-yellow-200/60 mt-1 pt-1 border-t border-yellow-400/10">
                    <span className="italic opacity-70">Starting Capital (ref only)</span>
                    <span className="font-bold text-yellow-100/40">{fmt(Number(capital) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Purchases Outflow */}
              <div className="flex flex-col gap-1 bg-red-500/10 rounded-2xl p-4 border border-red-300/20">
                <span className="text-[10px] font-black text-yellow-200/50 uppercase tracking-widest">Total Purchases</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-rose-300 font-black text-xl">−{fmt(totalPurchases)}</span>
                  <span className="text-[10px] text-yellow-200/40 uppercase">EGP</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-yellow-200/50">
                    <ShoppingCart size={11} />
                    <span>Oils, Bottles, Supplies</span>
                  </div>
                  <div className="flex justify-between text-yellow-200/60">
                    <span>Auto-synced with Purchases</span>
                  </div>
                </div>
              </div>

              {/* Withdrawals Outflow */}
              <div className="flex flex-col gap-1 bg-orange-500/10 rounded-2xl p-4 border border-orange-300/20">
                <span className="text-[10px] font-black text-yellow-200/50 uppercase tracking-widest">Manual Withdrawals</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-orange-300 font-black text-xl">−{fmt(totalWithdrawals)}</span>
                  <span className="text-[10px] text-yellow-200/40 uppercase">EGP</span>
                </div>
                <div className="mt-2 text-xs text-yellow-200/50">
                  Rent, personal use, etc.
                </div>
              </div>
            </div>

            {/* Formula summary row */}
            <div className="mt-4 px-2 flex flex-wrap gap-2 items-center justify-center text-xs text-yellow-200/50 font-mono">
              <span className="text-emerald-300/80">{fmt(totalRevenue)}</span>
              <span>−</span>
              <span className="text-rose-300/80">{fmt(totalPurchases)}</span>
              <span>−</span>
              <span className="text-orange-300/80">{fmt(totalWithdrawals)}</span>
              <span>=</span>
              <span className={`font-black text-sm ${cashOnHand >= 0 ? 'text-yellow-200' : 'text-rose-300'}`}>{fmt(cashOnHand)} EGP</span>
            </div>
          </div>

          {/* Always-visible mini bar at the bottom */}
          <div className={`transition-all duration-300 ${showCashBreakdown ? 'mt-2' : 'mt-5'}`}>
            <p className="text-yellow-200/40 text-[10px] text-center uppercase tracking-widest">
              Hover to see full breakdown · Updates live when purchases are logged
            </p>
          </div>
        </div>
      </div>

      {/* TOP ROW: Debt and Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starting Investment (Debt) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Landmark size={20} />
                </div>
                <span className="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">Starting Investment</span>
              </div>
              <button
                onClick={handleOpenModal}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                title="Edit Investment"
              >
                <Edit2 size={16} />
              </button>
            </div>

            <div className="relative pt-2">
               <span className="text-5xl font-black text-slate-800 dark:text-slate-100">{loadingValues ? '...' : fmt(Number(capital) || 0)}</span>
               <span className="text-xs font-bold text-slate-400 ml-2 uppercase">EGP</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
             <button
               onClick={handleOpenModal}
               className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
             >
               Update Debt Value
             </button>
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Coverage</p>
                <p className={`text-lg font-black ${assetCoverage >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{assetCoverage.toFixed(1)}%</p>
             </div>
          </div>
        </div>

        {/* Total Sales Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute -right-6 -bottom-6 text-emerald-500/5 dark:text-emerald-500/10 pointer-events-none">
              <DollarSign size={180} />
           </div>
           <div>
              <div className="flex items-center space-x-3 mb-6 relative z-10">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <TrendingUp size={20} />
                </div>
                <div className="flex items-center justify-between flex-1">
                  <span className="font-bold text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Sales Revenue</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-5xl font-black text-slate-800 dark:text-slate-100">{loadingValues ? '...' : fmt(totalRevenue)}</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-[0.1em]">Gross Lifetime Revenue (Sold)</span>
              </div>
           </div>

           <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 relative z-10">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div
                   className="h-full bg-emerald-500 transition-all duration-1000"
                   style={{ width: `${Math.min(assetCoverage, 100)}%` }}
                 />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic">Your current assets cover {assetCoverage.toFixed(1)}% of your initial investment.</p>
           </div>
        </div>
      </div>

      <div className="mt-10 mb-4 flex items-center gap-2">
         <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Asset Inventory Details</span>
         <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
      </div>

      {/* BOTTOM ROW: Asset Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Raw Materials (Oils) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between group hover:border-amber-500 transition-all">
           <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Activity size={18} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Raw Materials (Oils)</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{loadingValues ? '...' : fmt(inventoryValue.oils)}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">Liquid Capital (EGP)</span>
              </div>
           </div>
        </div>

        {/* Bottles Value */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between group hover:border-blue-500 transition-all">
           <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Package size={18} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Bottles Inventory</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{loadingValues ? '...' : fmt(inventoryValue.bottles)}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">Packaging Capital (EGP)</span>
              </div>
           </div>
        </div>

        {/* Assets & Tools */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between group hover:border-purple-500 transition-all">
           <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                  <ShoppingBag size={18} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Assets & Tools</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{loadingValues ? '...' : fmt(inventoryValue.assets)}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-tighter">Fixed Capital (EGP)</span>
              </div>
           </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          EDIT CAPITAL MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => !savingCapital && setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Landmark size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Update Capital</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Modify your starting investment.</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Current Database Value</label>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  {fmt(Number(capital) || 0)} EGP
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">New Debt Total</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={modalCapital}
                    onChange={(e) => setModalCapital(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-xl px-5 py-4 text-2xl font-black text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="0.00"
                    autoFocus
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none group-focus-within:text-indigo-500">EGP</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={savingCapital}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCapital}
                disabled={savingCapital || modalCapital === ''}
                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {savingCapital ? <Loader2 size={18} className="animate-spin" /> : (capitalSuccess ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Save size={18} />)}
                {savingCapital ? 'Saving...' : (capitalSuccess ? 'Data Saved!' : 'Confirm New Baseline')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RECORD EXPENSE (WITHDRAWAL) MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => !savingWithdrawal && setIsWithdrawalModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-2xl" style={{ background: 'rgba(217,119,6,0.15)' }}>
                <MinusCircle size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Record Expense</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manually deduct from cash on hand.</p>
              </div>
            </div>

            {/* Current Cash on Hand context */}
            <div className="mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40" style={{ background: 'rgba(217,119,6,0.06)' }}>
              <p className="text-[10px] uppercase tracking-widest text-amber-600/70 font-bold mb-1">Current Cash on Hand</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{fmt(cashOnHand)} EGP</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Expense Amount (EGP)</label>
                <div className="relative group">
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 rounded-xl px-5 py-4 text-2xl font-black text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                    placeholder="0.00"
                    min="0"
                    autoFocus
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none group-focus-within:text-amber-500">EGP</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Note (optional)</label>
                <input
                  type="text"
                  value={withdrawalNote}
                  onChange={(e) => setWithdrawalNote(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                  placeholder="e.g. Monthly rent, personal use..."
                />
              </div>
              {withdrawalAmount !== '' && Number(withdrawalAmount) > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
                  Cash after expense: <span className={`font-black ml-1 ${(cashOnHand - Number(withdrawalAmount)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {fmt(cashOnHand - Number(withdrawalAmount))} EGP
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsWithdrawalModalOpen(false)}
                disabled={savingWithdrawal}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWithdrawal}
                disabled={savingWithdrawal || withdrawalAmount === '' || Number(withdrawalAmount) <= 0}
                className="flex-[2] py-3.5 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
              >
                {savingWithdrawal ? <Loader2 size={18} className="animate-spin" /> : (withdrawalSuccess ? <CheckCircle2 size={18} className="text-emerald-300" /> : <MinusCircle size={18} />)}
                {savingWithdrawal ? 'Saving...' : (withdrawalSuccess ? 'Recorded!' : 'Confirm Expense')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
