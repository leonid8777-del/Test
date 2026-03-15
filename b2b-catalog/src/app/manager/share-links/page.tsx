'use client';

import { ShareLinkManager } from '@/components/manager/ShareLinkManager';
import { sampleCategories } from '@/lib/sample-data';

const sampleLinks = [
  {
    id: 'sl-1',
    token: 'demo',
    manager_id: 'mgr-1',
    label: 'Demo Katalog (alle Kategorien)',
    filters: {},
    default_language: 'de' as const,
    active: true,
    created_at: '2024-03-01',
  },
  {
    id: 'sl-2',
    token: 'food-en-abc123',
    manager_id: 'mgr-1',
    label: 'UK Client - Food only',
    filters: { category_ids: ['cat-1', 'cat-2', 'cat-3'] },
    default_language: 'en' as const,
    active: true,
    created_at: '2024-03-05',
  },
  {
    id: 'sl-3',
    token: 'export-ru-xyz789',
    manager_id: 'mgr-1',
    label: 'Russischer Kunde - Export',
    filters: { export_only: true },
    default_language: 'ru' as const,
    active: true,
    created_at: '2024-03-08',
  },
];

export default function ShareLinksPage() {
  return <ShareLinkManager links={sampleLinks} categories={sampleCategories} />;
}
