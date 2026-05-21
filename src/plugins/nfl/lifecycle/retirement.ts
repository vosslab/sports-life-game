// nfl/lifecycle/retirement.ts - Career end hook for NFL retirement
//
// Fires when player reaches end of career (retirement).

import type { CareerEndHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const retirementHook: CareerEndHook = {
	id: 'nfl-retirement',
	trigger: 'retirement',
	priority: 100,

	fire(player: Player, ctx: GameContext): void {
		ctx.addHeadline('End of Career');
		ctx.addText("After a legendary career in the NFL, it's time to hang it up.");
	},
};
