// index.ts - barrel re-exports for the week_sim module.
//
// Imports the named modules directly (focus, goals, momentum,
// game, depth_chart, practice) and re-exports key types and functions
// for consuming code.

export type { WeeklyFocus } from './focus.js';
export { applySeasonGoal, applyWeeklyFocus } from './focus.js';

export type { GoalInfo } from './goals.js';
export { getGoalsForPhase, getPreferredActivitiesForGoal } from './goals.js';

export { updateMomentum, calculateLetterGrade } from './momentum.js';

export type { StatLine, GameResult } from './game.js';
export { simulateGame } from './game.js';

export type { DepthChartUpdate } from './depth_chart.js';
export { evaluateDepthChartUpdate } from './depth_chart.js';

export type { PracticeResult } from './practice.js';
export { runPracticeSession } from './practice.js';
