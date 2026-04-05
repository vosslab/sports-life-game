// recruiting.ts - college recruiting engine (pure functions, no UI)
//
// Pure recruiting calculations and state transitions.
// No modals, buttons, or flow timing -- that lives in hs_recruiting.ts.

import { Player, randomInRange } from './player.js';
import { NCAASchool } from './ncaa.js';
import {
	RecruitingProfile, SchoolInterest, SchoolRecord, OfferState, VisitImpression,
	createRecruitingProfile, advanceOfferState, getSchoolById,
	AcademicStanding, CoreProgress,
} from './recruiting_profile.js';

//============================================
// College offer from a recruiting school
export interface CollegeOffer {
	collegeName: string;
	division: string;        // 'D1 Power 5' | 'D1 Group of 5' | 'D2' | 'D3'
	scholarshipType: string; // 'full' | 'partial' | 'walk-on'
	prestige: number;        // 1-100
	interest: number;        // 1-100, how much they want the player
}

//============================================
// Complete recruiting state for a player
export interface RecruitingState {
	stars: number;           // 0-5 star rating
	offers: CollegeOffer[];
	committed: boolean;
	committedTo: string | null;
	overallRanking: number;  // regional ranking 1-500
}

//============================================
// Power 5 college names for realistic variety
const POWER5_COLLEGES = [
	'Alabama',
	'Ohio State',
	'Clemson',
	'Oregon',
	'USC',
	'Michigan',
	'LSU',
	'Georgia',
	'Texas',
	'Penn State',
	'Oklahoma',
	'Texas A&M',
	'Nebraska',
	'Florida',
	'Notre Dame'
];

//============================================
// Group of 5 college names
const GROUP_OF_5_COLLEGES = [
	'Boise State',
	'Memphis',
	'UCF',
	'Appalachian State',
	'Coastal Carolina',
	'Liberty',
	'San Diego State',
	'Nevada',
	'Air Force',
	'Colorado State',
	'Tulane',
	'Temple'
];

//============================================
// Common D2 and D3 college names
const D2_D3_COLLEGES = [
	'West Chester',
	'Slippery Rock',
	'Bloomsburg',
	'Frostburg State',
	'Shippensburg',
	'Valdosta State',
	'North Dakota State',
	'Truman State',
	'Winona State',
	'Milwaukee School of Engineering',
	'Ithaca',
	'Alfred State',
	'Canisius',
	'Holy Cross',
	'Colby',
	'Bowdoin',
	'Union College'
];

//============================================
// Calculate star rating based on weighted formula of player stats
// Uses: athleticism (0.25) + technique (0.25) + footballIq (0.2)
//       + confidence (0.15) + discipline (0.15)
// 5 stars: >= 75, 4 stars: >= 60, 3 stars: >= 45, 2 stars: >= 30, else 1
// Writes the result directly to player.recruitingStars.
export function updateRecruitingStars(player: Player): number {
	const weighted =
		player.core.athleticism * 0.25 +
		player.core.technique * 0.25 +
		player.core.footballIq * 0.2 +
		player.core.confidence * 0.15 +
		player.core.discipline * 0.15;

	// Determine star rating from weighted score
	let stars: number;
	if (weighted >= 75) {
		stars = 5;
	} else if (weighted >= 60) {
		stars = 4;
	} else if (weighted >= 45) {
		stars = 3;
	} else if (weighted >= 30) {
		stars = 2;
	} else {
		stars = 1;
	}

	// Write to player so the value persists
	player.recruitingStars = stars;

	return stars;
}

//============================================
// Select random college name from appropriate list
function getRandomCollege(division: string): string {
	if (division === 'D1 Power 5') {
		return POWER5_COLLEGES[randomInRange(0, POWER5_COLLEGES.length - 1)];
	} else if (division === 'D1 Group of 5') {
		return GROUP_OF_5_COLLEGES[randomInRange(0, GROUP_OF_5_COLLEGES.length - 1)];
	} else {
		return D2_D3_COLLEGES[randomInRange(0, D2_D3_COLLEGES.length - 1)];
	}
}

