// college.ts - college football phase with season decisions and draft tracking

import { Player, randomInRange, clampStat, modifyStat, createEmptySeasonStats } from './player.js';

//============================================
// College career choice
export interface CollegeChoice {
	text: string;
	effects: Record<string, number>;
	flavor: string;
	is_big_decision: boolean;
}

//============================================
// Results of a simulated college season
export interface CollegeSeasonResult {
	wins: number;
	losses: number;
	storyText: string;
	awards: string[];
	draftStock: number;
}

//============================================
// NIL (Name, Image, Likeness) deal result
export interface NILDeal {
	amount: number;
	brand: string;
	storyText: string;
}

//============================================
// Get college teams from data
const POWER5_COLLEGES = [
	'Alabama', 'Ohio State', 'Georgia', 'Michigan', 'Clemson',
	'Texas', 'Oregon', 'USC', 'LSU', 'Penn State',
	'Florida State', 'Oklahoma', 'Notre Dame', 'Tennessee', 'Miami',
	'Wisconsin', 'Auburn', 'Florida', 'Texas A&M', 'North Carolina',
	'Iowa', 'Michigan State', 'Stanford', 'UCLA', 'Virginia Tech'
];

const GROUP_OF_5_COLLEGES = [
	'Boise State', 'Memphis', 'UCF', 'Appalachian State',
	'Coastal Carolina', 'Liberty', 'SMU', 'Tulane', 'UNLV',
	'James Madison', 'Jacksonville State', 'Sam Houston State',
	'Air Force', 'Army', 'Navy', 'Marshall', 'Western Kentucky',
	'Troy', 'Louisiana', 'South Alabama'
];

const D2_COLLEGES = [
	'Valdosta State', 'Ferris State', 'Shepherd', 'Colorado Mines',
	'Northwest Missouri State', 'Grand Valley State', 'Pittsburg State',
	'West Florida', 'Minnesota State', 'Angelo State'
];

const D3_COLLEGES = [
	'Mount Union', 'Mary Hardin-Baylor', 'North Central', 'Wheaton',
	'St. Thomas', 'Wisconsin-Whitewater', 'Linfield', 'Cortland',
	'Johns Hopkins', 'Carnegie Mellon'
];

//============================================
// Start college phase: pick a school from offers
export function startCollege(player: Player): string {
	let storyText = '';

	// Player should have a college from recruiting offers
	if (!player.teamName || player.teamName === '') {
		// Fallback: no college assigned, pick based on recruiting stars
		const collegeName = assignDefaultCollege(player);
		player.teamName = collegeName;
		storyText = `With limited offers, you accepted a walk-on opportunity at ` +
			`${collegeName}. It wasn't glamorous, but it was your shot.`;
	} else {
		storyText = `You arrived at ${player.teamName} ready to prove yourself. ` +
			`The campus was bigger than you imagined, the stadium louder ` +
			`than anything in high school.`;
	}

	player.phase = 'college';
	player.currentSeason = 1;
	player.age = 18;

	return storyText;
}

//============================================
// Assign a default college if none provided
function assignDefaultCollege(player: Player): string {
	if (player.recruitingStars >= 4) {
		return POWER5_COLLEGES[randomInRange(0, POWER5_COLLEGES.length - 1)];
	} else if (player.recruitingStars >= 3) {
		return GROUP_OF_5_COLLEGES[randomInRange(0, GROUP_OF_5_COLLEGES.length - 1)];
	} else if (player.recruitingStars >= 2) {
		return D2_COLLEGES[randomInRange(0, D2_COLLEGES.length - 1)];
	} else {
		return D3_COLLEGES[randomInRange(0, D3_COLLEGES.length - 1)];
	}
}

