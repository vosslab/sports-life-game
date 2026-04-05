// nfl_veteran.ts - ages 32-36: post-peak veteran years
//
// Athleticism declining (-2 to -4/year). Health concern events.
// Retirement check each offseason. Mentoring events.

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
export const nflVeteranHandler: YearHandler = {
	id: 'nfl_veteran',
	ageStart: 32,
	ageEnd: 36,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Build season first so team name is synced before displaying intro text
		const season = buildNFLSeason(player.teamName);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			player.teamName = playerTeam.getDisplayName();
			player.teamStrength = playerTeam.strength;
		}

		// Increment nflYear after retirement choice so retiring reports correct count
		ctx.updateHeader(player);
		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear + 1}`);
		ctx.addText(`${player.firstName} is a veteran presence with the ${player.teamName}.`);
		if (player.core.athleticism < 40) {
			ctx.addText('The body is starting to slow down.');
		}

		// Retirement option for veterans
		ctx.showChoices([
			{
				text: 'Start Season',
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

	ctx.addHeadline('Veteran Wisdom');
	ctx.showChoices([
		{
			text: 'Mentor the young guys',
			primary: true,
			action: () => {
				player.hidden.leadership = clampStat(player.hidden.leadership + 5);
				player.career.popularity = clampStat(player.career.popularity + 2);
				modifyStat(player, 'athleticism', -1);
				ctx.addText(`${player.firstName} becomes a mentor and leader in the locker room.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Switch to a contending team',
			primary: false,
			action: () => {
				modifyStat(player, 'confidence', 3);
				modifyStat(player, 'athleticism', 1);
				player.career.popularity = clampStat(player.career.popularity - 2);
				ctx.addText(`${player.firstName} makes one final move to chase a championship.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Restructure your contract to help the team',
			primary: false,
			action: () => {
				player.hidden.leadership = clampStat(player.hidden.leadership + 3);
				player.career.money -= 1000000;
				modifyStat(player, 'discipline', 2);
				ctx.addText(`${player.firstName} restructures to help the team, taking a $1M pay cut.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
