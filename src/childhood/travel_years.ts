// travel_years.ts - ages 11-13: travel team football
//
// Same town/mascot as peewee. Play against other schools.
// 8-game season. Depth chart introduced (starter/backup).
// Position can shift based on growth.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';

//============================================
export const travelHandler: YearHandler = {
	id: 'travel',
	ageStart: 11,
	ageEnd: 13,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Same team as peewee
		player.teamName = `${player.townName} ${player.townMascot}`;
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - Travel Team`);
		ctx.addText(`${player.firstName} plays travel ball for the ${player.teamName}.`);

		// TODO: implement 8-game season with depth chart
		ctx.showChoices([{
			text: 'Continue',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
	},

	getSeasonConfig(): SeasonConfig {
		return {
			seasonLength: 8,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: false,
			eventChance: 30,
			opponentStrengthBase: 35,
			opponentStrengthRange: 25,
		};
	},
};
