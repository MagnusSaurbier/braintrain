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

  const allEntries = familyDef.entries;
  const range = prefixRanges[family] ?? {
    minExp: allEntries[0]?.exp ?? 0,
    maxExp: allEntries[allEntries.length - 1]?.exp ?? 0,
  };

  function setRange(newMin: number, newMax: number) {
    update({ prefixRanges: { ...prefixRanges, [family]: { minExp: newMin, maxExp: newMax } } });
  }

  function handleClick(exp: number) {
    const isActive = exp >= range.minExp && exp <= range.maxExp;
    if (!isActive) {
      setRange(Math.min(exp, range.minExp), Math.max(exp, range.maxExp));
    } else {
      const distToMin = exp - range.minExp;
      const distToMax = range.maxExp - exp;
      if (distToMin >= distToMax) {
        // closer to max → keep min side, new max = entry before this one
        const idx = allEntries.findIndex(e => e.exp === exp);
        if (idx <= 0) return;
        setRange(range.minExp, allEntries[idx - 1]!.exp);
      } else {
        // closer to min → keep max side, new min = entry after this one
        const idx = allEntries.findIndex(e => e.exp === exp);
        if (idx < 0 || idx >= allEntries.length - 1) return;
        setRange(allEntries[idx + 1]!.exp, range.maxExp);
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-white text-sm font-medium w-16 shrink-0">{familyDef.label}</span>
      <div className="flex gap-1 flex-1">
        {allEntries.map(entry => {
          const isActive = entry.exp >= range.minExp && entry.exp <= range.maxExp;
          return (
            <button
              key={entry.exp}
              onClick={() => handleClick(entry.exp)}
              className={`text-xs py-0.5 rounded font-mono transition-colors flex-1 text-center ${
                isActive
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {entry.symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsClient() {
  const { pInputs, pDigits, minOom, maxOom, ccMin, ccMax, update, reset } = useSettingsStore();

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

        {/* Currency conversion range */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <p className="text-white font-medium text-sm">€ / $ conversion range</p>
            <p className="text-gray-500 text-xs mt-1">Bounds for the exchange rate when € and $ appear as numerator/denominator.</p>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-white text-sm font-medium">Min</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={ccMin}
                onChange={e => update({ ccMin: Math.min(parseFloat(e.target.value) || 0.01, ccMax - 0.01) })}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-white text-sm font-medium">Max</label>
              <input
                type="number"
                step="0.01"
                min="0.02"
                value={ccMax}
                onChange={e => update({ ccMax: Math.max(parseFloat(e.target.value) || 0.02, ccMin + 0.01) })}
                className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
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
