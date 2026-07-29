/**
 * invoicePDF.ts
 *
 * Generates a PDF invoice by:
 * 1. Building the invoice HTML with explicit inline styles (no Tailwind dependency)
 * 2. Injecting it into a visible, off-screen container
 * 3. Using html2canvas to take a high-fidelity screenshot
 * 4. Embedding the canvas image into a jsPDF A4 document
 *
 * This approach guarantees correct Arabic RTL rendering because html2canvas
 * captures what the browser actually paints — fonts, direction, and layout included.
 */

import { jsPDF } from 'jspdf';
import { Order } from '../types';

/** Returns a Blob containing the PDF for the given order */
export async function generateInvoicePDFFromElement(
  _element: HTMLDivElement,
  order: Order
): Promise<Blob> {
  return generateInvoicePDF(order);
}

export async function generateInvoicePDF(order: Order): Promise<Blob> {
  // ── 1. Build the invoice HTML string ────────────────────────────────────
  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const orderId = '#' + (order.id?.split('-')[0] || '------').toUpperCase();
  const dateStr = formatDate(order.createdAt);
  const statusLabel =
    order.status === 'Sold'     ? 'تم البيع'
    : order.status === 'Prepared' ? 'جاهز'
    : 'قيد الانتظار';

  const itemRows = (order.items && Array.isArray(order.items) ? order.items : [])
    .map((item, i) => {
      const lineTotal = Math.round((item.unitPrice || 0) * (item.quantity || 1)).toString();
      const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      const mixBadge = item.isMix
        ? `<div style="font-size:10px;color:#7c3aed;font-weight:700;margin-top:2px;">تركيبة خاصة</div>`
        : '';
      return `
        <tr>
          <td style="padding:16px 20px;background:${bg};border-bottom:1px solid #f1f5f9;text-align:right;">
            <div style="font-weight:700;color:#111827;">${item.perfumeName || '—'}</div>
            ${mixBadge}
          </td>
          <td style="padding:16px 20px;background:${bg};border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:#6b7280;">${item.size || '—'}</td>
          <td style="padding:16px 20px;background:${bg};border-bottom:1px solid #f1f5f9;text-align:center;font-weight:700;color:#111827;">${item.quantity || 1}</td>
          <td style="padding:16px 20px;background:${bg};border-bottom:1px solid #f1f5f9;text-align:left;font-weight:900;color:#111827;">${lineTotal} ج.م</td>
        </tr>`;
    })
    .join('');

  const html = `
    <div style="
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
      direction: rtl;
      padding: 48px;
      box-sizing: border-box;
      color: #111827;
      display: flex;
      flex-direction: column;
    ">
      <!-- HEADER -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 24px;
        margin-bottom: 32px;
      ">
        <!-- Brand left (in RTL = right side visually) -->
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="
            background:#1e293b;
            border-radius:12px;
            width:64px;
            height:64px;
            display:flex;
            align-items:center;
            justify-content:center;
            overflow:hidden;
          ">
            <span style="color:#f59e0b;font-size:24px;font-weight:900;">و</span>
          </div>
          <div>
            <div style="font-size:24px;font-weight:900;color:#111827;">ونس للعطور</div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">WANAS PERFUMES</div>
          </div>
        </div>
        <!-- Invoice label right (in RTL = left side visually) -->
        <div style="text-align:left;">
          <div style="font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-1px;">فاتورة بيع</div>
          <div style="font-size:13px;font-weight:700;color:#64748b;">رقم الفاتورة: ${orderId}</div>
        </div>
      </div>

      <!-- CLIENT + ORDER INFO -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px;">
        <!-- Client info -->
        <div>
          <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:12px;">بيانات العميل</div>
          <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:4px;">${order.clientName || '—'}</div>
          <div style="font-size:14px;color:#475569;font-weight:500;">${order.phone || '—'}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">${order.address || '—'}</div>
        </div>
        <!-- Order details -->
        <div style="text-align:left;">
          <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:12px;">تفاصيل الطلب</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:6px;">
            التاريخ: <span style="color:#1e293b;font-weight:700;">${dateStr}</span>
          </div>
          <div style="font-size:13px;color:#64748b;">
            الحالة: <span style="color:#1e293b;font-weight:700;">${statusLabel}</span>
          </div>
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:40px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:14px 20px;text-align:right;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">الصنف</th>
            <th style="padding:14px 20px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">الحجم</th>
            <th style="padding:14px 20px;text-align:center;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">الكمية</th>
            <th style="padding:14px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">السعر الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="4" style="padding:24px;text-align:center;color:#94a3b8;">—</td></tr>`}
        </tbody>
      </table>

      <!-- TOTALS BOX -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:64px;padding:0 16px;">
        <div style="width:320px;background:#f9fafb;padding:24px;border-radius:16px;border:1px solid #f1f5f9;">
          <div style="display:flex;justify-content:space-between;align-items:center;color:#4b5563;font-weight:700;font-size:14px;margin-bottom:16px;">
            <span>المجموع:</span>
            <span>${Math.round(order.totalOrderValue)} ج.م</span>
          </div>
          <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:18px;font-weight:700;color:#111827;">الإجمالي:</span>
            <span style="font-size:22px;font-weight:900;color:#111827;">${Math.round(order.totalOrderValue)} ج.م</span>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top:auto;padding-top:24px;border-top:1px solid #f1f5f9;text-align:center;">
        <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:8px;">شكراً لاختيارك ونس للعطور</div>
        <div style="font-size:12px;color:#94a3b8;font-style:italic;">Wanas Perfumes - Where elegance meets scent.</div>
        <div style="display:flex;justify-content:center;gap:32px;margin-top:20px;">
          <div style="font-size:9px;color:#cbd5e1;font-weight:700;text-transform:uppercase;letter-spacing:2px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;background:#e2e8f0;border-radius:50%;display:inline-block;"></span>
            Official Invoice
          </div>
          <div style="font-size:9px;color:#cbd5e1;font-weight:700;text-transform:uppercase;letter-spacing:2px;display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;background:#e2e8f0;border-radius:50%;display:inline-block;"></span>
            No Return After Use
          </div>
        </div>
      </div>
    </div>
  `;

  // ── 2. Create a visible off-screen container ─────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: -9999px;
    width: 794px;
    background: #ffffff;
    z-index: -1;
    pointer-events: none;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  // ── 3. Load Cairo font (already in the page) and wait for layout ─────────
  await document.fonts.ready;
  // Extra delay for images and full paint
  await new Promise(resolve => setTimeout(resolve, 350));

  // ── 4. Capture with html2canvas ──────────────────────────────────────────
  let blob: Blob;
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
    });

    // ── 5. Embed canvas into jsPDF ───────────────────────────────────────────
    const imgData   = canvas.toDataURL('image/png', 1.0);
    const pageW     = 210;  // A4 mm
    const pageH     = 297;
    const pxRatio   = pageW / canvas.width;
    const imgHeight = canvas.height * pxRatio;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    let yOffset   = 0;
    let remaining = imgHeight;

    while (remaining > 0) {
      if (yOffset > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', 0, -yOffset, pageW, imgHeight);
      yOffset   += pageH;
      remaining -= pageH;
    }

    blob = doc.output('blob');
  } finally {
    // ── 6. Always clean up the injected container ────────────────────────────
    document.body.removeChild(container);
  }

  return blob;
}

export function getInvoiceFileName(order: Order): string {
  const clientSlug = (order.clientName || 'client')
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0600-\u06FF-]/g, '');
  const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
  return `Wanas_Invoice_${clientSlug}_${dateStr}.pdf`;
}
