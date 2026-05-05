// recruiting_events.ts - junior/senior preseason and postseason events
//
// Handles camp choices, film building, showcase attendance, and offer reviews
// for recruiting stages at ages 16-17.

import { Player, modifyStat, randomInRange } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { rand } from '../core/rng.js';
import {
	updateRecruitingStars,
	initRecruitingProfile,
	getRecruitingStory,
	generateIncrementalOffers,
	processVisit,
	applyCoachingChange,
	processCommitment,
	advanceSchoolInterestStates,
	CollegeOffer,
} from '../recruiting.js';
import {
	getSchoolsAtState,
	countOffers,
} from '../recruiting_profile.js';
import {
	resolveSchoolDisplayName,
	getSchoolDivisionLabel,
	estimateSeasonWins,
	showVisitImpressionCard,
} from './recruiting_helpers.js';
import { showSigningDay, showWalkOnOptions } from './recruiting_offers.js';

//============================================
// Junior Pre-Season: "Summer Before Junior Year"
// Camp, highlight reel, or training choice
export function showJuniorPreseason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	// Initialize recruiting profile if needed
	if (!player.recruitingProfile) {
		player.recruitingProfile = initRecruitingProfile(
			player,
			ctx.ncaaSchools,
		);
	}

	// Set varsity flag for recruiting events
	player.storyFlags['hs_varsity'] = true;

	ctx.addHeadline('Summer Before Junior Year');
	ctx.addText('NCAA coaches can now officially contact you.');
	ctx.addText(`Recruiting: ${player.recruitingStars} stars`);

	const profile = player.recruitingProfile;

	ctx.waitForInteraction('Recruiting Decision', [
		{
			text: 'Attend Elite Camp',
			primary: false,
			action: () => {
				// Camp performance roll
				const campScore =
					player.core.athleticism * 0.3
					+ player.core.technique * 0.3
					+ player.core.confidence * 0.2
					+ randomInRange(-15, 15);

				if (campScore >= 50) {
					// Good camp
					profile.buzz = Math.min(100, profile.buzz + 12);
					profile.campReputation = Math.min(100, profile.campReputation + 15);
					modifyStat(player, 'technique', 2);
					profile.campAttended = true;
					ctx.addText(
						'You crush it at the Elite Camp. Coaches are taking notice.'
						+ ' Your forty time turns heads and your position drills are sharp.',
					);
				} else {
					// Disappointing camp
					profile.buzz = Math.min(100, profile.buzz + 3);
					profile.campReputation = Math.min(100, profile.campReputation + 3);
					modifyStat(player, 'confidence', -3);
					profile.campAttended = true;
					ctx.addText(
						'The Elite Camp does not go as planned.'
						+ ' Your forty time is disappointing and you struggle with'
						+ ' the position drills. There is still time to recover.',
					);
				}

				ctx.updateStats(player);
				showJuniorPreseasonNarrative(player, ctx);
				onDone();
			},
		},
		{
			text: 'Build Highlight Reel',
			primary: false,
			action: () => {
				// Advance film grade
				if (profile.filmGrade === 'none') {
					profile.filmGrade = 'serviceable';
					ctx.addText(
						'Your uncle helps edit your highlight reel for free.'
						+ ' It is not perfect, but it shows your best plays.'
						+ ' Coaches now have something to watch.',
					);
				} else if (profile.filmGrade === 'serviceable') {
					profile.filmGrade = 'strong';
					ctx.addText(
						'Your coach helps you pick the strongest clips from sophomore'
						+ ' and early junior footage. The reel is polished and shows real growth.',
					);
				} else {
					ctx.addText(
						'You update your highlight reel with the latest footage.'
						+ ' Every clip is carefully chosen to show your best work.',
					);
				}
				profile.buzz = Math.min(100, profile.buzz + 8);
				profile.exposure = Math.min(100, profile.exposure + 5);
				ctx.updateStats(player);
				showJuniorPreseasonNarrative(player, ctx);
				onDone();
			},
		},
		{
			text: 'Focus on Training',
			primary: true,
			action: () => {
				modifyStat(player, 'athleticism', 3);
				modifyStat(player, 'technique', 2);
				modifyStat(player, 'footballIq', 1);
				ctx.addText(
					'You spend the summer in the weight room and on the practice field.'
					+ ' No camps, no social media. Just grinding.'
					+ ' Your body is stronger and your fundamentals are sharper.',
				);
				ctx.updateStats(player);
				showJuniorPreseasonNarrative(player, ctx);
				onDone();
			},
		},
	]);
}

