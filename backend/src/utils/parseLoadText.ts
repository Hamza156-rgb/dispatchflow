/**
 * Freeform load text → structured load fields.
 *
 * Dispatchers get loads as email bodies, chat messages and rate-confirmation
 * snippets. This turns a pasted blob into a pre-filled load form so nobody
 * retypes a lane at 6am. It is deliberately forgiving: anything it can't read
 * is simply left blank for the human to fill in, and every unmatched line is
 * returned so the UI can show what was ignored.
 */

export interface ParsedLoad {
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  pickupAt?: string;   // ISO
  deliveryAt?: string; // ISO
  miles?: number;
  rate?: number;
  equipment?: string;
  weight?: string;
  commodity?: string;
  driver?: string;
  referenceNumber?: string;
  client?: string;
  notes?: string;
}

export interface ParseResult {
  fields: ParsedLoad;
  /** Field names we actually found — the UI highlights these. */
  matched: string[];
  /** Lines nothing was extracted from, so the user can eyeball what was dropped. */
  unmatched: string[];
}

const STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
  // Canadian provinces show up on cross-border postings
  'AB','BC','MB','NB','NL','NS','ON','PE','QC','SK',
]);

// Two tiers. `strict` spellings are unambiguous enough to hunt for anywhere in
// the text; the abbreviations are only trusted next to an equipment label,
// since "PO" and "SD" turn up inside reference numbers and company names.
const EQUIPMENT_STRICT: [RegExp, string][] = [
  [/\b(dry\s*van)\b/i, 'Dry Van'],
  [/\b(reefer|refrigerated|temp\s*control)\b/i, 'Reefer'],
  [/\b(flat\s*bed|flatbed)\b/i, 'Flatbed'],
  [/\b(step\s*deck|stepdeck|drop\s*deck)\b/i, 'Step Deck'],
  [/\b(power\s*only)\b/i, 'Power Only'],
  [/\b(box\s*truck|straight\s*truck)\b/i, 'Box Truck'],
  [/\b(hot\s*shot|hotshot)\b/i, 'Hotshot'],
];
const EQUIPMENT_LOOSE: [RegExp, string][] = [
  ...EQUIPMENT_STRICT,
  [/\bvan\b/i, 'Dry Van'], [/\bdv\b/i, 'Dry Van'],
  [/\bfb\b/i, 'Flatbed'], [/\bsd\b/i, 'Step Deck'], [/\bpo\b/i, 'Power Only'],
];

