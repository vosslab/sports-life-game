// nfl_early.ts - ages 23-26: establishing NFL years
//
// Stats still improving. Contract negotiation events.
// Pro Bowl / All-Pro tracking. Trade request option.

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
export const nflEarlyHandler: YearHandler = {
	id: 'nfl_early',
	ageStart: 23,
	ageEnd: 26,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear += 1;
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear}`);
		ctx.addText(`${player.firstName} is establishing a career with the ${player.teamName}.`);

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
	// Salary based on depth chart
	const salary = player.depthChart === 'starter' ? 5000000 : 1500000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