//============================================
// Generate college offers based on star rating, also considers season wins
// 5 stars: 5-8 offers, Power 5 with full scholarships
// 4 stars: 3-6 offers, Power 5 and Group of 5, mostly full
// 3 stars: 2-4 offers, Group of 5 and D2, partial scholarships
// 2 stars: 0-2 offers, D2 and D3, partial or walk-on
// 1 star: 0-1 offers, D3 or walk-on
export function generateOffers(
	player: Player,
	stars: number,
	seasonWins: number
): CollegeOffer[] {
	const offers: CollegeOffer[] = [];
	const usedColleges = new Set<string>();

	let offerCount: number;
	let divisionList: string[];
	let scholarshipWeights: { full: number; partial: number; walkOn: number };

	switch (stars) {
		case 5:
			// Elite prospect: lots of Power 5 offers with full scholarships
			offerCount = randomInRange(5, 8);
			divisionList = Array(offerCount).fill('D1 Power 5');
			scholarshipWeights = { full: 1.0, partial: 0.0, walkOn: 0.0 };
			break;

		case 4:
			// Very good prospect: mix of Power 5 and Group of 5
			offerCount = randomInRange(3, 6);
			divisionList = [
				...Array(Math.ceil(offerCount * 0.6)).fill('D1 Power 5'),
				...Array(Math.floor(offerCount * 0.4)).fill('D1 Group of 5')
			];
			scholarshipWeights = { full: 0.8, partial: 0.2, walkOn: 0.0 };
			break;

		case 3:
			// Good prospect: Group of 5 and D2 offers
			offerCount = randomInRange(2, 4);
			divisionList = [
				...Array(Math.ceil(offerCount * 0.5)).fill('D1 Group of 5'),
				...Array(Math.floor(offerCount * 0.5)).fill('D2')
			];
			scholarshipWeights = { full: 0.4, partial: 0.6, walkOn: 0.0 };
			break;

		case 2:
			// Average prospect: D2 and D3 offers, mostly partial
			offerCount = randomInRange(0, 2);
			divisionList = [
				...Array(Math.ceil(offerCount * 0.5)).fill('D2'),
				...Array(Math.floor(offerCount * 0.5)).fill('D3')
			];
			scholarshipWeights = { full: 0.1, partial: 0.7, walkOn: 0.2 };
			break;

		case 1:
		default:
			// Marginal prospect: possibly one D3 or walk-on
			offerCount = randomInRange(0, 1);
			divisionList = Array(offerCount).fill('D3');
			scholarshipWeights = { full: 0.0, partial: 0.4, walkOn: 0.6 };
			break;
	}

	// Generate offers
	for (let i = 0; i < offerCount; i++) {
		const division = divisionList[i];

		// Keep generating college names until we get a unique one
		let collegeName: string;
		let attempts = 0;
		do {
			collegeName = getRandomCollege(division);
			attempts++;
		} while (usedColleges.has(collegeName) && attempts < 10);

		usedColleges.add(collegeName);

		// Determine scholarship type based on weights
		const scholarshipRoll = Math.random();
		let scholarshipType: string;
		if (scholarshipRoll < scholarshipWeights.full) {
			scholarshipType = 'full';
		} else if (
			scholarshipRoll <
			scholarshipWeights.full + scholarshipWeights.partial
		) {
			scholarshipType = 'partial';
		} else {
			scholarshipType = 'walk-on';
		}

		// Calculate prestige (1-100) based on division
		let prestige: number;
		if (division === 'D1 Power 5') {
			prestige = randomInRange(80, 100);
		} else if (division === 'D1 Group of 5') {
			prestige = randomInRange(60, 79);
		} else if (division === 'D2') {
			prestige = randomInRange(40, 59);
		} else {
			prestige = randomInRange(20, 39);
		}

		// Interest level: based on stars + season performance
		const baseInterest = stars * 15 + seasonWins * 2;
		const interest = Math.min(
			100,
			baseInterest + randomInRange(-5, 10)
		);

		offers.push({
			collegeName,
			division,
			scholarshipType,
			prestige,
			interest
		});
	}

	return offers;
}

