// engine_state.ts - engine state management and getter functions
//
// Provides the shared EngineState type and the activeEngine variable that
// tracks the currently running season. Getter functions allow other modules
// to safely query engine state without creating circular dependencies.

import { Player } from '../player.js';
import { CareerContext, SeasonConfig } from '../core/year_handler.js';
import { LeagueSeason } from '../season/season_model.js';
import { Activity, WeekState } from '../activities.js';
import { getActivitiesForPhase, isActivityUnlocked, getEffectPreview } from '../activities.js';

//============================================
// Engine state: minimal, just tracks weekly phase and callbacks. The
// CareerContext is captured here so non-weekly entry points (like the
// Activities-tab refresh) can route through ctx instead of importing the
// UI module directly.
export interface EngineState {
	season: LeagueSeason;
	config: SeasonConfig;
	weekState: WeekState;
	onSeasonEnd: () => void;
	ctx: CareerContext;
}

// Current active engine state (null when no season running)
export let activeEngine: EngineState | null = null;

// Exported for module initialization in season_lifecycle
export function setActiveEngine(engine: EngineState | null): void {
	activeEngine = engine;
}

//============================================
// Refresh activities tab (called by tab switch handler)
export function refreshActivitiesForCurrentSeason(player: Player): void {
	if (!activeEngine) {
		return;
	}
	const activities = getActivitiesForPhase(player.phase, player);
	activeEngine.ctx.renderActivitiesTab({
		activities,
		weekState: activeEngine.weekState,
		isUnlocked: (activity: Activity) => isActivityUnlocked(activity, player),
		effectPreview: (activity: Activity) => getEffectPreview(activity),
		// Activity selection during tab browse is a no-op if no active season
		onSelect: () => {},
	});
}

//============================================
// Check if a season is currently active
export function isSeasonActive(): boolean {
	return activeEngine !== null;
}

//============================================
// Get current season record (for UI display)
export function getSeasonRecord(): { wins: number; losses: number } | null {
	if (!activeEngine) {
		return null;
	}
	const record = activeEngine.season.getPlayerRecord();
	return { wins: record.wins, losses: record.losses };
}

//============================================
// Get the active week state (for sidebar checklist updates)
export function getActiveWeekState(): WeekState | null {
	if (!activeEngine) {
		return null;
	}
	return activeEngine.weekState;
}

//============================================
// Get the active LeagueSeason (for tab switch standings display)
export function getActiveSeason(): LeagueSeason | null {
	if (!activeEngine) {
		return null;
	}
	return activeEngine.season;
}
