'use client';

import { I18nProvider } from '@/i18n/context';
import { CartProvider } from '@/lib/cart-context';
import { Header } from '@/components/layout/Header';
import { useParams } from 'next/navigation';
import type { Language } from '@/i18n/translations';

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const token = params.token as string;

  return (
    <I18nProvider defaultLang={'de' as Language}>
      <CartProvider>
        <div className="min-h-screen bg-gray-50">
          <Header token={token} />
          <main className="max-w-7xl mx-auto px-4 py-4">{children}</main>
        </div>
      </CartProvider>
    </I18nProvider>
  );
}
