import type { CartItem } from '@/types/database';

interface InquiryData {
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  items: CartItem[];
  language: 'de' | 'en' | 'ru';
}

const templates = {
  de: {
    greeting: 'Neue Anfrage von',
    company: 'Firma',
    email: 'E-Mail',
    phone: 'Telefon',
    items: 'Angefragte Artikel',
    qty: 'Menge',
    price: 'Preis/Einheit',
    message: 'Nachricht',
    total: 'Gesamtpositionen',
  },
  en: {
    greeting: 'New inquiry from',
    company: 'Company',
    email: 'Email',
    phone: 'Phone',
    items: 'Requested items',
    qty: 'Quantity',
    price: 'Price/unit',
    message: 'Message',
    total: 'Total items',
  },
  ru: {
    greeting: 'Новый запрос от',
    company: 'Компания',
    email: 'Эл. почта',
    phone: 'Телефон',
    items: 'Запрошенные товары',
    qty: 'Количество',
    price: 'Цена/ед.',
    message: 'Сообщение',
    total: 'Всего позиций',
  },
};

export function buildWhatsAppMessage(data: InquiryData): string {
  const t = templates[data.language];

  let msg = `📋 *${t.greeting} ${data.customerName}*\n`;
  msg += `${t.company}: ${data.customerCompany}\n`;
  msg += `${t.email}: ${data.customerEmail}\n`;
  msg += `${t.phone}: ${data.customerPhone}\n\n`;

  msg += `*${t.items}:*\n`;
  data.items.forEach((item, i) => {
    msg += `${i + 1}. ${item.offer.title}\n`;
    msg += `   ${t.qty}: ${item.quantity} ${item.offer.unit}\n`;
    msg += `   ${t.price}: ${item.offer.price_per_unit.toFixed(2)} ${item.offer.currency}\n`;
    if (item.offer.article_numbers?.[0]) {
      msg += `   Art.Nr: ${item.offer.article_numbers[0].article_number}\n`;
    }
    msg += '\n';
  });

  msg += `${t.total}: ${data.items.length}\n`;

  if (data.message) {
    msg += `\n${t.message}: ${data.message}`;
  }

  return msg;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
