'use client';

import { useSettingsStore, DEFAULT_SETTINGS } from '@/store/settingsStore';
import { FAMILIES } from '@/challenges/magnitude-multiply/families';

function bucketProbs(p: number, n: number): number[] {
  if (Math.abs(p - 1) < 1e-9) return Array(n).fill(1 / n);
  const pFirst = (1 - p) / (1 - Math.pow(p, n));
  return Array.from({ length: n }, (_, i) => pFirst * Math.pow(p, i));
}

function geomMean(p: number, min: number, max: number): number {
  const n = max - min + 1;
  const probs = bucketProbs(p, n);
  return probs.reduce((sum, prob, i) => sum + prob * (min + i), 0);
}

function DistBar({ p, min, max }: { p: number; min: number; max: number }) {
  const n = max - min + 1;
  const probs = bucketProbs(p, n);
  const buckets = probs.map((prob, i) => ({ k: min + i, prob }));
  const peak = Math.max(...buckets.map(b => b.prob));

  return (
    <div className="flex items-end gap-0.5 h-32 mt-3">
      {buckets.map(({ k, prob }) => (
        <div key={k} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="bg-indigo-500 rounded-sm w-full"
            style={{ height: `${Math.round((prob / peak) * 96)}px` }}
          />
          <span className="text-gray-500 text-[10px]">{k}</span>
        </div>
      ))}
    </div>
  );
}

