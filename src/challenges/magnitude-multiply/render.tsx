'use client';

import { useState, useEffect, useRef } from 'react';
import type { MagProblem } from './logic';

export function MagMultiplyRender({
  problem,
  onSubmit,
  readOnly = false,
}: {
  problem: MagProblem;
  onSubmit: (answer: number) => void;
  timeLeftMs: number;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue('');
    inputRef.current?.focus();
  }, [problem]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(value);
    if (!isNaN(n)) onSubmit(n);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Factors */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-3">
        {problem.factors.map((f, i) => (
          <span key={i} className="flex items-center gap-3">
            {i > 0 && <span className="text-gray-500 text-2xl font-light">×</span>}
            <span className="flex flex-col items-center bg-gray-800 border border-gray-700 px-5 py-3 rounded-xl">
              <span className="text-white font-mono text-2xl whitespace-nowrap">{f.numeral}</span>
              <span className="text-indigo-300 text-sm font-medium mt-0.5">{f.unit}</span>
            </span>
          </span>
        ))}
      </div>

      {/* Target unit — always visible */}
      <div className="text-gray-400 text-sm">
        = ? <span className="text-indigo-300 font-medium">{problem.targetUnit}</span>
      </div>

      {/* Answer form — hidden while result is showing */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="your estimate"
              className="bg-gray-800 text-white border border-gray-600 rounded-xl px-5 py-3 text-xl w-52 text-center focus:outline-none focus:border-indigo-500 font-mono"
            />
            <span className="text-indigo-300 font-medium">{problem.targetUnit}</span>
            <button
              type="submit"
              disabled={value === ''}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-6 py-3 rounded-xl text-xl font-semibold transition-colors"
            >
              →
            </button>
        </form>
      )}
    </div>
  );
}
