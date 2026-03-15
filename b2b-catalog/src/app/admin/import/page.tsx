'use client';

import { ImportForm } from '@/components/admin/ImportForm';
import { sampleCategories } from '@/lib/sample-data';

export default function ImportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <ImportForm
        categories={sampleCategories}
        onPublish={(offers) => {
          alert(`${offers.length} Angebot(e) als Entwurf gespeichert!`);
        }}
      />
    </div>
  );
}
