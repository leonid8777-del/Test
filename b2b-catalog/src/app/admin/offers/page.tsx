'use client';

import { OfferManager } from '@/components/admin/OfferManager';
import { sampleOffers } from '@/lib/sample-data';

export default function OffersPage() {
  const activeOffers = sampleOffers.filter(o => o.status !== 'archived');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Angebote verwalten</h1>
      <OfferManager offers={activeOffers} />
    </div>
  );
}
