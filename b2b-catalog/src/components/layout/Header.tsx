'use client';

import Link from 'next/link';
import { ShoppingCart, Globe } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useI18n } from '@/i18n/context';
import type { Language } from '@/i18n/translations';

interface HeaderProps {
  token?: string;
  showCart?: boolean;
  showLangSwitcher?: boolean;
}

const langLabels: Record<Language, string> = {
  de: 'DE',
  en: 'EN',
  ru: 'RU',
};

export function Header({ token, showCart = true, showLangSwitcher = true }: HeaderProps) {
  const { itemCount } = useCart();
  const { lang, setLang } = useI18n();

  return (
    <header className="sticky top-0 z-50 bg-[#F6B306] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={token ? `/catalog/${token}` : '/'}
          className="text-lg font-bold text-gray-900 tracking-tight"
        >
          Angebotskatalog
        </Link>

        <div className="flex items-center gap-3">
          {showLangSwitcher && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4 text-gray-700" />
              {(Object.keys(langLabels) as Language[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    lang === l
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-yellow-400'
                  }`}
                >
                  {langLabels[l]}
                </button>
              ))}
            </div>
          )}

          {showCart && token && (
            <Link
              href={`/catalog/${token}/cart`}
              className="relative flex items-center gap-1 text-gray-900 hover:text-gray-700"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-gray-900 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
