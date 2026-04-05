// hs_postgrad.ts - JUCO and prep school post-grad year
//
// Handles age 18 when the player chose JUCO or prep school
// instead of signing directly. Called from college_entry.ts
// via the routing check.

import { Player, modifyStat, randomInRange } from '../player.js';
import { CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildJucoSeason } from './juco_season_builder.js';
import {
	updateRecruitingStars,
	generateIncrementalOffers,
	advanceSchoolInterestStates,
} from '../recruiting.js';
import { getSchoolsAtState, getSchoolById, countOffers } from '../recruiting_profile.js';
import { formatSchoolName } from '../ncaa.js';
import { showWalkOnOptions } from './hs_recruiting.js';

//============================================
// Season config for JUCO (shorter season)
const JUCO_SEASON_CONFIG: SeasonConfig = {
	seasonLength: 8,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: false,
	eventChance: 30,
	opponentStrengthBase: 40,
	opponentStrengthRange: 30,
};

//============================================
// Run the JUCO post-grad year
export function runJucoYear(player: Player, ctx: CareerContext): void {
	applyAgeDrift(player);

	ctx.addHeadline('Age 18 - JUCO Year');
	ctx.addText(
		'You arrive at a junior college determined to prove yourself.'
		+ ' The competition is real, and coaches from four-year schools'
		+ ' are watching these games too.'
	);

	// Build JUCO season with generated teams
	const playerStrength = randomInRange(35, 75);
	player.teamStrength = playerStrength;
	const season = buildJucoSeason(playerStrength);

	// Set team name from the generated season's player team
	const playerTeam = season.getPlayerTeam();
	if (playerTeam) {
		player.teamName = `${playerTeam.name} ${playerTeam.mascot}`;
	} else {
		player.teamName = 'Central CC Cougars';
	}

	ctx.waitForInteraction('JUCO Season', [{
		text: 'Start Season',
		primary: true,
		action: () => {
			startSeason(
				player, ctx, JUCO_SEASON_CONFIG, season,
				() => handleJucoSeasonEnd(player, ctx),
			);
		},
	}]);
}

//============================================
// Run the prep school post-grad year (no season, pure training)
export function runPrepYear(player: Player, ctx: CareerContext): void {
	applyAgeDrift(player);

	ctx.addHeadline('Age 18 - Prep School Year');
	ctx.addText(
		'You enroll at a football prep school. Better coaching,'
		+ ' better competition, better facilities.'
		+ ' This is your year to transform.'
	);

	// Stat growth from prep year
	modifyStat(player, 'technique', 7);
	modifyStat(player, 'footballIq', 5);
	modifyStat(player, 'athleticism', 3);
	ctx.updateStats(player);

	ctx.addText(
		'The coaching staff pushes you harder than anyone ever has.'
		+ ' Your technique is sharper, your football IQ is higher,'
		+ ' and your body is stronger.'
	);

	// Update recruiting
	updateRecruitingStars(player);
	const profile = player.recruitingProfile;
	if (profile) {
		profile.buzz = Math.min(100, profile.buzz + 10);

		// Generate offers based on improved stats
		generateIncrementalOffers(profile, player, ctx.ncaaSchools, randomInRange(1, 3));
		advanceSchoolInterestStates(profile, player, 0, false);
	}

	// Show offers or walk-on options
	showPostgradOffers(player, ctx);
}

//============================================
// After JUCO season ends
function handleJucoSeasonEnd(player: Player, ctx: CareerContext): void {
	// Stat growth from JUCO year
	modifyStat(player, 'technique', 5);
	modifyStat(player, 'athleticism', 3);
	ctx.updateStats(player);

	// Update recruiting
	updateRecruitingStars(player);
	const profile = player.recruitingProfile;
	if (profile) {
		// Generate offers based on JUCO performance
		const seasonWins = Math.min(8, randomInRange(3, 7));
		advanceSchoolInterestStates(profile, player, seasonWins, false);
		generateIncrementalOffers(profile, player, ctx.ncaaSchools, randomInRange(2, 4));
	}

	ctx.addHeadline('JUCO Season Complete');
	ctx.addText('Your junior college season is over. Time to see who is calling.');

	showPostgradOffers(player, ctx);
}

//============================================
// Show post-grad offers or walk-on fallback
function showPostgradOffers(player: Player, ctx: CareerContext): void {
	const profile = player.recruitingProfile;
	if (!profile) {
		// Fallback to walk-on
		showWalkOnOptions(player, ctx, () => {});
		return;
	}

	const offers = getSchoolsAtState(profile, 'soft_offer');
	if (offers.length === 0) {
		ctx.addText('No offers came through. But there are still options.');
		showWalkOnOptions(player, ctx, () => {});
		return;
	}

	// Show offers as choices (cap at 4)
	const displayOffers = offers.slice(0, 4);
	ctx.addText(`You have ${offers.length} offer(s) on the table.`);

	const choices = displayOffers.map(school => {
		const schoolData = getSchoolById(school.schoolId, ctx.ncaaSchools);
		const schoolName = schoolData ? formatSchoolName(schoolData) : school.schoolId;
		const divLabel = schoolData ? schoolData.subdivision : 'Unknown';
		const scholarshipLabel = school.scholarshipType !== 'none'
			? ` - ${school.scholarshipType}` : '';

		return {
			text: `${schoolName} (${divLabel}${scholarshipLabel})`,
			primary: false,
			action: () => {
				player.teamName = schoolName;
				// Clear recruiting flag to prevent HS recruiting events in college
				delete player.storyFlags['hs_varsity'];
				player.phase = 'college';
				profile.signed = true;
				profile.phase = 'complete';
				profile.isJuco = false;
				profile.isPrepSchool = false;
				ctx.addResult(`${player.firstName} signs with ${schoolName}!`);
				ctx.addText(
					'After the long road through post-grad football,'
					+ ` you have earned your spot at ${schoolName}.`
				);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		};
	});

	ctx.waitForInteraction('College Offers', choices, 'Choose your college destination.');
}
