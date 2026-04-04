// nfl_peak.ts - ages 27-31: prime NFL years
//
// Highest stat potential. Big contract money.
// Pro Bowl / All-Pro most likely here. Subtle decline near 31.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { generateHighSchoolTeam } from '../team.js';

//============================================
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 17,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: true,
	eventChance: 35,
	opponentStrengthBase: 60,
	opponentStrengthRange: 30,
};

//============================================
export const nflPeakHandler: YearHandler = {
	id: 'nfl_peak',
	ageStart: 27,
	ageEnd: 31,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear += 1;
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear}`);
		ctx.addText(`${player.firstName} is in prime form with the ${player.teamName}.`);

		const team = generateHighSchoolTeam(player.teamName);
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
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	// Peak salary
	const salary = player.depthChart === 'starter' ? 12000000 : 3000000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
