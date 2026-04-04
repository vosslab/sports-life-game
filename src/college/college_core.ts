// college_core.ts - ages 19-20: sophomore/junior college years
//
// 12-game season. NIL deals available (year 2+).
// Draft stock tracking (year 3+). Transfer portal option each offseason.
// Junior year: early declaration option if eligible.

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
	const yearLabel = player.collegeYear === 2 ? 'Sophomore' : 'Junior';
	ctx.addText(`${yearLabel} season is over.`);

	// Junior year: early declaration option
	if (player.collegeYear >= 3) {
		const canDeclare = player.core.athleticism >= 60 || player.core.technique >= 70;
		if (canDeclare) {
			ctx.addText('NFL scouts are talking. You could declare for the draft early.');
			ctx.showChoices([
				{
					text: 'Declare for Draft',
					primary: false,
					action: () => {
						player.phase = 'nfl';
						advanceToNextYear(player, ctx);
					},
				},
				{
					text: 'Return for Senior Year',
					primary: true,
					action: () => advanceToNextYear(player, ctx),
				},
			]);
			return;
		}
	}

	// TODO: transfer portal option
	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
