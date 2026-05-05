// hs_recruiting.ts - public recruiting API entry points
//
// Delegates to recruiting_events and recruiting_offers modules.
// This is the ONLY file imported by hs_varsity.ts.

import { Player } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import {
	showJuniorPreseason,
	showJuniorPostseason,
	showSeniorPreseason,
} from './recruiting_events.js';
import { showSigningDay, showWalkOnOptions } from './recruiting_offers.js';

//============================================
// Hook called at the start of varsity year (ages 16-17)
// This is the ONLY entry point from hs_varsity.ts
export function runRecruitingHookForStartOfYear(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	if (player.age === 16) {
		showJuniorPreseason(player, ctx, onDone);
	} else if (player.age === 17) {
		showSeniorPreseason(player, ctx, onDone);
	} else {
		// No recruiting for other ages
		onDone();
	}
}

//============================================
// Hook called at the end of varsity season (ages 16-17)
// This is the ONLY entry point from hs_varsity.ts for post-season
export function runRecruitingHookForEndOfSeason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	if (player.age === 16) {
		showJuniorPostseason(player, ctx, onDone);
	} else if (player.age === 17) {
		showSigningDay(player, ctx, onDone);
	} else {
		onDone();
	}
}

//============================================
// Re-export walk-on options for use elsewhere if needed
export { showWalkOnOptions };
