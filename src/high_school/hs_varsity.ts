// hs_varsity.ts - ages 16-17: varsity high school football
//
// Same school/mascot as frosh/soph. Driver license milestone at 16.
// Depth chart resets (likely backup on varsity).
// Recruiting stars actively tracked. College offers at end of senior year.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { generateHighSchoolTeam } from '../team.js';
import { updateRecruitingStars } from '../recruiting.js';

//============================================
// Season config for varsity
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 10,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: true,
	eventChance: 35,
	opponentStrengthBase: 45,
	opponentStrengthRange: 35,
};

//============================================
export const hsVarsityHandler: YearHandler = {
	id: 'hs_varsity',
	ageStart: 16,
	ageEnd: 17,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Reset depth chart when moving to varsity at age 16
		if (player.age === 16) {
			player.depthChart = 'backup';
			ctx.addHeadline("Driver's License!");
			ctx.addText(`${player.firstName} got a driver's license! Freedom at last.`);
		}

		// Same team identity as frosh/soph
		player.teamName = `${player.hsName} ${player.hsMascot}`;

		// Generate new season schedule
		const team = generateHighSchoolTeam(player.teamName);
		player.teamStrength = team.strength;

		// Update recruiting stars
		updateRecruitingStars(player);

		ctx.updateHeader(player);

		const yearLabel = player.age === 16 ? 'Junior' : 'Senior';
		ctx.addHeadline(`Age ${player.age} - ${yearLabel} Year (Varsity)`);
		ctx.addText(`${player.firstName} is on the varsity team at ${player.hsName}.`);
		ctx.addText(`Playing ${player.position || 'TBD'} as a ${player.depthChart}.`);
		ctx.addText(`Recruiting: ${player.recruitingStars} stars`);

		// Start the season via the weekly engine
		ctx.showChoices([{
			text: 'Start Season',
			primary: true,
			action: () => {
				startSeason(
					player, ctx, SEASON_CONFIG, team.schedule,
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
// Called when the weekly engine finishes the season
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	// Update recruiting stars after season
	updateRecruitingStars(player);

	if (player.age === 17) {
		// Senior year: show college offers
		ctx.addHeadline('Senior Season Complete');
		ctx.addText(`Recruiting: ${player.recruitingStars} stars`);
		ctx.addText('College scouts have been watching. Offers are coming in...');

		// TODO: wire into college offer system (college_offers.ts)
		ctx.showChoices([{
			text: 'View College Offers',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
	} else {
		// Junior year: continue
		ctx.addText('Junior season is over.');
		ctx.showChoices([{
			text: 'Continue to Next Year',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
	}
}
