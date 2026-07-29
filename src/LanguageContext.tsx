import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

export const translations = {
  en: {
    // Nav tabs
    pricingCalculator:   'Pricing Calculator',
    orderManagement:     'Order Management',
    accountingDashboard: 'Accounting Dashboard',
    customerDatabase:    'Customer Database',
    products:            'Products',
    settings:            'Settings',
    accessList:          'Access List',

    // App header
    loggedInAs:          'Logged in as:',

    // Accounting Dashboard
    totalRevenue:        'Total Revenue',
    netProfit:           'Net Profit (Live Margin)',
    totalCost:           'Total Cost',
    recentSalesLedger:   'Recent Sales Ledger',
    downloadExcel:       'Download Excel',
    topClient:           'Top Client',
    bestSeller:          'Best Seller',
    totalSpent:          'Total Spent:',
    sold:                'Sold',
    units:               'units',
    cartsProcessed:      'cart(s) processed',
    sumProductionCosts:  'Sum of all production costs',
    revenueCosts:        'Total Revenue - Total Production Costs',
    client:              'Client',
    cartSummary:         'Cart Summary',
    sellingPrice:        'Selling Price',
    costPrice:           'Cost Price',
    liveMargin:          'Live Margin',
    items:               'Item(s)',
    noSalesYet:          'No sales recorded yet. Move carts to "Sold" to see them here.',
    emptyDashboard:      'Your Accounting Dashboard is currently empty. Complete sales from the Order Management pipeline to populate financial analytics.',
    capitalAssets:       'Capital & Assets',
    purchasesModule:     'Purchases Module',

    // Order Management
    trackManage:         'Track and manage client multi-item carts',
    newCartOrder:        'New Cart Order',
    closeForm:           'Close Form',
    clientName:          'Client Name',
    phoneOptional:       'Phone Number (Optional)',
    addressOptional:     'Address (Optional)',
    addItem:             'Add Item',
    placeOrder:          'Place Order',
    placingOrder:        'Placing Order...',
    pending:             'Pending',
    prepared:            'Prepared',
    soldStatus:          'Sold',
    markPrepared:        'Mark as Prepared',
    markSold:            'Mark as Sold',
    revertPending:       'Revert to Pending',
    revertPrepared:      'Revert to Prepared',
    deleteOrder:         'Delete Order',
    editOrder:           'Edit Order',
    printInvoice:        'Print Invoice',
    noOrdersYet:         'No orders yet.',
    stockWarning:        'Low stock warning',

    // Settings
    globalConfig:        'Global Configuration',
    fineTune:            'Fine-tune the mathematical parameters that scale the entire platform',
    applySettings:       'Apply Master Settings',
    savedToCloud:        'Saved to Cloud!',
    saveFailed:          'Save Failed — Retry',
    financialMargins:    'Financial Margins & Packaging',
    packagingConstant:   'Base Packaging Constant (EGP)',
    profitTarget:        'Profit Target',
    reinvestmentFund:    'Reinvestment Fund',
    volumeMatrix:        'Volume Matrix Constraints',
    orderPricingRules:   'Order Pricing Rules',
    marketingCost:       'Marketing Cost (Fixed)',
    stickerCost:         'Sticker Cost (Fixed)',
    targetCostPct:       'Target Cost Percentage',
    bottlePresets:       'Moderator Bottle Presets',
    oilPresets:          'Moderator Oil Presets',
    formatSystem:        'Format Orders System',
    formatDesc:          'Erases all Supabase order telemetry',

    // General
    save:                'Save',
    cancel:              'Cancel',
    loading:             'Loading...',
    error:               'Error',
    notAvailable:        'N/A',
    notEnoughData:       'Not enough data',
    financialOverview:   'Financial overview based on completed sales',
    egp:                 'EGP',
    quantity:            'Qty',
    size:                'Size',
    perfume:             'Perfume',
    bottle:              'Bottle',
    discount:            'Discount',
    suggestedPrice:      'Suggested Price',
    liveMarginLabel:     'Live Margin',
    totalOrder:          'Total Order Value',
  },

  ar: {
    // Nav tabs
    pricingCalculator:   'حاسبة الأسعار',
    orderManagement:     'إدارة الطلبات',
    accountingDashboard: 'لوحة المحاسبة',
    customerDatabase:    'قاعدة العملاء',
    products:            'المنتجات',
    settings:            'الإعدادات',
    accessList:          'قائمة الصلاحيات',

    // App header
    loggedInAs:          'مسجل الدخول كـ:',

    // Accounting Dashboard
    totalRevenue:        'إجمالي الإيرادات',
    netProfit:           'صافي الربح (الهامش الحي)',
    totalCost:           'إجمالي التكاليف',
    recentSalesLedger:   'سجل المبيعات الأخيرة',
    downloadExcel:       'تنزيل Excel',
    topClient:           'أفضل عميل',
    bestSeller:          'الأكثر مبيعًا',
    totalSpent:          'إجمالي الإنفاق:',
    sold:                'مباعة',
    units:               'وحدة',
    cartsProcessed:      'طلب (طلبات) مكتملة',
    sumProductionCosts:  'مجموع تكاليف الإنتاج الكلية',
    revenueCosts:        'إجمالي الإيرادات - إجمالي تكاليف الإنتاج',
    client:              'العميل',
    cartSummary:         'ملخص الطلب',
    sellingPrice:        'سعر البيع',
    costPrice:           'سعر التكلفة',
    liveMargin:          'الهامش الحي',
    items:               'عنصر (عناصر)',
    noSalesYet:          'لا توجد مبيعات مسجلة حتى الآن. انقل الطلبات إلى "مباع" لرؤيتها هنا.',
    emptyDashboard:      'لوحة المحاسبة فارغة حاليًا. أكمل المبيعات من خط إدارة الطلبات لتفعيل التحليلات المالية.',
    capitalAssets:       'رأس المال والأصول',
    purchasesModule:     'وحدة المشتريات',

    // Order Management
    trackManage:         'تتبع وإدارة طلبات العملاء',
    newCartOrder:        'طلب جديد',
    closeForm:           'إغلاق النموذج',
    clientName:          'اسم العميل',
    phoneOptional:       'رقم الهاتف (اختياري)',
    addressOptional:     'العنوان (اختياري)',
    addItem:             'إضافة عنصر',
    placeOrder:          'تأكيد الطلب',
    placingOrder:        'جاري تسجيل الطلب...',
    pending:             'قيد الانتظار',
    prepared:            'جاهز',
    soldStatus:          'مباع',
    markPrepared:        'تجهيز',
    markSold:            'تأكيد البيع',
    revertPending:       'إعادة للانتظار',
    revertPrepared:      'إعادة للتجهيز',
    deleteOrder:         'حذف الطلب',
    editOrder:           'تعديل الطلب',
    printInvoice:        'طباعة الفاتورة',
    noOrdersYet:         'لا توجد طلبات حتى الآن.',
    stockWarning:        'تحذير: المخزون منخفض',

    // Settings
    globalConfig:        'الإعدادات العامة',
    fineTune:            'ضبط المعاملات الرياضية لتوسيع نطاق المنصة بالكامل',
    applySettings:       'تطبيق الإعدادات الرئيسية',
    savedToCloud:        'تم الحفظ على السحابة!',
    saveFailed:          'فشل الحفظ — أعد المحاولة',
    financialMargins:    'الهوامش المالية والتعبئة',
    packagingConstant:   'ثابت التغليف الأساسي (جنيه)',
    profitTarget:        'هدف الربح',
    reinvestmentFund:    'صندوق إعادة الاستثمار',
    volumeMatrix:        'مصفوفة قيود الحجم',
    orderPricingRules:   'قواعد تسعير الطلبات',
    marketingCost:       'تكلفة التسويق (ثابتة)',
    stickerCost:         'تكلفة الملصق (ثابتة)',
    targetCostPct:       'نسبة التكلفة المستهدفة',
    bottlePresets:       'خيارات الزجاجات المحددة مسبقًا',
    oilPresets:          'خيارات الزيوت المحددة مسبقًا',
    formatSystem:        'تهيئة نظام الطلبات',
    formatDesc:          'يمسح جميع بيانات الطلبات من قاعدة البيانات',

    // General
    save:                'حفظ',
    cancel:              'إلغاء',
    loading:             'جاري التحميل...',
    error:               'خطأ',
    notAvailable:        'غير متاح',
    notEnoughData:       'بيانات غير كافية',
    financialOverview:   'لمحة مالية مبنية على المبيعات المكتملة',
    egp:                 'جنيه',
    quantity:            'الكمية',
    size:                'الحجم',
    perfume:             'العطر',
    bottle:              'الزجاجة',
    discount:            'خصم',
    suggestedPrice:      'السعر المقترح',
    liveMarginLabel:     'الهامش الحي',
    totalOrder:          'إجمالي قيمة الطلب',
  }
} as const;

export type TranslationKey = keyof typeof translations['en'];

interface LanguageContextType {
  lang: Language;
  language: Language;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  language: 'en',
  toggleLang: () => {},
  t: (key) => key,
  isRTL: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('wanas_lang') as Language) || 'en';
  });

  const isRTL = lang === 'ar';

  useEffect(() => {
    localStorage.setItem('wanas_lang', lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (isRTL) {
      document.documentElement.classList.add('font-cairo');
    } else {
      document.documentElement.classList.remove('font-cairo');
    }
  }, [lang, isRTL]);

  const toggleLang = () => setLang(prev => prev === 'en' ? 'ar' : 'en');

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return (
    <LanguageContext.Provider value={{ lang, language: lang, toggleLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
