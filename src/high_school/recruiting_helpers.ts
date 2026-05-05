// recruiting_helpers.ts - utility functions for recruiting flow
//
// School lookup, division labels, season estimation, and other helpers.

import { Player, randomInRange } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { formatSchoolName } from '../ncaa.js';
import { getSchoolById } from '../recruiting_profile.js';

//============================================
// Helper: resolve school display name from ID
export function resolveSchoolDisplayName(
	schoolId: string,
	ctx: CareerContext,
): string {
	const school = getSchoolById(schoolId, ctx.ncaaSchools);
	if (school) {
		return formatSchoolName(school);
	}
	return schoolId;
}

//============================================
// Helper: get division label for a school
export function getSchoolDivisionLabel(
	schoolId: string,
	ctx: CareerContext,
): string {
	const school = getSchoolById(schoolId, ctx.ncaaSchools);
	if (school) {
		return school.subdivision;
	}
	return 'Unknown';
}

//============================================
// Helper: estimate season wins from player performance
// In a real implementation this would read from LeagueSeason
export function estimateSeasonWins(player: Player): number {
	// Rough estimate based on team strength and player contribution
	const baseWins = Math.floor(player.teamStrength / 15);
	const playerBonus = Math.floor(
		(player.core.athleticism + player.core.technique) / 50
	);
	const totalWins = Math.min(10, baseWins + playerBonus + randomInRange(-1, 2));
	return Math.max(0, totalWins);
}

//============================================
// Helper: show visit impression card as narrative text
export function showVisitImpressionCard(
	ctx: CareerContext,
	impression: {
		campusVibe: string;
		coachTrust: string;
		playingTimePath: string;
		familyReaction: string;
	},
	schoolName: string,
): void {
	ctx.addText(`Visit Report - ${schoolName}:`);
	ctx.addText(`  Campus Vibe: ${impression.campusVibe}`);
	ctx.addText(`  Coach Trust: ${impression.coachTrust}`);
	ctx.addText(`  Playing Time Path: ${impression.playingTimePath}`);
	ctx.addText(`  Family Reaction: ${impression.familyReaction}`);
}

//============================================
// Helper: clear the hs_varsity flag when transitioning to college
// Prevents recruiting events from leaking into college via HS event fallback
export function clearRecruitingFlags(player: Player): void {
	delete player.storyFlags['hs_varsity'];
}
