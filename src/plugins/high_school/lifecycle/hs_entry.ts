// hs_entry.ts - High School phase entry milestone
//
// Fires once when entering the high_school phase to announce the milestone
// and set the narrative tone for the new phase.

import type { PhaseStartHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const hsEntryHook: PhaseStartHook = {
	id: 'hs-entry',
	phase: 'high_school',
	fire(_player: Player, ctx: GameContext): void {
		ctx.addHeadline("You're a High School Freshman");
		ctx.addText(
			'Welcome to high school. Four years ahead: growing as an athlete, ' +
				'building your name, and catching the eye of college scouts.'
		);
	},
};
