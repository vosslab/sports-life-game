// index.ts - barrel re-exports for the week_sim module.
//
// New code can import the named modules directly (focus, goals, momentum,
// game, depth_chart, practice). This barrel exists so the legacy
// `src/week_sim.ts` shim and existing importers continue to compile.

export type { WeeklyFocus } from './focus.js';
export { applySeasonGoal, applyWeeklyFocus } from './focus.js';

export type { GoalInfo } from './goals.js';
export { getGoalsForPhase, getPreferredActivitiesForGoal } from './goals.js';

export {
	updateMomentum,
	calculatePerformanceRating,
	calculateLetterGrade,
} from './momentum.js';

export type { StatLine, GameResult } from './game.js';
export { simulateGame } from './game.js';

export type { DepthChartUpdate } from './depth_chart.js';
export { evaluateDepthChartUpdate } from './depth_chart.js';

export type { PracticeResult } from './practice.js';
export { runPracticeSession } from './practice.js';
