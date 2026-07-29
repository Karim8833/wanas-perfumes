import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import PricingCalculator from './components/PricingCalculator';
import OrderBoard from './components/OrderBoard';
import AccountingDashboard from './components/AccountingDashboard';
import CustomerDatabase from './components/CustomerDatabase';
import UserManager from './components/UserManager';
import Settings from './components/Settings';
import Login from './components/Login';
import ProductManager from './components/ProductManager';
import { Order, User, SystemSettings } from './types';
import { Sun, Moon, LogOut, ShieldAlert, Settings as SettingsIcon, MessageCircle, X, Facebook, Phone, Instagram, Tag } from 'lucide-react';
import { useDarkMode } from './hooks/useDarkMode';
import logo from './assets/logo.png';
import { supabase, deductStock, restoreStock } from './supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

const DEFAULT_SETTINGS: SystemSettings = {
  packagingConstant: 25,
  profitMargin: 0.20,
  reinvestmentMargin: 0.05,
  miscCost: 20,
  stickerCost: 5,
  targetCostPercentage: 0.60,
  boxSellingPrice: 50,
  sizes: {
    '30ml': { constant: 2, oilVol: 8 },
    '50ml': { constant: 4, oilVol: 15 },
    '100ml': { constant: 7, oilVol: 30 },
  },
  bottlePresets: [
    { id: 'bp-1', label: 'Original', price: 150 },
    { id: 'bp-2', label: 'Premium', price: 40 },
    { id: 'bp-3', label: 'Regular', price: 20 },
  ],
  oilPresets: [
    { id: 'op-1', label: 'High Quality', price: 12 },
    { id: 'op-2', label: 'Premium Quality', price: 8 },
    { id: 'op-3', label: 'Regular Quality', price: 5 },
  ]
};


