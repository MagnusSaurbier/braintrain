import type { Challenge } from '@/challenges/types';
import { generateProblem, checkAnswer, type MagProblem } from './logic';
import { MagMultiplyRender } from './render';

export const magnitudeMultiply: Challenge<MagProblem, number> = {
  id: 'magnitude-multiply',
  category: 'mental-math',
  title: 'Magnitude Multiply',
  description: 'Multiply numbers spanning wild orders of magnitude.',
  instructions:
    'Multiply all the shown numbers and enter your best estimate. Numbers may range from nano (10⁻⁹) to tera (10¹²). Score is based on how close you are in log space — within 10× is worth points.',
  config: {
    durationSec: 0,
    startDifficulty: 1,
    mode: 'infinite',
  },
  generateProblem,
  checkAnswer,
  renderProblem: MagMultiplyRender,
};
