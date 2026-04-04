// college_entry.ts - age 18: college freshman / redshirt year
//
// If redshirt: training year with events but no game action, big stat growth.
// If playing: 12-game season as backup/starter depending on school choice.

import { Player, modifyStat } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { generateHighSchoolTeam } from '../team.js';

//============================================
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 12,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: true,
	eventChance: 30,
	opponentStrengthBase: 55,
	opponentStrengthRange: 30,
};

//============================================
export const collegeEntryHandler: YearHandler = {
	id: 'college_entry',
	ageStart: 18,
	ageEnd: 18,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.collegeYear = 1;
		ctx.updateHeader(player);

		ctx.addHeadline('Age 18 - College Freshman');
		ctx.addText(`${player.firstName} begins college at ${player.teamName}.`);

		if (player.isRedshirt) {
			// Redshirt year: no games, training growth
			ctx.addText('Redshirt year: training hard, no game action.');
			ctx.addText('Focus on development and getting stronger.');
			// Extra stat growth during redshirt
			modifyStat(player, 'technique', 5);
			modifyStat(player, 'footballIq', 3);
			ctx.updateStats(player);

			ctx.showChoices([{
				text: 'Continue to Sophomore Year',
				primary: true,
				action: () => {
					player.eligibilityYears = 5; // extra year from redshirt
					advanceToNextYear(player, ctx);
				},
			}]);
		} else {
			ctx.addText(`Playing as a ${player.depthChart}.`);

			// Generate schedule and start season
			const team = generateHighSchoolTeam(player.teamName); // reuse generator for now
			player.teamStrength = team.strength;

			ctx.showChoices([{
				text: 'Start Season',
				primary: true,
				action: () => {
					startSeason(player, ctx, SEASON_CONFIG, team.schedule,
						() => handleSeasonEnd(player, ctx),
					);
				},
			}]);
		}
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	ctx.addText('Freshman season is over.');
	// TODO: transfer portal option
	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
