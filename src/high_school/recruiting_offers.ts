// recruiting_offers.ts - offer review, commitment, and signing day
//
// Handles signing day flow, commitment decisions, walk-on/JUCO alternatives.

import { Player } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { formatSchoolName } from '../ncaa.js';
import { rand } from '../core/rng.js';
import {
	processCommitment,
	processSigning,
	processDecommitment,
	commitToCollege,
	generateIncrementalOffers,
	updateRecruitingStars,
	advanceSchoolInterestStates,
	getRecruitingStory,
	CollegeOffer,
} from '../recruiting.js';
import {
	getSchoolById,
	getSchoolsAtState,
	countOffers,
} from '../recruiting_profile.js';
import {
	clearRecruitingFlags,
	resolveSchoolDisplayName,
	getSchoolDivisionLabel,
	estimateSeasonWins,
} from './recruiting_helpers.js';

//============================================
// Signing Day: after senior season, the big decision
export function showSigningDay(
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
	generateIncrementalOffers(profile, player, ctx.ncaaSchools, 2);

	ctx.addHeadline('Signing Day');
	ctx.addText(
		`Final recruiting profile: ${player.recruitingStars} stars | Buzz: ${profile.buzz}`,
	);

	// Check if already committed
	if (profile.verbalCommit) {
		showCommitmentDecision(player, ctx, onDone);
		return;
	}

	// Get all committable offers
	const committable = profile.schools.filter(
		(s) =>
			s.isCommittable
			&& s.state !== 'offer_pulled'
			&& s.state !== 'signed'
	);

	// Also include verbal offers that are not yet committable
	const verbalOffers = profile.schools.filter(
		(s) => s.state === 'verbal_offer'
	);

	// Merge and deduplicate, cap at 6
	const allOffers = [...committable, ...verbalOffers];
	const seen = new Set<string>();
	const uniqueOffers = allOffers
		.filter((s) => {
			if (seen.has(s.schoolId)) return false;
			seen.add(s.schoolId);
			return true;
		})
		.slice(0, 6);

	if (uniqueOffers.length === 0) {
		ctx.addText('The recruiting trail has gone quiet. No committable offers.');
		showWalkOnOptions(player, ctx, onDone);
		return;
	}

	// Show the recruiting story
	const narrativeOffers: CollegeOffer[] = uniqueOffers.map((s) => ({
		collegeName: s.schoolId,
		division: getSchoolDivisionLabel(s.schoolId, ctx),
		scholarshipType: s.scholarshipType,
		prestige: s.interest,
		interest: s.interest,
	}));
	const story = getRecruitingStory(player.recruitingStars, narrativeOffers);
	ctx.addText(story);

	// Build offer choices
	const offerChoices = uniqueOffers.map((school) => {
		const schoolName = resolveSchoolDisplayName(school.schoolId, ctx);
		const schoolRecord = getSchoolById(school.schoolId, ctx.ncaaSchools);
		const divLabel = getSchoolDivisionLabel(school.schoolId, ctx);
		const scholarshipLabel =
			school.scholarshipType === 'none'
				? 'Preferred walk-on'
				: school.scholarshipType;
		const projectedRole = getProjectedCollegeRole(
			player,
			divLabel,
			school.interest,
			school.scholarshipType,
		);
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
			schoolRecord
				? `${divLabel} - ${schoolRecord.conference}`
				: divLabel,
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
			description: detailParts
				.filter((part) => part !== null)
				.join('\n'),
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
		'Each offer shows where the school is, what level it plays at, the scholarship type, and the role coaches are projecting for you.',
	);
}

//============================================
// Projected college role calculation
export function getProjectedCollegeRole(
	player: Player,
	division: string,
	interest: number,
	scholarshipType: string,
): { depthChart: 'starter' | 'backup'; label: string } {
	const readiness =
		player.core.technique
		+ player.core.athleticism
		+ player.core.footballIq;
	const hasFullRide = scholarshipType === 'full';
	const hasPartial = scholarshipType === 'partial';
	const isWalkOn =
		scholarshipType === 'walk-on' || scholarshipType === 'none';

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
	if (
		player.recruitingStars >= 5
		&& hasFullRide
		&& readiness >= 195
		&& interest >= 75
	) {
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
		+ ' They expect your signature this week.',
	);

	ctx.waitForInteraction('Signing Day Decision', [
		{
			text: `Sign with ${schoolName}`,
			primary: true,
			action: () => {
				processSigning(profile);

				const school = profile.schools.find(
					(s) => s.schoolId === committedSchoolId,
				);
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
					+ ' but others have already moved on.',
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
		+ ' There are still paths forward.',
	);

	// Pick a random FCS school for walk-on
	const fcsSchools = ctx.ncaaSchools.fcs;
	let walkOnSchool = fcsSchools[0];
	if (fcsSchools.length > 0) {
		walkOnSchool = fcsSchools[Math.floor(rand() * fcsSchools.length)];
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
					+ ' The road is longer, but it is still a road.',
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
					+ ' This is your second chance.',
				);
				ctx.updateStats(player);
				ctx.save();
				advanceToNextYear(player, ctx);
			},
		},
	]);
}