function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wanas_active_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState<'calculator' | 'orders' | 'dashboard' | 'customers' | 'users' | 'settings' | 'products'>('calculator');
  const [users, setUsers] = useState<User[]>([]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wanas_active_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('wanas_active_session');
    }
  }, [currentUser]);

  useEffect(() => {
    // Handle Global Sync Initial Load
    const initData = async () => {
      const { data: usersData } = await supabase.from('app_users').select('*');
      if (usersData) setUsers(usersData);

      syncCustomers();
      syncSystemSettings();
    };
    initData();
  }, []);

  // Integrated Settings Global State
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);


  const syncSystemSettings = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      if (error) {
        console.error("Error fetching system settings:", error);
        return;
      }
      if (data) {
        setSettings({
          packagingConstant: Number(data.packaging_constant) || DEFAULT_SETTINGS.packagingConstant,
          profitMargin: Number(data.profit_margin) || DEFAULT_SETTINGS.profitMargin,
          reinvestmentMargin: Number(data.reinvestment_margin) || DEFAULT_SETTINGS.reinvestmentMargin,
          miscCost: Number(data.marketing_cost) || DEFAULT_SETTINGS.miscCost,
          stickerCost: Number(data.sticker_cost) || DEFAULT_SETTINGS.stickerCost,
          targetCostPercentage: Number(data.target_cost_percentage) || DEFAULT_SETTINGS.targetCostPercentage,
          sizes: typeof data.sizes === 'string' ? JSON.parse(data.sizes) : (data.sizes || DEFAULT_SETTINGS.sizes),
          boxSellingPrice: (typeof data.sizes === 'string' ? JSON.parse(data.sizes) : (data.sizes || {})).premiumBox?.sellingPrice || DEFAULT_SETTINGS.boxSellingPrice,
          bottlePresets: typeof data.bottle_presets === 'string' ? JSON.parse(data.bottle_presets) : (data.bottle_presets || DEFAULT_SETTINGS.bottlePresets),
          oilPresets: typeof data.oil_presets === 'string' ? JSON.parse(data.oil_presets) : (data.oil_presets || DEFAULT_SETTINGS.oilPresets),
        });
      }
    } catch (err) {
      console.error("Network error fetching system settings:", err);
    }
  };

  const saveSystemSettings = async (newSettings: SystemSettings): Promise<boolean> => {
    try {
      const { error } = await supabase.from('system_settings').upsert({
        id: 1,
        packaging_constant: newSettings.packagingConstant,
        profit_margin: newSettings.profitMargin,
        reinvestment_margin: newSettings.reinvestmentMargin,
        marketing_cost: newSettings.miscCost,
        sticker_cost: newSettings.stickerCost,
        target_cost_percentage: newSettings.targetCostPercentage,
        sizes: JSON.stringify({
          ...newSettings.sizes,
          premiumBox: { sellingPrice: newSettings.boxSellingPrice }
        }),
        bottle_presets: JSON.stringify(newSettings.bottlePresets),
        oil_presets: JSON.stringify(newSettings.oilPresets),
      }, { onConflict: 'id' });

      if (error) {
        console.error("Error saving system settings:", error);
        return false;
      } else {
        setSettings(newSettings);
        console.log('✅ System settings saved successfully.');
        return true;
      }
    } catch (err) {
      console.error("Network error saving system settings:", err);
      return false;
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    syncSystemSettings();

    const channel = supabase.channel('realtime_system_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: "id=eq.1" }, () => {
        syncSystemSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const syncOrders = async () => {
      try {
        const { data, error } = await supabase.from('orders').select('*');

        if (error) {
          console.error("Supabase Connection Error:", error);
          setDbConnectionError(true);
          return;
        }

        setDbConnectionError(false);

        if (data) {
          const mappedOrders = data.map((o: any) => ({
            id: o.id,
            clientName: o.client_name,
            phone: o.phone,
            address: o.address,
            totalOrderValue: Number(o.total_order_value) || Number(o.revenue) || 0,
            profit: o.profit !== undefined ? Number(o.profit) : undefined,
            status: o.status as Order['status'],
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
            stockDeducted: o.stock_deducted ?? false,
            createdAt: o.created_at ? new Date(o.created_at) : new Date(),
            preparedAt: o.prepared_at ? new Date(o.prepared_at) : undefined,
            soldAt: o.sold_at ? new Date(o.sold_at) : undefined
          }));
          setOrders(mappedOrders);
        }
      } catch (err: any) {
        console.error("Supabase Network Error:", err);
        setDbConnectionError(true);
      }
    };
    syncOrders();

    // Supabase Live Sync Protocol Binding
    const channel = supabase.channel('realtime_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, _payload => {
        syncOrders(); // Pull fresh cloud memory directly on laptop/mobile event triggers 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const syncCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) {
        console.error("Error fetching customers:", error);
        return;
      }
      if (data) setDbCustomers(data);
    } catch (err) {
      console.error("Network error fetching customers:", err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    syncCustomers();

    const channel = supabase.channel('realtime_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        syncCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const [isDark, setIsDark] = useDarkMode();

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'Owner') setActiveTab('dashboard');
    else setActiveTab('calculator');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // RBAC Permission Locks
  const canAccessPricing = currentUser.role === 'Owner' || currentUser.role === 'Moderator';
  const canAccessOrders = currentUser.role === 'Owner' || currentUser.role === 'Moderator';
  const canAccessDashboard = currentUser.role === 'Owner' || currentUser.role === 'Observer';
  const canAccessCustomers = currentUser.role === 'Owner' || currentUser.role === 'Observer';
  const canAccessProducts = currentUser.role === 'Owner' || currentUser.role === 'Moderator';
  const isOwner = currentUser.role === 'Owner';

  const addOrder = async (newOrder: Order): Promise<boolean> => {
    if (!canAccessOrders) return false;

    // Accurate Profit Calculation based on exact item costs and selling prices (Supports Premium Box fixed profit)
    const calculatedProfit = newOrder.items.reduce((sum, item) => {
      return sum + ((item.unitPrice - (item.calculatedCost || 0)) * item.quantity);
    }, 0);

    // Explicit Payload mapping targeting exactly matching user requested schemas
    const insertPayload = {
      client_name: newOrder.clientName,
      phone: newOrder.phone,
      address: newOrder.address,
      revenue: newOrder.totalOrderValue,
      total_order_value: newOrder.totalOrderValue,
      profit: calculatedProfit,
      status: newOrder.status,
      items: JSON.stringify(newOrder.items) // Enforce strict JSONB stringification per schema requirements
    };

    console.log('Sending to Supabase:', [insertPayload]);

    try {
      // 1. Upsert Customer into customers table
      if (newOrder.phone) {
        const { error: customerError } = await supabase
          .from('customers')
          .upsert({
            name: newOrder.clientName,
            phone: newOrder.phone,
            address: newOrder.address
          }, { onConflict: 'phone' });

        if (customerError) {
          console.warn('⚠️ Failed to upsert customer metadata:', customerError.message);
        }
      }

      // 2. Insert Order
      const { data, error } = await supabase.from('orders').insert([insertPayload]).select().single();
      console.log('Supabase Response:', { data, error });

      if (error) {
        alert('Network Database Constraint! Failed to Insert Order: ' + error.message);
        return false;
      }

      if (data) {
        const verifiedOrder: Order = {
          id: data.id,
          clientName: data.client_name,
          phone: data.phone,
          address: data.address,
          totalOrderValue: data.revenue !== undefined ? Number(data.revenue) : Number(data.total_order_value),
          profit: data.profit !== undefined ? Number(data.profit) : undefined,
          status: data.status,
          items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
          createdAt: data.created_at ? new Date(data.created_at) : new Date()
        };
        // ONLY explicitly apply the verified cloud map to Local render:
        setOrders(prev => [...prev, verifiedOrder]);
        return true;
      }
      return false;
    } catch (e: any) {
      console.error(e);
      alert('Active Network Timeout connecting to Supabase Cloud!');
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status'], isReversal: boolean = false) => {
    if (!canAccessOrders) return;

    let timeUpdateDB: any = {};
    let timeUpdateLocal: any = {};

    if (isReversal) {
      if (newStatus === 'Pending') {
        timeUpdateDB = { prepared_at: null };
        timeUpdateLocal = { preparedAt: undefined };
      } else if (newStatus === 'Prepared') {
        timeUpdateDB = { sold_at: null };
        timeUpdateLocal = { soldAt: undefined };
      }
    } else {
      if (newStatus === 'Prepared') {
        timeUpdateDB = { prepared_at: new Date().toISOString() };
        timeUpdateLocal = { preparedAt: new Date() };
      } else if (newStatus === 'Sold') {
        timeUpdateDB = { sold_at: new Date().toISOString() };
        timeUpdateLocal = { soldAt: new Date() };
      }
    }

    const updatePayload = {
      status: newStatus,
      ...timeUpdateDB
    };

    console.log('Sending to Supabase:', updatePayload);

    try {
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      console.log('Supabase Response:', error);

      if (error) {
        alert('Network Database Constraint! Failed to Update State: ' + error.message);
        return;
      }

      // Explicitly process success map rendering locals strictly upon confirmation 
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, ...timeUpdateLocal } : o));

      // ── Auto-deduct stock once when moving to 'Prepared' ──────────────────────────────
      if (!isReversal && newStatus === 'Prepared') {
        const order = orders.find(o => o.id === orderId);
        if (order && !order.stockDeducted) {
          console.log('📦 Deducting stock for order:', orderId);
          const deductionErrors = await deductStock(orderId, order.items);
          if (deductionErrors.length > 0) {
            console.warn('⚠️ Stock deduction warnings:', deductionErrors);
          }
          setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, stockDeducted: true } : o
          ));
        }
      } else if (isReversal && newStatus === 'Pending') {
        // ── Auto-restore stock when moving back to 'Pending' ──────────────────────────
        const order = orders.find(o => o.id === orderId);
        if (order && order.stockDeducted) {
          console.log('📦 Restoring stock for order:', orderId);
          const restoreErrors = await restoreStock(orderId, order.items);
          if (restoreErrors.length > 0) {
            console.warn('⚠️ Stock restore warnings:', restoreErrors);
          }
          setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, stockDeducted: false } : o
          ));
        }
      }
      // ────────────────────────────────────────────────────────────────────────
    } catch (e: any) {
      console.error(e);
      alert('Active Network Timeout connecting to Supabase Cloud!');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!canAccessOrders) return;

    if (window.confirm('Are you sure you want to delete this order?')) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      await supabase.from('orders').delete().eq('id', orderId);
    }
  };

  const editOrder = async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
    if (!canAccessOrders) return false;

    const updatePayload: any = {
      client_name: updates.clientName,
      phone: updates.phone,
      address: updates.address,
    };
    if (updates.totalOrderValue !== undefined) {
      updatePayload.revenue = updates.totalOrderValue;
      updatePayload.total_order_value = updates.totalOrderValue;
    }
    if (updates.items) {
      updatePayload.items = JSON.stringify(updates.items);
      const calculatedProfit = updates.items.reduce((sum, item) => sum + ((item.unitPrice - (item.calculatedCost || 0)) * item.quantity), 0);
      updatePayload.profit = calculatedProfit;
      updates.profit = calculatedProfit; // Reflect locally
    }

    try {
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (error) {
        alert('Failed to update order: ' + error.message);
        return false;
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleResetSystem = async () => {
    setOrders([]);
    await supabase.from('orders').delete().not('id', 'is', null);
  };

  const { t, lang, toggleLang } = useLanguage();

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors flex flex-col">
      {dbConnectionError && (
        <div className="w-full bg-red-600 text-white text-center py-2 text-sm font-bold flex items-center justify-center shadow-md z-50">
          <ShieldAlert className="w-4 h-4 mr-2" /> DATABASE DISCONNECTED - Please check your network or Supabase settings!
        </div>
      )}
      <header className="flex flex-col w-full px-4 md:px-6 lg:px-8 py-3 md:py-4 max-w-7xl mx-auto gap-3 md:gap-0 flex-shrink-0">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Wanas Perfumes Logo" className="h-10 md:h-12 object-contain flex-shrink-0" />
            <h1 className="hidden md:block font-cairo font-bold md:text-xl text-slate-900 dark:text-slate-100 flex-shrink-0">
              Wanas Perfumes <span className="font-normal opacity-80 mx-1">|</span> ونس للعطور
            </h1>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4 flex-shrink-0">
            <div className="hidden sm:flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
              <span className="text-xs font-medium text-slate-500 mr-2">{t('loggedInAs')}</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-500">{currentUser.username}</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded uppercase font-bold tracking-wider">{currentUser.role}</span>
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="p-2 md:p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 transition-colors font-black text-xs min-w-[38px] flex items-center justify-center"
              aria-label="Toggle Language"
              title={lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'}
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </button>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 md:p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 md:p-2.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900/30 shadow-sm text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              title="Secure Logout"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Row 2 on mobile */}
        <div className="flex justify-between items-center md:hidden w-full pt-2">
          <h1 className="font-cairo font-bold text-lg text-slate-900 dark:text-slate-100">
            Wanas <span className="font-normal opacity-80 mx-1">|</span> ونس
          </h1>
          <div className="flex items-center">
            <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 rounded-full font-bold">{currentUser.username} ({currentUser.role})</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pt-2 md:pt-4 flex-1 overflow-hidden flex flex-col w-full relative">
        <div className="flex overflow-x-auto whitespace-nowrap hide-scrollbar pb-2 mb-4 w-full flex-shrink-0 z-40 relative">
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 w-max transition-colors">
            {canAccessPricing && (
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'calculator' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {t('pricingCalculator')}
              </button>
            )}
            {canAccessOrders && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'orders' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {t('orderManagement')}
              </button>
            )}
            {canAccessDashboard && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'dashboard' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {t('accountingDashboard')}
              </button>
            )}
            {canAccessCustomers && (
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'customers' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {t('customerDatabase')}
              </button>
            )}
            {canAccessProducts && (
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'products' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-1.5" /> {t('products')}
                </div>
              </button>
            )}
            {isOwner && (
              <>
                <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1 flex-shrink-0"></div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'settings' ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-center space-x-1">
                    <SettingsIcon className="w-4 h-4 mr-1" /> {t('settings')}
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${activeTab === 'users' ? 'bg-red-600/90 text-white shadow-md border border-red-500/50' : 'bg-transparent text-red-400 dark:text-red-500/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                >
                  <div className="flex items-center space-x-1">
                    <ShieldAlert className="w-4 h-4 mr-1" /> {t('accessList')}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="animate-in fade-in duration-300 flex-1 overflow-hidden flex flex-col z-[50] relative">
          {activeTab === 'calculator' && canAccessPricing && <PricingCalculator currentUserRole={currentUser.role} settings={settings} />}
          {activeTab === 'orders' && canAccessOrders && <OrderBoard orders={orders} settings={settings} updateOrderStatus={updateOrderStatus} onAddOrder={addOrder} onDeleteOrder={deleteOrder} onEditOrder={editOrder} />}
          {activeTab === 'dashboard' && canAccessDashboard && <AccountingDashboard orders={orders} settings={settings} currentUserRole={currentUser.role} />}
          {activeTab === 'customers' && canAccessCustomers && <CustomerDatabase orders={orders} currentUserRole={currentUser.role} dbCustomers={dbCustomers} onRefresh={syncCustomers} />}
          {activeTab === 'products' && canAccessProducts && <ProductManager />}
          {activeTab === 'users' && isOwner && <UserManager users={users} setUsers={setUsers} currentUser={currentUser} />}
          {activeTab === 'settings' && isOwner && <Settings settings={settings} onSave={saveSystemSettings} onResetSystem={handleResetSystem} />}

          {/* Security fallback renderer */}
          {((activeTab === 'calculator' && !canAccessPricing) ||
            (activeTab === 'orders' && !canAccessOrders) ||
            (activeTab === 'dashboard' && !canAccessDashboard) ||
            (activeTab === 'customers' && !canAccessCustomers) ||
            (activeTab === 'products' && !canAccessProducts) ||
            (activeTab === 'users' && !isOwner) ||
            (activeTab === 'settings' && !isOwner)) && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ShieldAlert className="w-16 h-16 mb-4 text-red-500/50" />
                <h2 className="text-xl font-bold">Unauthorized Access Blocked</h2>
                <p>Your current security clearance ({currentUser.role}) does not allow this action.</p>
              </div>
            )}
        </div>
      </main>
      <FloatingContact />
    </div>
  );
}