function Slider({
  label,
  description,
  value,
  min,
  max,
  step,
  logScale,
  onChange,
  format,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  logScale?: boolean;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const sliderMin   = logScale ? Math.log10(min)   : min;
  const sliderMax   = logScale ? Math.log10(max)   : max;
  const sliderValue = logScale ? Math.log10(value) : value;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value);
    onChange(logScale ? Math.pow(10, raw) : raw);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-white font-medium text-sm">{label}</label>
        <span className="font-mono text-indigo-300 text-sm">{format ? format(value) : value}</span>
      </div>
      <p className="text-gray-500 text-xs mb-1">{description}</p>
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={step}
        value={sliderValue}
        onChange={handleChange}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

function FamilyPrefixEditor({ family }: { family: string }) {
  const { prefixRanges, update } = useSettingsStore();
  const familyDef = FAMILIES[family];
  if (!familyDef) return null;

  const range = prefixRanges[family] ?? { minExp: familyDef.entries[0]?.exp ?? 0, maxExp: familyDef.entries[familyDef.entries.length - 1]?.exp ?? 0 };
  const allEntries = familyDef.entries;
  const activeSet = allEntries.filter(e => e.exp >= range.minExp && e.exp <= range.maxExp);

  const minIdx = allEntries.findIndex(e => e.exp === range.minExp);
  const maxIdx = allEntries.findIndex(e => e.exp === range.maxExp);

  const prevEntry = minIdx > 0 ? allEntries[minIdx - 1] : null;
  const nextEntry = maxIdx < allEntries.length - 1 ? allEntries[maxIdx + 1] : null;
  const currentMin = activeSet[0];
  const currentMax = activeSet[activeSet.length - 1];

  function setRange(newMin: number, newMax: number) {
    update({ prefixRanges: { ...prefixRanges, [family]: { minExp: newMin, maxExp: newMax } } });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium w-16 shrink-0">{familyDef.label}</span>
        <div className="flex items-center gap-1 flex-wrap">
          {/* Left expand/shrink buttons */}
          <button
            onClick={() => prevEntry && setRange(prevEntry.exp, range.maxExp)}
            disabled={prevEntry === null}
            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={prevEntry ? `Add ${prevEntry.symbol}` : 'Already at minimum'}
          >
            ← {prevEntry?.symbol ?? '—'}
          </button>
          <button
            onClick={() => currentMin && activeSet.length > 1 && setRange(activeSet[1]!.exp, range.maxExp)}
            disabled={activeSet.length <= 1}
            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={activeSet.length > 1 ? `Remove ${currentMin?.symbol}` : 'Must keep at least one'}
          >
            × {currentMin?.symbol ?? '—'}
          </button>

          {/* Active and inactive chips */}
          {allEntries.map(entry => {
            const isActive = entry.exp >= range.minExp && entry.exp <= range.maxExp;
            return (
              <span
                key={entry.exp}
                className={`text-xs px-2 py-0.5 rounded font-mono ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-600'}`}
              >
                {entry.symbol}
              </span>
            );
          })}

          {/* Right shrink/expand buttons */}
          <button
            onClick={() => currentMax && activeSet.length > 1 && setRange(range.minExp, activeSet[activeSet.length - 2]!.exp)}
            disabled={activeSet.length <= 1}
            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={activeSet.length > 1 ? `Remove ${currentMax?.symbol}` : 'Must keep at least one'}
          >
            {currentMax?.symbol ?? '—'} ×
          </button>
          <button
            onClick={() => nextEntry && setRange(range.minExp, nextEntry.exp)}
            disabled={nextEntry === null}
            className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={nextEntry ? `Add ${nextEntry.symbol}` : 'Already at maximum'}
          >
            {nextEntry?.symbol ?? '—'} →
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsClient() {
  const { pInputs, pDigits, minOom, maxOom, update, reset } = useSettingsStore();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-[210mm] mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Magnitude Multiply generation parameters</p>
          </div>
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Home</a>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-7">

          {/* p_inputs */}
          <div>
            <Slider
              label="p_inputs — number of factors"
              description={`Ratio between adjacent buckets P(k+1)/P(k) over [2, 8]. Mean ≈ ${geomMean(pInputs, 2, 8).toFixed(1)} factors. <1 = few, >1 = many.`}
              value={pInputs}
              min={0.1}
              max={10}
              step={0.01}
              logScale
              onChange={(v) => update({ pInputs: v })}
              format={(v) => v.toFixed(2)}
            />
            <DistBar p={pInputs} min={2} max={8} />
          </div>

          {/* p_digits */}
          <div>
            <Slider
              label="p_digits — significant digits"
              description={`Ratio between adjacent buckets P(k+1)/P(k) over [1, 8]. Mean ≈ ${geomMean(pDigits, 1, 8).toFixed(1)} digits. <1 = few, >1 = many.`}
              value={pDigits}
              min={0.1}
              max={10}
              step={0.01}
              logScale
              onChange={(v) => update({ pDigits: v })}
              format={(v) => v.toFixed(2)}
            />
            <DistBar p={pDigits} min={1} max={8} />
          </div>

          {/* OoM range */}
          <div className="flex flex-col gap-4">
            <p className="text-white font-medium text-sm">Input OoM range</p>
            <p className="text-gray-500 text-xs -mt-3">Exponent bounds for generated factor values (10^min to 10^max).</p>
            <div className="flex gap-6">
              <div className="flex-1">
                <Slider
                  label="Min OoM"
                  description=""
                  value={minOom}
                  min={-12}
                  max={0}
                  step={1}
                  onChange={(v) => update({ minOom: Math.min(v, maxOom - 1) })}
                  format={(v) => `10^${v}`}
                />
              </div>
              <div className="flex-1">
                <Slider
                  label="Max OoM"
                  description=""
                  value={maxOom}
                  min={0}
                  max={12}
                  step={1}
                  onChange={(v) => update({ maxOom: Math.max(v, minOom + 1) })}
                  format={(v) => `10^${v}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>10^{minOom}</span>
              <span className="text-gray-600">range: {maxOom - minOom} OoM</span>
              <span>10^{maxOom}</span>
            </div>
          </div>
        </div>

        {/* Unit families */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-white font-medium text-sm">Unit families</p>
            <p className="text-gray-500 text-xs mt-1">Configure which prefix scales are active per unit family.</p>
          </div>
          {Object.keys(FAMILIES).map(family => (
            <FamilyPrefixEditor key={family} family={family} />
          ))}
        </div>

        <button
          onClick={reset}
          className="self-start text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
