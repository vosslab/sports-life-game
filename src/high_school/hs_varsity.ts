// hs_varsity.ts - ages 16-17: varsity high school football
//
// Same school/mascot as frosh/soph. Driver license milestone at 16.
// Depth chart resets (likely backup on varsity).
// Recruiting is handled entirely by hs_recruiting.ts via two hooks.

import { Player, randomInRange } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildHighSchoolSeason } from './hs_season_builder.js';
import { updateRecruitingStars } from '../recruiting.js';
import { applyPalette } from '../theme.js';
import {
	runRecruitingHookForStartOfYear,
	runRecruitingHookForEndOfSeason,
} from './hs_recruiting.js';

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
		// Reapply team colors each season
		if (player.teamPalette) {
			applyPalette(player.teamPalette);
		}

		// Build new season using the season layer
		const playerStrength = randomInRange(35, 90);
		player.teamStrength = playerStrength;

		// Update recruiting stars
		updateRecruitingStars(player);

		ctx.updateHeader(player);

		const yearLabel = player.age === 16 ? 'Junior' : 'Senior';
		ctx.addHeadline(`Age ${player.age} - ${yearLabel} Year (Varsity)`);
		ctx.addText(`${player.firstName} is on the varsity team at ${player.hsName}.`);
		ctx.addText(`Playing ${player.position || 'TBD'} as a ${player.depthChart}.`);
		ctx.addText(`Recruiting: ${player.recruitingStars} stars`);

		// Build the season
		const season = buildHighSchoolSeason(player.hsName, player.hsMascot, playerStrength);

		// Run recruiting pre-season hook, then start football season
		runRecruitingHookForStartOfYear(player, ctx, () => {
			ctx.waitForInteraction('Varsity Season', [{
				text: 'Start Season',
				primary: true,
				action: () => {
					startSeason(
						player, ctx, SEASON_CONFIG, season,
						() => handleSeasonEnd(player, ctx),
					);
				},
			}]);
		});
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
// Called when the weekly engine finishes the season
// Delegates entirely to the recruiting post-season hook
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	// Update recruiting stars after season
	updateRecruitingStars(player);

	// Recruiting handles all post-season flow (offers, visits, signing)
	runRecruitingHookForEndOfSeason(player, ctx, () => {
		// This callback is only reached if recruiting has nothing to do
		// (should not happen for ages 16-17, but safe fallback)
		ctx.addText('Season is over.');
	});
}
