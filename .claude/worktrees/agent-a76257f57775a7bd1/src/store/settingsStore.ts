import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrefixRange = { minExp: number; maxExp: number };

export type MagSettings = {
  pInputs: number; // P(stop) per step for input count, geom dist over [2,8]
  pDigits: number; // P(stop) per step for sig digits, geom dist over [1,8]
  minOom: number;  // min exponent for generated values
  maxOom: number;  // max exponent for generated values
  prefixRanges: Record<string, PrefixRange>;
};

export const DEFAULT_PREFIX_RANGES: Record<string, PrefixRange> = {
  W:      { minExp: -9,  maxExp: 12 },
  L:      { minExp: -9,  maxExp: 9  },
  ton:    { minExp: -9,  maxExp: 12 },
  '€':    { minExp: 0,   maxExp: 12 },
  '$':    { minExp: 0,   maxExp: 12 },
  person: { minExp: 0,   maxExp: 9  },
  unit:   { minExp: 0,   maxExp: 9  },
};

export const DEFAULT_SETTINGS: MagSettings = {
  pInputs: 0.5,  // ratio: each bucket has half the prob of the previous → front-heavy
  pDigits: 0.5,
  minOom: -9,
  maxOom: 11,
  prefixRanges: DEFAULT_PREFIX_RANGES,
};

type Store = MagSettings & {
  update: (patch: Partial<MagSettings>) => void;
  reset: () => void;
};

export const useSettingsStore = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'braintrain:settings' }
  )
);