//============================================
// Generate narrative text about recruiting status
export function getRecruitingStory(
	stars: number,
	offers: CollegeOffer[]
): string {
	let story = '';

	if (stars === 5) {
		story =
			'Your phone won\'t stop ringing. Every Power 5 program in the ' +
			'country wants a piece of you. Coaches are lining up to ' +
			'visit, and the prestige schools are pulling out all the stops ' +
			'to get your commitment.';
	} else if (stars === 4) {
		story =
			'The recruiting buzz around you is real. Top programs are ' +
			'actively pursuing you, and your mailbox is filling up with ' +
			'official visit invitations. You\'re getting the attention ' +
			'of the elite.';
	} else if (stars === 3) {
		story =
			'You\'re starting to see serious recruiting interest. ' +
			'Multiple college programs see potential in you, and ' +
			'coaches are beginning to make their pitches. This is your ' +
			'moment to shine.';
	} else if (stars === 2) {
		story =
			'The recruiting trail has been somewhat quiet, but there are ' +
			'still opportunities. Some programs are interested in what ' +
			'you can become. A strong finish to the season could change ' +
			'everything.';
	} else if (stars === 1) {
		story =
			'The recruiting trail has been quiet. You\'re hoping to catch ' +
			'the eye of smaller programs or earn a walk-on opportunity. ' +
			'Every game matters now.';
	}

	// Add info about best offer if available
	if (offers.length > 0) {
		const topOffer = offers[0];
		story +=
			` Your best offer so far is from ${topOffer.collegeName} ` +
			`(${topOffer.division}, ${topOffer.scholarshipType} scholarship).`;
	}

	return story;
}

//============================================
// Player commits to a college offer
// Returns dramatic story text about the decision
export function commitToCollege(
	player: Player,
	offer: CollegeOffer
): string {
	let story = '';

	const prestige = offer.prestige;

	// Build dramatic story based on prestige and scholarship type
	if (prestige >= 80 && offer.scholarshipType === 'full') {
		story =
			`You stood in your kitchen, holding the phone to your ear. ` +
			`The head coach of ${offer.collegeName} just made the pitch ` +
			`of a lifetime. Full ride. Guaranteed playing time. National ` +
			`championship dreams. Your heart racing, you took a deep ` +
			`breath and said the words you\'d been dreaming about since ` +
			`you were a kid: "I\'m committing to ${offer.collegeName}." ` +
			`Your parents rushed in, tears streaming down their faces. ` +
			`This was it. Your path was set.`;
	} else if (prestige >= 60 && offer.scholarshipType === 'full') {
		story =
			`After weeks of considering your options, you made the call. ` +
			`You were going to ${offer.collegeName}. It felt right. A ` +
			`strong program, a solid education, and a real shot to play ` +
			`at a high level. You could feel your mom beaming over your ` +
			`shoulder as you finalized the decision.`;
	} else if (offer.scholarshipType === 'partial') {
		story =
			`You stared at the scholarship paperwork in front of you. ` +
			`${offer.collegeName} was offering you a partial ride - not ` +
			`the full deal, but it was an opportunity. A chance to prove ` +
			`yourself. You signed on the dotted line, determined to earn ` +
			`the respect of that coaching staff.`;
	} else {
		// Walk-on
		story =
			`The walk-on offer from ${offer.collegeName} wasn\'t glamorous, ` +
			`but it was your shot. No scholarship guarantee, just the ` +
			`opportunity to earn it. You took it. You\'d show them what ` +
			`you were made of.`;
	}

	return story;
}

