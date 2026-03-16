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
  internal_notes: string;
}

const UNIT_MAP: Record<string, UnitType> = {
  kg: 'kg',
  kilo: 'kg',
  kilogramm: 'kg',
  stück: 'Stück',
  stk: 'Stück',
  box: 'Stück',
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
  'a-ware': 'A',
  'klasse a': 'A',
  neu: 'A',
  new: 'A',
  ovp: 'A',
  b: 'B',
  'b-ware': 'B',
  'klasse b': 'B',
  c: 'C',
  'c-ware': 'C',
  d: 'D',
  beschädigt: 'D',
  damaged: 'D',
};

/** Strip WhatsApp export timestamps like "[12.03.26, 10:19:24] Ilia Eremeev: " */
function stripWhatsAppTimestamps(text: string): string {
  return text
    .replace(/^\[[\d.]+,\s*[\d:]+\]\s*[^:]+:\s*/gm, '')
    .replace(/^\u200e/gm, ''); // strip LTR mark
}

/** Parse German number format: "2.421" → 2421, "1,20" → 1.20 */
function parseGermanNumber(s: string): number {
  // If the string has a comma followed by 1-2 digits at the end → decimal comma
  if (/,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // Otherwise treat dots as thousands separators
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

function extractArticleNumbers(text: string): string[] {
  const numbers: string[] = [];

  // Match GH_XXX123-4 style internal codes and classic EAN/SKU patterns
  const patterns = [
    /\bGH_[A-Z0-9\-]+/g,                                          // GH_INP52010-6
    /(?:Art\.?\s*(?:Nr\.?|Nummer|#)|EAN|GTIN|SKU)\s*[:\-]?\s*([\w\-]{4,})/gi,
    /\b(\d{6,13})\b/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = (match[1] ?? match[0]).trim();
      if (!numbers.includes(num)) numbers.push(num);
    }
  }
  return numbers;
}

function extractQuantity(text: string): { value: number; unit: UnitType } {
  // "Menge: ca. 2.421 kg" or "ca. 1.710 Stk."
  const mengeMatch = text.match(
    /(?:Menge|Qty|Quantity|Anzahl)\s*[:\-]?\s*(?:ca\.?\s*)?([0-9][0-9\.,]*)\s*(kg|kilo|stück|stk|box|pcs|palette[n]?|pal|posten|set[s]?)/i
  );
  if (mengeMatch) {
    return {
      value: parseGermanNumber(mengeMatch[1]),
      unit: UNIT_MAP[mengeMatch[2].toLowerCase()] || 'Stück',
    };
  }

  // Generic number + unit
  const genericMatch = text.match(
    /(?:ca\.?\s*)?([0-9][0-9\.,]+)\s*(kg|kilo|stück|stk|box|palette[n]?|pal|posten|set[s]?)\b/i
  );
  if (genericMatch) {
    return {
      value: parseGermanNumber(genericMatch[1]),
      unit: UNIT_MAP[genericMatch[2].toLowerCase()] || 'Stück',
    };
  }

  return { value: 1, unit: 'Posten' };
}

function extractPrice(text: string): { value: number; currency: Currency } {
  // "Nettopreis: 1,20 €/kg" or "1,45€/Box"
  const patterns = [
    /(?:Netto(?:preis)?|Preis|Price|VK|EK)\s*[:\-]?\s*([0-9][0-9\.,]*)\s*€/i,
    /([0-9][0-9\.,]*)\s*€/,
    /€\s*([0-9][0-9\.,]*)/,
    /([0-9][0-9\.,]*)\s*EUR/i,
    /([0-9][0-9\.,]*)\s*\$/,
    /([0-9][0-9\.,]*)\s*USD/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const currency: Currency =
        pattern.source.includes('\\$') || pattern.source.includes('USD') ? 'USD' : 'EUR';
      return { value: parseGermanNumber(match[1]), currency };
    }
  }

  return { value: 0, currency: 'EUR' };
}

function extractCondition(text: string): ConditionCode {
  // "A-Ware, OVP" / "B-Ware" in title or Zustand line
  const condMatch = text.match(
    /(?:Zustand|Condition|Qualität)\s*[:\-]?\s*([A-Da-d][-\w]*)/i
  );
  if (condMatch) {
    const key = condMatch[1].toLowerCase();
    if (CONDITION_MAP[key]) return CONDITION_MAP[key];
  }

  // Scan whole text for A-Ware / B-Ware patterns
  const wareMatch = text.match(/\b([A-Da-d]-Ware)\b/i);
  if (wareMatch) {
    const key = wareMatch[1].toLowerCase();
    return CONDITION_MAP[key] || 'B';
  }

  // OVP = new/sealed
  if (/\bOVP\b/i.test(text)) return 'A';

  return 'B';
}

function extractBrand(text: string): string {
  const match = text.match(/(?:Marke|Brand|Hersteller)\s*[:\-]?\s*([^\n,•]+)/i);
  if (match) return match[1].trim();
  return '';
}

function extractVolumeText(text: string): string {
  const match = text.match(/(?:Volumen|Volume|Inhalt|Größe|Size)\s*[:\-]?\s*([^\n]+)/i);
  if (match) return match[1].trim();
  return '';
}

function extractInternalNotes(text: string): string {
  // Find everything after "Interne Info" marker
  const match = text.match(/‼️?\s*Interne\s*Info[^:]*:?\s*‼?\s*([\s\S]+)/i);
  if (match) return match[1].replace(/Viel Erfolg!.*/i, '').trim();
  return '';
}

function extractExportOnly(text: string): boolean {
  return /(?:nur\s*export|export\s*only|nur\s*ausland)/i.test(text);
}

function stripInternalSection(text: string): string {
  // Remove everything from "Interne Info" onward
  return text.replace(/[-–]+\s*\n?‼️?\s*Interne\s*Info[\s\S]*/i, '').trim();
}

export function parseWhatsAppOffer(rawText: string): ParsedOffer {
  const cleaned = stripWhatsAppTimestamps(rawText);
  const publicText = stripInternalSection(cleaned);

  const lines = publicText
    .split('\n')
    .map(l => l.replace(/^[•⁠\-\*\s]+/, '').trim())
    .filter(Boolean);

  const title = lines[0] || 'Untitled Offer';

  const brand = extractBrand(cleaned);
  const articleNumbers = extractArticleNumbers(cleaned);
  const { value: qty, unit } = extractQuantity(cleaned);
  const { value: price, currency } = extractPrice(cleaned);
  const conditionCode = extractCondition(cleaned);
  const exportOnly = extractExportOnly(cleaned);
  const volumeText = extractVolumeText(cleaned);
  const internalNotes = extractInternalNotes(cleaned);

  // Description lines: skip metadata lines
  const metaPattern = /^(menge|volumen|nettopreis|preis|marke|zustand|gh_|art\.)/i;
  const descLines = lines.slice(1).filter(l => !metaPattern.test(l));
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
    internal_notes: internalNotes,
  };
}

/** Split a multi-offer WhatsApp export into individual offer blocks. */
export function parseMultipleOffers(text: string): ParsedOffer[] {
  const cleaned = stripWhatsAppTimestamps(text);

  // Split on separator lines (---) that appear between offers
  const blocks = cleaned
    .split(/\n-{5,}\n/)
    .map(b => b.trim())
    .filter(b => b.length > 20);

  if (blocks.length <= 1) return [parseWhatsAppOffer(text)];

  // Each block may contain one offer; filter out "Viel Erfolg" footers
  return blocks
    .filter(b => !/^(Viel Erfolg|‼️\s*Interne)/i.test(b))
    .map(b => parseWhatsAppOffer(b));
}
