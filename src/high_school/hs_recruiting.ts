// hs_recruiting.ts - recruiting UI flow layer
//
// Interaction builders for the high school recruiting experience.
// Calls pure engine functions from recruiting.ts and presents
// results via ctx.waitForInteraction(). No recruiting logic here --
// only interaction sequencing and narrative text.

import { Player, modifyStat, randomInRange } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { formatSchoolName } from '../ncaa.js';
import { advanceToNextYear } from '../core/year_runner.js';
import {
	updateRecruitingStars,
	initRecruitingProfile,
	getRecruitingStory,
	commitToCollege,
	advanceSchoolInterestStates,
	generateIncrementalOffers,
	processVisit,
	processCommitment,
	processDecommitment,
	processSigning,
	applyCoachingChange,
	CollegeOffer,
} from '../recruiting.js';
import {
	getSchoolById, getSchoolsAtState, getCommittedSchool, countOffers,
} from '../recruiting_profile.js';

//============================================
// Clear the hs_varsity flag when transitioning to college
// Prevents recruiting events from leaking into college via HS event fallback
function clearRecruitingFlags(player: Player): void {
	delete player.storyFlags['hs_varsity'];
}

//============================================
// Hook called at the start of varsity year (ages 16-17)
// This is the ONLY entry point from hs_varsity.ts
export function runRecruitingHookForStartOfYear(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	if (player.age === 16) {
		showJuniorPreseason(player, ctx, onDone);
	} else if (player.age === 17) {
		showSeniorPreseason(player, ctx, onDone);
	} else {
		// No recruiting for other ages
		onDone();
	}
}

//============================================
// Hook called at the end of varsity season (ages 16-17)
// This is the ONLY entry point from hs_varsity.ts for post-season
export function runRecruitingHookForEndOfSeason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	if (player.age === 16) {
		showJuniorPostseason(player, ctx, onDone);
	} else if (player.age === 17) {
		showSigningDay(player, ctx, onDone);
	} else {
		onDone();
	}
}

//============================================
// Junior Pre-Season: "Summer Before Junior Year"
// Camp, highlight reel, or training choice
function showJuniorPreseason(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	// Initialize recruiting profile if needed
	if (!player.recruitingProfile) {
		player.recruitingProfile = initRecruitingProfile(player, ctx.ncaaSchools);
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
				const campScore = player.core.athleticism * 0.3
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
						+ ' Your forty time turns heads and your position drills are sharp.'
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
						+ ' the position drills. There is still time to recover.'
					);
				}

				ctx.updateStats(player);
				showRecruitingNarrative(player, ctx);
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
						+ ' Coaches now have something to watch.'
					);
				} else if (profile.filmGrade === 'serviceable') {
					profile.filmGrade = 'strong';
					ctx.addText(
						'Your coach helps you pick the strongest clips from sophomore'
						+ ' and early junior footage. The reel is polished and shows real growth.'
					);
				} else {
					ctx.addText(
						'You update your highlight reel with the latest footage.'
						+ ' Every clip is carefully chosen to show your best work.'
					);
				}
				profile.buzz = Math.min(100, profile.buzz + 8);
				profile.exposure = Math.min(100, profile.exposure + 5);
				ctx.updateStats(player);
				showRecruitingNarrative(player, ctx);
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
					+ ' Your body is stronger and your fundamentals are sharper.'
				);
				ctx.updateStats(player);
				showRecruitingNarrative(player, ctx);
				onDone();
			},
		},
	]);
}

