// year_runner.ts - advances the player through years via handler dispatch
//
// Convention: current age finishes -> offseason runs -> age increments -> next handler starts
// startYear() means "begin the content for this exact age"
//
// Example:
//   age 15 season ends (frosh/soph handler)
//   offseason runs (position change option, stat review)
//   age increments to 16
//   hs_varsity.startYear() begins
//   driver license milestone fires during age-16 flow
//   varsity season starts

import { Player } from '../player.js';
import { CareerContext } from './year_handler.js';
import { getHandler, hasHandler } from './year_registry.js';
import { syncTabsToPhase } from '../tab_manager.js';

//============================================
// Advance player to the next year and dispatch to the correct handler
export function advanceToNextYear(player: Player, ctx: CareerContext): void {
	// Increment age
	player.age += 1;
	// Increment calendar year
	player.seasonYear += 1;

	// Check if we have a handler for this age
	if (!hasHandler(player.age)) {
		// No handler means career is over (age > 39)
		ctx.addHeadline('Career Complete');
		ctx.addText(`${player.firstName} ${player.lastName} has completed their career.`);
		return;
	}

	// Get the handler for the new age
	const handler = getHandler(player.age);

	// Update phase based on handler id
	player.phase = getPhaseForHandler(handler.id);

	// Tab bar must sync after phase change. Without this, tabs show stale
	// buttons from the previous phase (e.g. childhood tabs during high school).
	syncTabsToPhase(player.phase);

	// Dispatch to handler
	handler.startYear(player, ctx);
}

//============================================
// Start a specific year (used for game resume / initial start)
export function startYear(player: Player, ctx: CareerContext): void {
	if (!hasHandler(player.age)) {
		ctx.addHeadline('Career Complete');
		ctx.addText(`${player.firstName} ${player.lastName} has completed their career.`);
		return;
	}

	const handler = getHandler(player.age);
	// Update phase based on handler id (matches advanceToNextYear behavior)
	player.phase = getPhaseForHandler(handler.id);
	// Tab bar must sync after phase change (see advanceToNextYear comment)
	syncTabsToPhase(player.phase);
	handler.startYear(player, ctx);
}

//============================================
// Map handler id to career phase
function getPhaseForHandler(handlerId: string): Player['phase'] {
	if (handlerId === 'kid_years') {
		return 'childhood';
	}
	if (handlerId === 'peewee' || handlerId === 'travel') {
		return 'youth';
	}
	if (handlerId === 'hs_frosh_soph' || handlerId === 'hs_varsity') {
		return 'high_school';
	}
	if (handlerId.startsWith('college')) {
		return 'college';
	}
	if (handlerId.startsWith('nfl')) {
		return 'nfl';
	}
	// Unknown handler ID - throw error instead of silently returning childhood
	throw new Error(`Unknown handler ID: ${handlerId}`);
}
