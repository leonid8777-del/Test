'use client';

import { useState } from 'react';
import { Trash2, ShoppingCart, ArrowLeft, Send } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useI18n } from '@/i18n/context';
import { buildWhatsAppMessage, buildWhatsAppUrl } from '@/lib/whatsapp-message';
import type { Language } from '@/types/database';

interface CartViewProps {
  token: string;
  managerPhone?: string;
  onInquirySent?: () => void;
}

export function CartView({ token, managerPhone = '+491234567890', onInquirySent }: CartViewProps) {
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const { t, lang } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Build WhatsApp message
    const waMessage = buildWhatsAppMessage({
      customerName: form.name,
      customerCompany: form.company,
      customerEmail: form.email,
      customerPhone: form.phone,
      message: form.message,
      items,
      language: lang as Language,
    });

    // Open WhatsApp
    const waUrl = buildWhatsAppUrl(managerPhone, waMessage);
    window.open(waUrl, '_blank');

    // Clear cart and navigate
    clearCart();
    setSending(false);
    onInquirySent?.();
  };

  if (items.length === 0 && !showForm) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t.cart.empty}</p>
        <a
          href={`/catalog/${token}`}
          className="inline-block mt-4 text-sm text-blue-600 hover:underline"
        >
          {t.cart.continueBrowsing}
        </a>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.common.back}
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-4">{t.inquiry.title}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">{t.inquiry.name} *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">{t.inquiry.company} *</label>
            <input
              type="text"
              required
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">{t.inquiry.email} *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">{t.inquiry.phone}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">{t.inquiry.message}</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            {items.map(item => (
              <div key={item.offer.id} className="flex justify-between">
                <span className="text-gray-700">{item.offer.title}</span>
                <span className="text-gray-500">
                  {item.quantity} {item.offer.unit} × {item.offer.price_per_unit.toFixed(2)}{' '}
                  {item.offer.currency}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 font-medium">
              {items.length} {t.cart.items}
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            {t.inquiry.sendViaWhatsApp}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{t.cart.title}</h2>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.offer.id}
            className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-gray-900 truncate">{item.offer.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.offer.price_per_unit.toFixed(2)} {item.offer.currency} / {item.offer.unit}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-400">{t.cart.requestedQty}:</label>
                <input
                  type="number"
                  min={1}
                  max={item.offer.quantity_available}
                  value={item.quantity}
                  onChange={e =>
                    updateQuantity(item.offer.id, parseInt(e.target.value) || 1)
                  }
                  className="w-16 text-sm px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <span className="text-xs text-gray-400">{item.offer.unit}</span>
              </div>
            </div>
            <button
              onClick={() => removeItem(item.offer.id)}
              className="text-red-400 hover:text-red-600 self-start"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <a
          href={`/catalog/${token}`}
          className="flex-1 text-center text-sm font-medium py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {t.cart.continueBrowsing}
        </a>
        <button
          onClick={() => setShowForm(true)}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 bg-[#F6B306] text-gray-900 rounded-lg hover:bg-yellow-500"
        >
          <Send className="w-4 h-4" />
          {t.cart.sendInquiry}
        </button>
      </div>
    </div>
  );
}
