'use client';

import { CatalogView } from '@/components/catalog/CatalogView';
import { sampleOffers, sampleCategories } from '@/lib/sample-data';

export default function CatalogPage() {
  const publicOffers = sampleOffers.filter(
    o => o.public_visible && o.status !== 'archived' && o.status !== 'draft'
  );

  return <CatalogView offers={publicOffers} categories={sampleCategories} />;
}