//============================================
// Junior Post-Season: offer review, visit, verbal commit
export function showJuniorPostseason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	const profile = player.recruitingProfile;
	if (!profile) {
		onDone();
		return;
	}

	// Update recruiting stars based on season performance
	updateRecruitingStars(player);

	// Advance school interest states (using season record)
	// Estimate wins from season stats or use a reasonable default
	const seasonWins = estimateSeasonWins(player);
	const playoffAppearance = false; // simplified for now
	advanceSchoolInterestStates(profile, player, seasonWins, playoffAppearance);

	// Generate 1-3 new incremental offers
	generateIncrementalOffers(profile, player, ctx.ncaaSchools, randomInRange(1, 3));

	ctx.addHeadline('Junior Season Complete');
	ctx.addText(`Recruiting: ${player.recruitingStars} stars`);

	// Show recruiting narrative
	const offerCount = countOffers(profile);
	const offers = getSchoolsAtState(profile, 'soft_offer');
	const narrativeOffers: CollegeOffer[] = offers.map((s) => ({
		collegeName: s.schoolId,
		division: getSchoolDivisionLabel(s.schoolId, ctx),
		scholarshipType: s.scholarshipType,
		prestige: s.interest,
		interest: s.interest,
	}));
	const story = getRecruitingStory(player.recruitingStars, narrativeOffers);
	ctx.addText(story);

	// Academic warning if at risk
	if (profile.academicStanding === 'at_risk') {
		ctx.addText(
			'Your counselor warns that your core GPA is drifting toward the danger zone.'
			+ ' Two schools have paused recruiting until your grades improve.',
		);
	}

	// Build choices based on what is available
	const choices: { text: string; primary: boolean; action: () => void }[] = [];

	// Unofficial visit option (if any offers exist)
	if (offerCount > 0) {
		const topOffer = offers[0];
		if (topOffer) {
			const schoolName = resolveSchoolDisplayName(topOffer.schoolId, ctx);
			choices.push({
				text: `Visit ${schoolName}`,
				primary: false,
				action: () => {
					const impression = processVisit(
						profile,
						topOffer.schoolId,
						'unofficial',
					);
					if (impression) {
						ctx.addText(`You take an unofficial visit to ${schoolName}.`);
						showVisitImpressionCard(ctx, impression, schoolName);
					}
					// Register with NCAA eligibility center
					profile.eligibilityRegistered = true;
					ctx.addText('You also register with the NCAA Eligibility Center.');
					ctx.updateStats(player);
					ctx.save();
					advanceToNextYear(player, ctx);
				},
			});
		}
	}

	// Verbal commit option (if committable offer exists)
	const committableOffers = profile.schools.filter((s) => s.isCommittable);
	if (committableOffers.length > 0) {
		const topCommittable = committableOffers[0];
		const commitSchoolName = resolveSchoolDisplayName(
			topCommittable.schoolId,
			ctx,
		);
		choices.push({
			text: `Commit to ${commitSchoolName}`,
			primary: false,
			action: () => {
				processCommitment(profile, topCommittable.schoolId);
				ctx.addResult(
					`${player.firstName} verbally commits to ${commitSchoolName}!`,
				);
				ctx.addText(
					'The commitment is non-binding, but it is a major milestone.'
					+ ' Coaches from other schools may back off now.',
				);
				profile.eligibilityRegistered = true;
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		});
	}

	// Keep options open (always available)
	choices.push({
		text: 'Keep Options Open',
		primary: true,
		action: () => {
			ctx.addText(
				'You decide to keep your options open heading into senior year.'
				+ ' There is still time to build your profile and earn better offers.',
			);
			profile.eligibilityRegistered = true;
			ctx.updateStats(player);
			ctx.save();
			advanceToNextYear(player, ctx);
		},
	});

	ctx.waitForInteraction('Junior Offseason', choices);
}

