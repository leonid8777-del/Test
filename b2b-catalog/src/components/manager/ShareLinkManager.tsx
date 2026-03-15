'use client';

import { useState } from 'react';
import { Copy, Plus, Link2, ExternalLink, Trash2 } from 'lucide-react';
import type { ShareLink, Category, Language } from '@/types/database';

interface ShareLinkManagerProps {
  links: ShareLink[];
  categories: Category[];
  onCreateLink?: (link: Partial<ShareLink>) => void;
  onDeleteLink?: (id: string) => void;
}

export function ShareLinkManager({ links, categories, onCreateLink, onDeleteLink }: ShareLinkManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newLink, setNewLink] = useState({
    label: '',
    default_language: 'de' as Language,
    category_ids: [] as string[],
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/catalog/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = () => {
    onCreateLink?.({
      label: newLink.label,
      default_language: newLink.default_language,
      filters: { category_ids: newLink.category_ids.length > 0 ? newLink.category_ids : undefined },
    });
    setNewLink({ label: '', default_language: 'de', category_ids: [] });
    setShowCreate(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Share Links</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 bg-[#F6B306] text-gray-900 rounded-lg hover:bg-yellow-500"
        >
          <Plus className="w-4 h-4" />
          Neuer Link
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">Bezeichnung</label>
            <input
              value={newLink.label}
              onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
              placeholder="z.B. Kunde Müller - Food"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Sprache</label>
            <select
              value={newLink.default_language}
              onChange={e => setNewLink(l => ({ ...l, default_language: e.target.value as Language }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Kategorien filtern (optional)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setNewLink(l => ({
                      ...l,
                      category_ids: l.category_ids.includes(cat.id)
                        ? l.category_ids.filter(id => id !== cat.id)
                        : [...l.category_ids, cat.id],
                    }))
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    newLink.category_ids.includes(cat.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {cat.name_de}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newLink.label}
              className="flex-1 text-sm font-medium py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Erstellen
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {links.map(link => (
          <div
            key={link.id}
            className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3"
          >
            <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900">{link.label}</div>
              <div className="text-xs text-gray-500 truncate font-mono">
                /catalog/{link.token}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Sprache: {link.default_language.toUpperCase()}
                {link.filters.category_ids && ` · ${link.filters.category_ids.length} Kategorien`}
                {!link.active && ' · Deaktiviert'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyLink(link.token)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                title="Link kopieren"
              >
                {copied === link.token ? (
                  <span className="text-green-500 text-xs">✓</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={`/catalog/${link.token}`}
                target="_blank"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => onDeleteLink?.(link.id)}
                className="p-1.5 rounded hover:bg-gray-100 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {links.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Noch keine Share Links erstellt.
          </div>
        )}
      </div>
    </div>
  );
}
