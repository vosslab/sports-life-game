// college_senior.ts - age 21: senior year
//
// Final college season. Maximum draft stock pressure.
// Mandatory draft declaration at end. College graduation event.

import { Player, modifyStat, clampStat } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildCollegeSeason } from './college_season_builder.js';
import { formatSchoolName } from '../ncaa.js';

//============================================
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 11,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: true,
	eventChance: 30,
	opponentStrengthBase: 55,
	opponentStrengthRange: 30,
};

//============================================
export const collegeSeniorHandler: YearHandler = {
	id: 'college_senior',
	ageStart: 21,
	ageEnd: 21,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.collegeYear = 4;
		ctx.updateHeader(player);

		ctx.addHeadline('Age 21 - Senior Year');
		ctx.addText(`${player.firstName} is a senior at ${player.teamName}.`);
		ctx.addText('This is the last college season. Make it count.');

		// Generate schedule and start season
		const allSchools = [...ctx.ncaaSchools.fbs, ...ctx.ncaaSchools.fcs];
		const playerSchool = allSchools.find(s => formatSchoolName(s) === player.teamName)
			|| allSchools[0];
		const season = buildCollegeSeason(playerSchool, allSchools);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			player.teamStrength = playerTeam.strength;
		}

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
	ctx.addHeadline('College Graduation');
	ctx.addText(`${player.firstName} graduates from ${player.teamName}!`);
	ctx.addText('Time to prepare for the NFL Draft.');

	ctx.addHeadline('NFL Combine Prep');
	ctx.showChoices([
		{
			text: 'Crush the combine with elite athleticism',
			primary: false,
			action: () => {
				modifyStat(player, 'athleticism', 2);
				player.draftStock = clampStat(player.draftStock + 5);
				ctx.addText(`${player.firstName} dominates the combine with elite athletic performance.`);
				ctx.updateStats(player);
				player.phase = 'nfl';
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Impress scouts with football IQ at Pro Day',
			primary: true,
			action: () => {
				modifyStat(player, 'footballIq', 3);
				player.draftStock = clampStat(player.draftStock + 3);
				ctx.addText(`${player.firstName} impresses scouts with exceptional football intelligence.`);
				ctx.updateStats(player);
				player.phase = 'nfl';
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Let your game tape speak for itself',
			primary: false,
			action: () => {
				modifyStat(player, 'confidence', 3);
				player.draftStock = clampStat(player.draftStock + 2);
				ctx.addText(`${player.firstName} relies on film tape to make the case to scouts.`);
				ctx.updateStats(player);
				player.phase = 'nfl';
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
