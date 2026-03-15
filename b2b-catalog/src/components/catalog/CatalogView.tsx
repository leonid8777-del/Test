'use client';

import { useState, useMemo } from 'react';
import { OfferCard } from './OfferCard';
import { OfferDetail } from './OfferDetail';
import { FilterBar } from '@/components/ui/FilterBar';
import { useI18n } from '@/i18n/context';
import type { Offer, Category, OfferImage, OfferArticleNumber } from '@/types/database';

type OfferWithRelations = Offer & {
  category?: Category;
  images?: OfferImage[];
  article_numbers?: OfferArticleNumber[];
};

interface CatalogViewProps {
  offers: OfferWithRelations[];
  categories: Category[];
  showInternalFields?: boolean;
}

export function CatalogView({ offers, categories, showInternalFields = false }: CatalogViewProps) {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return offers.filter(offer => {
      if (selectedCategory && offer.category_id !== selectedCategory) return false;
      if (selectedCondition && offer.condition_code !== selectedCondition) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = offer.title.toLowerCase().includes(q);
        const matchBrand = offer.brand.toLowerCase().includes(q);
        const matchDesc = offer.short_description.toLowerCase().includes(q);
        const matchArticle = offer.article_numbers?.some(an =>
          an.article_number.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchBrand && !matchDesc && !matchArticle) return false;
      }
      return true;
    });
  }, [offers, selectedCategory, selectedCondition, searchQuery]);

  const selectedOffer = selectedOfferId
    ? offers.find(o => o.id === selectedOfferId)
    : null;

  if (selectedOffer) {
    return (
      <OfferDetail
        offer={selectedOffer}
        showInternalFields={showInternalFields}
        onBack={() => setSelectedOfferId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        selectedCondition={selectedCondition}
        searchQuery={searchQuery}
        onCategoryChange={setSelectedCategory}
        onConditionChange={setSelectedCondition}
        onSearchChange={setSearchQuery}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t.catalog.noResults}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              showInternalFields={showInternalFields}
              onViewDetails={setSelectedOfferId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
