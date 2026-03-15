'use client';

import { useState } from 'react';
import { Eye, EyeOff, Archive, Edit3, Trash2, Search } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { Offer, Category, OfferImage, OfferArticleNumber } from '@/types/database';

type OfferWithRelations = Offer & {
  category?: Category;
  images?: OfferImage[];
  article_numbers?: OfferArticleNumber[];
};

interface OfferManagerProps {
  offers: OfferWithRelations[];
  onToggleVisibility?: (id: string, visible: boolean) => void;
  onArchive?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  partially_sold: 'bg-yellow-100 text-yellow-700',
  sold_out: 'bg-red-100 text-red-700',
  archived: 'bg-gray-200 text-gray-500',
};

export function OfferManager({ offers, onToggleVisibility, onArchive, onEdit, onDelete }: OfferManagerProps) {
  const [search, setSearch] = useState('');

  const filtered = offers.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      o.brand.toLowerCase().includes(q) ||
      o.article_numbers?.some(an => an.article_number.includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Angebote suchen..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div className="text-sm text-gray-500">{filtered.length} Angebote</div>

      <div className="space-y-2">
        {filtered.map(offer => (
          <div
            key={offer.id}
            className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm text-gray-900 truncate">{offer.title}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[offer.status]}`}>
                  {offer.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {offer.brand && <Chip label={offer.brand} variant="category" />}
                <Chip label={offer.condition_code} variant="condition" />
                <Chip label={`${offer.quantity_available}/${offer.quantity_total} ${offer.unit}`} variant="unit" />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {offer.price_per_unit.toFixed(2)} {offer.currency}/{offer.unit}
                {' · '}Min: {offer.min_price_internal.toFixed(2)} {offer.currency}
                {offer.export_only && ' · Export only'}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleVisibility?.(offer.id, !offer.public_visible)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                title={offer.public_visible ? 'Ausblenden' : 'Veröffentlichen'}
              >
                {offer.public_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit?.(offer.id)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                title="Bearbeiten"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onArchive?.(offer.id)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                title="Archivieren"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
