// nfl_late.ts - ages 37-39: twilight NFL years
//
// Steep athleticism decline. Retirement pressure.
// Farewell events. Forced retirement if stats too low.
// Hall of Fame discussion.

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
export const nflLateHandler: YearHandler = {
	id: 'nfl_late',
	ageStart: 37,
	ageEnd: 39,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear += 1;
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear}`);
		ctx.addText(`${player.firstName} is in the twilight of a long career.`);

		// Forced retirement check
		const totalAbility = player.core.athleticism + player.core.technique;
		if (player.core.health < 20 || totalAbility < 60) {
			ctx.addHeadline('Forced Retirement');
			ctx.addText('The body can no longer keep up. It is time to hang up the cleats.');
			player.phase = 'legacy';
			ctx.addText(`Career earnings: $${(player.career.money / 1000000).toFixed(1)}M`);
			ctx.addText(`NFL seasons: ${player.nflYear}`);
			return;
		}

		const team = generateHighSchoolTeam(player.teamName);
		player.teamStrength = team.strength;

		ctx.showChoices([
			{
				text: 'Play One More Season',
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
					ctx.addText(`Career earnings: $${(player.career.money / 1000000).toFixed(1)}M`);
					player.phase = 'legacy';
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
	const salary = player.depthChart === 'starter' ? 5000000 : 1200000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	// Check for age-39 forced end
	if (player.age >= 39) {
		ctx.addHeadline('Retirement');
		ctx.addText(`${player.firstName} retires at age 39 after ${player.nflYear} NFL seasons.`);
		ctx.addText(`Career earnings: $${(player.career.money / 1000000).toFixed(1)}M`);
		player.phase = 'legacy';
		return;
	}

	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
