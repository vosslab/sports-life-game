// hs_varsity.ts - ages 16-17: varsity high school football
//
// Same school/mascot as frosh/soph. Driver license milestone at 16.
// Depth chart resets (likely backup on varsity).
// Recruiting stars actively tracked. College offers at end of senior year.

import { Player, randomInRange } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildHighSchoolSeason } from './hs_season_builder.js';
import { updateRecruitingStars } from '../recruiting.js';
import { assignPlayerCollege, formatSchoolName, NCAASchool } from '../ncaa.js';

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

		// Build new season using the season layer
		// Player team drawn from the same pool as opponents (35-90)
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

		// Start the season via the weekly engine
		ctx.showChoicePopup('Varsity Season', [{
			text: 'Start Season',
			primary: true,
			action: () => {
				startSeason(
					player, ctx, SEASON_CONFIG, season,
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
		// Senior year: generate and show real college offers
		ctx.addHeadline('Senior Season Complete');
		ctx.addText(`Recruiting: ${player.recruitingStars} stars`);
		ctx.addText('College scouts have been watching. The offers are in.');

		// Generate 3 college offers based on recruiting stars
		const allSchools = [...ctx.ncaaSchools.fbs, ...ctx.ncaaSchools.fcs];
		const offers: NCAASchool[] = [];
		const usedNames = new Set<string>();
		// Retry up to 10 times to get 3 distinct schools
		let attempts = 0;
		while (offers.length < 3 && allSchools.length > 0 && attempts < 10) {
			const school = assignPlayerCollege(player.recruitingStars, allSchools);
			if (!usedNames.has(school.commonName)) {
				offers.push(school);
				usedNames.add(school.commonName);
			}
			attempts += 1;
		}

		// Fallback: fill remaining slots with random schools if fewer than 3 offers
		if (offers.length < 3 && allSchools.length > 0) {
			for (let i = offers.length; i < 3; i++) {
				const fallbackSchool = allSchools[randomInRange(0, allSchools.length - 1)];
				if (!usedNames.has(fallbackSchool.commonName)) {
					offers.push(fallbackSchool);
					usedNames.add(fallbackSchool.commonName);
				}
			}
		}

		if (offers.length === 0) {
			// Guard: if allSchools is empty, create a hardcoded default
			if (allSchools.length === 0) {
				const defaultSchool: NCAASchool = {
					fullName: 'State University',
					commonName: 'State',
					nickname: 'Wildcats',
					city: 'Springfield',
					state: 'Generic',
					subdivision: 'FBS',
					conference: 'Independent',
				};
				offers.push(defaultSchool);
			} else {
				// Final fallback: pick any school if nothing worked
				const fallback = allSchools[randomInRange(0, allSchools.length - 1)];
				offers.push(fallback);
			}
		}

		// Build choice buttons for each offer
		const offerChoices = offers.map(school => {
			const displayName = formatSchoolName(school);
			const tierLabel = school.subdivision === 'FBS' ? 'FBS' : 'FCS';
			return {
				text: `${displayName} (${tierLabel})`,
				primary: false,
				action: () => {
					player.teamName = displayName;
					player.phase = 'college';
					ctx.addResult(`${player.firstName} commits to ${displayName}!`);
					ctx.updateStats(player);
					ctx.save();
					advanceToNextYear(player, ctx);
				},
			};
		});

		ctx.showChoicePopup('College Offers', offerChoices);
	} else {
		// Junior year: continue
		ctx.addText('Junior season is over.');
		ctx.showChoicePopup('Offseason', [{
			text: 'Continue to Next Year',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
	}
}
