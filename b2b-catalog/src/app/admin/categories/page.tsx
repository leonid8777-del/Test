'use client';

import { useState } from 'react';
import { Plus, Edit3, Trash2, GripVertical } from 'lucide-react';
import { sampleCategories } from '@/lib/sample-data';
import type { Category } from '@/types/database';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(sampleCategories);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState({ name_de: '', name_en: '', name_ru: '', slug: '' });

  const handleAdd = () => {
    if (!newCat.name_de || !newCat.slug) return;
    const cat: Category = {
      id: `cat-${Date.now()}`,
      ...newCat,
      sort_order: categories.length + 1,
      created_at: new Date().toISOString(),
    };
    setCategories([...categories, cat]);
    setNewCat({ name_de: '', name_en: '', name_ru: '', slug: '' });
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Kategorien</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-[#F6B306] text-gray-900 rounded-lg hover:bg-yellow-500"
        >
          <Plus className="w-4 h-4" />
          Neue Kategorie
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Name (DE) *</label>
              <input
                value={newCat.name_de}
                onChange={e => setNewCat(c => ({ ...c, name_de: e.target.value }))}
                className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Slug *</label>
              <input
                value={newCat.slug}
                onChange={e => setNewCat(c => ({ ...c, slug: e.target.value }))}
                className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Name (EN)</label>
              <input
                value={newCat.name_en}
                onChange={e => setNewCat(c => ({ ...c, name_en: e.target.value }))}
                className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Name (RU)</label>
              <input
                value={newCat.name_ru}
                onChange={e => setNewCat(c => ({ ...c, name_ru: e.target.value }))}
                className="w-full mt-0.5 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-sm font-medium px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Speichern
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3"
          >
            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900">{cat.name_de}</div>
              <div className="text-xs text-gray-400">
                EN: {cat.name_en || '—'} · RU: {cat.name_ru || '—'} · /{cat.slug}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 rounded hover:bg-gray-100 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
