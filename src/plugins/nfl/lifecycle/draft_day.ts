// nfl/lifecycle/draft_day.ts - Age 22 NFL draft day hook
//
// Fires once at age 22 to transition into NFL career.

import type { AgeHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const draftDayHook: AgeHook = {
	id: 'nfl-age-22-draft-day',
	age: 22,
	once: true,
	priority: 100,

	fire(player: Player, ctx: GameContext): void {
		// Draft day is unconditional at age 22 in current model.
		// Future condition predicate could gate on draft stock or phase.
		ctx.addHeadline('Draft Day!');
		ctx.addText('You step up to the podium as your name is called. A new era begins.');
		player.phase = 'nfl';
	},
};
