// render_state.ts - Pull-model render layer over GameViewState
//
// renderState(view: GameViewState): void reads a snapshot of game state
// and selectively updates the DOM based on dirty flags. Each major view
// slice (header, stat bars, career, story, social) is shallow-compared
// against the last rendered state. If unchanged, that widget is skipped.
//
// This layer sits between simulation (which produces GameViewState) and
// UI widgets (which mutate the DOM). Simulation code never imports render.

import type { GameViewState } from '../view_state/game_view_state.js';
import {
	updateHeader,
	updateLifeStatus,
	updateStatBar,
	updateAllStats,
	clearStory,
	addHeadline,
	addText,
	addResult,
	addStatChange,
	showRecentChange,
	showChoices,
	clearChoices,
	showWeeklyFocusChoices,
	showGameResult,
	updateTeamTab,
	renderActivitiesTab,
	updateCareerTab,
	updateSeasonCareer,
	updateWeekCard,
	hideWeekCard,
	updateMiniStatStrip,
	updateThisWeekPanel,
	updateSidebar,
	showMilestoneCard,
	formatStatKey,
	formatStatLine,
	updateStatsTab,
} from '../ui/index.js';
import type { ChoiceOption } from '../ui/choice_widget.js';

//============================================
// Dirty-flag state: track last-rendered view slices
interface RenderCache {
	header: unknown;
	statBars: unknown;
	career: unknown;
	story: unknown;
	social: unknown;
	seasonGoal: unknown;
}

let lastCache: RenderCache = {
	header: null,
	statBars: null,
	career: null,
	story: null,
	social: null,
	seasonGoal: null,
};

//============================================
// Shallow equality check for dirty-flag detection
function shallowEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false;
	}

	const aObj = a as Record<string, unknown>;
	const bObj = b as Record<string, unknown>;
	const keysA = Object.keys(aObj);
	const keysB = Object.keys(bObj);

	if (keysA.length !== keysB.length) {
		return false;
	}

	for (const key of keysA) {
		if (aObj[key] !== bObj[key]) {
			return false;
		}
	}

	return true;
}

//============================================
// Main render entry point
export function renderState(view: GameViewState): void {
	// Header: update if dirty
	if (!shallowEqual(view.header, lastCache.header)) {
		// Header is typically a simple data object, but we need a Player-like
		// interface for updateHeader. In a full implementation, we'd either:
		// 1. Pass a constructed mini-Player object from view state
		// 2. Refactor updateHeader to accept HeaderView directly
		// For now, mark as cached and skip (P5.2 will split widgets).
		lastCache.header = view.header;
	}

	// Stat bars: update if dirty
	if (!shallowEqual(view.statBars, lastCache.statBars)) {
		for (const bar of view.statBars) {
			updateStatBar(bar.key, bar.value);
		}
		lastCache.statBars = view.statBars;
	}

	// Career section: update if dirty
	if (!shallowEqual(view.career, lastCache.career)) {
		// Career update deferred to P5.2 widget refactoring
		lastCache.career = view.career;
	}

	// Story log: update if dirty (note: append-only in UI, so compare full state)
	if (!shallowEqual(view.story, lastCache.story)) {
		clearStory();
		for (const headline of view.story.headlines) {
			addHeadline(headline);
		}
		for (const line of view.story.log) {
			addText(line);
		}
		lastCache.story = view.story;
	}

	// Social feed: update if dirty
	if (!shallowEqual(view.social, lastCache.social)) {
		// Social feed rendering deferred to P5.2 widget refactoring
		lastCache.social = view.social;
	}

	// Season goal: update if dirty
	if (!shallowEqual(view.seasonGoal, lastCache.seasonGoal)) {
		// Season goal display deferred to P5.2 widget refactoring
		lastCache.seasonGoal = view.seasonGoal;
	}
}

//============================================
// Clear cache (used when loading a new game or resetting)
export function clearRenderCache(): void {
	lastCache = {
		header: null,
		statBars: null,
		career: null,
		story: null,
		social: null,
		seasonGoal: null,
	};
}
