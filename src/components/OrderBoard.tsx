import React, { useState } from 'react';
import { Package, Clock, CheckCircle2, Plus, Phone, MapPin, Trash2, ShoppingCart } from 'lucide-react';
import { Order, OrderItem, BottleSize } from '../types';

interface OrderBoardProps {
  orders: Order[];
  updateOrderStatus: (id: string, status: Order['status']) => void;
  onAddOrder: (order: Order) => void;
}

const OrderBoard: React.FC<OrderBoardProps> = ({ orders, updateOrderStatus, onAddOrder }) => {
  const [isAdding, setIsAdding] = useState(false);
  
  const initialItemState: OrderItem = { perfumeName: '', size: '50ml', quantity: 1, unitPrice: 0 };
  
  const [newOrder, setNewOrder] = useState({
    clientName: '',
    phone: '',
    address: '',
    items: [{ ...initialItemState, unitPrice: '' as any as number }]
  });

  const currentTotalValue = newOrder.items.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (item.quantity || 1)), 0);

  const handleAddItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { ...initialItemState, unitPrice: '' as any as number }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (newOrder.items.length === 1) return;
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.clientName) return;
    
    // Validate all items
    const isValid = newOrder.items.every(item => item.perfumeName && String(item.unitPrice) !== '' && item.quantity > 0);
    if (!isValid) return;
    
    onAddOrder({
      id: Math.random().toString(36).substr(2, 9),
      clientName: newOrder.clientName,
      phone: newOrder.phone,
      address: newOrder.address,
      items: newOrder.items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), quantity: Number(i.quantity) })),
      totalOrderValue: currentTotalValue,
      status: 'Pending',
      createdAt: new Date()
    });
    
    setNewOrder({ 
      clientName: '', phone: '', address: '', 
      items: [{ ...initialItemState, unitPrice: '' as any as number }] 
    });
    setIsAdding(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const columns: { title: string; status: Order['status']; icon: React.ReactNode; color: string }[] = [
    { title: 'Pending', status: 'Pending', icon: <Clock className="w-5 h-5" />, color: 'bg-slate-100 text-slate-700' },
    { title: 'Prepared', status: 'Prepared', icon: <Package className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700' },
    { title: 'Sold', status: 'Sold', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="flex flex-col h-full pb-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Order Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Track and manage client multi-item carts</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center space-x-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto shadow-sm"
        >
          {isAdding ? <ShoppingCart className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{isAdding ? 'Close Form' : 'New Cart Order'}</span>
        </button>
      </div>

      {isAdding && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 px-6 pt-6 pb-24 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 animate-in slide-in-from-top-4 transition-colors max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar relative">
          <form onSubmit={handleAddSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                <input 
                  type="text" required
                  value={newOrder.clientName} onChange={e => setNewOrder({...newOrder, clientName: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
                <input 
                  type="tel"
                  value={newOrder.phone} onChange={e => setNewOrder({...newOrder, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="01x xxx xxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address (Optional)</label>
                <input 
                  type="text"
                  value={newOrder.address} onChange={e => setNewOrder({...newOrder, address: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="Shipping Address"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cart Items</h4>
              </div>
              
              {newOrder.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Perfume Name</label>
                    <input 
                      type="text" required
                      value={item.perfumeName} onChange={e => handleItemChange(index, 'perfumeName', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Size</label>
                    <select 
                      value={item.size} onChange={e => handleItemChange(index, 'size', e.target.value as BottleSize)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    >
                      <option value="30ml">30ml</option>
                      <option value="50ml">50ml</option>
                      <option value="100ml">100ml</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qty</label>
                    <input 
                      type="number" min="1" required
                      value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-10 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Unit Price</label>
                    <input 
                      type="number" min="0" required
                      value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center pb-2">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(index)}
                      disabled={newOrder.items.length === 1}
                      className={`p-2 rounded-lg transition-colors ${newOrder.items.length === 1 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button 
                type="button"
                onClick={handleAddItem}
                className="text-sm font-medium text-amber-600 dark:text-amber-500 flex items-center mt-2 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Another Item
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="mb-4 sm:mb-0 text-center sm:text-left">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Order Value</p>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-wide bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/30">
                  {currentTotalValue.toFixed(2)} <span className="text-sm text-slate-500 dark:text-slate-400">EGP</span>
                </div>
              </div>
              <div className="flex space-x-3 w-full sm:w-auto">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 sm:flex-none justify-center bg-amber-600 hover:bg-amber-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95">
                  Confirm Order
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar md:overflow-hidden md:pr-1">
        {columns.map(col => (
          <div key={col.status} className="bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col h-full min-h-[500px] md:min-h-0 transition-colors">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${col.color}`}>
                  {col.icon}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{col.title}</h3>
              </div>
              <span className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                {orders.filter(o => o.status === col.status).length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 min-h-0">
              {orders
                .filter(o => o.status === col.status)
                .sort((a, b) => {
                  if (col.status === 'Pending') {
                    return b.createdAt.getTime() - a.createdAt.getTime();
                  }
                  if (col.status === 'Prepared') {
                    return (b.preparedAt?.getTime() || 0) - (a.preparedAt?.getTime() || 0);
                  }
                  if (col.status === 'Sold') {
                    return (b.soldAt?.getTime() || 0) - (a.soldAt?.getTime() || 0);
                  }
                  return 0;
                })
                .map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{order.clientName}</h4>
                    </div>
                    <span className="text-sm font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-1.5 rounded-lg text-right whitespace-nowrap shadow-sm">
                      {order.totalOrderValue.toFixed(2)} EGP
                    </span>
                  </div>

                  {(order.phone || order.address) && (
                    <div className="space-y-1 mb-3 pt-1">
                      {order.phone && (
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="w-3 h-3 mr-1.5 flex-shrink-0" />
                          <span>{order.phone}</span>
                        </div>
                      )}
                      {order.address && (
                        <div className="flex items-start text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2 leading-relaxed">{order.address}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-item Mapping */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 space-y-2 mb-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1 border-b border-slate-200 dark:border-slate-700 pb-1">Cart Summary ({order.items.reduce((acc, i) => acc + i.quantity, 0)} Items)</p>
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex items-start">
                          <span className="font-bold text-slate-600 dark:text-slate-300 mr-2">{item.quantity}x</span>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 dark:text-slate-200 leading-tight">{item.perfumeName}</span>
                            <span className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 mt-0.5"><Package className="w-3 h-3 mr-1" /> {item.size}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 text-center pt-1">
                        +{order.items.length - 3} more item(s)
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamps */}
                  <div className="space-y-1 mb-4 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                    {col.status === 'Pending' && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                        Added: {formatDate(order.createdAt)}
                      </div>
                    )}
                    {col.status === 'Prepared' && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-col gap-1 font-medium tracking-wide">
                        <span>Added: {formatDate(order.createdAt)}</span>
                        <span>Prepared: {order.preparedAt ? formatDate(order.preparedAt) : 'N/A'}</span>
                      </div>
                    )}
                    {col.status === 'Sold' && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 flex flex-col gap-1 font-medium tracking-wide">
                        <span>Prepared: {order.preparedAt ? formatDate(order.preparedAt) : 'N/A'}</span>
                        <span className="text-emerald-600 dark:text-emerald-500 font-bold">Sold: {order.soldAt ? formatDate(order.soldAt) : 'N/A'}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                    {col.status === 'Pending' && (
                      <button onClick={() => updateOrderStatus(order.id, 'Prepared')} className="flex-1 text-center py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors">
                        Mark Prepared
                      </button>
                    )}
                    {col.status === 'Prepared' && (
                      <button onClick={() => updateOrderStatus(order.id, 'Sold')} className="flex-1 text-center py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-xs font-bold transition-colors">
                        Mark Sold
                      </button>
                    )}
                    {col.status === 'Sold' && (
                      <div className="flex-1 text-center py-2 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Finalized
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {orders.filter(o => o.status === col.status).length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
                  No orders {col.title.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBoard;
