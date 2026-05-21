// nfl/lifecycle/nfl_entry.ts - NFL phase entry hook
//
// Fires when entering NFL phase (rookie season).

import type { PhaseStartHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const nflEntryHook: PhaseStartHook = {
	id: 'nfl-entry',
	phase: 'nfl',
	priority: 100,

	fire(player: Player, ctx: GameContext): void {
		ctx.addHeadline('Welcome to the NFL');
		ctx.addText('Your rookie season is about to begin. Time to prove yourself at the highest level.');
	},
};
