// nfl_declaration.ts - Age 20 NFL declaration window opens
//
// Fires once at age 20 to notify the player about the early NFL declaration option.
// Junior players can declare early if they meet draft-stock thresholds.

import type { AgeHook } from '../../plugin_host.js';
import type { Player } from '../../../player.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const nflDeclarationHook: AgeHook = {
	id: 'college-age-20-nfl-declaration',
	age: 20,
	once: true,
	fire(player: Player, ctx: GameContext): void {
		ctx.addText(
			'You turned 20. With two years of college experience, you\'re now eligible ' +
			'to declare for the NFL Draft early. If your draft stock is strong enough, ' +
			'this could be a strategic opportunity to enter the league and start your pro career.'
		);
	},
};
