// nfl_late.ts - ages 37-39: twilight NFL years
//
// Steep athleticism decline. Retirement pressure.
// Farewell events. Forced retirement if stats too low.
// Hall of Fame discussion.

import { Player, modifyStat, clampStat } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildNFLSeason } from './nfl_season_builder.js';

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
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear + 1}`);
		ctx.addText(`${player.firstName} is in the twilight of a long career.`);

		// Forced retirement check - nflYear not yet incremented so count is accurate
		const totalAbility = player.core.athleticism + player.core.technique;
		if (player.core.health < 20 || totalAbility < 60) {
			ctx.addHeadline('Forced Retirement');
			ctx.addText('The body can no longer keep up. It is time to hang up the cleats.');
			player.phase = 'legacy';
			ctx.addText(`Career earnings: $${(player.career.money / 1000000).toFixed(1)}M`);
			ctx.addText(`NFL seasons: ${player.nflYear}`);
			return;
		}

		const season = buildNFLSeason(player.teamName);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			player.teamName = playerTeam.getDisplayName();
			player.teamStrength = playerTeam.strength;
		}

		// nflYear incremented only when player commits to playing the season
		ctx.showChoices([
			{
				text: 'Play One More Season',
				primary: true,
				action: () => {
					player.nflYear += 1;
					startSeason(player, ctx, SEASON_CONFIG, season,
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

	ctx.addHeadline('Twilight Years');
	ctx.showChoices([
		{
			text: 'Embrace the farewell tour',
			primary: true,
			action: () => {
				player.career.popularity = clampStat(player.career.popularity + 5);
				modifyStat(player, 'confidence', 3);
				ctx.addText(`${player.firstName} embraces the farewell tour with fans.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'No fanfare, just compete',
			primary: false,
			action: () => {
				modifyStat(player, 'discipline', 3);
				modifyStat(player, 'technique', 1);
				modifyStat(player, 'confidence', 1);
				ctx.addText(`${player.firstName} keeps grinding without drawing attention.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
