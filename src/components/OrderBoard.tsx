import React, { useState, useRef, useEffect } from 'react';
import { Package, Clock, CheckCircle2, Plus, Phone, MapPin, Trash2, ShoppingCart, Edit2, Beaker, Printer, MessageCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Order, OrderItem, BottleSize, MixIngredient, SystemSettings } from '../types';
import { supabase, searchPerfumes, fetchPerfumeStock, searchMakhamria } from '../supabaseClient';
import InvoiceTemplate from './InvoiceTemplate';



interface OrderBoardProps {
  orders: Order[];
  settings: SystemSettings;
  updateOrderStatus: (id: string, status: Order['status'], isReversal?: boolean) => void;
  onAddOrder: (order: Order) => Promise<boolean>;
  onDeleteOrder: (id: string) => void;
  onEditOrder: (orderId: string, updates: Partial<Order>) => Promise<boolean>;
}

const OrderBoard: React.FC<OrderBoardProps> = ({ orders, settings, updateOrderStatus, onAddOrder, onDeleteOrder, onEditOrder }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ clientName: '', phone: '', address: '', totalOrderValue: 0, items: [] as OrderItem[] });

  // ── Printing Logic ──
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const promiseResolveRef = useRef<any>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPrinting && promiseResolveRef.current) {
      promiseResolveRef.current();
    }
  }, [isPrinting, selectedOrder]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    // ❌ مسحنا سطر documentTitle من هنا ❌
    onBeforePrint: () => {
      return new Promise((resolve) => {
        promiseResolveRef.current = resolve;
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      promiseResolveRef.current = null;
      // السطر ده عشان يرجع اسم الموقع طبيعي بعد ما تقفل الفاتورة
      document.title = 'Wanas Perfumes';
    }
  });



  // ── Trigger print for the InvoiceTemplate (kept for HTML print path) ──────
  const triggerPrint = (order: Order) => {
    const clientName = order.clientName || 'عميل';
    document.title = `فاتورة_${clientName}`;
    setSelectedOrder(order);
    setIsPrinting(true);
    handlePrint();
  };
  const handleEditClick = (order: Order) => {
    setEditForm({
      clientName: order.clientName,
      phone: order.phone || '',
      address: order.address || '',
      totalOrderValue: order.totalOrderValue,
      items: JSON.parse(JSON.stringify(order.items))
    });
    setEditingOrder(order);
  };

  const handleEditItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setEditForm(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      const newTotal = updatedItems.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0);

      return { ...prev, items: updatedItems, totalOrderValue: newTotal };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setIsEditing(true);
    const success = await onEditOrder(editingOrder.id, editForm);
    setIsEditing(false);
    if (success) {
      setEditingOrder(null);
      showToast('Changes Saved');
    }
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSearchMode, setActiveSearchMode] = useState<'add-name' | 'edit-name' | 'add-phone' | 'edit-phone' | null>(null);

  const [phoneSuggestions, setPhoneSuggestions] = useState<any[]>([]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState<{ mode: 'add' | 'edit' } | null>(null);

  const [perfumeSuggestions, setPerfumeSuggestions] = useState<any[]>([]);
  const [activePerfumeDropdown, setActivePerfumeDropdown] = useState<{ mode: 'add' | 'edit', index: number } | null>(null);
  // stockWarnings: per-item index => warning message or null
  const [stockWarnings, setStockWarnings] = useState<Record<number, string | null>>({});
  // stockCache: cache stock_ml per perfume name to avoid repeated fetches
  const [stockCache, setStockCache] = useState<Record<string, number | null>>({});

  const handleSearch = async (val: string, mode: 'add' | 'edit', field: 'name' | 'phone') => {
    if (mode === 'add') setNewOrder({ ...newOrder, [field === 'name' ? 'clientName' : 'phone']: val });
    else setEditForm({ ...editForm, [field === 'name' ? 'clientName' : 'phone']: val });

    console.log(`Searching for ${field}:`, val);
    if (!val || val.trim().length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('name, phone, address')
        .ilike(field, `%${val}%`)
        .limit(5);

      if (error) console.error('Error fetching customers:', error);
      console.log('Found customers:', data);

      if (data && data.length > 0) {
        setSuggestions(data);
        setShowDropdown(true);
        setActiveSearchMode(`${mode}-${field}` as any);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelect = (customer: any) => {
    if (activeSearchMode?.startsWith('add')) {
      setNewOrder(prev => ({
        ...prev,
        clientName: customer.name || prev.clientName,
        phone: customer.phone || '',
        address: customer.address || '',
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        clientName: customer.name || prev.clientName,
        phone: customer.phone || '',
        address: customer.address || '',
      }));
    }
    setShowDropdown(false);
  };

  const handlePhoneSearch = async (val: string, mode: 'add' | 'edit') => {
    if (mode === 'add') setNewOrder({ ...newOrder, phone: val });
    else setEditForm({ ...editForm, phone: val });

    console.log('Searching Phone for:', val);
    if (!val || val.trim().length === 0) {
      setPhoneSuggestions([]);
      setShowPhoneDropdown(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${val}%`)
        .limit(5);

      if (error) console.error('Phone Search Error:', error);
      console.log('Phone Search Results:', data);

      if (data && data.length > 0) {
        setPhoneSuggestions(data);
        setShowPhoneDropdown({ mode });
      } else {
        setPhoneSuggestions([]);
        setShowPhoneDropdown(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhoneSelect = (customer: any, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setNewOrder(prev => ({
        ...prev,
        clientName: customer.name || prev.clientName,
        phone: customer.phone || '',
        address: customer.address || prev.address,
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        clientName: customer.name || prev.clientName,
        phone: customer.phone || '',
        address: customer.address || prev.address,
      }));
    }
    setShowPhoneDropdown(null);
  };

  const handlePerfumeSearch = async (val: string, index: number, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      const updatedItems = [...newOrder.items];
      updatedItems[index].perfumeName = val;
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      handleEditItemChange(index, 'perfumeName', val);
    }

    if (!val || val.trim().length === 0) {
      setPerfumeSuggestions([]);
      setActivePerfumeDropdown(null);
      return;
    }

    try {
      const data = await searchPerfumes(val);

      if (data && data.length > 0) {
        setPerfumeSuggestions(data);
        setActivePerfumeDropdown({ mode, index });
      } else {
        setPerfumeSuggestions([]);
        setActivePerfumeDropdown(null);
      }
    } catch (e) {
      console.error('Frontend Search Error:', e);
    }
  };

  const handlePerfumeSelect = async (perfSelected: any, index: number, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      const updatedItems = [...newOrder.items];
      updatedItems[index].perfumeName = perfSelected.name;
      updatedItems[index].oilCostPrice = perfSelected.cost_price || 0;
      updatedItems[index] = recalculateItemCosts(updatedItems[index]);
      setNewOrder({ ...newOrder, items: updatedItems });

      // fetch stock for warning
      const cached = stockCache[perfSelected.name];
      const stockMl = cached !== undefined ? cached : await fetchPerfumeStock(perfSelected.name);
      if (!(perfSelected.name in stockCache)) {
        setStockCache(prev => ({ ...prev, [perfSelected.name]: stockMl }));
      }
      const qty = updatedItems[index].quantity || 1;
      if (stockMl !== null && qty > stockMl) {
        setStockWarnings(prev => ({ ...prev, [index]: `Not enough stock! Available: ${stockMl} ml` }));
      } else {
        setStockWarnings(prev => ({ ...prev, [index]: null }));
      }
    } else {
      setEditForm(prev => {
        const updatedItems = [...prev.items];
        updatedItems[index] = { ...updatedItems[index], perfumeName: perfSelected.name, oilCostPrice: perfSelected.cost_price || 0 };
        updatedItems[index] = recalculateItemCosts(updatedItems[index]);
        return { ...prev, items: updatedItems, totalOrderValue: updatedItems.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0) };
      });
    }
    setActivePerfumeDropdown(null);
  };

  const [bottlesList, setBottlesList] = useState<any[]>([]);

  const fetchBottles = async () => {
    try {
      const { data, error } = await supabase.from('bottles')
        .select('id, size, unit_price, stock_quantity')
        .gt('stock_quantity', 0);
        
      if (error) {
        console.error('Error fetching bottles:', error);
      } else if (data) {
        console.log('Bottles fetched:', data);
        setBottlesList(data);
      }
    } catch (err) {
      console.error('Fetch bottles exception:', err);
    }
  };

  useEffect(() => {
    fetchBottles();
  }, []);

  // Force re-fetch when 'Add Order' form opens
  useEffect(() => {
    if (isAdding) {
      fetchBottles();
    }
  }, [isAdding]);

  const recalculateItemCosts = (item: OrderItem): OrderItem => {
    if (item.isMakhamria) {
      let productionCost = item.oilCostPrice || 0; // Unit cost price of Makhamria
      let baseSuggested = item.suggestedPrice || 0; // Unit selling price of Makhamria
      let boxCost = 0;
      let boxSellingPrice = 0;

      if (item.premiumBox) {
        const boxBottle = bottlesList.find(b => b.size === 'علبة');
        boxCost = boxBottle ? boxBottle.unit_price : 0;
        boxSellingPrice = 20; // 20 EGP flat rate
        productionCost += boxCost;
      }

      const finalSuggested = baseSuggested + boxSellingPrice;
      const finalUnitPrice = Math.max(0, Math.round(finalSuggested + (item.manualPlus || 0) - (item.manualDiscount || 0)));

      return {
        ...item,
        calculatedCost: productionCost,
        suggestedPrice: finalSuggested,
        unitPrice: finalUnitPrice
      };
    }

    // 🔍 Fixed Oil Volume Mapping
    const FIXED_OIL_VOLUMES: Record<string, number> = { '30ml': 8, '50ml': 15, '100ml': 30 };
    const oilVol = FIXED_OIL_VOLUMES[item.size] || 15;
    const packaging = settings.packagingConstant || 0;
    const sticker = settings.stickerCost || 0;
    const misc = settings.miscCost || 0;
    const sizeConstant = settings.sizes[item.size]?.constant || 0;
    const targetPercentage = settings.targetCostPercentage || 0.60;
    
    let productionCost = 0;
    
    // 1. Oil Cost Calculation
    if (!item.isMix) {
      productionCost += (item.oilCostPrice || 0) * oilVol;
    } else {
      const ingredientsCost = (item.ingredients || []).reduce((sum, ing) => {
        return sum + ((ing.costPrice || 0) * (ing.amountMl || 0));
      }, 0);
      productionCost += ingredientsCost;
    }
    
    // 2. Packaging & Fixed Costs
    productionCost += (item.bottlePrice || 0);
    productionCost += (packaging + sticker + misc + sizeConstant); 

    // 3. Suggested Selling Price (Cost / Margin)
    const suggestedPriceRaw = productionCost > 0 ? (productionCost / targetPercentage) : 0;
    const suggestedPrice = Math.round(suggestedPriceRaw);
    
    let boxCost = 0;
    let boxSellingPrice = 0;

    // Add Box Price if toggled ON
    if (item.premiumBox) {
      const boxBottle = bottlesList.find(b => b.size === 'علبة');
      boxCost = boxBottle ? boxBottle.unit_price : 0;
      boxSellingPrice = 20; // 20 EGP flat rate
      
      productionCost += boxCost; // Add to cost for margin calculation
    }
    
    // 4. Final Price after manual plus and manual discount
    const finalUnitPrice = Math.max(0, Math.round(suggestedPrice + boxSellingPrice + (item.manualPlus || 0) - (item.manualDiscount || 0)));

    return {
      ...item,
      calculatedCost: productionCost,
      suggestedPrice: suggestedPrice,
      unitPrice: finalUnitPrice
    };
  };

  const initialItemState: OrderItem = { perfumeName: '', size: '50ml', quantity: 1, unitPrice: 0, isMix: false, isMakhamria: false, ingredients: [], oilCostPrice: 0, bottleName: '', bottlePrice: 0, manualPlus: 0, manualDiscount: 0, calculatedCost: 0, suggestedPrice: 0 };

  const [newOrder, setNewOrder] = useState({
    clientName: '',
    phone: '',
    address: '',
    items: [{ ...initialItemState, unitPrice: '' as any as number }]
  });

  // Ingredient-level perfume search state
  const [ingredientPerfumeSuggestions, setIngredientPerfumeSuggestions] = useState<any[]>([]);
  const [activeIngredientDropdown, setActiveIngredientDropdown] = useState<{ itemIndex: number; ingIndex: number } | null>(null);

  // Makhamria search state
  const [makhamriaSuggestions, setMakhamriaSuggestions] = useState<any[]>([]);
  const [activeMakhamriaDropdown, setActiveMakhamriaDropdown] = useState<{ mode: 'add' | 'edit', index: number } | null>(null);

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
    setStockWarnings(prev => {
      const updated: Record<number, string | null> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki < index) updated[ki] = v;
        else if (ki > index) updated[ki - 1] = v;
      });
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      if (field === 'bottleName') {
         const bottle = bottlesList.find(b => b.size === value);
         updatedItems[index].bottleName = value;
         updatedItems[index].bottlePrice = bottle?.unit_price || 0;
      } 
      else if (field === 'size') {
         // Auto-select bottle that matches the size string "e.g., 50ml"
         const matchingBottle = bottlesList.find(b => b.size === value);
         if (matchingBottle) {
            updatedItems[index].bottleName = matchingBottle.size;
            updatedItems[index].bottlePrice = matchingBottle.unit_price;
         } else {
            updatedItems[index].bottleName = '';
            updatedItems[index].bottlePrice = 0;
         }
      }
      
      updatedItems[index] = recalculateItemCosts(updatedItems[index]);
      return { ...prev, items: updatedItems };
    });
  };

  // Toggle item between single, mix, and makhamria mode
  const handleSetItemType = (index: number, mode: 'single' | 'mix' | 'makhamria') => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      const isMix = mode === 'mix';
      const isMakhamria = mode === 'makhamria';
      updatedItems[index] = {
        ...updatedItems[index],
        isMix,
        isMakhamria,
        perfumeName: '',
        oilCostPrice: 0,
        makhamriaId: undefined,
        suggestedPrice: 0,
        ingredients: isMix ? [{ perfumeName: '', amountMl: 0, costPrice: 0 }] : []
      };
      updatedItems[index] = recalculateItemCosts(updatedItems[index]);
      return { ...prev, items: updatedItems };
    });
  };

  const handleMakhamriaSearch = async (val: string, index: number, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      const updatedItems = [...newOrder.items];
      updatedItems[index].perfumeName = val;
      setNewOrder({ ...newOrder, items: updatedItems });
    }

    if (!val || val.trim().length === 0) {
      setMakhamriaSuggestions([]);
      setActiveMakhamriaDropdown(null);
      return;
    }

    try {
      const data = await searchMakhamria(val);
      if (data && data.length > 0) {
        setMakhamriaSuggestions(data);
        setActiveMakhamriaDropdown({ mode, index });
      } else {
        setMakhamriaSuggestions([]);
        setActiveMakhamriaDropdown(null);
      }
    } catch (e) {
      console.error('Makhamria Search Error:', e);
    }
  };

  const handleMakhamriaSelect = async (makSelected: any, index: number, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      const updatedItems = [...newOrder.items];
      updatedItems[index].perfumeName = makSelected.name;
      updatedItems[index].makhamriaId = makSelected.id;
      updatedItems[index].oilCostPrice = makSelected.cost_price || 0;
      updatedItems[index].suggestedPrice = makSelected.selling_price || 0;
      updatedItems[index] = recalculateItemCosts(updatedItems[index]);
      setNewOrder({ ...newOrder, items: updatedItems });

      const stockQty = makSelected.stock_qty ?? 0;
      const qty = updatedItems[index].quantity || 1;
      if (qty > stockQty) {
        setStockWarnings(prev => ({ ...prev, [index]: `Not enough stock! Available: ${stockQty} Pcs` }));
      } else {
        setStockWarnings(prev => ({ ...prev, [index]: null }));
      }
    }
    setActiveMakhamriaDropdown(null);
  };


  // Ingredient CRUD
  const handleIngredientChange = (itemIdx: number, ingIdx: number, field: keyof MixIngredient, value: any) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      const ings = [...(updatedItems[itemIdx].ingredients || [])];
      ings[ingIdx] = { ...ings[ingIdx], [field]: value };
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], ingredients: ings };
      updatedItems[itemIdx] = recalculateItemCosts(updatedItems[itemIdx]);
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddIngredient = (itemIdx: number) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      const ings = [...(updatedItems[itemIdx].ingredients || []), { perfumeName: '', amountMl: 0, costPrice: 0 }];
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], ingredients: ings };
      updatedItems[itemIdx] = recalculateItemCosts(updatedItems[itemIdx]);
      return { ...prev, items: updatedItems };
    });
  };

  const handleRemoveIngredient = (itemIdx: number, ingIdx: number) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      const ings = (updatedItems[itemIdx].ingredients || []).filter((_, i) => i !== ingIdx);
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], ingredients: ings };
      updatedItems[itemIdx] = recalculateItemCosts(updatedItems[itemIdx]);
      return { ...prev, items: updatedItems };
    });
  };

  const handleIngredientPerfumeSearch = async (val: string, itemIdx: number, ingIdx: number) => {
    handleIngredientChange(itemIdx, ingIdx, 'perfumeName', val);
    if (!val || val.trim().length === 0) {
      setIngredientPerfumeSuggestions([]);
      setActiveIngredientDropdown(null);
      return;
    }
    try {
      const data = await searchPerfumes(val);
      if (data && data.length > 0) {
        setIngredientPerfumeSuggestions(data);
        setActiveIngredientDropdown({ itemIndex: itemIdx, ingIndex: ingIdx });
      } else {
        setIngredientPerfumeSuggestions([]);
        setActiveIngredientDropdown(null);
      }
    } catch (e) {
      console.error('Ingredient search error:', e);
    }
  };

  const handleIngredientPerfumeSelect = (perfSelected: any, itemIdx: number, ingIdx: number) => {
    setNewOrder(prev => {
      const updatedItems = [...prev.items];
      const ings = [...(updatedItems[itemIdx].ingredients || [])];
      ings[ingIdx] = { ...ings[ingIdx], perfumeName: perfSelected.name, costPrice: perfSelected.cost_price || 0 };
      updatedItems[itemIdx] = { ...updatedItems[itemIdx], ingredients: ings };
      updatedItems[itemIdx] = recalculateItemCosts(updatedItems[itemIdx]);
      return { ...prev, items: updatedItems };
    });
    setActiveIngredientDropdown(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.clientName) return;

    // Validate all items
    const isValid = newOrder.items.every(item => {
      if (!item.perfumeName || String(item.unitPrice) === '' || item.quantity <= 0) return false;
      if (item.isMix) {
        return item.ingredients && item.ingredients.length > 0 && item.ingredients.every(ing => ing.perfumeName && ing.amountMl > 0);
      }
      return true;
    });
    if (!isValid) return;

    // ── Validation: Check Bottle Stock ──
    const requiredBottles: Record<string, number> = {};
    for (const item of newOrder.items) {
      if (item.bottleName) {
        requiredBottles[item.bottleName] = (requiredBottles[item.bottleName] || 0) + item.quantity;
      }
    }

    for (const bottleSize of Object.keys(requiredBottles)) {
      const bottle = bottlesList.find(b => b.size === bottleSize);
      if (!bottle) {
        alert(`Bottle option "${bottleSize}" not found in inventory!`);
        return;
      }
      if (bottle.stock_quantity < requiredBottles[bottleSize]) {
        alert(`Insufficient bottle stock! You requested ${requiredBottles[bottleSize]}x "${bottleSize}", but only ${bottle.stock_quantity} are available.`);
        return;
      }
    }
    // ────────────────────────────────────

    if (currentTotalValue <= 0) {
      alert("Error: Total order value cannot be zero. Please check unit prices.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('name', newOrder.clientName);

      if (!searchError && (!existingCustomer || existingCustomer.length === 0)) {
        await supabase.from('customers').insert({
          name: newOrder.clientName,
          phone: newOrder.phone || null,
          address: newOrder.address || null
        });
        console.log('New customer saved:', newOrder.clientName);
      }
    } catch (e) {
      console.error('Customer auto-save error (Order will still proceed):', e);
    }

    const success = await onAddOrder({
      id: Math.random().toString(36).substr(2, 9),
      clientName: newOrder.clientName,
      phone: newOrder.phone,
      address: newOrder.address,
      items: newOrder.items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), quantity: Number(i.quantity) })),
      totalOrderValue: currentTotalValue,
      status: 'Pending',
      createdAt: new Date()
    });

    setIsSubmitting(false);

    if (success) {
      // ── Live Update: Subtract bottle stock upon success ──
      for (const bottleSize of Object.keys(requiredBottles)) {
        const bottle = bottlesList.find(b => b.size === bottleSize);
        if (bottle) {
          const newStock = Math.max(0, bottle.stock_quantity - requiredBottles[bottleSize]);
          await supabase.from('bottles').update({ stock_quantity: newStock }).eq('id', bottle.id);
        }
      }
      fetchBottles(); // Live update for the UI without manual refresh
      // ───────────────────────────────────────────────────

      setNewOrder({
        clientName: '', phone: '', address: '',
        items: [{ ...initialItemState, unitPrice: '' as any as number }]
      });
      setIsAdding(false);
      showToast('Order Placed Successfully!');
    }
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
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                <input
                  type="text" required
                  value={newOrder.clientName}
                  onChange={e => handleSearch(e.target.value, 'add', 'name')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="Full Name"
                  autoComplete="off"
                />
                {showDropdown && activeSearchMode === 'add-name' && suggestions.length > 0 && (
                  <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                    {suggestions.map((cust, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(cust)}
                        className="p-3 sm:p-4 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-amber-500 text-sm sm:text-base">{cust.name}</div>
                        {(cust.phone || cust.address) && (
                          <div className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">{[cust.phone, cust.address].filter(Boolean).join(' • ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newOrder.phone}
                  onChange={e => handlePhoneSearch(e.target.value, 'add')}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  placeholder="01x xxx xxxx"
                  autoComplete="off"
                />
                {showPhoneDropdown?.mode === 'add' && phoneSuggestions.length > 0 && (
                  <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                    {phoneSuggestions.map((cust, i) => (
                      <div
                        key={i}
                        onClick={() => handlePhoneSelect(cust, 'add')}
                        className="p-3 sm:p-4 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-amber-500 text-sm sm:text-base">{cust.phone} <span className="text-slate-400 font-normal ml-1">- {cust.name}</span></div>
                        {cust.address && (
                          <div className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">{cust.address}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address (Optional)</label>
                <input
                  type="text"
                  value={newOrder.address} onChange={e => setNewOrder({ ...newOrder, address: e.target.value })}
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
                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-3">
                  {/* ── Toggle: Single / Mix / Makhamria ── */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleSetItemType(index, 'single')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${!item.isMix && !item.isMakhamria
                          ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        Single Perfume
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetItemType(index, 'mix')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${item.isMix
                          ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <Beaker className="w-3 h-3" /> Custom Mix
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetItemType(index, 'makhamria')}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${item.isMakhamria
                          ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        <Sparkles className="w-3 h-3" /> مخمرية
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={newOrder.items.length === 1}
                      className={`p-2 rounded-lg transition-colors ${newOrder.items.length === 1 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ── SINGLE PERFUME MODE ── */}
                  {!item.isMix && !item.isMakhamria && (
                    <>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-12 sm:col-span-6 relative">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Perfume Name</label>
                        <input
                          type="text" required
                          value={item.perfumeName}
                          onChange={e => handlePerfumeSearch(e.target.value, index, 'add')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                          placeholder="Perfume name..."
                          autoComplete="off"
                        />
                        {stockWarnings[index] && (
                          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-900/25 border border-orange-300 dark:border-orange-700/50 rounded-lg text-xs font-semibold text-orange-600 dark:text-orange-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            {stockWarnings[index]}
                          </div>
                        )}
                        {activePerfumeDropdown?.mode === 'add' && activePerfumeDropdown.index === index && perfumeSuggestions.length > 0 && (
                          <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                            {perfumeSuggestions.map((perf, i) => (
                              <div
                                key={i}
                                onClick={() => handlePerfumeSelect(perf, index, 'add')}
                                className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                              >
                                <div className="font-bold text-amber-500 text-sm">{perf.name}</div>
                                {perf.stock_ml != null && (
                                  <div className="text-xs text-slate-400 mt-0.5">Stock: {perf.stock_ml} ml</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
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
                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qty</label>
                        <input
                          type="number" min="1" required
                          value={item.quantity}
                          onChange={e => {
                            const qty = Number(e.target.value);
                            handleItemChange(index, 'quantity', qty);
                            const name = item.perfumeName;
                            if (name && name in stockCache) {
                              const stockMl = stockCache[name];
                              if (stockMl !== null && qty > stockMl) {
                                setStockWarnings(prev => ({ ...prev, [index]: `Not enough stock! Available: ${stockMl} ml` }));
                              } else {
                                setStockWarnings(prev => ({ ...prev, [index]: null }));
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                    {/* COST ENGINE DETAILS - SINGLE */}
                    <div className="grid grid-cols-12 gap-3 items-end bg-slate-100/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 mt-2">
                        <div className="col-span-12 sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Bottle Options</label>
                          <select value={item.bottleName || ''} onChange={e => handleItemChange(index, 'bottleName', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-amber-500 outline-none text-xs">
                             <option value="">No Custom Bottle</option>
                             {bottlesList.filter(b => b.size !== 'علبة').map(b => <option key={b.id} value={b.size}>{b.size} (+{b.unit_price})</option>)}
                          </select>
                        </div>
                        <div className="col-span-12 sm:col-span-3 flex items-center">
                          <label className="flex items-center space-x-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 cursor-pointer pt-3 hover:opacity-80 transition-opacity">
                             <input 
                               type="checkbox" 
                               checked={item.premiumBox || false} 
                               onChange={e => handleItemChange(index, 'premiumBox', e.target.checked)}
                               className="rounded text-amber-500 focus:ring-amber-500 border-amber-300 bg-amber-50 dark:bg-slate-800 w-3.5 h-3.5"
                             />
                             <span>Add Premium Box (علبة) (+20 EGP)</span>
                          </label>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                           <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Suggested</label>
                           <div className="px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 text-xs font-bold rounded flex items-center h-[30px] overflow-hidden whitespace-nowrap">
                              {Math.round(item.suggestedPrice || 0)} EGP
                           </div>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                           <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Plus (+)</label>
                           <input type="number" min="0" value={item.manualPlus || ''} onChange={e => handleItemChange(index, 'manualPlus', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-amber-500 outline-none text-xs" placeholder="+ EGP" />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                           <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Discount</label>
                           <input type="number" min="0" value={item.manualDiscount || ''} onChange={e => handleItemChange(index, 'manualDiscount', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-amber-500 outline-none text-xs" placeholder="- EGP" />
                        </div>
                        <div className="col-span-12 sm:col-span-3 flex justify-end">
                           <div className="flex flex-col items-end justify-center h-full">
                               <span className="text-[9px] uppercase font-bold text-slate-400">Live Margin</span>
                               <span className={`text-sm font-bold ${((item.unitPrice || 0) - (item.calculatedCost || 0)) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {((item.unitPrice || 0) - (item.calculatedCost || 0)) > 0 ? '+' : ''}{Math.round((item.unitPrice || 0) - (item.calculatedCost || 0))} EGP
                               </span>
                           </div>
                        </div>
                    </div>
                    </>
                  )}

                  {/* ── MAKHAMRIA MODE ── */}
                  {item.isMakhamria && (
                    <>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-12 sm:col-span-8 relative">
                        <label className="block text-xs font-medium text-rose-500 dark:text-rose-400 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> مخمرية (Makhamria Product)
                        </label>
                        <input
                          type="text" required
                          value={item.perfumeName}
                          onChange={e => handleMakhamriaSearch(e.target.value, index, 'add')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700/50 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                          placeholder="Search Makhamria (مخمرية)..."
                          autoComplete="off"
                        />
                        {stockWarnings[index] && (
                          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-orange-50 dark:bg-orange-900/25 border border-orange-300 dark:border-orange-700/50 rounded-lg text-xs font-semibold text-orange-600 dark:text-orange-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {stockWarnings[index]}
                          </div>
                        )}
                        {activeMakhamriaDropdown?.mode === 'add' && activeMakhamriaDropdown.index === index && makhamriaSuggestions.length > 0 && (
                          <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-rose-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                            {makhamriaSuggestions.map((mak, i) => (
                              <div
                                key={i}
                                onClick={() => handleMakhamriaSelect(mak, index, 'add')}
                                className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                              >
                                <div className="font-bold text-rose-400 text-sm">{mak.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5 flex justify-between">
                                  <span>Price: {mak.selling_price ?? 0} EGP | Cost: {mak.cost_price ?? 0} EGP</span>
                                  <span className="font-semibold text-amber-400">Stock: {mak.stock_qty ?? 0} Pcs</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qty (Pcs / عدد)</label>
                        <input
                          type="number" min="1" required
                          value={item.quantity}
                          onChange={e => {
                            const qty = Number(e.target.value);
                            handleItemChange(index, 'quantity', qty);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* COST ENGINE DETAILS - MAKHAMRIA */}
                    <div className="grid grid-cols-12 gap-3 items-end bg-rose-50/30 dark:bg-rose-900/20 p-2.5 rounded-lg border border-rose-100/50 dark:border-rose-800/30 mt-2">
                      <div className="col-span-12 sm:col-span-6 flex items-center">
                        <label className="flex items-center space-x-2 text-[11px] font-bold text-rose-700 dark:text-rose-400 cursor-pointer pt-1 hover:opacity-80 transition-opacity">
                          <input 
                            type="checkbox" 
                            checked={item.premiumBox || false} 
                            onChange={e => handleItemChange(index, 'premiumBox', e.target.checked)}
                            className="rounded text-rose-500 focus:ring-rose-500 border-rose-300 bg-rose-50 dark:bg-slate-800 w-3.5 h-3.5"
                          />
                          <span>Add Premium Box (علبة) (+20 EGP)</span>
                        </label>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Suggested</label>
                        <div className="px-2 py-1.5 bg-rose-100/50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 text-xs font-bold rounded flex items-center h-[30px] overflow-hidden whitespace-nowrap">
                          {Math.round(item.suggestedPrice || 0)} EGP
                        </div>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Plus (+)</label>
                        <input type="number" min="0" value={item.manualPlus || ''} onChange={e => handleItemChange(index, 'manualPlus', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-rose-500 outline-none text-xs" placeholder="+ EGP" />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Discount</label>
                        <input type="number" min="0" value={item.manualDiscount || ''} onChange={e => handleItemChange(index, 'manualDiscount', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-rose-500 outline-none text-xs" placeholder="- EGP" />
                      </div>
                      <div className="col-span-12 flex justify-end pt-1">
                        <div className="flex flex-col items-end justify-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Live Margin</span>
                          <span className={`text-sm font-bold ${((item.unitPrice || 0) - (item.calculatedCost || 0)) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {((item.unitPrice || 0) - (item.calculatedCost || 0)) > 0 ? '+' : ''}{Math.round((item.unitPrice || 0) - (item.calculatedCost || 0))} EGP
                          </span>
                        </div>
                      </div>
                    </div>
                    </>
                  )}

                  {/* ── CUSTOM MIX MODE ── */}
                  {item.isMix && (
                    <div className="space-y-3">
                      {/* Mix Name + Size + Qty + Price row */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 sm:col-span-6">
                          <label className="block text-xs font-medium text-purple-500 dark:text-purple-400 mb-1 flex items-center gap-1">
                            <Beaker className="w-3 h-3" /> Mix Name
                          </label>
                          <input
                            type="text" required
                            value={item.perfumeName}
                            onChange={e => handleItemChange(index, 'perfumeName', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700/50 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                            placeholder="e.g. Special VIP Mix"
                            autoComplete="off"
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
                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qty</label>
                          <input
                            type="number" min="1" required
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* COST ENGINE DETAILS - MIX */}
                      <div className="grid grid-cols-12 gap-3 items-end bg-purple-50/30 dark:bg-purple-900/20 p-2.5 rounded-lg border border-purple-100/50 dark:border-purple-800/30 mt-2">
                          <div className="col-span-12 sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Bottle Options</label>
                            <select value={item.bottleName || ''} onChange={e => handleItemChange(index, 'bottleName', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-purple-500 outline-none text-xs">
                               <option value="">No Custom Bottle</option>
                               {bottlesList.filter(b => b.size !== 'علبة').map(b => <option key={b.id} value={b.size}>{b.size} (+{b.unit_price})</option>)}
                            </select>
                          </div>
                          <div className="col-span-12 sm:col-span-3 flex items-center">
                            <label className="flex items-center space-x-2 text-[11px] font-bold text-purple-700 dark:text-purple-400 cursor-pointer pt-3 hover:opacity-80 transition-opacity">
                               <input 
                                 type="checkbox" 
                                 checked={item.premiumBox || false} 
                                 onChange={e => handleItemChange(index, 'premiumBox', e.target.checked)}
                                 className="rounded text-purple-500 focus:ring-purple-500 border-purple-300 bg-purple-50 dark:bg-slate-800 w-3.5 h-3.5"
                               />
                               <span>Add Premium Box (علبة) (+20 EGP)</span>
                            </label>
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Suggested</label>
                             <div className="px-2 py-1.5 bg-purple-100/50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50 text-xs font-bold rounded flex items-center h-[30px] overflow-hidden whitespace-nowrap">
                                {Math.round(item.suggestedPrice || 0)} EGP
                             </div>
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Plus (+)</label>
                             <input type="number" min="0" value={item.manualPlus || ''} onChange={e => handleItemChange(index, 'manualPlus', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-purple-500 outline-none text-xs" placeholder="+ EGP" />
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                             <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Discount</label>
                             <input type="number" min="0" value={item.manualDiscount || ''} onChange={e => handleItemChange(index, 'manualDiscount', Number(e.target.value))} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded focus:ring-1 focus:ring-purple-500 outline-none text-xs" placeholder="- EGP" />
                          </div>
                          <div className="col-span-12 sm:col-span-3 flex justify-end">
                             <div className="flex flex-col items-end justify-center h-full">
                                 <span className="text-[9px] uppercase font-bold text-slate-400">Live Margin</span>
                                 <span className={`text-sm font-bold ${((item.unitPrice || 0) - (item.calculatedCost || 0)) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {((item.unitPrice || 0) - (item.calculatedCost || 0)) > 0 ? '+' : ''}{Math.round((item.unitPrice || 0) - (item.calculatedCost || 0))} EGP
                                 </span>
                             </div>
                          </div>
                      </div>

                      {/* Ingredients list */}
                      <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-200 dark:border-purple-800/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 tracking-wider">Ingredients</p>
                          <button
                            type="button"
                            onClick={() => handleAddIngredient(index)}
                            className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                          >
                            <Plus className="w-3 h-3 mr-0.5" /> Add
                          </button>
                        </div>
                        {(item.ingredients || []).map((ing, ingIdx) => (
                          <div key={ingIdx} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-7 relative">
                              <input
                                type="text" required
                                value={ing.perfumeName}
                                onChange={e => handleIngredientPerfumeSearch(e.target.value, index, ingIdx)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                placeholder="Perfume oil..."
                                autoComplete="off"
                              />
                              {activeIngredientDropdown?.itemIndex === index && activeIngredientDropdown?.ingIndex === ingIdx && ingredientPerfumeSuggestions.length > 0 && (
                                <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-purple-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-48 animate-in fade-in slide-in-from-top-1">
                                  {ingredientPerfumeSuggestions.map((perf, pi) => (
                                    <div
                                      key={pi}
                                      onClick={() => handleIngredientPerfumeSelect(perf, index, ingIdx)}
                                      className="p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                                    >
                                      <div className="font-bold text-purple-400 text-sm">{perf.name}</div>
                                      {perf.stock_ml != null && (
                                        <div className="text-xs text-slate-400 mt-0.5">Stock: {perf.stock_ml} ml</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number" min="0" step="0.5" required
                                value={ing.amountMl || ''}
                                onChange={e => handleIngredientChange(index, ingIdx, 'amountMl', Number(e.target.value))}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                placeholder="ml"
                              />
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(index, ingIdx)}
                                disabled={(item.ingredients || []).length <= 1}
                                className={`p-1.5 rounded-lg transition-colors ${(item.ingredients || []).length <= 1 ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  {Math.round(currentTotalValue)} <span className="text-sm text-slate-500 dark:text-slate-400">EGP</span>
                </div>
              </div>
              <div className="flex space-x-3 w-full sm:w-auto">
                <button type="button" onClick={() => setIsAdding(false)} disabled={isSubmitting} className="flex-1 sm:flex-none justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 sm:flex-none justify-center ${isSubmitting ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'} text-white px-8 py-2.5 rounded-lg font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95`}>
                  {isSubmitting ? 'Saving...' : 'Confirm Order'}
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{order.clientName}</h4>
                        {order.phone && (
                          <a 
                            href={(() => {
                              let clean = order.phone.replace(/\D/g, '');
                              if (clean.startsWith('0')) {
                                clean = '20' + clean.substring(1);
                              }
                              return `https://wa.me/${clean}`;
                            })()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-green-500 transition-colors p-1" 
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(order); }} className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edit Order">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete Order">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-sm font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-1.5 rounded-lg text-right whitespace-nowrap shadow-sm">
                        {Math.round(order.totalOrderValue)} EGP
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
                              <span className="flex items-center text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.isMix ? (
                                  <><Beaker className="w-3 h-3 mr-1 text-purple-400" /> Mix ({item.ingredients?.length || 0} oils) · {item.size}</>
                                ) : item.isMakhamria ? (
                                  <><Sparkles className="w-3 h-3 mr-1 text-rose-400" /> مخمرية (Pcs)</>
                                ) : (
                                  <><Package className="w-3 h-3 mr-1" /> {item.size}</>
                                )}
                              </span>
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
                        <>
                          <button
                            onClick={() => triggerPrint(order)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, 'Prepared')} className="flex-1 text-center py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-xs font-bold transition-colors">
                            Mark Prepared
                          </button>
                        </>
                      )}
                      {col.status === 'Prepared' && (
                        <>
                          <button onClick={() => updateOrderStatus(order.id, 'Pending', true)} className="flex-1 text-center py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">
                            Move Back
                          </button>
                          <button
                            onClick={() => triggerPrint(order)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, 'Sold')} className="flex-1 text-center py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-xs font-bold transition-colors">
                            Mark Sold
                          </button>
                        </>
                      )}
                      {col.status === 'Sold' && (
                        <>
                          <button
                            onClick={() => triggerPrint(order)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateOrderStatus(order.id, 'Prepared', true)} className="flex-1 text-center py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors">
                            Move Back
                          </button>
                          <div className="flex-[2] text-center py-2 text-slate-400 dark:text-slate-500 text-xs font-bold flex items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Finalized
                          </div>
                        </>
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

      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[50] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95 max-h-[90vh] flex flex-col relative z-[60]">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex-shrink-0 mb-4">Edit Order</h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                <input
                  type="text"
                  value={editForm.clientName}
                  onChange={e => handleSearch(e.target.value, 'edit', 'name')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                  autoComplete="off"
                />
                {showDropdown && activeSearchMode === 'edit-name' && suggestions.length > 0 && (
                  <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                    {suggestions.map((cust, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelect(cust)}
                        className="p-3 sm:p-4 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-amber-500 text-sm sm:text-base">{cust.name}</div>
                        {(cust.phone || cust.address) && (
                          <div className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">{[cust.phone, cust.address].filter(Boolean).join(' • ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => handlePhoneSearch(e.target.value, 'edit')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                  autoComplete="off"
                />
                {showPhoneDropdown?.mode === 'edit' && phoneSuggestions.length > 0 && (
                  <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                    {phoneSuggestions.map((cust, i) => (
                      <div
                        key={i}
                        onClick={() => handlePhoneSelect(cust, 'edit')}
                        className="p-3 sm:p-4 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-amber-500 text-sm sm:text-base">{cust.phone} <span className="text-slate-400 font-normal ml-1">- {cust.name}</span></div>
                        {cust.address && (
                          <div className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">{cust.address}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cart Items</h4>
                </div>
                <div className="space-y-3 pr-1">
                  {editForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 relative">
                      <div className="col-span-12 sm:col-span-8 relative">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Perfume Name</label>
                        <input
                          type="text" required
                          value={item.perfumeName}
                          onChange={e => handlePerfumeSearch(e.target.value, index, 'edit')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm transition-colors"
                          autoComplete="off"
                        />
                        {activePerfumeDropdown?.mode === 'edit' && activePerfumeDropdown.index === index && perfumeSuggestions.length > 0 && (
                          <div className="absolute z-[9999] top-full left-0 mt-1 w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-1">
                            {perfumeSuggestions.map((perf, i) => (
                              <div
                                key={i}
                                onClick={() => handlePerfumeSelect(perf, index, 'edit')}
                                className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors"
                              >
                                <div className="font-bold text-amber-500 text-sm">{perf.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Qty</label>
                        <input
                          type="number" min="1" required
                          value={item.quantity} onChange={e => handleEditItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Revenue (EGP)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={editForm.totalOrderValue}
                    onChange={e => setEditForm({ ...editForm, totalOrderValue: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-slate-900 dark:text-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-amber-600 font-bold text-sm">EGP</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-4 flex-shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors shadow-sm"
                disabled={isEditing}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
                disabled={isEditing}
              >
                {isEditing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center z-[100] animate-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />
          {toast.message}
        </div>
      )}

      {/* Hidden Invoice for Printing */}
      <div className="hidden">
        {selectedOrder && (
          <InvoiceTemplate ref={componentRef} order={selectedOrder} />
        )}
      </div>
    </div>
  );
};

export default OrderBoard;
