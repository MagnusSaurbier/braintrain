import type { RunResult } from '@/challenges/types';

export type ChallengeStats = {
  challengeId: string;
  bestScore: number;
  bestAccuracy: number;
  totalRuns: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedAt: number;
  history: RunResult[];
};

export interface StatsRepository {
  getChallengeStats(challengeId: string): ChallengeStats | null;
  recordRun(result: RunResult): ChallengeStats;
  getAllStats(): Record<string, ChallengeStats>;
  clear(challengeId?: string): void;
}

const HISTORY_CAP = 50;
const KEY_PREFIX = 'braintrain:stats:';
const VERSION = 1;

class LocalStorageStatsRepository implements StatsRepository {
  private key(id: string) {
    return `${KEY_PREFIX}${id}`;
  }

  private load(id: string): ChallengeStats | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== VERSION) return null;
      return parsed.data as ChallengeStats;
    } catch {
      return null;
    }
  }

  private save(stats: ChallengeStats) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.key(stats.challengeId), JSON.stringify({ version: VERSION, data: stats }));
    } catch {
      // quota exceeded – silently ignore
    }
  }

  getChallengeStats(challengeId: string): ChallengeStats | null {
    return this.load(challengeId);
  }

  recordRun(result: RunResult): ChallengeStats {
    const existing = this.load(result.challengeId);
    const history = existing ? [...existing.history, result].slice(-HISTORY_CAP) : [result];
    const streak = existing ? existing.currentStreak + 1 : 1;
    const stats: ChallengeStats = {
      challengeId: result.challengeId,
      bestScore: Math.max(result.score, existing?.bestScore ?? 0),
      bestAccuracy: Math.max(result.accuracy, existing?.bestAccuracy ?? 0),
      totalRuns: (existing?.totalRuns ?? 0) + 1,
      currentStreak: streak,
      longestStreak: Math.max(streak, existing?.longestStreak ?? 0),
      lastPlayedAt: result.finishedAt,
      history,
    };
    this.save(stats);
    return stats;
  }

  getAllStats(): Record<string, ChallengeStats> {
    if (typeof window === 'undefined') return {};
    const out: Record<string, ChallengeStats> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) {
        const id = k.slice(KEY_PREFIX.length);
        const s = this.load(id);
        if (s) out[id] = s;
      }
    }
    return out;
  }

  clear(challengeId?: string) {
    if (typeof window === 'undefined') return;
    if (challengeId) {
      localStorage.removeItem(this.key(challengeId));
    } else {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(KEY_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    }
  }
}

let repo: StatsRepository | null = null;
export function getStatsRepository(): StatsRepository {
  if (!repo) repo = new LocalStorageStatsRepository();
  return repo;
}
