// nfl_veteran.ts - ages 32-36: post-peak veteran years
//
// Athleticism declining (-2 to -4/year). Health concern events.
// Retirement check each offseason. Mentoring events.

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
export const nflVeteranHandler: YearHandler = {
	id: 'nfl_veteran',
	ageStart: 32,
	ageEnd: 36,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear += 1;
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear}`);
		ctx.addText(`${player.firstName} is a veteran presence with the ${player.teamName}.`);
		if (player.core.athleticism < 40) {
			ctx.addText('The body is starting to slow down.');
		}

		const team = generateHighSchoolTeam(player.teamName);
		player.teamStrength = team.strength;

		// Retirement option for veterans
		ctx.showChoices([
			{
				text: 'Start Season',
				primary: true,
				action: () => {
					startSeason(player, ctx, SEASON_CONFIG, team.schedule,
						() => handleSeasonEnd(player, ctx),
					);
				},
			},
			{
				text: 'Retire',
				primary: false,
				action: () => {
					ctx.addHeadline('Retirement');
					ctx.addText(`${player.firstName} announces retirement after ${player.nflYear} NFL seasons.`);
					player.phase = 'legacy';
					// TODO: Hall of Fame check, legacy screen
				},
			},
		]);
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	const salary = player.depthChart === 'starter' ? 8000000 : 2000000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
