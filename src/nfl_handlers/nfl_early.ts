// nfl_early.ts - ages 23-26: establishing NFL years
//
// Stats still improving. Contract negotiation events.
// Pro Bowl / All-Pro tracking. Trade request option.

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
export const nflEarlyHandler: YearHandler = {
	id: 'nfl_early',
	ageStart: 23,
	ageEnd: 26,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.nflYear += 1;

		// Build season first so team name is synced before displaying intro text
		const season = buildNFLSeason(player.teamName);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			player.teamName = playerTeam.getDisplayName();
			player.teamStrength = playerTeam.strength;
		}

		ctx.updateHeader(player);
		ctx.addHeadline(`Age ${player.age} - NFL Season ${player.nflYear}`);
		ctx.addText(`${player.firstName} is establishing a career with the ${player.teamName}.`);

		ctx.showChoicePopup('Early NFL Career', [{
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
	const salary = player.depthChart === 'starter' ? 5000000 : 1500000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	ctx.addHeadline('Offseason Priorities');
	ctx.showChoicePopup('Next Chapter', [
		{
			text: 'Push for a contract extension',
			primary: false,
			action: () => {
				player.career.money += 2000000;
				modifyStat(player, 'confidence', 2);
				ctx.addText(`${player.firstName} negotiates a $2M offseason bonus extension.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Focus on becoming a team leader',
			primary: true,
			action: () => {
				player.hidden.leadership = clampStat(player.hidden.leadership + 4);
				modifyStat(player, 'discipline', 2);
				ctx.addText(`${player.firstName} takes on a leadership role for the team.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Train at a position-specific camp',
			primary: false,
			action: () => {
				modifyStat(player, 'technique', 3);
				modifyStat(player, 'athleticism', 1);
				ctx.addText(`${player.firstName} refines position-specific skills at elite camps.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