// Label → field. Longest labels first so "delivery date" beats "date".
const LABELS: [RegExp, keyof ParsedLoad][] = [
  [/^(pick\s*up|pickup|pu|ship\s*date|pick\s*up\s*date)$/i, 'pickupAt'],
  [/^(delivery|deliver|del|drop|drop\s*off|delivery\s*date|dropoff)$/i, 'deliveryAt'],
  [/^(rate|pay|price|amount|linehaul|line\s*haul|total|offer)$/i, 'rate'],
  [/^(miles|mileage|distance|mi|trip)$/i, 'miles'],
  [/^(equipment|equip|trailer|type)$/i, 'equipment'],
  [/^(weight|wt|lbs|pounds)$/i, 'weight'],
  [/^(commodity|freight|product|cargo)$/i, 'commodity'],
  [/^(driver|carrier|truck)$/i, 'driver'],
  [/^(ref|ref\s*#|reference|reference\s*#|load\s*#|load\s*id|order\s*#|pro\s*#|bol)$/i, 'referenceNumber'],
  [/^(broker|shipper|customer|client|company|posted\s*by)$/i, 'client'],
  [/^(origin|from|pick\s*up\s*location|pu\s*location)$/i, 'originCity'],
  [/^(destination|dest|to|deliver\s*to|consignee)$/i, 'destCity'],
  [/^(notes|note|comments|comment|instructions|special)$/i, 'notes'],
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse the date formats that actually turn up in dispatch emails. */
const parseDateish = (raw: string, now = new Date()): string | undefined => {
  const s = raw.trim();
  if (!s) return undefined;

  // Time component, if any: "09:00", "9:00am", "1400"
  let hour = 0, minute = 0;
  const time = s.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (time) {
    hour = Number(time[1]);
    minute = Number(time[2]);
    const mer = time[3]?.toLowerCase();
    if (mer === 'pm' && hour < 12) hour += 12;
    if (mer === 'am' && hour === 12) hour = 0;
  }

  // ISO: 2026-07-15
  const iso = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return build(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), hour, minute, true, now);

  // US numeric: 07/15/2026, 7/15/26, 07-15, 7/15
  const us = s.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (us) {
    let year = us[3] ? Number(us[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    return build(year, Number(us[1]) - 1, Number(us[2]), hour, minute, !!us[3], now);
  }

  // Named month: "Jul 15", "15 July 2026", "July 15th"
  const named = s.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i)
    || s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:,?\s*(\d{4}))?\b/i);
  if (named) {
    const a = named[1], b = named[2];
    const monthName = (/^\d+$/.test(a) ? b : a).slice(0, 3).toLowerCase();
    const day = Number(/^\d+$/.test(a) ? a : b);
    if (monthName in MONTHS) {
      return build(named[3] ? Number(named[3]) : now.getFullYear(), MONTHS[monthName], day, hour, minute, !!named[3], now);
    }
  }

  // Bare time with no date — assume today.
  if (time) return build(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, true, now);
  return undefined;
};

const build = (
  y: number, m: number, d: number, hh: number, mm: number,
  yearExplicit: boolean, now: Date,
): string | undefined => {
  let date = new Date(y, m, d, hh, mm);
  if (isNaN(date.getTime())) return undefined;
  // "PU 3/4" written in December means next March, not nine months ago.
  // Only roll forward when the year was inferred, never when it was stated.
  if (!yearExplicit && date.getTime() < now.getTime() - 60 * 86_400_000) {
    date = new Date(y + 1, m, d, hh, mm);
  }
  if (date.getFullYear() < 2000 || date.getFullYear() > 2100) return undefined;
  return date.toISOString();
};

const parseMoney = (raw: string): number | undefined => {
  const m = raw.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(k)?/i);
  if (!m) return undefined;
  const n = Number(m[1]) * (m[2] ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const parseCount = (raw: string): number | undefined => {
  const m = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const matchEquipment = (raw: string, strict = false): string | undefined =>
  (strict ? EQUIPMENT_STRICT : EQUIPMENT_LOOSE).find(([re]) => re.test(raw))?.[1];

// Filler that precedes a city inside a prose sentence ("...going from Atlanta GA").
const CITY_NOISE = /^(we|have|has|a|an|the|this|load|loads|freight|going|goes|need|needs|from|to|out|of|in|at|near|pick|picking|pickup|pu|deliver|delivering|delivery|shipping|ships|origin|destination|dest)$/i;

/** Trim prose down to the city itself — cities run to 3 words ("Salt Lake City"). */
const cleanCity = (raw: string): string | undefined => {
  let words = raw.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  // Drop leading filler, then keep at most the last three tokens.
  while (words.length && CITY_NOISE.test(words[0])) words.shift();
  if (words.length > 3) words = words.slice(-3);
  // A stray filler word can still lead after truncation.
  while (words.length > 1 && CITY_NOISE.test(words[0])) words.shift();
  return words.length ? titleCase(words.join(' ')) : undefined;
};

/** "Chicago, IL" / "Chicago IL" / "...from Atlanta GA" → parts. */
const parsePlace = (raw: string): { city?: string; state?: string } => {
  const s = raw.trim().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
  const withComma = s.match(/^(.+?),\s*([A-Za-z]{2})\b/);
  if (withComma && STATES.has(withComma[2].toUpperCase())) {
    return { city: cleanCity(withComma[1]), state: withComma[2].toUpperCase() };
  }
  const noComma = s.match(/^(.+?)\s+([A-Za-z]{2})\b/);
  if (noComma && STATES.has(noComma[2].toUpperCase())) {
    return { city: cleanCity(noComma[1]), state: noComma[2].toUpperCase() };
  }
  return s ? { city: cleanCity(s) } : {};
};

const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * Pull "Label: value" out of a line. Falls back to a bare space separator
 * ("PU 3/4 08:00", "Miles 239") but only when the leading word is a label we
 * recognise — otherwise every sentence would parse as a key/value pair.
 */
const splitLabel = (line: string): { label: string; value: string } | null => {
  const punctuated = line.match(/^([A-Za-z#/ ]{2,24}?)\s*(?:[:=]|\s[-–]\s|#\s*)\s*(.+)$/);
  if (punctuated) {
    return { label: punctuated[1].trim().replace(/\s*#$/, '').replace(/\s+/g, ' '), value: punctuated[2].trim() };
  }
  const spaced = line.match(/^([A-Za-z]{2,12}(?:\s+[A-Za-z]{2,12})?)\s+(.+)$/);
  if (spaced) {
    // Try the two-word label first, then the single leading word.
    for (const candidate of [spaced[1].replace(/\s+/g, ' '), spaced[1].split(/\s+/)[0]]) {
      if (LABELS.some(([re]) => re.test(candidate))) {
        return { label: candidate, value: line.slice(candidate.length).trim() };
      }
    }
  }
  return null;
};

/** Split "Chicago, IL -> Gary, IN" on any of the separators people use. */
const splitLane = (s: string): [string, string] | null => {
  const m = s.split(/\s*(?:->|→|=>|–|—|\bto\b|\bTO\b)\s*/);
  if (m.length === 2 && m[0].trim() && m[1].trim()) return [m[0], m[1]];
  return null;
};

export const parseLoadText = (text: string, now = new Date()): ParseResult => {
  const fields: ParsedLoad = {};
  const matched = new Set<string>();
  const unmatched: string[] = [];
  const noteLines: string[] = [];

  const set = <K extends keyof ParsedLoad>(key: K, value: ParsedLoad[K]) => {
    if (value === undefined || value === '' || fields[key] !== undefined) return false;
    fields[key] = value;
    matched.add(key);
    return true;
  };

  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    let hit = false;

    // "Label: value", "Label - value", "Ref # 1234", "Miles 239"
    const kv = splitLabel(line);
    if (kv) {
      const { label, value } = kv;
      const field = LABELS.find(([re]) => re.test(label))?.[1];

      if (field === 'pickupAt' || field === 'deliveryAt') hit = set(field, parseDateish(value, now));
      else if (field === 'rate') hit = set('rate', parseMoney(value));
      else if (field === 'miles') hit = set('miles', parseCount(value));
      else if (field === 'equipment') hit = set('equipment', matchEquipment(value) ?? titleCase(value));
      else if (field === 'originCity' || field === 'destCity') {
        // "From: Chicago, IL" — but also "From: Chicago, IL to Gary, IN"
        const lane = splitLane(value);
        if (lane) {
          const a = parsePlace(lane[0]), b = parsePlace(lane[1]);
          hit = set('originCity', a.city) || hit; set('originState', a.state);
          set('destCity', b.city); set('destState', b.state);
        } else {
          const p = parsePlace(value);
          if (field === 'originCity') { hit = set('originCity', p.city); set('originState', p.state); }
          else { hit = set('destCity', p.city); set('destState', p.state); }
        }
      }
      else if (field === 'notes') { noteLines.push(value); hit = true; }
      else if (field) hit = set(field, value);
    }

    if (hit) continue;

    // Unlabeled lane line: "Chicago, IL -> Gary, IN"
    if (fields.originCity === undefined) {
      const lane = splitLane(line);
      if (lane) {
        const a = parsePlace(lane[0]), b = parsePlace(lane[1]);
        if (a.state || b.state) {
          set('originCity', a.city); set('originState', a.state);
          set('destCity', b.city); set('destState', b.state);
          continue;
        }
      }
    }

    // Bare money / equipment on their own line
    if (fields.rate === undefined && /^\$\s*[\d,]+(\.\d{2})?$/.test(line)) {
      if (set('rate', parseMoney(line))) continue;
    }
    if (fields.equipment === undefined && line.length <= 24) {
      const eq = matchEquipment(line);
      if (eq) { set('equipment', eq); continue; }
    }

    unmatched.push(line);
  }

  // Last resort: sweep the whole blob for values that were buried in prose.
  // Only unambiguous spellings, so a sentence can't invent an equipment type.
  if (fields.equipment === undefined) set('equipment', matchEquipment(text, true));
  if (fields.weight === undefined) {
    const w = text.match(/\b([\d][\d,]{2,8})\s*(?:lbs\b|pounds\b|#)/i);
    if (w) set('weight', `${w[1]} lbs`);
  }
  if (fields.miles === undefined) {
    const m = text.match(/\b([\d][\d,]{0,5})\s*(?:miles|mi)\b/i);
    if (m) set('miles', parseCount(m[1]));
  }
  // A date mentioned mid-sentence ("...picking up Jul 16 at 10:00am").
  if (fields.pickupAt === undefined) {
    const line = lines.find((l) => /\b(pick(ing|s)?\s*up|pickup|pu)\b/i.test(l));
    if (line) set('pickupAt', parseDateish(line, now));
  }
  if (fields.deliveryAt === undefined) {
    const line = lines.find((l) => /\b(deliver(ing|s|y)?|drop(ping)?\s*off)\b/i.test(l));
    if (line) set('deliveryAt', parseDateish(line, now));
  }

  // Anything left over that looks like prose becomes the note body — better in
  // the record than silently dropped.
  const leftoverNotes = unmatched.filter((l) => l.split(/\s+/).length >= 4);
  const allNotes = [...noteLines, ...leftoverNotes].join('\n');
  if (allNotes) set('notes', allNotes);

  return { fields, matched: [...matched], unmatched };
};