const FloatingContact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeQR, setActiveQR] = useState<{href: string, label: string, titleArabic: string, icon: JSX.Element, color: string} | null>(null);

  const socialLinks = [
    { icon: <Facebook className="w-5 h-5" />, href: 'https://www.facebook.com/profile.php?id=61584610146849', color: 'bg-blue-600', label: 'Facebook', titleArabic: 'امسح الكود لمتابعة ونس على فيسبوك' },
    { icon: <Phone className="w-5 h-5" />, href: 'https://wa.me/201094634080', color: 'bg-emerald-600', label: 'WhatsApp', titleArabic: 'امسح الكود للتواصل مع ونس على واتساب' },
    { icon: <Instagram className="w-5 h-5" />, href: 'https://www.instagram.com/wanasperfumes1?igsh=NzZ4OGM3NW92MGJl', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600', label: 'Instagram', titleArabic: 'امسح الكود لمتابعة ونس على إنستجرام' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center space-y-4">
      {/* Sub-buttons */}
      {isOpen && (
        <div className="flex flex-col space-y-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {socialLinks.map((link, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveQR(link);
                setIsOpen(false);
              }}
              className={`p-3 rounded-full text-white shadow-xl hover:scale-110 transition-all flex items-center justify-center ${link.color} border border-white/20`}
              title={link.label}
            >
              {link.icon}
            </button>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-slate-900 border-2 border-[#d4af37] text-[#d4af37] shadow-lg hover:shadow-[0_0_15px_#d4af37] active:scale-95 ${!isOpen ? 'animate-bounce' : ''}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Styles for bounce and animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 2s infinite;
        }
      `}</style>

      {/* QR Code Modal */}
      {activeQR && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={() => setActiveQR(null)}>
          <div className="bg-slate-900 border border-[#d4af37] rounded-3xl p-6 md:p-8 w-full max-w-sm flex flex-col items-center text-center shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveQR(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-full">
              <X className="w-4 h-4" />
            </button>
            <div className={`p-4 rounded-full ${activeQR.color} mb-5 shadow-lg flex items-center justify-center`}>
              <div className="scale-150 text-white">
                {activeQR.icon}
              </div>
            </div>
            <h3 className="text-[#d4af37] font-cairo font-bold text-lg md:text-xl mb-6 leading-relaxed px-4">
              {activeQR.titleArabic}
            </h3>
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-inner mb-6 border-4 border-slate-100">
              <QRCodeCanvas value={activeQR.href} size={220} level="H" includeMargin={false} />
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(activeQR.href);
                alert('تم نسخ الرابط! (Link Copied)');
              }}
              className="w-full py-3 md:py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-700 shadow-sm text-sm md:text-base flex items-center justify-center gap-2"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
