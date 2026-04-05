// nfl_rookie.ts - age 22: NFL rookie year
//
// Draft day simulation. Assigned to real NFL team.
// 17-game season. Rookie contract, low salary.

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
export const nflRookieHandler: YearHandler = {
	id: 'nfl_rookie',
	ageStart: 22,
	ageEnd: 22,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear = 1;

		// Generate NFL season (assigns player to a real team if name doesn't match)
		const season = buildNFLSeason(player.teamName);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			// Sync player teamName with the actual NFL team from the season
			player.teamName = playerTeam.getDisplayName();
			player.teamStrength = playerTeam.strength;
		}

		ctx.updateHeader(player);
		ctx.addHeadline('Age 22 - NFL Rookie Season');
		ctx.addText(`${player.firstName} begins NFL career with the ${player.teamName}.`);

		ctx.showChoices([{
			text: 'Start Season',
			primary: true,
			action: () => {
				startSeason(player, ctx, SEASON_CONFIG, season,
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
	player.career.money += 750000;
	ctx.addText(`Earned $750,000 in rookie contract.`);

	ctx.addHeadline('Offseason Plan');
	ctx.showChoices([
		{
			text: 'Hire a personal trainer for the offseason',
			primary: false,
			action: () => {
				modifyStat(player, 'athleticism', 3);
				modifyStat(player, 'technique', 1);
				player.career.money = Math.max(0, player.career.money - 100000);
				ctx.addText(`${player.firstName} invests $100k in elite personal training.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Study the playbook obsessively',
			primary: true,
			action: () => {
				modifyStat(player, 'footballIq', 4);
				modifyStat(player, 'technique', 2);
				ctx.addText(`${player.firstName} becomes a film room expert this offseason.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Enjoy the money and relax',
			primary: false,
			action: () => {
				modifyStat(player, 'confidence', 3);
				modifyStat(player, 'health', 2);
				modifyStat(player, 'discipline', -2);
				ctx.addText(`${player.firstName} enjoys the rookie success with time off.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