//============================================
// Junior Post-Season: offer review, visit, verbal commit
function showJuniorPostseason(
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
	const narrativeOffers: CollegeOffer[] = offers.map(s => ({
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
			+ ' Two schools have paused recruiting until your grades improve.'
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
					const impression = processVisit(profile, topOffer.schoolId, 'unofficial');
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
	const committableOffers = profile.schools.filter(s => s.isCommittable);
	if (committableOffers.length > 0) {
		const topCommittable = committableOffers[0];
		const commitSchoolName = resolveSchoolDisplayName(topCommittable.schoolId, ctx);
		choices.push({
			text: `Commit to ${commitSchoolName}`,
			primary: false,
			action: () => {
				processCommitment(profile, topCommittable.schoolId);
				ctx.addResult(`${player.firstName} verbally commits to ${commitSchoolName}!`);
				ctx.addText(
					'The commitment is non-binding, but it is a major milestone.'
					+ ' Coaches from other schools may back off now.'
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
				+ ' There is still time to build your profile and earn better offers.'
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
function showSeniorPreseason(
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
	if (Math.random() < 0.10) {
		const affectedId = applyCoachingChange(profile);
		if (affectedId) {
			const schoolName = resolveSchoolDisplayName(affectedId, ctx);
			ctx.addText(
				`Breaking news: The head coach at ${schoolName} just took another job.`
				+ ' Your relationship with that program resets to zero.'
			);
			if (profile.verbalCommit === affectedId) {
				ctx.addText(
					'You were committed there. The new staff has not confirmed your spot.'
					+ ' Your commitment is in limbo.'
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
		.filter(s => s.visitStatus !== 'official')
		.slice(0, 3);

	if (offersForVisit.length > 0) {
		const topVisitSchool = offersForVisit[0];
		const visitSchoolName = resolveSchoolDisplayName(topVisitSchool.schoolId, ctx);
		choices.push({
			text: `Official Visit: ${visitSchoolName}`,
			primary: false,
			action: () => {
				const impression = processVisit(profile, topVisitSchool.schoolId, 'official');
				if (impression) {
					ctx.addText(
						`You take an official visit to ${visitSchoolName}.`
						+ ' The school flies you out, shows you the facilities, and rolls out'
						+ ' the red carpet.'
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
				+ ` Film grade: ${profile.filmGrade}.`
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
			const campScore = player.core.athleticism * 0.3
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
					+ ' Your stock is rising fast.'
				);
			} else {
				profile.buzz = Math.min(100, profile.buzz + 3);
				profile.exposure = Math.min(100, profile.exposure + 5);
				profile.showcaseAttended = true;
				ctx.addText(
					'The National Showcase is a mixed bag. You have some good reps'
					+ ' but nothing that turns heads. The exposure still helps.'
				);
			}
			ctx.updateStats(player);
			onDone();
		},
	});

	ctx.waitForInteraction('Senior Year Recruiting', choices);
}

//============================================
// Signing Day: after senior season, the big decision
function showSigningDay(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	const profile = player.recruitingProfile;
	if (!profile) {
		onDone();
		return;
	}

	// Final recruiting star update
	updateRecruitingStars(player);

	// Advance states with senior season performance
	const seasonWins = estimateSeasonWins(player);
	advanceSchoolInterestStates(profile, player, seasonWins, false);

	// Final offer wave
	generateIncrementalOffers(profile, player, ctx.ncaaSchools, randomInRange(1, 3));

	ctx.addHeadline('Signing Day');
	ctx.addText(`Final recruiting profile: ${player.recruitingStars} stars | Buzz: ${profile.buzz}`);

	// Check if already committed
	if (profile.verbalCommit) {
		showCommitmentDecision(player, ctx, onDone);
		return;
	}

	// Get all committable offers
	const committable = profile.schools.filter(
		s => s.isCommittable
			&& s.state !== 'offer_pulled'
			&& s.state !== 'signed'
	);

	// Also include verbal offers that are not yet committable
	const verbalOffers = profile.schools.filter(
		s => s.state === 'verbal_offer'
	);

	// Merge and deduplicate, cap at 6
	const allOffers = [...committable, ...verbalOffers];
	const seen = new Set<string>();
	const uniqueOffers = allOffers.filter(s => {
		if (seen.has(s.schoolId)) return false;
		seen.add(s.schoolId);
		return true;
	}).slice(0, 6);

	if (uniqueOffers.length === 0) {
		ctx.addText('The recruiting trail has gone quiet. No committable offers.');
		showWalkOnOptions(player, ctx, onDone);
		return;
	}

	// Show the recruiting story
	const narrativeOffers: CollegeOffer[] = uniqueOffers.map(s => ({
		collegeName: s.schoolId,
		division: getSchoolDivisionLabel(s.schoolId, ctx),
		scholarshipType: s.scholarshipType,
		prestige: s.interest,
		interest: s.interest,
	}));
	const story = getRecruitingStory(player.recruitingStars, narrativeOffers);
	ctx.addText(story);

		// Build offer choices
		const offerChoices = uniqueOffers.map(school => {
			const schoolName = resolveSchoolDisplayName(school.schoolId, ctx);
			const schoolRecord = getSchoolById(school.schoolId, ctx.ncaaSchools);
			const divLabel = getSchoolDivisionLabel(school.schoolId, ctx);
			const scholarshipLabel = school.scholarshipType === 'none'
				? 'Preferred walk-on'
				: school.scholarshipType;
			const projectedRole = getProjectedCollegeRole(player, divLabel, school.interest, school.scholarshipType);
			// Build school record display
			let recordLine = '';
			if (school.schoolRecord) {
				const rec = school.schoolRecord;
				recordLine = `Last season: ${rec.wins}-${rec.losses}`;
				recordLine += `, conf rank: #${rec.conferenceRank}`;
				if (rec.nationalRank > 0) {
					recordLine += `, nationally ranked #${rec.nationalRank}`;
				}
			}

			const detailParts = [
				schoolRecord ? `${schoolRecord.city}, ${schoolRecord.state}` : null,
				schoolRecord ? `${divLabel} - ${schoolRecord.conference}` : divLabel,
				recordLine || null,
				`Scholarship: ${scholarshipLabel}`,
				`Expected role: ${projectedRole.label}`,
			];
			if (school.visitImpression) {
				detailParts.push(`Visit trust: ${school.visitImpression.coachTrust}`);
			}
			if (school.coachRelationship >= 50) {
				detailParts.push('Strong coach relationship');
			}

			return {
				text: schoolName,
				description: detailParts.filter(part => part !== null).join('\n'),
				primary: projectedRole.depthChart === 'starter',
				action: () => {
					// Commit and sign
					if (school.isCommittable) {
						processCommitment(profile, school.schoolId);
				} else {
					// Force commit for verbal offers on signing day
					school.isCommittable = true;
					processCommitment(profile, school.schoolId);
				}
				processSigning(profile);

				// Use commitToCollege narrative
				const offer: CollegeOffer = {
					collegeName: school.schoolId,
					division: divLabel,
					scholarshipType: school.scholarshipType,
					prestige: school.interest,
					interest: school.interest,
				};
				const commitStory = commitToCollege(player, offer);
				ctx.addText(commitStory);

					// Set player state for college transition
					player.teamName = schoolName;
					clearRecruitingFlags(player);
					player.phase = 'college';
					player.depthChart = projectedRole.depthChart;
					ctx.addResult(`${player.firstName} signs with ${schoolName}!`);
					ctx.addText(`Projected role: ${projectedRole.label}.`);
					ctx.updateStats(player);
					ctx.save();
					advanceToNextYear(player, ctx);
				},
			};
		});

		ctx.waitForInteraction(
			'College Decision',
			offerChoices,
			'Each offer shows where the school is, what level it plays at, the scholarship type, and the role coaches are projecting for you.'
		);
	}

//============================================
function getProjectedCollegeRole(
	player: Player,
	division: string,
	interest: number,
	scholarshipType: string,
): { depthChart: 'starter' | 'backup'; label: string } {
	const readiness = player.core.technique + player.core.athleticism + player.core.footballIq;
	const hasFullRide = scholarshipType === 'full';
	const hasPartial = scholarshipType === 'partial';
	const isWalkOn = scholarshipType === 'walk-on' || scholarshipType === 'none';

	// Walk-on: always backup or scout team
	if (isWalkOn) {
		if (readiness >= 200) {
			return {
				depthChart: 'backup',
				label: 'walk-on with a shot to earn playing time',
			};
		}
		return {
			depthChart: 'backup',
			label: 'walk-on, scout team likely',
		};
	}

	// FCS schools: easier to start
	if (division === 'FCS') {
		if (hasFullRide && readiness >= 185) {
			return {
				depthChart: 'starter',
				label: 'expected to compete for starting job immediately',
			};
		}
		if (hasFullRide && interest >= 70) {
			return {
				depthChart: 'starter',
				label: 'competing for early playing time, possible starter',
			};
		}
		if (hasPartial && readiness >= 170) {
			return {
				depthChart: 'backup',
				label: 'rotation player with a path to start by sophomore year',
			};
		}
		return {
			depthChart: 'backup',
			label: 'developmental prospect, likely redshirt candidate',
		};
	}

	// FBS schools: harder to start
	if (player.recruitingStars >= 5 && hasFullRide && readiness >= 195 && interest >= 75) {
		return {
			depthChart: 'starter',
			label: 'possible day-one starter, blue-chip recruit',
		};
	}
	if (player.recruitingStars >= 4 && hasFullRide && readiness >= 180) {
		return {
			depthChart: 'backup',
			label: 'immediate contributor, competing for starting job',
		};
	}
	if (hasFullRide && interest >= 65) {
		return {
			depthChart: 'backup',
			label: 'rotation backup, expected to develop into starter',
		};
	}
	if (hasPartial && readiness >= 170) {
		return {
			depthChart: 'backup',
			label: 'depth piece with upside, needs to earn scholarship upgrade',
		};
	}
	if (hasPartial) {
		return {
			depthChart: 'backup',
			label: 'developmental project, likely redshirt year',
		};
	}
	return {
		depthChart: 'backup',
		label: 'backup with a long road to the field',
	};
}

//============================================
// Commitment decision: honor or decommit
function showCommitmentDecision(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	const profile = player.recruitingProfile!;
	const committedSchoolId = profile.verbalCommit!;
	const schoolName = resolveSchoolDisplayName(committedSchoolId, ctx);

	ctx.addText(
		`You are verbally committed to ${schoolName}.`
		+ ' They expect your signature this week.'
	);

	ctx.waitForInteraction('Signing Day Decision', [
		{
			text: `Sign with ${schoolName}`,
			primary: true,
			action: () => {
				processSigning(profile);

				const school = profile.schools.find(s => s.schoolId === committedSchoolId);
				const offer: CollegeOffer = {
					collegeName: committedSchoolId,
					division: getSchoolDivisionLabel(committedSchoolId, ctx),
					scholarshipType: school?.scholarshipType || 'full',
					prestige: school?.interest || 70,
					interest: school?.interest || 70,
				};
				const commitStory = commitToCollege(player, offer);
				ctx.addText(commitStory);

				player.teamName = schoolName;
				clearRecruitingFlags(player);
				player.phase = 'college';
				ctx.addResult(`${player.firstName} signs with ${schoolName}!`);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Decommit and Reopen Recruitment',
			primary: false,
			action: () => {
				processDecommitment(profile);
				ctx.addText(
					`${player.firstName} decommits from ${schoolName}.`
					+ ' The news breaks fast. Some coaches start calling again,'
					+ ' but others have already moved on.'
				);

				// Now show the regular signing day flow
				// processDecommitment() already cleared verbalCommit
				showSigningDay(player, ctx, onDone);
			},
		},
	]);
}

//============================================
// Walk-on / JUCO / Prep options when no offers
export function showWalkOnOptions(
	player: Player,
	ctx: CareerContext,
	onDone: () => void,
): void {
	const profile = player.recruitingProfile;
	if (!profile) {
		onDone();
		return;
	}

	ctx.addText(
		'The scholarship offers did not come. But your football story is not over.'
		+ ' There are still paths forward.'
	);

	// Pick a random FCS school for walk-on
	const fcsSchools = ctx.ncaaSchools.fcs;
	let walkOnSchool = fcsSchools[0];
	if (fcsSchools.length > 0) {
		walkOnSchool = fcsSchools[randomInRange(0, fcsSchools.length - 1)];
	}
	const walkOnName = formatSchoolName(walkOnSchool);

	ctx.waitForInteraction('What Next?', [
		{
			text: `Walk on at ${walkOnName}`,
			primary: true,
			action: () => {
				const offer: CollegeOffer = {
					collegeName: walkOnSchool.commonName,
					division: 'FCS',
					scholarshipType: 'walk-on',
					prestige: 30,
					interest: 40,
				};
				const commitStory = commitToCollege(player, offer);
				ctx.addText(commitStory);

				profile.signed = true;
				profile.phase = 'complete';
				player.teamName = walkOnName;
				clearRecruitingFlags(player);
				player.phase = 'college';
				ctx.addResult(`${player.firstName} walks on at ${walkOnName}!`);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'JUCO for a Year',
			primary: false,
			action: () => {
				profile.isJuco = true;
				profile.phase = 'postgrad';
				ctx.addText(
					'You decide to spend a year at a junior college.'
					+ ' It is a chance to develop your skills and earn new offers.'
					+ ' The road is longer, but it is still a road.'
				);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		},
		{
			text: 'Prep School Year',
			primary: false,
			action: () => {
				profile.isPrepSchool = true;
				profile.phase = 'postgrad';
				ctx.addText(
					'You enroll at a football prep school for an extra year.'
					+ ' Better coaching, better competition, better film.'
					+ ' This is your second chance.'
				);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		},
	]);
}

//============================================
// Helper: show visit impression card as narrative text
function showVisitImpressionCard(
	ctx: CareerContext,
	impression: { campusVibe: string; coachTrust: string; playingTimePath: string; familyReaction: string },
	schoolName: string,
): void {
	ctx.addText(`Visit Report - ${schoolName}:`);
	ctx.addText(`  Campus Vibe: ${impression.campusVibe}`);
	ctx.addText(`  Coach Trust: ${impression.coachTrust}`);
	ctx.addText(`  Playing Time Path: ${impression.playingTimePath}`);
	ctx.addText(`  Family Reaction: ${impression.familyReaction}`);
}

//============================================
// Helper: show current recruiting narrative
function showRecruitingNarrative(player: Player, ctx: CareerContext): void {
	const profile = player.recruitingProfile;
	if (!profile) return;

	const offerCount = countOffers(profile);
	const narrativeOffers: CollegeOffer[] = getSchoolsAtState(profile, 'soft_offer').map(s => ({
		collegeName: s.schoolId,
		division: 'D1',
		scholarshipType: s.scholarshipType,
		prestige: s.interest,
		interest: s.interest,
	}));
	const story = getRecruitingStory(player.recruitingStars, narrativeOffers);
	ctx.addText(story);
	ctx.addText(`Schools watching: ${profile.schools.length} | Offers: ${offerCount} | Buzz: ${profile.buzz}`);
}

//============================================
// Helper: resolve school display name from ID
function resolveSchoolDisplayName(schoolId: string, ctx: CareerContext): string {
	const school = getSchoolById(schoolId, ctx.ncaaSchools);
	if (school) {
		return formatSchoolName(school);
	}
	return schoolId;
}

//============================================
// Helper: get division label for a school
function getSchoolDivisionLabel(schoolId: string, ctx: CareerContext): string {
	const school = getSchoolById(schoolId, ctx.ncaaSchools);
	if (school) {
		return school.subdivision;
	}
	return 'Unknown';
}

//============================================
// Helper: estimate season wins from player performance
// In a real implementation this would read from LeagueSeason
function estimateSeasonWins(player: Player): number {
	// Rough estimate based on team strength and player contribution
	const baseWins = Math.floor(player.teamStrength / 15);
	const playerBonus = Math.floor(
		(player.core.athleticism + player.core.technique) / 50
	);
	const totalWins = Math.min(10, baseWins + playerBonus + randomInRange(-1, 2));
	return Math.max(0, totalWins);
}
