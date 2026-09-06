export type PrefixEntry = { exp: number; symbol: string };
export type FamilyDef = {
  label: string;
  entries: PrefixEntry[]; // sorted by exp ascending
};

export const FAMILIES: Record<string, FamilyDef> = {
  W: {
    label: 'Watts',
    entries: [
      { exp: -15, symbol: 'fW' }, { exp: -12, symbol: 'pW' }, { exp: -9, symbol: 'nW' },
      { exp: -6, symbol: 'μW' }, { exp: -3, symbol: 'mW' }, { exp: 0, symbol: 'W' },
      { exp: 3, symbol: 'kW' }, { exp: 6, symbol: 'MW' }, { exp: 9, symbol: 'GW' },
      { exp: 12, symbol: 'TW' }, { exp: 15, symbol: 'PW' },
    ],
  },
  L: {
    label: 'Litres',
    entries: [
      { exp: -15, symbol: 'fL' }, { exp: -12, symbol: 'pL' }, { exp: -9, symbol: 'nL' },
      { exp: -6, symbol: 'μL' }, { exp: -3, symbol: 'mL' }, { exp: 0, symbol: 'L' },
      { exp: 3, symbol: 'kL' }, { exp: 6, symbol: 'ML' }, { exp: 9, symbol: 'GL' },
      { exp: 12, symbol: 'TL' }, { exp: 15, symbol: 'PL' },
    ],
  },
  // ton: values in kg
  ton: {
    label: 'Mass',
    entries: [
      { exp: -15, symbol: 'fg' }, { exp: -12, symbol: 'pg' }, { exp: -9, symbol: 'ng' },
      { exp: -6, symbol: 'μg' }, { exp: -3, symbol: 'mg' }, { exp: 0, symbol: 'g' },
      { exp: 3, symbol: 'kg' }, { exp: 6, symbol: 't' }, { exp: 9, symbol: 'kt' },
      { exp: 12, symbol: 'Mt' }, { exp: 15, symbol: 'Gt' },
    ],
  },
  '€': {
    label: 'Euro',
    entries: [
      { exp: 0, symbol: '€' }, { exp: 3, symbol: 'K€' }, { exp: 6, symbol: 'M€' },
      { exp: 9, symbol: 'B€' }, { exp: 12, symbol: 'T€' }, { exp: 15, symbol: 'P€' },
    ],
  },
  '$': {
    label: 'Dollar',
    entries: [
      { exp: 0, symbol: '$' }, { exp: 3, symbol: 'K$' }, { exp: 6, symbol: 'M$' },
      { exp: 9, symbol: 'B$' }, { exp: 12, symbol: 'T$' }, { exp: 15, symbol: 'P$' },
    ],
  },
  person: {
    label: 'People',
    entries: [
      { exp: 0, symbol: 'person' }, { exp: 3, symbol: 'K person' },
      { exp: 6, symbol: 'M person' }, { exp: 9, symbol: 'B person' },
      { exp: 12, symbol: 'T person' }, { exp: 15, symbol: 'P person' },
    ],
  },
  unit: {
    label: 'Units',
    entries: [
      { exp: 0, symbol: 'unit' }, { exp: 3, symbol: 'K unit' },
      { exp: 6, symbol: 'M unit' }, { exp: 9, symbol: 'B unit' },
      { exp: 12, symbol: 'T unit' },
    ],
  },
};

/** Returns active entries (those with exp in [minExp, maxExp]). */
export function activeEntries(family: string, minExp: number, maxExp: number): PrefixEntry[] {
  return (FAMILIES[family]?.entries ?? []).filter(e => e.exp >= minExp && e.exp <= maxExp);
}
