// nfl_rookie.ts - age 22: NFL rookie year
//
// Draft day simulation. Assigned to real NFL team.
// 17-game season. Rookie contract, low salary.

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
export const nflRookieHandler: YearHandler = {
	id: 'nfl_rookie',
	ageStart: 22,
	ageEnd: 22,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear = 1;

		// TODO: real NFL draft simulation with team assignment
		// For now, use a placeholder team
		if (player.teamName === '' || !player.teamName.includes('NFL')) {
			player.teamName = 'NFL Team';
		}

		ctx.updateHeader(player);
		ctx.addHeadline('Age 22 - NFL Rookie Season');
		ctx.addText(`${player.firstName} begins NFL career with the ${player.teamName}.`);

		// Generate schedule and start season
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
	ctx.addText('Rookie season is in the books.');
	// Rookie salary
	player.career.money += 750000;
	ctx.addText(`Earned $750,000 in rookie contract.`);

	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