//============================================
// Initialize a recruiting profile at the start of junior year (age 16)
// Seeds initial school watchlist based on recruiting stars and position
export function initRecruitingProfile(
	player: Player,
	ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] },
): RecruitingProfile {
	const profile = createRecruitingProfile();

	// Set buzz based on current recruiting stars
	profile.buzz = Math.min(100, player.recruitingStars * 12 + randomInRange(0, 10));
	profile.exposure = Math.min(100, player.recruitingStars * 8 + randomInRange(0, 5));

	// Set academic standing based on discipline and footballIq
	const academicScore = player.core.discipline * 0.6 + player.core.footballIq * 0.4;
	if (academicScore >= 60) {
		profile.academicStanding = 'excellent';
		profile.coreProgress = 'strong';
	} else if (academicScore >= 35) {
		profile.academicStanding = 'solid';
		profile.coreProgress = 'on_track';
	} else {
		profile.academicStanding = 'at_risk';
		profile.coreProgress = 'behind';
	}

	// Seed watchlist schools based on star rating
	const allSchools = [...ncaaSchools.fbs, ...ncaaSchools.fcs];
	seedSchoolWatchlist(profile, player, allSchools);

	return profile;
}

//============================================
// Seed the initial school watchlist based on player stars and position
function seedSchoolWatchlist(
	profile: RecruitingProfile,
	player: Player,
	allSchools: NCAASchool[],
): void {
	// Determine how many schools to seed (5-star gets more attention)
	const stars = player.recruitingStars;
	const targetCount = Math.min(15, 5 + stars * 2);

	// Build candidate pool based on star tier
	let candidates: NCAASchool[];
	if (stars >= 4) {
		candidates = allSchools.filter(s => s.subdivision === 'FBS');
	} else if (stars >= 3) {
		candidates = allSchools;
	} else if (stars >= 2) {
		// Mostly FCS plus a few FBS
		const fcsSchools = allSchools.filter(s => s.subdivision === 'FCS');
		const fbsSlice = allSchools.filter(s => s.subdivision === 'FBS').slice(0, 5);
		candidates = [...fcsSchools, ...fbsSlice];
	} else {
		candidates = allSchools.filter(s => s.subdivision === 'FCS');
	}

	// Shuffle and pick
	const shuffled = [...candidates].sort(() => Math.random() - 0.5);
	const selected = shuffled.slice(0, targetCount);
	const usedIds = new Set<string>();

	for (const school of selected) {
		if (usedIds.has(school.commonName)) {
			continue;
		}
		usedIds.add(school.commonName);

		// Base interest: higher stars = more initial interest from schools
		const baseInterest = stars * 10 + randomInRange(5, 20);
		const schemeFit = computeSchoolFit(school, player);

		const entryInterest = Math.min(100, baseInterest + schemeFit);
		const entry: SchoolInterest = {
			schoolId: school.commonName,
			state: 'watchlist',
			scholarshipType: 'none',
			interest: entryInterest,
			coachRelationship: 0,
			visitStatus: 'none',
			isCommittable: false,
			schoolRecord: generateSchoolRecord(school, entryInterest),
		};
		profile.schools.push(entry);
	}
}

//============================================
// Derive scheme fit from school and player position (0-30 bonus)
// Not persisted -- computed fresh when needed
export function computeSchoolFit(school: NCAASchool, player: Player): number {
	const positionFit = randomInRange(5, 25);
	let prestigeBonus = 0;
	if (school.subdivision === 'FBS') {
		prestigeBonus = 5;
	}
	return positionFit + prestigeBonus;
}

