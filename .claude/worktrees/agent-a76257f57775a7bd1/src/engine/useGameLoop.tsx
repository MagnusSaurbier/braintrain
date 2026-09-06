'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
import type { Challenge, RoundState, RunResult } from '@/challenges/types';
import { createRng } from '@/lib/rng';
import { getStatsRepository } from '@/persistence';

type Action =
  | { type: 'START' }
  | { type: 'SUBMIT_ANSWER'; score: number; correct: boolean }
  | { type: 'TICK'; elapsed: number }
  | { type: 'FINISH' };

function initState(challengeId: string, durationSec: number): RoundState {
  return {
    challengeId,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    startedAt: 0,
    timeLeftMs: durationSec * 1000,
    elapsedMs: 0,
    status: 'idle',
    difficulty: 1,
  };
}

function reducer(
  state: RoundState,
  action: Action,
  infinite: boolean
): RoundState {
  switch (action.type) {
    case 'START':
      return { ...state, status: 'running', startedAt: Date.now() };
    case 'SUBMIT_ANSWER':
      return {
        ...state,
        score: state.score + action.score,
        correctCount: action.correct ? state.correctCount + 1 : state.correctCount,
        wrongCount: action.correct ? state.wrongCount : state.wrongCount + 1,
        difficulty: Math.min(state.difficulty + (action.correct ? 0.5 : 0), 5),
      };
    case 'TICK': {
      const elapsedMs = state.elapsedMs + action.elapsed;
      if (infinite) return { ...state, elapsedMs };
      const timeLeftMs = state.timeLeftMs - action.elapsed;
      if (timeLeftMs <= 0) return { ...state, timeLeftMs: 0, elapsedMs, status: 'finished' };
      return { ...state, timeLeftMs, elapsedMs };
    }
    case 'FINISH':
      return { ...state, status: 'finished' };
    default:
      return state;
  }
}

export function useGameLoop<TProblem, TAnswer>(
  challenge: Challenge<TProblem, TAnswer>
) {
  const infinite = challenge.config.mode === 'infinite';

  // Bind reducer with the infinite flag
  const boundReducer = useCallback(
    (state: RoundState, action: Action) => reducer(state, action, infinite),
    [infinite]
  );

  const [state, dispatch] = useReducer(
    boundReducer,
    initState(challenge.id, challenge.config.durationSec)
  );

  const rngRef = useRef(createRng(Date.now()));
  const [problem, setProblem] = useReducerProblem(challenge, rngRef.current, state.difficulty);
  const lastTickRef = useRef<number>(0);
  const savedRef = useRef(false);

  useEffect(() => {
    if (state.status !== 'running') return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;
      dispatch({ type: 'TICK', elapsed });
    }, 100);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === 'finished' && !savedRef.current) {
      savedRef.current = true;
      const total = state.correctCount + state.wrongCount;
      const result: RunResult = {
        challengeId: challenge.id,
        score: state.score,
        correctCount: state.correctCount,
        wrongCount: state.wrongCount,
        accuracy: total > 0 ? state.correctCount / total : 0,
        durationSec: Math.round(state.elapsedMs / 1000),
        finishedAt: Date.now(),
      };
      getStatsRepository().recordRun(result);
    }
  }, [state.status, challenge.id, state]);

  const submit = useCallback(
    (answer: TAnswer) => {
      if (state.status !== 'running') return;
      const result = challenge.checkAnswer(problem, answer);
      dispatch({ type: 'SUBMIT_ANSWER', score: result.score, correct: result.correct });
      return result;
    },
    [challenge, problem, state.status]
  );

  const advance = useCallback(() => {
    setProblem(challenge.generateProblem(state.difficulty, rngRef.current));
  }, [challenge, state.difficulty, setProblem]);

  const start = useCallback(() => {
    savedRef.current = false;
    rngRef.current = createRng(Date.now());
    setProblem(challenge.generateProblem(1, rngRef.current));
    dispatch({ type: 'START' });
  }, [challenge, setProblem]);

  const end = useCallback(() => {
    dispatch({ type: 'FINISH' });
  }, []);

  return { state, problem, submit, advance, start, end };
}

function useReducerProblem<TProblem, TAnswer>(
  challenge: Challenge<TProblem, TAnswer>,
  rng: ReturnType<typeof createRng>,
  difficulty: number
): [TProblem, (p: TProblem) => void] {
  const [p, setP] = useReducer(
    (_: TProblem, next: TProblem) => next,
    undefined as unknown as TProblem,
    () => challenge.generateProblem(difficulty, rng)
  );
  return [p, setP];
}
