'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { sampleOffers, sampleCategories } from '@/lib/sample-data';

export default function EditOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offer = sampleOffers.find(o => o.id === params.id);

  if (!offer) {
    return <div className="text-center py-16 text-gray-400">Angebot nicht gefunden.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </button>

      <h1 className="text-xl font-bold text-gray-900">Angebot bearbeiten</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Titel</label>
          <input
            defaultValue={offer.title}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Marke</label>
            <input
              defaultValue={offer.brand}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Kategorie</label>
            <select
              defaultValue={offer.category_id}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {sampleCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name_de}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Kurzbeschreibung</label>
          <input
            defaultValue={offer.short_description}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Langbeschreibung</label>
          <textarea
            defaultValue={offer.long_description}
            rows={4}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Preis/Einheit</label>
            <input
              type="number"
              step="0.01"
              defaultValue={offer.price_per_unit}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Min. intern</label>
            <input
              type="number"
              step="0.01"
              defaultValue={offer.min_price_internal}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Einheit</label>
            <select
              defaultValue={offer.unit}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="kg">kg</option>
              <option value="Stück">Stück</option>
              <option value="Palette">Palette</option>
              <option value="Posten">Posten</option>
              <option value="Set">Set</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Gesamtmenge</label>
            <input
              type="number"
              defaultValue={offer.quantity_total}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Verfügbar</label>
            <input
              type="number"
              defaultValue={offer.quantity_available}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Zustand</label>
            <select
              defaultValue={offer.condition_code}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="A">A - Neu</option>
              <option value="B">B - B-Ware</option>
              <option value="C">C - C-Ware</option>
              <option value="D">D - Beschädigt</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              defaultValue={offer.status}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="draft">Entwurf</option>
              <option value="active">Aktiv</option>
              <option value="partially_sold">Teilweise verkauft</option>
              <option value="sold_out">Ausverkauft</option>
              <option value="archived">Archiviert</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={offer.public_visible} className="rounded" />
            Öffentlich sichtbar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={offer.export_only} className="rounded" />
            Nur Export
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={offer.in_stock} className="rounded" />
            Auf Lager
          </label>
        </div>

        <button
          onClick={() => {
            alert('Angebot gespeichert (Demo)');
            router.push('/admin/offers');
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#F6B306] text-gray-900 font-medium py-2.5 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          <Save className="w-4 h-4" />
          Speichern
        </button>
      </div>
    </div>
  );
}