//============================================
// Advance school interest states after a season
// Schools with high enough interest progress through the state machine
export function advanceSchoolInterestStates(
	profile: RecruitingProfile,
	player: Player,
	seasonWins: number,
	playoffAppearance: boolean,
): void {
	// Boost buzz from season performance
	profile.buzz = Math.min(100, profile.buzz + seasonWins * 3);
	if (playoffAppearance) {
		profile.buzz = Math.min(100, profile.buzz + 8);
	}

	// Update exposure from buzz
	profile.exposure = Math.min(100, Math.max(profile.exposure, profile.buzz * 0.7));

	for (const school of profile.schools) {
		// Skip terminal states
		if (school.state === 'offer_pulled' || school.state === 'signed'
			|| school.state === 'committed') {
			continue;
		}

		// Boost interest from buzz, relationship, and season
		const buzzBoost = profile.buzz * 0.3;
		const relationshipBoost = school.coachRelationship * 0.2;
		const seasonBoost = seasonWins * 2;
		school.interest = Math.min(
			100, school.interest + buzzBoost + relationshipBoost + seasonBoost
		);

		// Advance state if interest threshold met
		if (school.state === 'watchlist' && school.interest >= 45) {
			advanceOfferState(school, 'interest');
		} else if (school.state === 'interest' && school.interest >= 55) {
			advanceOfferState(school, 'soft_offer');
			school.scholarshipType = determineScholarship(player.recruitingStars);
		} else if (school.state === 'soft_offer' && school.interest >= 65) {
			advanceOfferState(school, 'verbal_offer');
		} else if (school.state === 'verbal_offer' && school.interest >= 75) {
			if (school.coachRelationship >= 30) {
				advanceOfferState(school, 'committable_offer');
				school.isCommittable = true;
			}
		}
	}

	// Academic standing can gate offers
	if (profile.academicStanding === 'at_risk') {
		for (const school of profile.schools) {
			if (school.state === 'soft_offer' && school.interest < 60) {
				advanceOfferState(school, 'offer_pulled');
			}
		}
	}
}

//============================================
// Determine scholarship type based on star rating
function determineScholarship(stars: number): 'full' | 'partial' | 'walk-on' {
	if (stars >= 5) {
		return 'full';
	}
	if (stars >= 4) {
		return Math.random() < 0.8 ? 'full' : 'partial';
	}
	if (stars >= 3) {
		const roll = Math.random();
		if (roll < 0.4) return 'full';
		if (roll < 0.9) return 'partial';
		return 'walk-on';
	}
	if (stars >= 2) {
		const roll = Math.random();
		if (roll < 0.1) return 'full';
		if (roll < 0.7) return 'partial';
		return 'walk-on';
	}
	return Math.random() < 0.3 ? 'partial' : 'walk-on';
}

//============================================
// Generate incremental offers from schools not yet tracking the player
export function generateIncrementalOffers(
	profile: RecruitingProfile,
	player: Player,
	ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] },
	maxCount: number,
): number {
	const allSchools = [...ncaaSchools.fbs, ...ncaaSchools.fcs];
	const existingIds = new Set(profile.schools.map(s => s.schoolId));

	// Filter to schools not already tracking
	let candidates = allSchools.filter(s => !existingIds.has(s.commonName));

	// Filter by star tier
	const stars = player.recruitingStars;
	if (stars >= 4) {
		candidates = candidates.filter(s => s.subdivision === 'FBS');
	} else if (stars <= 2) {
		candidates = candidates.filter(s => s.subdivision === 'FCS');
	}

	// Shuffle and pick up to maxCount
	const shuffled = [...candidates].sort(() => Math.random() - 0.5);
	const selected = shuffled.slice(0, maxCount);
	let added = 0;

	for (const school of selected) {
		const schemeFit = computeSchoolFit(school, player);
		const interest = Math.min(100, profile.buzz * 0.5 + schemeFit + randomInRange(10, 25));

		const entry: SchoolInterest = {
			schoolId: school.commonName,
			state: 'soft_offer',
			scholarshipType: determineScholarship(stars),
			interest: interest,
			coachRelationship: randomInRange(10, 30),
			visitStatus: 'none',
			isCommittable: interest >= 75 && Math.random() < 0.5,
			schoolRecord: generateSchoolRecord(school, interest),
		};

		// High buzz + high interest = verbal offer directly
		if (profile.buzz >= 60 && interest >= 70) {
			entry.state = 'verbal_offer';
		}

		profile.schools.push(entry);
		added += 1;
	}

	pruneSchoolList(profile);
	return added;
}