//============================================
// Get available choices for a college season
export function getCollegeSeasonChoices(
	player: Player,
	year: number
): CollegeChoice[] {
	const choices: CollegeChoice[] = [];

	// Freshman year (Year 1)
	if (year === 1) {
		choices.push({
			text: 'Focus on academics and learning the system',
			effects: {
				technique: 8,
				footballIq: 12,
				athleticism: -2,
				discipline: 10,
			},
			flavor: 'You hit the books hard and study film constantly. The coaches ' +
				'notice your dedication to learning.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Push hard for playing time as a freshman',
			effects: {
				athleticism: 10,
				confidence: 8,
				technique: 2,
				health: -5,
			},
			flavor: 'You compete fiercely in practice, determined to earn your spot. ' +
				'By mid-season, you\'re seeing real snaps.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Build relationships with teammates and coaches',
			effects: {
				leadership: 10,
				popularity: 15,
				discipline: 5,
				confidence: 5,
			},
			flavor: 'You become a locker room favorite. The veterans take you under ' +
				'their wing. Culture matters.',
			is_big_decision: false,
		});
	}

	// Sophomore year (Year 2)
	if (year === 2) {
		const depthChartBonus = player.depthChart === 'starter' ? 8 : 0;

		choices.push({
			text: 'Become a leader and vocal voice in the locker room',
			effects: {
				leadership: 15,
				discipline: 10,
				popularity: 10,
				confidence: 8,
			},
			flavor: 'You step into a leadership role. Younger players look to you. ' +
				'The coaches trust you as a captain-in-waiting.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Focus on dominating your position group',
			effects: {
				technique: 12,
				athleticism: 10,
				footballIq: 8,
				popularity: 5,
			},
			flavor: 'You become known as a specialist. Your technique is refined, ' +
				'your film study relentless.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Pursue a lucrative NIL deal opportunity',
			effects: {
				money: 150000,
				popularity: 20,
				confidence: 12,
				discipline: -8,
			},
			flavor: 'A major brand approaches you with a generous NIL contract. ' +
				'Suddenly, you\'re not just a player-you\'re a marketable name.',
			is_big_decision: false,
		});
	}

	// Junior year (Year 3) - BIG DECISIONS
	if (year === 3) {
		choices.push({
			text: 'Declare for the NFL Draft',
			effects: {
				confidence: 15,
				draftStock: 20,
			},
			flavor: 'You\'ve dominated this season. The scouts are calling. It\'s time. ' +
				'You announce you\'re entering the draft-no more college ball.',
			is_big_decision: true,
		});

		choices.push({
			text: 'Return for senior year to build draft stock',
			effects: {
				technique: 8,
				athleticism: 5,
				draftStock: 15,
				discipline: 10,
			},
			flavor: 'The coaches advise another year. One more season to prove ' +
				'you\'re elite. One more chance to get the grade you deserve.',
			is_big_decision: true,
		});

		choices.push({
			text: 'Enter the transfer portal',
			effects: {
				athleticism: 6,
				confidence: 8,
				draftStock: 10,
				popularity: 15,
			},
			flavor: 'You enter the transfer portal. Championship contenders come calling. ' +
				'A fresh start at a bigger program could change everything.',
			is_big_decision: true,
		});
	}

	// Senior year (Year 4)
	if (year === 4) {
		choices.push({
			text: 'Chase individual accolades and stats',
			effects: {
				athleticism: 8,
				confidence: 10,
				draftStock: 12,
			},
			flavor: 'You go out in a blaze of glory. Records fall. Awards pile up. ' +
				'The draft can\'t come soon enough.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Focus on team success and championship run',
			effects: {
				leadership: 12,
				discipline: 15,
				popularity: 12,
				draftStock: 8,
			},
			flavor: 'It\'s not about you anymore. You sacrifice for the team, ' +
				'mentor younger players, do the little things.',
			is_big_decision: false,
		});

		choices.push({
			text: 'Balance playing with off-field success',
			effects: {
				technique: 8,
				leadership: 10,
				popularity: 18,
				money: 80000,
			},
			flavor: 'You juggle football, endorsements, and brand building. ' +
				'On and off the field, you\'re preparing for life after college.',
			is_big_decision: false,
		});
	}

	return choices;
}

//============================================
// Simulate a college season performance
export function simulateCollegeSeason(
	player: Player,
	year: number
): CollegeSeasonResult {
	// Base performance on player stats
	const baseWins = 8 + Math.floor(player.core.athleticism / 20);
	const wins = baseWins + randomInRange(-2, 2);
	// Clamp wins to 0-12 range to prevent negative losses
	const clampedWins = Math.min(12, Math.max(0, wins));
	const losses = 12 - clampedWins;

	const awards: string[] = [];
	let storyText = '';

	// Generate narrative based on depth chart and performance
	if (player.depthChart === 'starter') {
		const perfLevel = player.core.athleticism + player.core.technique;

		if (perfLevel >= 150) {
			storyText = `You had an elite season. Your name became synonymous with ` +
				`dominance. Scouts were taking notice.`;
			awards.push('First Team All-Conference');
		} else if (perfLevel >= 120) {
			storyText = `You were one of the best players on the field most Saturdays. ` +
				`Consistent, reliable, improving week to week.`;
			awards.push('Second Team All-Conference');
		} else {
			storyText = `You held your own as a starter. Some great games, some rough ones. ` +
				`But you're learning what it takes to play at this level.`;
		}
	} else if (player.depthChart === 'backup') {
		storyText = `You earned more playing time this year. The coaches trust you. ` +
			`By season's end, you're pushing for a starting spot.`;
	} else {
		storyText = `You fought your way into the rotation. Limited snaps, but you ` +
			`made them count when you got your chance.`;
	}

	// Draft stock progression
	let draftStockGain = calculateDraftStock(player) - player.draftStock;
	if (year === 3) {
		// Junior year matters more for draft projections
		draftStockGain = Math.floor(draftStockGain * 1.2);
	}

	const newDraftStock = clampStat(player.draftStock + draftStockGain);

	// Update player performance
	if (clampedWins >= 10) {
		modifyStat(player, 'confidence', 8);
	} else if (clampedWins <= 4) {
		modifyStat(player, 'confidence', -5);
	}

	// Health degrades with hard play
	modifyStat(player, 'health', -3 + randomInRange(-2, 2));

	// Team strength affects outcomes
	if (player.teamStrength >= 80) {
		storyText += ` Your team went to a major bowl game.`;
		if (awards.length === 0) {
			awards.push('Bowl Game Selection');
		}
	}

	// Year-specific narrative flavor
	if (year === 1) {
		storyText = `Your freshman season was a learning experience. ` + storyText;
	} else if (year === 4) {
		storyText = `In your final college season, ` + storyText.toLowerCase();
	}

	return {
		wins: clampedWins,
		losses,
		storyText,
		awards,
		draftStock: newDraftStock,
	};
}

