// nfl_peak.ts - ages 27-31: prime NFL years
//
// Highest stat potential. Big contract money.
// Pro Bowl / All-Pro most likely here. Subtle decline near 31.

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
export const nflPeakHandler: YearHandler = {
	id: 'nfl_peak',
	ageStart: 27,
	ageEnd: 31,

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
		ctx.addText(`${player.firstName} is in prime form with the ${player.teamName}.`);

		ctx.showChoicePopup('Prime Years', [{
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
	const salary = player.depthChart === 'starter' ? 12000000 : 3000000;
	player.career.money += salary;
	ctx.addText(`Earned $${(salary / 1000000).toFixed(1)}M this season.`);

	ctx.addHeadline('Peak Years - Major Decision');
	ctx.showChoicePopup('Major Crossroads', [
		{
			text: 'Chase a ring - recruit free agents to your team',
			primary: false,
			action: () => {
				player.hidden.leadership = clampStat(player.hidden.leadership + 3);
				modifyStat(player, 'confidence', 2);
				ctx.addText(`${player.firstName} uses star power to recruit elite teammates.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Sign a massive endorsement deal',
			primary: true,
			action: () => {
				player.career.money += 5000000;
				player.career.popularity = clampStat(player.career.popularity + 5);
				modifyStat(player, 'discipline', -2);
				ctx.addText(`${player.firstName} signs a $5M endorsement deal and becomes a household name.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Give back - start a foundation',
			primary: false,
			action: () => {
				player.hidden.leadership = clampStat(player.hidden.leadership + 4);
				player.career.popularity = clampStat(player.career.popularity + 3);
				modifyStat(player, 'confidence', 2);
				ctx.addText(`${player.firstName} establishes a charitable foundation in the community.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