//============================================
// Process a campus visit (unofficial or official)
export function processVisit(
	profile: RecruitingProfile,
	schoolId: string,
	visitType: 'unofficial' | 'official',
): VisitImpression | undefined {
	const school = profile.schools.find(s => s.schoolId === schoolId);
	if (!school) {
		console.warn(`Cannot visit unknown school: ${schoolId}`);
		return undefined;
	}

	school.visitStatus = visitType;
	if (visitType === 'unofficial') {
		if (!profile.unofficialVisits.includes(schoolId)) {
			profile.unofficialVisits.push(schoolId);
		}
		school.coachRelationship = Math.min(100, school.coachRelationship + 15);
	} else {
		if (profile.officialVisits.length >= 5) {
			console.warn('Cannot take more than 5 official visits');
			return undefined;
		}
		if (!profile.officialVisits.includes(schoolId)) {
			profile.officialVisits.push(schoolId);
		}
		school.coachRelationship = Math.min(100, school.coachRelationship + 20);
	}

	// Generate visit impression
	const impression = generateVisitImpression(school);
	school.visitImpression = impression;
	return impression;
}

//============================================
// Generate a visit impression card
function generateVisitImpression(school: SchoolInterest): VisitImpression {
	const interestFactor = school.interest / 100;

	// Campus vibe
	const vibeRoll = Math.random() + interestFactor * 0.3;
	let campusVibe: 'poor' | 'okay' | 'great';
	if (vibeRoll > 0.8) {
		campusVibe = 'great';
	} else if (vibeRoll > 0.4) {
		campusVibe = 'okay';
	} else {
		campusVibe = 'poor';
	}

	// Coach trust
	const trustRoll = Math.random() + school.coachRelationship / 200;
	let coachTrust: 'low' | 'medium' | 'high';
	if (trustRoll > 0.7) {
		coachTrust = 'high';
	} else if (trustRoll > 0.35) {
		coachTrust = 'medium';
	} else {
		coachTrust = 'low';
	}

	// Playing time path
	const pathRoll = Math.random() + interestFactor * 0.25;
	let playingTimePath: 'unclear' | 'possible' | 'strong';
	if (pathRoll > 0.75) {
		playingTimePath = 'strong';
	} else if (pathRoll > 0.4) {
		playingTimePath = 'possible';
	} else {
		playingTimePath = 'unclear';
	}

	// Family reaction (mostly random)
	const familyRoll = Math.random();
	let familyReaction: 'negative' | 'neutral' | 'positive';
	if (familyRoll > 0.6) {
		familyReaction = 'positive';
	} else if (familyRoll > 0.25) {
		familyReaction = 'neutral';
	} else {
		familyReaction = 'negative';
	}

	return { campusVibe, coachTrust, playingTimePath, familyReaction };
}

//============================================
// Process a verbal commitment to a school
export function processCommitment(
	profile: RecruitingProfile,
	schoolId: string,
): boolean {
	if (profile.verbalCommit !== null) {
		console.warn('Already committed, must decommit first');
		return false;
	}

	const school = profile.schools.find(s => s.schoolId === schoolId);
	if (!school) {
		console.warn(`Cannot commit to unknown school: ${schoolId}`);
		return false;
	}

	if (!school.isCommittable) {
		console.warn(`Offer from ${schoolId} is not committable`);
		return false;
	}

	const success = advanceOfferState(school, 'committed');
	if (success) {
		profile.verbalCommit = schoolId;
	}
	return success;
}

//============================================
// Process decommitment -- opens recruitment back up
export function processDecommitment(profile: RecruitingProfile): boolean {
	if (profile.verbalCommit === null) {
		return false;
	}

	const school = profile.schools.find(s => s.schoolId === profile.verbalCommit);
	if (school && school.state === 'committed') {
		// Intentional reverse transition: committed -> committable_offer
		// This bypasses advanceOfferState() because the state machine is
		// forward-only. Decommitment is the only allowed reverse path.
		school.state = 'committable_offer';
		school.interest = Math.max(0, school.interest - 20);
		school.coachRelationship = Math.max(0, school.coachRelationship - 25);
	}

	profile.buzz = Math.max(0, profile.buzz - 20);
	profile.verbalCommit = null;
	return true;
}

