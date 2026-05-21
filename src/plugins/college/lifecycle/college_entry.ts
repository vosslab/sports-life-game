// college_entry.ts - College phase entry milestone
//
// Fires once when entering the college phase to announce the milestone
// and set the narrative tone for the new phase.

import type { PhaseStartHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const collegeEntryHook: PhaseStartHook = {
	id: 'college-entry',
	phase: 'college',
	fire(player: Player, ctx: GameContext): void {
		ctx.addHeadline('Welcome to College Football');
		ctx.addText(
			'You\'ve committed to ' + player.teamName + '. The next four years will test ' +
			'your resilience, athleticism, and mental toughness. Every week, every game, ' +
			'shapes your path to the pros.'
		);
	},
};
