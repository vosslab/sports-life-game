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
import { generateNFLPalette, applyPalette } from '../theme.js';
import { getNFLDraftResult } from '../nfl.js';

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

		ctx.addHeadline('NFL Scouting Combine');
		ctx.addText(generateCombineNarrative(player));

		ctx.addHeadline('NFL Draft Day');
		const draftResult = getNFLDraftResult(player);
		player.teamName = draftResult.team;

		const draftLabel = draftResult.round === 0
			? `Signed by ${draftResult.team} as undrafted free agent`
			: `Drafted by ${draftResult.team} - Round ${draftResult.round}, Pick ${draftResult.pick}`;
		player.bigDecisions.push(draftLabel);

		ctx.addText(draftResult.storyText);
		ctx.addResult(`Selected by ${draftResult.team}`);
		if (draftResult.round > 0) {
			ctx.addResult(
				`Round ${draftResult.round} `
				+ `(${draftResult.pick}${getOrdinalSuffix(draftResult.pick)} overall)`
			);
		} else {
			ctx.addResult('Undrafted free agent signing');
		}

		// Generate NFL season (assigns player to a real team if name doesn't match)
		const season = buildNFLSeason(player.teamName);
		const playerTeam = season.getPlayerTeam();
		if (playerTeam) {
			// Sync player teamName with the actual NFL team from the season
			player.teamName = playerTeam.getDisplayName();
			player.teamStrength = playerTeam.strength;
		}
		// Apply real NFL team colors
		const nflPalette = generateNFLPalette(player.teamName);
		applyPalette(nflPalette);
		player.teamPalette = nflPalette;

		ctx.updateHeader(player);
		ctx.addHeadline('Age 22 - NFL Rookie Season');
		ctx.addText(`${player.firstName} begins NFL career with the ${player.teamName}.`);

		ctx.waitForInteraction('NFL Rookie Year', [{
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
	ctx.waitForInteraction('Rookie Offseason', [
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

//============================================
function generateCombineNarrative(player: Player): string {
	const ath = player.core.athleticism;
	const tech = player.core.technique;
	const iq = player.core.footballIq;
	const disc = player.core.discipline;

	let athResult = '';
	if (ath >= 80) {
		athResult = 'You lit up the athletic testing. The 40 and jumps got scouts buzzing.';
	} else if (ath >= 60) {
		athResult = 'Your athletic testing was solid. You looked like you belonged in the draft pool.';
	} else {
		athResult = 'The athletic testing was rough. Your timed drills did not help your case.';
	}

	let techResult = '';
	if (tech >= 75) {
		techResult = ' Position drills were crisp and clean. Coaches saw a pro-ready player.';
	} else if (tech >= 55) {
		techResult = ' Position drills were steady, but not enough to create a big jump.';
	} else {
		techResult = ' Position drills exposed some raw spots that still need work.';
	}

	let interviewResult = '';
	if (iq >= 70 && disc >= 60) {
		interviewResult = ' In team interviews, you came off prepared, mature, and easy to trust.';
	} else if (iq >= 50) {
		interviewResult = ' Interviews were fine. You answered well enough without stealing the room.';
	} else {
		interviewResult = ' Interview sessions were shaky, and some teams questioned your readiness.';
	}

	return athResult + techResult + interviewResult;
}

//============================================
function getOrdinalSuffix(value: number): string {
	const mod100 = value % 100;
	if (mod100 >= 11 && mod100 <= 13) {
		return 'th';
	}

	const mod10 = value % 10;
	if (mod10 === 1) {
		return 'st';
	}
	if (mod10 === 2) {
		return 'nd';
	}
	if (mod10 === 3) {
		return 'rd';
	}
	return 'th';
}
