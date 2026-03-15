import type { UnitType, ConditionCode, Currency } from '@/types/database';

export interface ParsedOffer {
  title: string;
  brand: string;
  short_description: string;
  long_description: string;
  article_numbers: string[];
  quantity_total: number;
  quantity_available: number;
  unit: UnitType;
  volume_text: string;
  price_per_unit: number;
  currency: Currency;
  condition_code: ConditionCode;
  category_slug: string;
  export_only: boolean;
}

const UNIT_MAP: Record<string, UnitType> = {
  kg: 'kg',
  kilo: 'kg',
  kilogramm: 'kg',
  stück: 'Stück',
  stk: 'Stück',
  pcs: 'Stück',
  pieces: 'Stück',
  palette: 'Palette',
  paletten: 'Palette',
  pal: 'Palette',
  plt: 'Palette',
  posten: 'Posten',
  lot: 'Posten',
  set: 'Set',
  sets: 'Set',
};

const CONDITION_MAP: Record<string, ConditionCode> = {
  a: 'A',
  'klasse a': 'A',
  'class a': 'A',
  neu: 'A',
  new: 'A',
  b: 'B',
  'klasse b': 'B',
  'class b': 'B',
  c: 'C',
  'klasse c': 'C',
  d: 'D',
  beschädigt: 'D',
  damaged: 'D',
};

function extractArticleNumbers(text: string): string[] {
  const patterns = [
    /(?:Art\.?\s*(?:Nr\.?|Nummer|#)|EAN|GTIN|SKU|Artikel)\s*[:\-]?\s*(\d[\d\-\.\/]{3,})/gi,
    /\b(\d{6,13})\b/g,
  ];

  const numbers: string[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = match[1].trim();
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
  }
  return numbers;
}

function extractQuantity(text: string): { value: number; unit: UnitType } {
  const patterns = [
    /(\d[\d\.,]*)\s*(kg|kilo|kilogramm|stück|stk|pcs|pieces|palette[n]?|pal|plt|posten|lot|set[s]?)\b/gi,
    /(?:Menge|Qty|Quantity|Anzahl)\s*[:\-]?\s*(\d[\d\.,]*)\s*(kg|stk|stück|pal|palette[n]?|posten|set[s]?)?/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      const unitStr = (match[2] || 'stück').toLowerCase();
      const unit = UNIT_MAP[unitStr] || 'Stück';
      return { value, unit };
    }
  }

  return { value: 1, unit: 'Posten' };
}

function extractPrice(text: string): { value: number; currency: Currency } {
  const patterns = [
    /(\d[\d\.,]*)\s*€/g,
    /€\s*(\d[\d\.,]*)/g,
    /(\d[\d\.,]*)\s*EUR/gi,
    /(?:Preis|Price|VK|EK)\s*[:\-]?\s*(\d[\d\.,]*)\s*(?:€|EUR)?/gi,
    /(\d[\d\.,]*)\s*\$/g,
    /\$\s*(\d[\d\.,]*)/g,
    /(\d[\d\.,]*)\s*USD/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const valStr = match[1] || match[2];
      if (!valStr) continue;
      const value = parseFloat(valStr.replace('.', '').replace(',', '.'));
      const currency: Currency = pattern.source.includes('\\$') || pattern.source.includes('USD') ? 'USD' : 'EUR';
      return { value, currency };
    }
  }

  return { value: 0, currency: 'EUR' };
}

function extractCondition(text: string): ConditionCode {
  const patterns = [
    /(?:Zustand|Condition|Klasse|Class|Qualität)\s*[:\-]?\s*([A-Da-d])\b/i,
    /\b(neu|new|beschädigt|damaged)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const val = match[1].toLowerCase();
      return CONDITION_MAP[val] || 'B';
    }
  }

  return 'B';
}

function extractBrand(text: string): string {
  const match = text.match(/(?:Marke|Brand|Hersteller)\s*[:\-]?\s*([^\n,]+)/i);
  if (match) return match[1].trim();

  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length >= 2) {
    const secondLine = lines[1].trim();
    if (secondLine.length < 40 && !/\d{3,}/.test(secondLine)) {
      return secondLine;
    }
  }

  return '';
}

function extractExportOnly(text: string): boolean {
  return /(?:nur\s*export|export\s*only|nur\s*ausland|foreign\s*only)/i.test(text);
}

function extractVolumeText(text: string): string {
  const match = text.match(/(?:Inhalt|Volume|Volumen|Größe|Size)\s*[:\-]?\s*([^\n]+)/i);
  if (match) return match[1].trim();

  const volumeMatch = text.match(/(\d+\s*(?:ml|l|cl|g|kg|oz)\b[^\n]*)/i);
  if (volumeMatch) return volumeMatch[1].trim();

  return '';
}

export function parseWhatsAppOffer(text: string): ParsedOffer {
  const lines = text.split('\n').filter(l => l.trim());
  const title = lines[0]?.replace(/^[\*\-\•]\s*/, '').trim() || 'Untitled Offer';

  const brand = extractBrand(text);
  const articleNumbers = extractArticleNumbers(text);
  const { value: qty, unit } = extractQuantity(text);
  const { value: price, currency } = extractPrice(text);
  const conditionCode = extractCondition(text);
  const exportOnly = extractExportOnly(text);
  const volumeText = extractVolumeText(text);

  const descLines = lines.slice(1).filter(l => {
    const lower = l.toLowerCase();
    return !lower.match(/^(marke|brand|preis|price|menge|qty|zustand|condition|art\.?\s*nr)/i);
  });

  const shortDesc = descLines.slice(0, 2).join(' ').substring(0, 200);
  const longDesc = descLines.join('\n');

  return {
    title,
    brand,
    short_description: shortDesc,
    long_description: longDesc,
    article_numbers: articleNumbers,
    quantity_total: qty,
    quantity_available: qty,
    unit,
    volume_text: volumeText,
    price_per_unit: price,
    currency,
    condition_code: conditionCode,
    category_slug: '',
    export_only: exportOnly,
  };
}

export function parseMultipleOffers(text: string): ParsedOffer[] {
  const separators = /\n{3,}|\n[-=]{3,}\n|\n\*{3,}\n/;
  const blocks = text.split(separators).filter(b => b.trim().length > 10);

  if (blocks.length <= 1) {
    return [parseWhatsAppOffer(text)];
  }

  return blocks.map(parseWhatsAppOffer);
}
