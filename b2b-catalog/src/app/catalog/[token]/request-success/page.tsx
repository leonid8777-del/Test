'use client';

import { useParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { useI18n } from '@/i18n/context';

export default function RequestSuccessPage() {
  const params = useParams();
  const token = params.token as string;
  const { t } = useI18n();

  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t.inquiry.success}</h1>
      <p className="text-gray-500 mb-6">{t.inquiry.successMessage}</p>
      <a
        href={`/catalog/${token}`}
        className="inline-block px-6 py-2.5 bg-[#F6B306] text-gray-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors"
      >
        {t.inquiry.backToCatalog}
      </a>
    </div>
  );
}
