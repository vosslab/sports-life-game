// weekly_engine.ts - Public API barrel for the weekly game engine
//
// CONTRACT: every call to runSeasonWeek() must end in exactly one of:
//   - { kind: "next_week", nextWeek: N }
//   - { kind: "season_ended" }
//
// No third state. No conditional path that silently returns without advancing.
// Handlers call startSeason() then the engine drives the weekly loop.
//
// SOURCE OF TRUTH: LeagueSeason owns all season state (schedule, records,
// standings, week counter). The engine reads from it and writes results to it.
//
// This barrel re-exports all public functions from cohesive submodules:
// - season_lifecycle: season start/end/advance/finalize
// - week_phases: goal/choice/crisis/activity/event phases
// - game_handler: game simulation and post-game flow
// - playoff_handler: playoff bracket progression
// - engine_state: engine state management and queries

import { loadChoicePools } from "./choices.js";
import { loadCrisisDefinitions } from "../crisis.js";

// Data imports
import crisisData from "../data/crises.js";

// Track whether data has been loaded
let isInitialized = false;

// Initialize choice pools and crisis definitions (must be called before game starts)
export async function initializeWeeklyEngine(): Promise<void> {
  if (isInitialized) {
    return;
  }
  await loadChoicePools();
  loadCrisisDefinitions(crisisData);
  isInitialized = true;
}

// Re-export public API from cohesive submodules
export { startSeason, advanceToNextWeek, endSeason, finalizeSeason } from "./season_lifecycle.js";
export {
  showGoalSelection,
  applyGoalAndAdvance,
  showWeeklyChoices,
  showCrisisResponse,
} from "./week_phases.js";
export {
  showActivities,
  handleActivitySelected,
  applyBackgroundActivityFromGoal,
  proceedToEventCheck,
  showEventCard,
} from "./week_phases.js";
export { proceedToGame, showRegularSeasonPostGame, simulateRestOfSeason } from "./game_handler.js";
export {
  startPlayoffs,
  showPlayoffPostGame,
  simulateNonPlayerPlayoffGames,
} from "./playoff_handler.js";
export {
  refreshActivitiesForCurrentSeason,
  isSeasonActive,
  getSeasonRecord,
  getActiveWeekState,
  getActiveSeason,
} from "./engine_state.js";