//============================================
// Senior Pre-Season: official visit, final reel, national showcase
export function showSeniorPreseason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	const profile = player.recruitingProfile;
	if (!profile) {
		// Should not happen, but just advance
		onDone();
		return;
	}

	profile.phase = 'senior';

	// Force eligibility registration if not done
	if (!profile.eligibilityRegistered) {
		profile.eligibilityRegistered = true;
		ctx.addText('You register with the NCAA Eligibility Center before the season.');
	}

	// Random coaching change event (10% chance)
	if (rand() < 0.1) {
		const affectedId = applyCoachingChange(profile);
		if (affectedId) {
			const schoolName = resolveSchoolDisplayName(affectedId, ctx);
			ctx.addText(
				`Breaking news: The head coach at ${schoolName} just took another job.`
				+ ' Your relationship with that program resets to zero.',
			);
			if (profile.verbalCommit === affectedId) {
				ctx.addText(
					'You were committed there. The new staff has not confirmed your spot.'
					+ ' Your commitment is in limbo.',
				);
			}
		}
	}

	ctx.addHeadline('Summer Before Senior Year');
	ctx.addText(`Recruiting: ${player.recruitingStars} stars`);
	ctx.addText(`Buzz: ${profile.buzz} | Film: ${profile.filmGrade}`);

	const choices: { text: string; primary: boolean; action: () => void }[] = [];

	// Official visit (if offers exist)
	const offersForVisit = getSchoolsAtState(profile, 'soft_offer')
		.filter((s) => s.visitStatus !== 'official')
		.slice(0, 3);

	if (offersForVisit.length > 0) {
		const topVisitSchool = offersForVisit[0];
		const visitSchoolName = resolveSchoolDisplayName(topVisitSchool.schoolId, ctx);
		choices.push({
			text: `Official Visit: ${visitSchoolName}`,
			primary: false,
			action: () => {
				const impression = processVisit(
					profile,
					topVisitSchool.schoolId,
					'official',
				);
				if (impression) {
					ctx.addText(
						`You take an official visit to ${visitSchoolName}.`
						+ ' The school flies you out, shows you the facilities, and rolls out'
						+ ' the red carpet.',
					);
					showVisitImpressionCard(ctx, impression, visitSchoolName);
				}
				ctx.updateStats(player);
				onDone();
			},
		});
	}

	// Final highlight reel
	choices.push({
		text: 'Final Highlight Reel',
		primary: false,
		action: () => {
			if (profile.filmGrade === 'none' || profile.filmGrade === 'poor') {
				profile.filmGrade = 'strong';
			} else {
				profile.filmGrade = 'elite';
			}
			profile.buzz = Math.min(100, profile.buzz + 10);
			ctx.addText(
				'Your senior tape shows growth that coaches want to see.'
				+ ` Film grade: ${profile.filmGrade}.`,
			);
			ctx.updateStats(player);
			onDone();
		},
	});

	// National showcase
	choices.push({
		text: 'Attend National Showcase',
		primary: true,
		action: () => {
			// High-variance camp event
			const campScore =
				player.core.athleticism * 0.3
				+ player.core.technique * 0.3
				+ player.core.confidence * 0.2
				+ randomInRange(-20, 20);

			if (campScore >= 55) {
				profile.buzz = Math.min(100, profile.buzz + 15);
				profile.showcaseAttended = true;
				// Generate new offers from schools not yet tracking
				generateIncrementalOffers(profile, player, ctx.ncaaSchools, randomInRange(1, 2));
				ctx.addText(
					'You dominate the National Showcase. New schools are calling.'
					+ ' Your stock is rising fast.',
				);
			} else {
				profile.buzz = Math.min(100, profile.buzz + 3);
				profile.exposure = Math.min(100, profile.exposure + 5);
				profile.showcaseAttended = true;
				ctx.addText(
					'The National Showcase is a mixed bag. You have some good reps'
					+ ' but nothing that turns heads. The exposure still helps.',
				);
			}
			ctx.updateStats(player);
			onDone();
		},
	});

	ctx.waitForInteraction('Senior Year Recruiting', choices);
}

//============================================
// Helper: show recruiting narrative for junior preseason
function showJuniorPreseasonNarrative(player: Player, ctx: CareerContext): void {
	const profile = player.recruitingProfile;
	if (!profile) return;

	const offerCount = countOffers(profile);
	const narrativeOffers: CollegeOffer[] = getSchoolsAtState(
		profile,
		'soft_offer',
	).map((s) => ({
		collegeName: s.schoolId,
		division: 'D1',
		scholarshipType: s.scholarshipType,
		prestige: s.interest,
		interest: s.interest,
	}));
	const story = getRecruitingStory(player.recruitingStars, narrativeOffers);
	ctx.addText(story);
	ctx.addText(
		`Schools watching: ${profile.schools.length} | Offers: ${offerCount} | Buzz: ${profile.buzz}`,
	);
}
