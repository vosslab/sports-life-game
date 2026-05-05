// week_sim.ts - re-export shim for the modular `src/week_sim/` tree.
//
// As of M4 of the modularization plan the legacy 1,180-line week_sim.ts has
// been decomposed into focused modules under `src/week_sim/`. This shim
// keeps the existing `from './week_sim.js'` importers (main.ts, ui.ts,
// game_loop.ts, social/fotomagic.ts, season/season_simulator.ts,
// weekly/weekly_engine.ts) working without rewriting their imports. New
// code should import from the specific submodule it needs.

export type {
	WeeklyFocus, GoalInfo, StatLine, GameResult, DepthChartUpdate, PracticeResult,
} from './week_sim/index.js';
export {
	applySeasonGoal,
	applyWeeklyFocus,
	getGoalsForPhase,
	getPreferredActivitiesForGoal,
	updateMomentum,
	calculatePerformanceRating,
	calculateLetterGrade,
	simulateGame,
	evaluateDepthChartUpdate,
	runPracticeSession,
} from './week_sim/index.js';
