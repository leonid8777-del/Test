'use client';

import { Search } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import type { Category, ConditionCode, Language } from '@/types/database';

interface FilterBarProps {
  categories: Category[];
  selectedCategory: string;
  selectedCondition: string;
  searchQuery: string;
  onCategoryChange: (cat: string) => void;
  onConditionChange: (cond: string) => void;
  onSearchChange: (q: string) => void;
}

function getCategoryName(cat: Category, lang: Language): string {
  const key = `name_${lang}` as keyof Category;
  return (cat[key] as string) || cat.name_de;
}

const conditionCodes: ConditionCode[] = ['A', 'B', 'C', 'D'];

export function FilterBar({
  categories,
  selectedCategory,
  selectedCondition,
  searchQuery,
  onCategoryChange,
  onConditionChange,
  onSearchChange,
}: FilterBarProps) {
  const { t, lang } = useI18n();

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t.catalog.search}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange('')}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            selectedCategory === ''
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {t.catalog.allCategories}
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50'
            }`}
          >
            {getCategoryName(cat, lang)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onConditionChange('')}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            selectedCondition === ''
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {t.catalog.allConditions}
        </button>
        {conditionCodes.map(code => (
          <button
            key={code}
            onClick={() => onConditionChange(code)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              selectedCondition === code
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50'
            }`}
          >
            {t.conditions[code as keyof typeof t.conditions]}
          </button>
        ))}
      </div>
    </div>
  );
}
