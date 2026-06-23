import type { Rng } from '@/lib/rng';
import type { AnswerResult } from '@/challenges/types';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/store/settingsStore';
import { FAMILIES, activeEntries } from './families';
import type { PrefixEntry } from './families';

export type DisplayFactor = {
  value: number;
  numeral: string; // formatted number string
  unit: string;    // e.g. "kW/mL" or "K€/person"
};

export type MagProblem = {
  factors: DisplayFactor[];
  targetUnit: string;
  exact: number;
};

// ── Chain unit ────────────────────────────────────────────────────────────────
// A chain link holds a specific prefix+unit symbol (e.g. "mL", "kW", "K€")
// and its family key.

type ChainUnit = { symbol: string; family: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSettings() {
  try { return useSettingsStore.getState(); } catch { return DEFAULT_SETTINGS; }
}

/** Returns active prefix entries for a family, using configured range or full family as fallback. */
function getActiveEntries(family: string): PrefixEntry[] {
  const settings = getSettings();
  const range = settings.prefixRanges[family];
  if (range) {
    const entries = activeEntries(family, range.minExp, range.maxExp);
    if (entries.length > 0) return entries;
  }
  return FAMILIES[family]?.entries ?? [];
}

/** Build all possible chain unit candidates from active entries across all families. */
function buildChainUnits(): ChainUnit[] {
  const result: ChainUnit[] = [];
  for (const family of Object.keys(FAMILIES)) {
    for (const entry of getActiveEntries(family)) {
      result.push({ symbol: entry.symbol, family });
    }
  }
  return result;
}

// p is the ratio between adjacent bucket probabilities: P(k+1) = p * P(k).
// Uses closed-form inverse CDF for efficiency.
function geomSample(rng: Rng, min: number, max: number, p: number): number {
  const n = max - min + 1;
  if (Math.abs(p - 1) < 1e-9) {
    return min + Math.floor(rng.next() * n);
  }
  const u = rng.next();
  const pn = Math.pow(p, n);
  const t = 1 - u * (1 - pn);
  if (t <= 0) return max;
  const k = Math.ceil(Math.log(t) / Math.log(p)) - 1;
  return min + Math.max(0, Math.min(n - 1, k));
}

/**
 * Generates integer mantissa M in [10^(k-1), 10^k-1] and OoM shift l.
 * a1 = M * 10^(-(k-1)) is in [1.0, 10.0) with k significant digits.
 * a2 = M * 10^(l-k+1) is the base-unit value.
 */
function generateFactorDigits(rng: Rng): { M: number; k: number; l: number; sign: number } {
  const { minOom, maxOom, pDigits } = getSettings();
  const k = geomSample(rng, 1, 8, pDigits);
  const l = rng.int(minOom, maxOom);
  const sign = rng.int(0, 1) === 0 ? 1 : -1;
  const minM = Math.pow(10, k - 1) | 0;
  const maxM = (Math.pow(10, k) | 0) - 1;
  return { M: rng.int(minM, maxM), k, l, sign };
}

/**
 * Formats integer M as "M * 10^exp" using string arithmetic — no floating-point noise.
 * Caps at maxDec decimal places and strips trailing zeros. Adds thousands separators.
 */
function intPow10Str(M: number, exp: number, maxDec: number): string {
  if (M === 0) return '0';
  const s = String(M);
  let intPart: string;
  let decPart: string;
  if (exp >= 0) {
    intPart = s + '0'.repeat(exp);
    decPart = '';
  } else {
    const absExp = -exp;
    if (absExp >= s.length) {
      intPart = '0';
      decPart = ('0'.repeat(absExp - s.length) + s).slice(0, maxDec).replace(/0+$/, '');
    } else {
      intPart = s.slice(0, s.length - absExp);
      decPart = s.slice(s.length - absExp).slice(0, maxDec).replace(/0+$/, '');
    }
  }
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${intPart}.${decPart}` : intPart;
}

/**
 * Returns display numeral and exact base-unit value derived purely from shown digits.
 * Display exponent relative to prefix: e = l - k + 1 - prefixEntry.exp
 */
function formatDisplay(
  M: number, k: number, l: number, sign: number, prefixEntry: PrefixEntry
): { numeral: string; exactVal: number } {
  const e = l - k + 1 - prefixEntry.exp;
  const shown = intPow10Str(M, e, 8);
  const numeral = (sign < 0 ? '−' : '') + shown;
  // Exact base-unit value = shown number * 10^prefixEntry.exp
  const shownNum = parseFloat(shown.replace(/,/g, ''));
  const exactVal = sign * shownNum * Math.pow(10, prefixEntry.exp);
  return { numeral, exactVal };
}

// ── Currency-pair helpers ─────────────────────────────────────────────────────

const CC_FAMILIES = new Set(['€', '$']);

function isCurrencyPair(a: string, b: string): boolean {
  return CC_FAMILIES.has(a) && CC_FAMILIES.has(b);
}

function baseSymbol(family: string): string {
  const entries = FAMILIES[family]?.entries ?? [];
  return (entries.find(e => e.exp === 0) ?? entries[0] ?? { symbol: family }).symbol;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateProblem(_difficulty: number, rng: Rng): MagProblem {
  const { pInputs } = getSettings();
  const count = geomSample(rng, 2, 8, pInputs);

  const familyKeys = Object.keys(FAMILIES);
  const targetFamily = rng.pick(familyKeys);
  const targetEntry = rng.pick(getActiveEntries(targetFamily));
  const targetUnit = targetEntry.symbol;

  const allChainUnits = buildChainUnits();

  // Pass 1: build chain structure (families only, no numbers)
  const chain: { aFamily: string; bFamily: string | null }[] = [];
  let curFamily = targetFamily;
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      chain.push({ aFamily: curFamily, bFamily: null });
    } else {
      const candidates = allChainUnits.filter(u => u.family !== curFamily);
      const B = rng.pick(candidates);
      chain.push({ aFamily: curFamily, bFamily: B.family });
      curFamily = B.family;
    }
  }

  // Pass 2: generate numbers for each link
  const factors: DisplayFactor[] = [];
  for (const { aFamily, bFamily } of chain) {
    let numeral: string;
    let factorValue: number;
    let unit: string;

    if (bFamily !== null && isCurrencyPair(aFamily, bFamily)) {
      // Currency conversion: clamp displayed value to [ccMin, ccMax]
      const { ccMin, ccMax, pDigits } = getSettings();
      const k = geomSample(rng, 1, 4, pDigits);
      const rawVal = ccMin + rng.next() * (ccMax - ccMin);
      const oom = Math.floor(Math.log10(rawVal));
      const M = Math.round(rawVal * Math.pow(10, k - 1 - oom));
      numeral = intPow10Str(M, oom - k + 1, 8);
      factorValue = parseFloat(numeral.replace(/,/g, ''));
      unit = `${baseSymbol(aFamily)}/${baseSymbol(bFamily)}`;
    } else {
      // Normal generation
      const { M, k, l, sign } = generateFactorDigits(rng);
      const aEntry = rng.pick(getActiveEntries(aFamily));
      const { numeral: num, exactVal: aExact } = formatDisplay(M, k, l + aEntry.exp, sign, aEntry);
      numeral = num;

      if (bFamily !== null) {
        const bEntry = rng.pick(getActiveEntries(bFamily));
        factorValue = aExact / Math.pow(10, bEntry.exp);
        unit = `${aEntry.symbol}/${bEntry.symbol}`;
      } else {
        factorValue = aExact;
        unit = aEntry.symbol;
      }
    }

    factors.push({ value: factorValue, numeral, unit });
  }

  // Shuffle so unit chain order is not revealed
  for (let i = factors.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [factors[i], factors[j]] = [factors[j], factors[i]];
  }

  const exactBase = factors.reduce((a, f) => a * f.value, 1);
  const exact = exactBase / Math.pow(10, targetEntry.exp);
  return { factors, targetUnit, exact };
}

export function checkAnswer(problem: MagProblem, answer: number): AnswerResult {
  const { exact } = problem;

  if (!isFinite(exact) || exact === 0) {
    return { correct: true, score: 100, expected: exact };
  }

  if (answer === 0 || !isFinite(answer)) return { correct: false, score: 0, expected: exact };

  const wrongSign = Math.sign(answer) !== Math.sign(exact);
  const logErr = Math.abs(Math.log10(Math.abs(exact / answer)));
  const rawScore = Math.round(100 * Math.pow(2, -logErr));
  const score = wrongSign ? rawScore - 10 : rawScore;
  const correct = !wrongSign && rawScore >= 90;

  return { correct, score, expected: exact };
}