//============================================
// Process signing -- finalizes commitment
export function processSigning(profile: RecruitingProfile): boolean {
	if (profile.verbalCommit === null) {
		console.warn('Cannot sign without a commitment');
		return false;
	}

	const school = profile.schools.find(s => s.schoolId === profile.verbalCommit);
	if (!school || school.state !== 'committed') {
		console.warn('School not in committed state');
		return false;
	}

	advanceOfferState(school, 'signed');
	profile.signed = true;
	profile.phase = 'complete';
	return true;
}

//============================================
// Prune school list to keep at or below 15 entries
export function pruneSchoolList(profile: RecruitingProfile): void {
	const maxSchools = 15;
	if (profile.schools.length <= maxSchools) {
		return;
	}

	// Priority: committed > offers > interest > watchlist > pulled
	const stateWeight: Record<string, number> = {
		signed: 100,
		committed: 90,
		committable_offer: 80,
		verbal_offer: 70,
		soft_offer: 60,
		interest: 30,
		watchlist: 10,
		offer_pulled: 0,
	};

	profile.schools.sort((a, b) => {
		const aWeight = (stateWeight[a.state] || 0) + a.interest / 100;
		const bWeight = (stateWeight[b.state] || 0) + b.interest / 100;
		return bWeight - aWeight;
	});

	profile.schools = profile.schools.slice(0, maxSchools);
}

//============================================
// Apply a coaching change to a random school in the profile
// Returns the affected school ID, or null if no eligible school
export function applyCoachingChange(profile: RecruitingProfile): string | null {
	const eligible = profile.schools.filter(
		s => s.state !== 'watchlist' && s.state !== 'offer_pulled'
			&& s.state !== 'signed'
	);

	if (eligible.length === 0) {
		return null;
	}

	const target = eligible[Math.floor(Math.random() * eligible.length)];
	target.coachRelationship = 0;

	// 40% chance the school pulls their offer
	if (Math.random() < 0.4) {
		advanceOfferState(target, 'offer_pulled');
	} else {
		target.interest = Math.max(20, target.interest - 25);
	}

	// Force decommit if committed to this school
	if (profile.verbalCommit === target.schoolId) {
		profile.verbalCommit = null;
	}

	return target.schoolId;
}

//============================================
// Generate a simulated school season record
// Better schools (higher subdivision, more interest) tend to have better records
export function generateSchoolRecord(
	school: NCAASchool,
	interest: number,
): SchoolRecord {
	// Base wins influenced by subdivision prestige
	let baseWins: number;
	if (school.subdivision === 'FBS') {
		// FBS teams range 2-13 wins
		baseWins = randomInRange(4, 10);
	} else {
		// FCS teams range 1-12 wins
		baseWins = randomInRange(2, 9);
	}

	// Higher interest schools tend to be better programs
	const interestBonus = Math.floor(interest / 30);
	const totalWins = Math.min(13, baseWins + interestBonus + randomInRange(-2, 2));
	const wins = Math.max(1, totalWins);
	// 12-game regular season for FBS, 11 for FCS
	const totalGames = school.subdivision === 'FBS' ? 12 : 11;
	const losses = totalGames - wins;

	// Conference rank: better records = better rank
	// Assume ~14 teams per conference
	const baseRank = Math.max(1, 15 - wins);
	const conferenceRank = Math.min(14, Math.max(1, baseRank + randomInRange(-2, 2)));

	// National rank: only good teams get ranked (top 25)
	let nationalRank = 0;
	if (wins >= 10 && school.subdivision === 'FBS') {
		nationalRank = randomInRange(1, 10);
	} else if (wins >= 8 && school.subdivision === 'FBS') {
		nationalRank = randomInRange(10, 25);
	} else if (wins >= 9 && school.subdivision === 'FCS') {
		nationalRank = randomInRange(15, 25);
	}

	return { wins, losses, conferenceRank, nationalRank };
}

//============================================
// Get the post-high-school route for handler dispatch
export function getPostHighSchoolRoute(
	player: Player,
): 'college_entry' | 'juco' | 'prep' {
	if (player.recruitingProfile?.isJuco) {
		return 'juco';
	}
	if (player.recruitingProfile?.isPrepSchool) {
		return 'prep';
	}
	return 'college_entry';
}
