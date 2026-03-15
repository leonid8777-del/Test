'use client';

import { useState } from 'react';
import { ArrowLeft, Package, Plus } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { useI18n } from '@/i18n/context';
import { useCart } from '@/lib/cart-context';
import type { Offer, Category, OfferImage, OfferArticleNumber, Language } from '@/types/database';

type OfferWithRelations = Offer & {
  category?: Category;
  images?: OfferImage[];
  article_numbers?: OfferArticleNumber[];
};

interface OfferDetailProps {
  offer: OfferWithRelations;
  showInternalFields?: boolean;
  onBack: () => void;
}

function getCategoryName(cat: Category | undefined, lang: Language): string {
  if (!cat) return '';
  const key = `name_${lang}` as keyof Category;
  return (cat[key] as string) || cat.name_de;
}

export function OfferDetail({ offer, showInternalFields = false, onBack }: OfferDetailProps) {
  const { t, lang } = useI18n();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(offer, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.catalog.backToCatalog}
      </button>

      {/* Image */}
      <div className="h-64 sm:h-80 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
        {offer.images?.[0]?.url ? (
          <img
            src={offer.images[0].url}
            alt={offer.title}
            className="h-full w-full object-cover rounded-lg"
          />
        ) : (
          <Package className="w-20 h-20 text-gray-300" />
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">{offer.title}</h1>

        <div className="flex flex-wrap gap-1.5">
          {offer.category && (
            <Chip label={getCategoryName(offer.category, lang)} variant="category" size="md" />
          )}
          <Chip
            label={t.conditions[offer.condition_code as keyof typeof t.conditions]}
            variant="condition"
            size="md"
          />
          <Chip label={offer.unit} variant="unit" size="md" />
          {offer.export_only && <Chip label={t.catalog.exportOnly} variant="export" size="md" />}
        </div>

        <p className="text-sm text-gray-600">{offer.short_description}</p>

        {offer.long_description && (
          <div className="text-sm text-gray-700 whitespace-pre-line border-t border-gray-100 pt-3">
            {offer.long_description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-100 pt-3">
          {offer.brand && (
            <div>
              <span className="text-gray-400">{t.catalog.brand}</span>
              <div className="font-medium">{offer.brand}</div>
            </div>
          )}
          <div>
            <span className="text-gray-400">{t.catalog.quantity}</span>
            <div className="font-medium">
              {offer.quantity_available.toLocaleString()} / {offer.quantity_total.toLocaleString()}{' '}
              {offer.unit} {t.catalog.available}
            </div>
          </div>
          {offer.volume_text && (
            <div className="col-span-2">
              <span className="text-gray-400">Volume</span>
              <div className="font-medium">{offer.volume_text}</div>
            </div>
          )}
          {offer.article_numbers && offer.article_numbers.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-400">{t.catalog.articleNumber}</span>
              <div className="font-mono text-sm">
                {offer.article_numbers.map(an => an.article_number).join(', ')}
              </div>
            </div>
          )}
        </div>

        {offer.quantity_available < offer.quantity_total && (
          <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
            {t.catalog.partialSale}
          </div>
        )}

        {/* Price + add */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {offer.price_per_unit.toFixed(2)} {offer.currency}
            </span>
            <span className="text-sm text-gray-500 ml-1">/ {offer.unit}</span>
          </div>
        </div>

        {showInternalFields && (
          <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1">
            <div className="font-semibold text-yellow-800">Interne Informationen</div>
            <div>Min. interner Preis: {offer.min_price_internal.toFixed(2)} {offer.currency}</div>
            <div>Auf Lager: {offer.in_stock ? '✓ Ja' : '✗ Nein'}</div>
            <div>Status: {offer.status}</div>
          </div>
        )}

        {offer.status !== 'sold_out' && offer.status !== 'archived' && (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={offer.quantity_available}
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleAdd}
              className={`flex-1 flex items-center justify-center gap-2 font-medium py-2.5 rounded-lg transition-colors ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-[#F6B306] text-gray-900 hover:bg-yellow-500'
              }`}
            >
              <Plus className="w-4 h-4" />
              {added ? '✓ Hinzugefügt' : t.catalog.addToCart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
