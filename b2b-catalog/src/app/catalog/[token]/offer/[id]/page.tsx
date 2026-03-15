'use client';

import { useParams, useRouter } from 'next/navigation';
import { OfferDetail } from '@/components/catalog/OfferDetail';
import { sampleOffers } from '@/lib/sample-data';

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const id = params.id as string;

  const offer = sampleOffers.find(o => o.id === id);

  if (!offer) {
    return (
      <div className="text-center py-16 text-gray-400">
        Angebot nicht gefunden.
      </div>
    );
  }

  return (
    <OfferDetail
      offer={offer}
      onBack={() => router.push(`/catalog/${token}`)}
    />
  );
}
