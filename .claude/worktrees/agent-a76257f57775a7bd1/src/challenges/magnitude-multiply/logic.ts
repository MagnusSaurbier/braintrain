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

function randomSigDigits(rng: Rng): number {
  return geomSample(rng, 1, 8, getSettings().pDigits);
}

function formatAbs(abs: number, sigDigits: number): string {
  if (abs === 0) return '0';
  const oom = Math.floor(Math.log10(abs));
  const factor = Math.pow(10, sigDigits - 1 - oom);
  const rounded = Math.round(abs * factor) / factor;
  const decimals = Math.max(0, sigDigits - 1 - oom);
  let str = rounded.toFixed(decimals);
  if (str.includes('.')) str = str.replace(/\.?0+$/, '');
  const [intPart, decPart] = str.split('.');
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${intFmt}.${decPart}` : intFmt;
}

/** Generates a raw value with random exponent and sign. */
function generateValue(rng: Rng): { value: number; sign: number } {
  const { minOom, maxOom } = getSettings();
  const exp = rng.int(minOom, maxOom);
  const sign = rng.int(0, 1) === 0 ? 1 : -1;
  const mantissa = rng.int(10, 99) / 10;
  const value = sign * mantissa * Math.pow(10, exp);
  return { value, sign };
}

/** Formats value for display relative to a given prefix entry. Returns numeral string only (no unit symbol). */
function formatDisplay(value: number, prefixEntry: PrefixEntry, sigDigits: number): string {
  const relVal = Math.abs(value) / Math.pow(10, prefixEntry.exp);
  const formatted = formatAbs(relVal, sigDigits);
  const signStr = value < 0 ? '−' : '';
  return `${signStr}${formatted}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateProblem(_difficulty: number, rng: Rng): MagProblem {
  const { pInputs } = getSettings();
  const count = geomSample(rng, 2, 8, pInputs);

  // Pick initial target family and a random active prefix entry for the first A
  const familyKeys = Object.keys(FAMILIES);
  const targetFamily = rng.pick(familyKeys);
  const initialEntries = getActiveEntries(targetFamily);
  const initialEntry = rng.pick(initialEntries);

  // targetUnit is the family key (base label) shown as answer unit
  const targetUnit = targetFamily;

  let A: ChainUnit = { symbol: initialEntry.symbol, family: targetFamily };
  const allChainUnits = buildChainUnits();

  const factors: DisplayFactor[] = [];

  for (let i = 0; i < count; i++) {
    const { value: rawVal } = generateValue(rng);
    const isLast = i === count - 1;

    // Pick B from chain units of a different family
    let B: ChainUnit | null = null;
    if (!isLast) {
      const candidates = allChainUnits.filter(u => u.family !== A.family);
      B = rng.pick(candidates);
    }

    // Find the prefix entry for A's current symbol
    const aEntries = FAMILIES[A.family]?.entries ?? [];
    const aEntry = aEntries.find(e => e.symbol === A.symbol) ?? { exp: 0, symbol: A.symbol };

    const sigDigits = randomSigDigits(rng);
    const numeral = formatDisplay(rawVal, aEntry, sigDigits);

    // Compute factor value in base units.
    //
    // A displayed factor "N A.symbol / B.symbol" means:
    //   N * 10^(aEntry.exp) [base_A] / [1 B.symbol = 10^(bEntry.exp) base_B]
    //
    // Since rawVal = N * 10^(aEntry.exp), the factor value in base_A/base_B is:
    //   rawVal / 10^(bEntry.exp)
    //
    // For the last factor (no B), value is just rawVal (in base_A units).
    let factorValue: number;
    if (B !== null) {
      const bEntries = FAMILIES[B.family]?.entries ?? [];
      const bEntry = bEntries.find(e => e.symbol === B!.symbol) ?? { exp: 0, symbol: B!.symbol };
      factorValue = rawVal / Math.pow(10, bEntry.exp);
    } else {
      factorValue = rawVal;
    }

    const unit = B !== null ? `${A.symbol}/${B.symbol}` : A.symbol;
    factors.push({ value: factorValue, numeral, unit });

    if (B !== null) A = B;
  }

  // Shuffle so unit chain order is not revealed
  for (let i = factors.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [factors[i], factors[j]] = [factors[j], factors[i]];
  }

  const exact = factors.reduce((a, f) => a * f.value, 1);
  return { factors, targetUnit, exact };
}

export function checkAnswer(problem: MagProblem, answer: number): AnswerResult {
  const { exact } = problem;

  if (!isFinite(exact) || exact === 0) {
    return { correct: Math.abs(answer) < 1e-9, score: 50, expected: exact };
  }

  if (answer === 0 || !isFinite(answer)) return { correct: false, score: 0, expected: exact };
  if (Math.sign(answer) !== Math.sign(exact)) return { correct: false, score: 0, expected: exact };

  const logErr = Math.abs(Math.log(exact / answer));
  const score = Math.round(100 * Math.pow(2, -logErr));
  const correct = score >= 90;

  return { correct, score, expected: exact };
}
