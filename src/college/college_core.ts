// college_core.ts - ages 19-20: sophomore/junior college years
//
// 12-game season. NIL deals available (year 2+).
// Draft stock tracking (year 3+). Transfer portal option each offseason.
// Junior year: early declaration option if eligible.

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
export const collegeCoreHandler: YearHandler = {
	id: 'college_core',
	ageStart: 19,
	ageEnd: 20,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.collegeYear += 1;
		ctx.updateHeader(player);

		const yearLabel = player.collegeYear === 2 ? 'Sophomore' : 'Junior';
		ctx.addHeadline(`Age ${player.age} - ${yearLabel} Year`);
		ctx.addText(`${player.firstName} is a ${yearLabel.toLowerCase()} at ${player.teamName}.`);

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
	const yearLabel = player.collegeYear === 2 ? 'Sophomore' : 'Junior';
	ctx.addText(`${yearLabel} season is over.`);

	// Junior year: early declaration option
	if (player.collegeYear >= 3) {
		const canDeclare = player.core.athleticism >= 60 || player.core.technique >= 70;
		if (canDeclare) {
			ctx.addText('NFL scouts are talking. You could declare for the draft early.');
			ctx.addHeadline('Offseason Training');
			ctx.showChoices([
				{
					text: 'Train with a speed coach',
					primary: false,
					action: () => {
						modifyStat(player, 'athleticism', 3);
						modifyStat(player, 'health', -1);
						ctx.addText(`${player.firstName} works intensively with a speed coach.`);
						ctx.updateStats(player);
						advanceToNextYear(player, ctx);
					},
				},
				{
					text: 'Work on football film all summer',
					primary: false,
					action: () => {
						modifyStat(player, 'footballIq', 3);
						modifyStat(player, 'technique', 1);
						ctx.addText(`${player.firstName} studies film and refines technique.`);
						ctx.updateStats(player);
						advanceToNextYear(player, ctx);
					},
				},
				{
					text: 'Get bigger in the weight room',
					primary: true,
					action: () => {
						modifyStat(player, 'technique', 2);
						modifyStat(player, 'athleticism', 1);
						modifyStat(player, 'health', 1);
						ctx.addText(`${player.firstName} gains strength in the offseason.`);
						ctx.updateStats(player);
						advanceToNextYear(player, ctx);
					},
				},
			]);
			return;
		}
	}

	// Sophomore or Junior (no early declaration option)
	ctx.addHeadline('Offseason Training');
	ctx.showChoices([
		{
			text: 'Train with a speed coach',
			primary: false,
			action: () => {
				modifyStat(player, 'athleticism', 3);
				modifyStat(player, 'health', -1);
				ctx.addText(`${player.firstName} works intensively with a speed coach.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Work on football film all summer',
			primary: false,
			action: () => {
				modifyStat(player, 'footballIq', 3);
				modifyStat(player, 'technique', 1);
				ctx.addText(`${player.firstName} studies film and refines technique.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Get bigger in the weight room',
			primary: true,
			action: () => {
				modifyStat(player, 'technique', 2);
				modifyStat(player, 'athleticism', 1);
				modifyStat(player, 'health', 1);
				ctx.addText(`${player.firstName} gains strength in the offseason.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
