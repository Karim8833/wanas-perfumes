import logo from '../assets/logo.png';
import React from 'react';
import { Order } from '../types';

interface InvoiceTemplateProps {
  order: Order;
}

const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ order }, ref) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={ref}
      dir="rtl"
      className="p-8 bg-white text-slate-900 w-full print:w-[210mm] print:max-w-none mx-auto font-sans"
      style={{ fontFamily: "'Inter', 'Arial', sans-serif" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-sm">
            <img
              src={logo}
              alt="Wanas Logo"
              className="w-16 h-16 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ونس للعطور</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Wanas Perfumes</p>
          </div>
        </div>
        <div className="text-left">
          <h2 className="text-3xl font-black text-slate-200 uppercase tracking-tighter">فاتورة بيع</h2>
          <p className="text-slate-500 font-bold">رقم الفاتورة: #{order.id?.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">بيانات العميل</h3>
          <p className="text-lg font-bold text-slate-800 mb-1">{order.clientName}</p>
          <p className="text-slate-600 font-medium">{order.phone || '—'}</p>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">{order.address || '—'}</p>
        </div>
        <div className="text-left">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1 text-left">تفاصيل الطلب</h3>
          <div className="space-y-1">
            <p className="text-sm text-slate-500">التاريخ: <span className="text-slate-800 font-bold">{formatDate(order.createdAt)}</span></p>
            <p className="text-sm text-slate-500">الحالة: <span className="text-slate-800 font-bold">{order.status === 'Sold' ? 'تم البيع' : 'جاهز'}</span></p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-10 text-right overflow-hidden rounded-xl border-collapse">
        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 border-b border-slate-200">الصنف</th>
            <th className="px-6 py-4 border-b border-slate-200 text-center">الحجم</th>
            <th className="px-6 py-4 border-b border-slate-200 text-center">الكمية</th>
            <th className="px-6 py-4 border-b border-slate-200 text-left">السعر الإجمالي</th>
          </tr>
        </thead>
        <tbody className="text-slate-700 font-medium">
          {order.items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td className="px-6 py-5">
                <p className="font-bold text-slate-900">{item.perfumeName}</p>
                {item.isMix && (
                  <p className="text-[10px] text-purple-600 font-bold mt-0.5">تركيبة خاصة</p>
                )}
                {item.isMakhamria && (
                  <p className="text-[10px] text-rose-600 font-bold mt-0.5">مخمرية (Makhamria)</p>
                )}
                {item.premiumBox && (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">مع علبة مميزة (Premium Box)</p>
                )}
              </td>
              <td className="px-6 py-5 text-center font-bold text-slate-500">{item.isMakhamria ? 'عدد (Pcs)' : item.size}</td>
              <td className="px-6 py-5 text-center font-bold text-slate-900">{item.quantity}</td>
              <td className="px-6 py-5 text-left font-black text-slate-900">{Math.round(item.unitPrice * item.quantity)} ج.م</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-16 px-4">
        <div className="w-80 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center text-gray-600 font-bold text-sm mb-4">
            <span>المجموع:</span>
            <span className="whitespace-nowrap">{Math.round(order.totalOrderValue)} ج.م</span>
          </div>
          <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between items-center text-gray-900">
            <span className="text-xl font-bold">الإجمالي:</span>
            <span className="text-2xl font-bold whitespace-nowrap">{Math.round(order.totalOrderValue)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 border-t border-slate-100 text-center">
        <p className="text-slate-900 font-black text-xl mb-2">شكراً لاختيارك ونس للعطور</p>
        <p className="text-slate-400 text-sm font-medium italic">Wanas Perfumes - Where elegance meets scent.</p>

        <div className="flex justify-center gap-8 mt-6">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
            Official Invoice
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
            No Return After Use
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;
