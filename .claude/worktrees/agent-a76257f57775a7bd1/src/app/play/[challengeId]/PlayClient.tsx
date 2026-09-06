'use client';

import { useState, useEffect } from 'react';
import { useGameLoop } from '@/engine/useGameLoop';
import { formatTime } from '@/lib/format';
import type { AnswerResult } from '@/challenges/types';
import { getChallengeById } from '@/challenges/registry';
import { notFound } from 'next/navigation';

export function PlayClient({ challengeId }: { challengeId: string }) {
  const challenge = getChallengeById(challengeId);
  if (!challenge) notFound();

  const infinite = challenge.config.mode === 'infinite';
  const { state, problem, submit, advance, start, end } = useGameLoop(challenge);
  const [pendingResult, setPendingResult] = useState<(AnswerResult & { userAnswer: number }) | null>(null);
  const [showStopwatch, setShowStopwatch] = useState(false);

  function handleSubmit(answer: unknown) {
    const result = submit(answer as never);
    if (result) setPendingResult({ ...result, userAnswer: answer as number });
  }

  function handleNext() {
    setPendingResult(null);
    advance();
  }

  useEffect(() => {
    if (!pendingResult) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const RenderProblem = challenge.renderProblem as React.ComponentType<{
    problem: unknown;
    onSubmit: (a: unknown) => void;
    timeLeftMs: number;
  }>;

  const total = state.correctCount + state.wrongCount;
  const avgMs = total > 0 ? state.elapsedMs / total : 0;

  if (state.status === 'idle') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-6">
        <h1 className="text-4xl font-bold">{challenge.title}</h1>
        <p className="text-gray-400 max-w-md text-center">{challenge.instructions}</p>
        {infinite && (
          <label className="flex items-center gap-3 text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showStopwatch}
              onChange={(e) => setShowStopwatch(e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            Show stopwatch &amp; avg. time per problem
          </label>
        )}
        <button
          onClick={start}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl text-2xl font-semibold transition-colors"
        >
          Start
        </button>
        <a href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</a>
      </div>
    );
  }

  if (state.status === 'finished') {
    const accuracy = total > 0 ? Math.round((state.correctCount / total) * 100) : 0;
    const elapsed = state.elapsedMs;
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-3xl font-bold">Session complete</h2>
        <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 w-full max-w-sm">
          <div className="text-6xl font-mono font-bold text-indigo-400">{state.score}</div>
          <div className="text-gray-400 text-sm">Total Score</div>
          <div className="flex gap-6 mt-2 text-center flex-wrap justify-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{state.correctCount}</div>
              <div className="text-gray-500 text-sm">Close</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{state.wrongCount}</div>
              <div className="text-gray-500 text-sm">Far off</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{accuracy}%</div>
              <div className="text-gray-500 text-sm">Accuracy</div>
            </div>
            {elapsed > 0 && (
              <div>
                <div className="text-2xl font-bold text-gray-300">{formatTime(elapsed)}</div>
                <div className="text-gray-500 text-sm">Time</div>
              </div>
            )}
            {total > 0 && elapsed > 0 && (
              <div>
                <div className="text-2xl font-bold text-gray-300">{(elapsed / total / 1000).toFixed(1)}s</div>
                <div className="text-gray-500 text-sm">Avg/problem</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4">
          <a
            href={`/play/${challenge.id}`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Play Again
          </a>
          <a
            href="/"
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-6">
      {/* Header bar */}
      <div className="flex items-center gap-6 flex-wrap justify-center">
        {!infinite && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Time</span>
            <span className={`font-mono font-bold text-lg ${state.timeLeftMs < 10000 ? 'text-red-400' : 'text-white'}`}>
              {formatTime(state.timeLeftMs)}
            </span>
          </div>
        )}
        {infinite && showStopwatch && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Elapsed</span>
              <span className="font-mono font-bold text-lg text-gray-300">{formatTime(state.elapsedMs)}</span>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Avg</span>
                <span className="font-mono font-bold text-lg text-gray-300">
                  {(state.elapsedMs / total / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Score</span>
          <span className="font-mono font-bold text-lg text-indigo-400">{state.score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Problems</span>
          <span className="font-mono font-bold text-lg text-gray-300">{total}</span>
        </div>
        {infinite && (
          <button
            onClick={end}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            End session
          </button>
        )}
      </div>

      {/* Problem — always visible; input form hidden while result is showing */}
      <div className="w-full max-w-2xl">
        <RenderProblem
          problem={problem}
          onSubmit={handleSubmit}
          timeLeftMs={state.timeLeftMs}
          {...(pendingResult ? { readOnly: true } : {})}
        />
      </div>

      {/* Solution panel — shown after submission until Next is clicked */}
      {pendingResult && (
        <div className="flex flex-col items-center gap-5 w-full max-w-md">
          <div className={`text-xl font-bold ${pendingResult.correct ? 'text-green-400' : pendingResult.score > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {pendingResult.correct ? '✓ Close enough' : pendingResult.score > 0 ? '~ Getting there' : '✗ Way off'}
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="px-5 py-3 text-gray-400">Your answer</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{formatExact(pendingResult.userAnswer)}</td>
                </tr>
                {pendingResult.expected != null && (
                  <tr className="border-b border-gray-800">
                    <td className="px-5 py-3 text-gray-400">Correct answer</td>
                    <td className="px-5 py-3 text-right font-mono text-white">{formatExact(pendingResult.expected as number)}</td>
                  </tr>
                )}
                {pendingResult.expected != null && pendingResult.userAnswer !== 0 && (
                  <tr className="border-b border-gray-800">
                    <td className="px-5 py-3 text-gray-400">Relative error</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-300">
                      {Math.abs(Math.log10(Math.abs((pendingResult.expected as number) / pendingResult.userAnswer))).toFixed(3)} OoM
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="px-5 py-3 text-gray-400">Points</td>
                  <td className={`px-5 py-3 text-right font-mono font-bold text-lg ${pendingResult.correct ? 'text-green-400' : pendingResult.score > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    +{pendingResult.score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <button
            onClick={handleNext}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-xl text-lg font-semibold transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function formatExact(n: number): string {
  if (!isFinite(n)) return String(n);
  if (n === 0) return '0';
  return n.toExponential(2); // 3 significant digits
}
