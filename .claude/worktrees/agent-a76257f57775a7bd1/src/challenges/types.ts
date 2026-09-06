import type { Rng } from '@/lib/rng';

export type Category = 'mental-math' | 'memory' | 'quick-thinking';

export type AnswerResult = {
  correct: boolean;
  score: number;
  expected?: unknown;
};

export type ChallengeConfig = {
  durationSec: number;
  startDifficulty: number;
  mode: 'fixed-time' | 'fixed-count' | 'survival' | 'infinite';
};

export type RoundState = {
  challengeId: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  startedAt: number;
  timeLeftMs: number;
  elapsedMs: number;
  status: 'idle' | 'running' | 'finished';
  difficulty: number;
};

export type RunResult = {
  challengeId: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  durationSec: number;
  finishedAt: number;
};

export type Challenge<TProblem, TAnswer> = {
  id: string;
  category: Category;
  title: string;
  description: string;
  instructions: string;
  config: ChallengeConfig;
  generateProblem: (difficulty: number, rng: Rng) => TProblem;
  checkAnswer: (problem: TProblem, answer: TAnswer) => AnswerResult;
  renderProblem: React.ComponentType<{
    problem: TProblem;
    onSubmit: (answer: TAnswer) => void;
    timeLeftMs: number;
  }>;
};
