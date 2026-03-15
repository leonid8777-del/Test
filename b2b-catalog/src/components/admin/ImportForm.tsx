'use client';

import { useState } from 'react';
import { Upload, FileText, Eye, Check, Edit3 } from 'lucide-react';
import { parseMultipleOffers, type ParsedOffer } from '@/lib/whatsapp-parser';
import type { Category, UnitType, ConditionCode, Currency } from '@/types/database';

interface ImportFormProps {
  categories: Category[];
  onPublish?: (offers: ParsedOffer[]) => void;
}

const unitOptions: UnitType[] = ['kg', 'Stück', 'Palette', 'Posten', 'Set'];
const conditionOptions: ConditionCode[] = ['A', 'B', 'C', 'D'];
const currencyOptions: Currency[] = ['EUR', 'USD'];

export function ImportForm({ categories, onPublish }: ImportFormProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedOffer[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleParse = () => {
    const offers = parseMultipleOffers(rawText);
    setParsed(offers);
    setStep('review');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const updateOffer = (index: number, field: keyof ParsedOffer, value: unknown) => {
    setParsed(prev =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    );
  };

  const handlePublish = () => {
    onPublish?.(parsed);
  };

  if (step === 'review') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {parsed.length} Angebot{parsed.length !== 1 ? 'e' : ''} erkannt
          </h2>
          <button
            onClick={() => setStep('input')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Zurück
          </button>
        </div>

        {parsed.map((offer, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{offer.title}</h3>
              <button
                onClick={() => setEditIndex(editIndex === idx ? null : idx)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {editIndex === idx ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs text-gray-500">Titel</label>
                  <input
                    value={offer.title}
                    onChange={e => updateOffer(idx, 'title', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Marke</label>
                  <input
                    value={offer.brand}
                    onChange={e => updateOffer(idx, 'brand', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="col-span-full">
                  <label className="text-xs text-gray-500">Kurzbeschreibung</label>
                  <input
                    value={offer.short_description}
                    onChange={e => updateOffer(idx, 'short_description', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="col-span-full">
                  <label className="text-xs text-gray-500">Langbeschreibung</label>
                  <textarea
                    value={offer.long_description}
                    onChange={e => updateOffer(idx, 'long_description', e.target.value)}
                    rows={3}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Menge</label>
                  <input
                    type="number"
                    value={offer.quantity_total}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateOffer(idx, 'quantity_total', v);
                      updateOffer(idx, 'quantity_available', v);
                    }}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Einheit</label>
                  <select
                    value={offer.unit}
                    onChange={e => updateOffer(idx, 'unit', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  >
                    {unitOptions.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Preis/Einheit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={offer.price_per_unit}
                    onChange={e => updateOffer(idx, 'price_per_unit', parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Währung</label>
                  <select
                    value={offer.currency}
                    onChange={e => updateOffer(idx, 'currency', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  >
                    {currencyOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Zustand</label>
                  <select
                    value={offer.condition_code}
                    onChange={e => updateOffer(idx, 'condition_code', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  >
                    {conditionOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Kategorie</label>
                  <select
                    value={offer.category_slug}
                    onChange={e => updateOffer(idx, 'category_slug', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  >
                    <option value="">— Wählen —</option>
                    {categories.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name_de}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Volumen/Inhalt</label>
                  <input
                    value={offer.volume_text}
                    onChange={e => updateOffer(idx, 'volume_text', e.target.value)}
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Artikelnummern (kommagetrennt)</label>
                  <input
                    value={offer.article_numbers.join(', ')}
                    onChange={e =>
                      updateOffer(
                        idx,
                        'article_numbers',
                        e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full mt-0.5 px-2 py-1.5 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={offer.export_only}
                    onChange={e => updateOffer(idx, 'export_only', e.target.checked)}
                    className="rounded"
                  />
                  <label className="text-xs text-gray-500">Nur Export</label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Marke: <strong>{offer.brand || '—'}</strong></div>
                <div>Menge: <strong>{offer.quantity_total} {offer.unit}</strong></div>
                <div>Preis: <strong>{offer.price_per_unit.toFixed(2)} {offer.currency}</strong></div>
                <div>Zustand: <strong>{offer.condition_code}</strong></div>
                {offer.article_numbers.length > 0 && (
                  <div className="col-span-2">
                    Art.Nr: <strong>{offer.article_numbers.join(', ')}</strong>
                  </div>
                )}
                {offer.short_description && (
                  <div className="col-span-2 text-gray-500">{offer.short_description}</div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Image previews */}
        {images.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Hochgeladene Bilder ({images.length})</h3>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="w-16 h-16 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Upload ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handlePublish}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Als Entwurf speichern
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Angebot importieren</h2>
      <p className="text-sm text-gray-500">
        WhatsApp-Text einfügen und Bilder hochladen. Die Angebote werden automatisch erkannt.
      </p>

      <div>
        <label className="text-sm font-medium text-gray-700">WhatsApp Text</label>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={10}
          placeholder="Text hier einfügen..."
          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Bilder</label>
        <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-6 cursor-pointer hover:border-yellow-400 transition-colors">
          <Upload className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-500">Bilder auswählen</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((img, i) => (
              <div key={i} className="w-16 h-16 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                <img
                  src={URL.createObjectURL(img)}
                  alt={`Upload ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleParse}
        disabled={!rawText.trim()}
        className="w-full flex items-center justify-center gap-2 bg-[#F6B306] text-gray-900 font-medium py-3 rounded-lg hover:bg-yellow-500 disabled:opacity-50 transition-colors"
      >
        <Eye className="w-4 h-4" />
        Vorschau & Bearbeiten
      </button>
    </div>
  );
}
