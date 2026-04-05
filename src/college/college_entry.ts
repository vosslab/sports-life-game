// college_entry.ts - age 18: college freshman / redshirt year
//
// If redshirt: training year with events but no game action, big stat growth.
// If playing: 12-game season as backup/starter depending on school choice.

import { Player, modifyStat, clampStat, randomInRange } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildCollegeSeason } from './college_season_builder.js';
import { formatSchoolName, assignPlayerCollege } from '../ncaa.js';

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
export const collegeEntryHandler: YearHandler = {
	id: 'college_entry',
	ageStart: 18,
	ageEnd: 18,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);
		player.collegeYear = 1;
		ctx.updateHeader(player);

		ctx.addHeadline('Age 18 - College Freshman');
		ctx.addText(`${player.firstName} begins college at ${player.teamName}.`);

		if (player.isRedshirt) {
			// Redshirt year: no games, training growth
			ctx.addText('Redshirt year: training hard, no game action.');
			ctx.addText('Focus on development and getting stronger.');
			// Extra stat growth during redshirt
			modifyStat(player, 'technique', 5);
			modifyStat(player, 'footballIq', 3);
			ctx.updateStats(player);

			ctx.showChoicePopup('Redshirt Year', [{
				text: 'Continue to Sophomore Year',
				primary: true,
				action: () => {
					player.eligibilityYears = 5; // extra year from redshirt
					advanceToNextYear(player, ctx);
				},
			}]);
		} else {
			ctx.addText(`Playing as a ${player.depthChart}.`);

			// Generate schedule and start season
			const allSchools = [...ctx.ncaaSchools.fbs, ...ctx.ncaaSchools.fcs];
			const playerSchool = allSchools.find(s => formatSchoolName(s) === player.teamName)
				|| allSchools[0];
			const season = buildCollegeSeason(playerSchool, allSchools);
			const playerTeam = season.getPlayerTeam();
			if (playerTeam) {
				player.teamStrength = playerTeam.strength;
			}

			ctx.showChoicePopup('Freshman Year', [{
				text: 'Start Season',
				primary: true,
				action: () => {
					startSeason(player, ctx, SEASON_CONFIG, season,
						() => handleSeasonEnd(player, ctx),
					);
				},
			}]);
		}
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	ctx.addText('Freshman season is over.');
	ctx.addHeadline('Offseason Decision');
	ctx.showChoicePopup('Next Steps', [
		{
			text: 'Hit the transfer portal',
			primary: false,
			action: () => {
				modifyStat(player, 'confidence', 3);
				modifyStat(player, 'discipline', -2);
				ctx.addText(`${player.firstName} enters the transfer portal seeking a better opportunity.`);
				ctx.updateStats(player);

				// Pick a new school from available transfer candidates
				const allSchools = [...ctx.ncaaSchools.fbs, ...ctx.ncaaSchools.fcs];
				const currentSchoolName = player.teamName;
				const portalCandidates = allSchools.filter(
					(school) => formatSchoolName(school) !== currentSchoolName
				);

				if (portalCandidates.length > 0) {
					// Assign new college based on recruiting profile
					const newSchool = assignPlayerCollege(
						Math.max(1, player.recruitingStars),
						portalCandidates
					);
					player.teamName = formatSchoolName(newSchool);

					// Record transfer in big decisions
					player.bigDecisions.push(`Transferred to ${player.teamName}`);

					// Set depth chart: most transfers start as backup
					// 25% chance to be starter if they have strong stats
					const immediateStarterChance = player.core.technique >= 70
						&& player.core.footballIq >= 65
						&& randomInRange(1, 100) <= 25;
					player.depthChart = immediateStarterChance ? 'starter' : 'backup';

					ctx.addText(
						`${player.firstName} lands at ${player.teamName}. `
						+ 'New coaches. New locker room. New chance.'
					);
					if (player.depthChart === 'starter') {
						ctx.addText(
							'Your tape was strong enough that the staff expects you to compete with the starters immediately.'
						);
					} else {
						ctx.addText(
							'The new staff likes your talent, but they are not handing you a starting role. '
							+ 'You will have to earn it.'
						);
					}

					ctx.updateHeader(player);
				}

				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Stay and compete for your spot',
			primary: true,
			action: () => {
				modifyStat(player, 'discipline', 3);
				modifyStat(player, 'technique', 2);
				ctx.addText(`${player.firstName} commits to the program and works to win the starting job.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Focus on academics this summer',
			primary: false,
			action: () => {
				modifyStat(player, 'footballIq', 3);
				modifyStat(player, 'discipline', 2);
				ctx.addText(`${player.firstName} hits the books and film room this summer.`);
				ctx.updateStats(player);
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
