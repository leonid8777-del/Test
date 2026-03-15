'use client';

import { InquiryList } from '@/components/manager/InquiryList';

const sampleInquiries = [
  {
    id: 'inq-1',
    share_link_id: 'sl-1',
    manager_id: 'mgr-1',
    customer_name: 'Hans Schmidt',
    customer_email: 'hans@schmidt-gmbh.de',
    customer_phone: '+49 171 1234567',
    customer_company: 'Schmidt GmbH',
    message: 'Wir haben Interesse an den Barilla Spaghetti und der Milka Schokolade. Bitte um Preisvorschlag für größere Mengen.',
    status: 'new' as const,
    created_at: '2024-03-15T10:30:00Z',
    items: [
      {
        id: 'ii-1',
        inquiry_id: 'inq-1',
        offer_id: 'offer-1',
        requested_quantity: 2000,
        unit: 'Stück' as const,
        price_per_unit: 0.89,
        offer: { title: 'Barilla Spaghetti No.5 500g' } as any,
      },
      {
        id: 'ii-2',
        inquiry_id: 'inq-1',
        offer_id: 'offer-3',
        requested_quantity: 5000,
        unit: 'Stück' as const,
        price_per_unit: 0.59,
        offer: { title: 'Milka Alpenmilch Schokolade 100g' } as any,
      },
    ],
  },
  {
    id: 'inq-2',
    share_link_id: 'sl-1',
    manager_id: 'mgr-1',
    customer_name: 'John Williams',
    customer_email: 'john@exporttrading.co.uk',
    customer_phone: '+44 20 7946 0958',
    customer_company: 'Export Trading Ltd.',
    message: 'We are interested in the Persil detergent for our Eastern European market.',
    status: 'in_progress' as const,
    created_at: '2024-03-14T14:00:00Z',
    items: [
      {
        id: 'ii-3',
        inquiry_id: 'inq-2',
        offer_id: 'offer-4',
        requested_quantity: 1000,
        unit: 'Stück' as const,
        price_per_unit: 3.49,
        offer: { title: 'Persil Universal Megaperls 23WL' } as any,
      },
    ],
  },
];

export default function InquiriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Anfragen</h1>
      <InquiryList inquiries={sampleInquiries} />
    </div>
  );
}
