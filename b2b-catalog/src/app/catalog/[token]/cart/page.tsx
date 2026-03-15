'use client';

import { useParams, useRouter } from 'next/navigation';
import { CartView } from '@/components/catalog/CartView';

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  return (
    <CartView
      token={token}
      onInquirySent={() => router.push(`/catalog/${token}/request-success`)}
    />
  );
}
