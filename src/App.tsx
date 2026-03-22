import React, { useState, useEffect } from 'react';
import PricingCalculator from './components/PricingCalculator';
import OrderBoard from './components/OrderBoard';
import AccountingDashboard from './components/AccountingDashboard';
import CustomerDatabase from './components/CustomerDatabase';
import UserManager from './components/UserManager';
import Settings from './components/Settings';
import Login from './components/Login';
import { Order, User, SystemSettings } from './types';
import { Sun, Moon, LogOut, ShieldAlert, Settings as SettingsIcon } from 'lucide-react';
import { useDarkMode } from './hooks/useDarkMode';

const INITIAL_USERS: User[] = [
  { id: 'admin_master_1', username: 'admin', password: '123456', role: 'Owner' }
];

const DEFAULT_SETTINGS: SystemSettings = {
  packagingConstant: 25,
  profitMargin: 0.20,
  reinvestmentMargin: 0.05,
  sizes: {
    '30ml': { constant: 2, oilVol: 10 },
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'calculator' | 'orders' | 'dashboard' | 'customers' | 'users' | 'settings'>('calculator');
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('wanas_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  useEffect(() => {
    localStorage.setItem('wanas_users', JSON.stringify(users));
  }, [users]);

  // Integrated Settings Global State
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('wanas_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          sizes: { ...DEFAULT_SETTINGS.sizes, ...(parsed.sizes || {}) },
          bottlePresets: parsed.bottlePresets || DEFAULT_SETTINGS.bottlePresets,
          oilPresets: parsed.oilPresets || DEFAULT_SETTINGS.oilPresets,
        };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('wanas_settings', JSON.stringify(settings));
  }, [settings]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('wanas_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((o: any) => {
          const isLegacy = !o.items;
          const items = isLegacy 
            ? [{ perfumeName: o.perfumeName, size: o.size, quantity: 1, unitPrice: o.sellingPrice }] 
            : o.items;
          const totalOrderValue = isLegacy ? o.sellingPrice : o.totalOrderValue;

          return {
            ...o,
            items,
            totalOrderValue,
            createdAt: new Date(o.createdAt),
            preparedAt: o.preparedAt ? new Date(o.preparedAt) : undefined,
            soldAt: o.soldAt ? new Date(o.soldAt) : undefined
          };
        });
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('wanas_orders', JSON.stringify(orders));
  }, [orders]);
  
  const [isDark, setIsDark] = useDarkMode();

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'Observer') setActiveTab('dashboard');
    else setActiveTab('calculator');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  // RBAC Permission Locks
  const canAccessPricing = currentUser.role === 'Owner' || currentUser.role === 'Moderator';
  const canAccessOrders = currentUser.role === 'Owner' || currentUser.role === 'Moderator';
  const canAccessDashboard = currentUser.role === 'Owner' || currentUser.role === 'Observer';
  const canAccessCustomers = currentUser.role === 'Owner' || currentUser.role === 'Observer';
  const isOwner = currentUser.role === 'Owner';

  const addOrder = (newOrder: Order) => {
    if (!canAccessOrders) return;
    setOrders(prev => [...prev, newOrder]);
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    if (!canAccessOrders) return;
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const timeUpdate = newStatus === 'Prepared' ? { preparedAt: new Date() } : newStatus === 'Sold' ? { soldAt: new Date() } : {};
        return { ...o, status: newStatus, ...timeUpdate };
      }
      return o;
    }));
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans transition-colors flex flex-col">
      <header className="flex flex-col w-full px-4 md:px-6 lg:px-8 py-3 md:py-4 max-w-7xl mx-auto gap-3 md:gap-0 flex-shrink-0">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Wanas Perfumes Logo" className="h-10 md:h-12 object-contain flex-shrink-0" />
            <h1 className="hidden md:block font-cairo font-bold md:text-xl text-slate-900 dark:text-slate-100 flex-shrink-0">
              Wanas Perfumes <span className="font-normal opacity-80 mx-1">|</span> ونس للعطور
            </h1>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-4 flex-shrink-0">
            <div className="hidden sm:flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
              <span className="text-xs font-medium text-slate-500 mr-2">Logged in as:</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-500">{currentUser.username}</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded uppercase font-bold tracking-wider">{currentUser.role}</span>
            </div>
            
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
        <div className="flex overflow-x-auto whitespace-nowrap hide-scrollbar pb-2 mb-4 w-full flex-shrink-0 z-20 relative">
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 w-max transition-colors">
            {canAccessPricing && (
              <button 
                onClick={() => setActiveTab('calculator')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'calculator' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Pricing Calculator
              </button>
            )}
            {canAccessOrders && (
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'orders' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Order Management
              </button>
            )}
            {canAccessDashboard && (
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'dashboard' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Accounting Dashboard
              </button>
            )}
            {canAccessCustomers && (
              <button 
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 mr-1 ${activeTab === 'customers' ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Customer Database
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
                    <SettingsIcon className="w-4 h-4 mr-1" /> Settings
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${activeTab === 'users' ? 'bg-red-600/90 text-white shadow-md border border-red-500/50' : 'bg-transparent text-red-400 dark:text-red-500/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                >
                  <div className="flex items-center space-x-1">
                    <ShieldAlert className="w-4 h-4 mr-1" /> Access List
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="animate-in fade-in duration-300 flex-1 overflow-hidden flex flex-col z-10 relative">
          {activeTab === 'calculator' && canAccessPricing && <PricingCalculator onAddOrder={addOrder} currentUserRole={currentUser.role} settings={settings} />}
          {activeTab === 'orders' && canAccessOrders && <OrderBoard orders={orders} updateOrderStatus={updateOrderStatus} onAddOrder={addOrder} />}
          {activeTab === 'dashboard' && canAccessDashboard && <AccountingDashboard orders={orders} settings={settings} currentUserRole={currentUser.role} />}
          {activeTab === 'customers' && canAccessCustomers && <CustomerDatabase orders={orders} currentUserRole={currentUser.role} />}
          {activeTab === 'users' && isOwner && <UserManager users={users} setUsers={setUsers} currentUser={currentUser} />}
          {activeTab === 'settings' && isOwner && <Settings settings={settings} setSettings={setSettings} />}
          
          {/* Security fallback renderer */}
          {((activeTab === 'calculator' && !canAccessPricing) || 
            (activeTab === 'orders' && !canAccessOrders) || 
            (activeTab === 'dashboard' && !canAccessDashboard) || 
            (activeTab === 'customers' && !canAccessCustomers) || 
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
    </div>
  );
}

export default App;