//============================================
// Calculate draft stock (1-100 scale)
export function calculateDraftStock(player: Player): number {
	// Weighted formula: athleticism and technique most important,
	// with size as a key physical attribute
	// Max-stat player (all 100s): ~95 before clamp
	// Average player (all 50s): ~45-55
	const baseScore =
		player.core.athleticism * 0.30 +
		player.core.technique * 0.25 +
		player.core.footballIq * 0.15 +
		player.core.confidence * 0.10 +
		player.hidden.size * 4;

	// Boost from intangibles: leadership and popularity
	const boostScore =
		player.hidden.leadership * 0.10 +
		player.career.popularity * 0.05;

	const total = clampStat(baseScore + boostScore);

	return Math.floor(total);
}

//============================================
// Generate a NIL deal if player qualifies
export function generateNILDeal(player: Player): NILDeal | null {
	// Need minimum athleticism and popularity
	if (player.core.athleticism < 50 || player.career.popularity < 30) {
		return null;
	}

	// Higher stats = better deals
	const dealChance = Math.min(0.8, player.career.popularity / 100);
	if (Math.random() > dealChance) {
		return null;
	}

	const brands = [
		'Nike', 'Gatorade', 'Beats by Dre', 'State Farm', 'FanDuel',
		'DraftKings', 'Panini', 'EA Sports', 'YouTube', 'Twitch',
		'Lamborghini', 'Richard Mille', 'Rolex', 'Prada'
	];

	const brand = brands[randomInRange(0, brands.length - 1)];

	// Amount scales with stats and popularity
	const baseAmount = 100000;
	const popularityBonus = player.career.popularity * 500;
	const athleticismBonus = player.core.athleticism * 300;
	const amount = baseAmount + popularityBonus + athleticismBonus +
		randomInRange(-50000, 75000);

	const storyText = `${brand} reached out to discuss a sponsorship deal. ` +
		`They see you as the face of a major campaign. The offer is substantial.`;

	return { amount, brand, storyText };
}

//============================================
// Update stats based on a college choice
export function applyCollegeChoice(
	player: Player,
	choice: CollegeChoice
): void {
	for (const [key, value] of Object.entries(choice.effects)) {
		if (key === 'draftStock') {
			player.draftStock = clampStat(player.draftStock + value);
		} else if (key === 'money') {
			player.career.money += value;
		} else if (key === 'popularity') {
			player.career.popularity = clampStat(
				player.career.popularity + value
			);
		} else if (key === 'leadership') {
			player.hidden.leadership = clampStat(
				player.hidden.leadership + value
			);
		} else if (key in player.core) {
			const stat = key as keyof typeof player.core;
			modifyStat(player, stat, value);
		}
	}
}

//============================================
// Check if player should return for another year or declare
export function checkDeclarationEligibility(
	player: Player,
	year: number
): { canDeclare: boolean; reason: string } {
	if (year < 3) {
		return {
			canDeclare: false,
			reason: 'You must complete at least 3 years before declaring.',
		};
	}

	if (player.draftStock >= 60) {
		return {
			canDeclare: true,
			reason: 'You\'re NFL-ready. Scouts have you as a draft pick.',
		};
	}

	return {
		canDeclare: true,
		reason: 'You can declare anytime after year 3, even with lower draft stock.',
	};
}

//============================================
// Simple test
console.assert(
	calculateDraftStock({
		firstName: 'Test',
		lastName: 'Player',
		age: 20,
		phase: 'college',
		position: 'QB',
		positionBucket: 'passer',
		depthChart: 'starter',
		core: {
			athleticism: 85,
			technique: 70,
			footballIq: 75,
			discipline: 60,
			health: 80,
			confidence: 75,
		},
		career: { popularity: 60, money: 0 },
		hidden: { size: 4, leadership: 70, durability: 75 },
		seasonStats: createEmptySeasonStats(),
		currentSeason: 1,
		currentWeek: 0,
		seasonYear: 2025,
		teamName: 'Alabama',
		teamStrength: 95,
		gpa: 3.0,
		relationships: { 'Coach': 75 },
		storyFlags: {},
		storyLog: [],
		careerHistory: [],
		bigDecisions: [],
		recruitingStars: 5,
		collegeOffers: [],
		draftStock: 0,
		useRealTeamNames: true,
		teamPalette: null,
		collegeYear: 0,
		nflYear: 0,
		townName: '',
		townMascot: '',
		hsName: '',
		hsMascot: '',
		nflTeamId: '',
		nflConference: '',
		nflDivision: '',
		isRedshirt: false,
		eligibilityYears: 4,
	}) >= 50,
	'Draft stock should be respectable for good player'
);
