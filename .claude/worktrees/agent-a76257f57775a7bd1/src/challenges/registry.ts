import { magnitudeMultiply } from './magnitude-multiply';
import type { Challenge } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const challenges: Challenge<any, any>[] = [magnitudeMultiply];

export function getChallenges() {
  return challenges;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getChallengeById(id: string): Challenge<any, any> | undefined {
  return challenges.find((c) => c.id === id);
}
