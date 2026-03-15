'use client';

import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { useI18n } from '@/i18n/context';
import { useCart } from '@/lib/cart-context';
import type { Offer, Category, OfferImage, OfferArticleNumber, Language } from '@/types/database';

type OfferWithRelations = Offer & {
  category?: Category;
  images?: OfferImage[];
  article_numbers?: OfferArticleNumber[];
};

interface OfferCardProps {
  offer: OfferWithRelations;
  showInternalFields?: boolean;
  onViewDetails?: (id: string) => void;
}

function getCategoryName(cat: Category | undefined, lang: Language): string {
  if (!cat) return '';
  const key = `name_${lang}` as keyof Category;
  return (cat[key] as string) || cat.name_de;
}

export function OfferCard({ offer, showInternalFields = false, onViewDetails }: OfferCardProps) {
  const { t, lang } = useI18n();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(offer, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const firstImage = offer.images?.[0]?.url;
  const firstArticle = offer.article_numbers?.[0]?.article_number;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div
        className="h-40 bg-gray-100 flex items-center justify-center cursor-pointer"
        onClick={() => onViewDetails?.(offer.id)}
      >
        {firstImage ? (
          <img src={firstImage} alt={offer.title} className="h-full w-full object-cover" />
        ) : (
          <Package className="w-12 h-12 text-gray-300" />
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Title */}
        <h3
          className="font-semibold text-sm text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
          onClick={() => onViewDetails?.(offer.id)}
        >
          {offer.title}
        </h3>

        {/* Chips */}
        <div className="flex flex-wrap gap-1">
          {offer.category && (
            <Chip label={getCategoryName(offer.category, lang)} variant="category" />
          )}
          <Chip label={t.conditions[offer.condition_code as keyof typeof t.conditions]} variant="condition" />
          <Chip label={offer.unit} variant="unit" />
          {offer.export_only && <Chip label={t.catalog.exportOnly} variant="export" />}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
          {firstArticle && (
            <div>
              <span className="text-gray-400">{t.catalog.articleNumber}</span>{' '}
              <span className="font-mono">{firstArticle}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">{t.catalog.quantity}:</span>{' '}
            {offer.quantity_available.toLocaleString()} {offer.unit}
          </div>
          {offer.brand && (
            <div>
              <span className="text-gray-400">{t.catalog.brand}:</span> {offer.brand}
            </div>
          )}
          {offer.volume_text && (
            <div className="col-span-2 text-gray-500">{offer.volume_text}</div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-gray-900">
            {offer.price_per_unit.toFixed(2)} {offer.currency}
          </span>
          <span className="text-xs text-gray-500">/ {offer.unit}</span>
        </div>

        {/* Internal fields */}
        {showInternalFields && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 space-y-1">
            <div>Min. intern: {offer.min_price_internal.toFixed(2)} {offer.currency}</div>
            <div>Lager: {offer.in_stock ? '✓ Ja' : '✗ Nein'}</div>
            <div>Status: {offer.status}</div>
          </div>
        )}

        {/* Add to cart */}
        {offer.status !== 'sold_out' && offer.status !== 'archived' && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              min={1}
              max={offer.quantity_available}
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-sm px-2 py-1.5 border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
            <button
              onClick={handleAdd}
              className={`flex-1 flex items-center justify-center gap-1 text-sm font-medium py-1.5 rounded transition-colors ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-[#F6B306] text-gray-900 hover:bg-yellow-500'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {added ? '✓' : t.catalog.addToCart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
