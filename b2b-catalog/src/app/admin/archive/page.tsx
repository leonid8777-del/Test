'use client';

import { OfferManager } from '@/components/admin/OfferManager';
import { sampleOffers } from '@/lib/sample-data';

// In a real app, fetch archived offers from DB
const archivedOffers = sampleOffers
  .filter(o => o.status === 'sold_out' || o.status === 'archived')
  .map(o => ({ ...o, status: 'archived' as const }));

// If none, show all as demo
const displayOffers = archivedOffers.length > 0 ? archivedOffers : [];

export default function ArchivePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Archiv</h1>
      <p className="text-sm text-gray-500">
        Ausverkaufte und archivierte Angebote. Diese sind nur für Manager und Admins sichtbar.
      </p>
      {displayOffers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Keine archivierten Angebote.</div>
      ) : (
        <OfferManager offers={displayOffers} />
      )}
    </div>
  );
}
