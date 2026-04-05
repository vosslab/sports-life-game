// recruiting.ts - college recruiting system for high school players

import { Player, randomInRange } from './player.js';

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
