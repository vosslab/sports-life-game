// college_senior.ts - age 21: senior year
//
// Final college season. Maximum draft stock pressure.
// Mandatory draft declaration at end. College graduation event.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { generateHighSchoolTeam } from '../team.js';

//============================================
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 12,
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
		const team = generateHighSchoolTeam(player.teamName);
		player.teamStrength = team.strength;

		ctx.showChoices([{
			text: 'Start Season',
			primary: true,
			action: () => {
				startSeason(player, ctx, SEASON_CONFIG, team.schedule,
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
	ctx.addText('Time to enter the NFL Draft.');

	// TODO: NFL combine, pro day, draft stock finalization
	ctx.showChoices([{
		text: 'Enter NFL Draft',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
