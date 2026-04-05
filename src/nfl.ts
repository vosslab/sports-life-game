// nfl.ts - NFL career phase with draft, seasons, and legacy

import { Player, randomInRange, clampStat, modifyStat, createEmptySeasonStats } from './player.js';

//============================================
// NFL Season results
export interface NFLSeasonResult {
	wins: number;
	losses: number;
	storyText: string;
	awards: string[];
	salary: number;
	playerStats: Record<string, number>;
}

//============================================
// Draft day result
export interface DraftResult {
	team: string;
	round: number;
	pick: number;
	storyText: string;
}

//============================================
// Midseason event with choices
export interface NFLMidseasonEvent {
	title: string;
	description: string;
	choices: Array<{
		text: string;
		effects: Record<string, number>;
		flavor: string;
	}>;
}

//============================================
// Retirement decision
export interface RetirementDecision {
	shouldRetire: boolean;
	storyText: string;
}

//============================================
// Hall of Fame eligibility
export interface HallOfFameEligibility {
	eligible: boolean;
	storyText: string;
	achievements: string[];
}

//============================================
// NFL teams
const NFL_TEAMS = [
	'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens',
	'Buffalo Bills', 'Carolina Panthers', 'Chicago Bears',
	'Cincinnati Bengals', 'Cleveland Browns', 'Dallas Cowboys',
	'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
	'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars',
	'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers',
	'Los Angeles Rams', 'Miami Dolphins', 'Minnesota Vikings',
	'New England Patriots', 'New Orleans Saints', 'New York Giants',
	'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers',
	'San Francisco 49ers', 'Seattle Seahawks', 'Tampa Bay Buccaneers',
	'Tennessee Titans', 'Washington Commanders'
];

//============================================
// Simulate draft day experience
export function getNFLDraftResult(player: Player): DraftResult {
	const stock = player.draftStock;

	let round: number;
	let pickRange: [number, number];
	let narrative: string;

	if (stock >= 85) {
		// First round pick
		round = 1;
		pickRange = [1, 10];
		narrative = 'Your name was called in the first round. The camera panned to you ' +
			'in the green room, emotions flooding your face. This was it.';
	} else if (stock >= 70) {
		// Early second round
		round = Math.random() > 0.5 ? 1 : 2;
		pickRange = round === 1 ? [20, 32] : [33, 50];
		narrative = round === 1
			? 'You heard your name in the first round. Not top 10, but still ' +
				'early. The cameras caught you hugging your parents.'
			: 'The second round started, and your name was called. Your moment ' +
				'had finally arrived.';
	} else if (stock >= 50) {
		// Mid-round picks
		round = 2 + Math.floor(Math.random() * 2);
		const roundStart = round === 2 ? 33 : 97;
		const roundEnd = round === 2 ? 96 : 160;
		pickRange = [roundStart, Math.min(roundEnd, roundStart + 30)];
		narrative = `You heard your name called in round ${round}. Not the headline ` +
			`you wanted, but you were in. Now you had to prove it.`;
	} else if (stock >= 30) {
		// Late round
		round = 4 + Math.floor(Math.random() * 3);
		pickRange = [160 + (round - 4) * 70, 250];
		narrative = 'The later rounds came and went. Your heart sank. Then, suddenly, ' +
			'in round ' + round + ', your name was announced. Relief washed over you.';
	} else if (stock >= 10) {
		// Undrafted free agent
		round = 0;
		pickRange = [1, 1];
		narrative = 'Your name never got called. The rounds ended. You were undrafted. ' +
			'But teams immediately reached out with free agent deals. You had options.';
	} else {
		// Walk-on/training squad
		round = 0;
		pickRange = [1, 1];
		narrative = 'Undrafted, undeterred. You signed with a team as an undrafted ' +
			'free agent. This was your last shot. You had to make it stick.';
	}

	const pick = round === 0 ? 0 :
		randomInRange(pickRange[0], Math.min(pickRange[1], 260));

	const team = NFL_TEAMS[randomInRange(0, NFL_TEAMS.length - 1)];

	let storyText = '';
	if (round === 0) {
		storyText = narrative + ` You signed with the ${team} as an undrafted ` +
			`free agent. The training camp battle begins.`;
	} else {
		storyText = narrative + ` The ${team} selected you. The cameras flashed. ` +
			`You put on the hat. Your NFL career had begun.`;
	}

	return { team, round, pick, storyText };
}

//============================================
// Simulate one NFL season
export function simulateNFLSeason(
	player: Player,
	year: number
): NFLSeasonResult {
	// Stat decline with age using peak-at-27 bell curve
	// Produces ~1.0 for ages 24-30, declines outside that range
	// age 22 = 0.75, age 27 = 1.0, age 32 = 0.75, age 37 = 0.0
	const ageFactors = Math.max(0, 1 - Math.pow((player.age - 27) / 10, 2));
	const injuryFactor = Math.max(0.5, player.core.health / 100);
	const performanceMultiplier = ageFactors * injuryFactor;

	// Base wins on team strength
	const baseWins = 8 + Math.floor(player.teamStrength / 20);
	const wins = clampStat(baseWins + randomInRange(-3, 3));
	const losses = 17 - wins;

	// Generate player stats based on position and performance
	const playerStats: Record<string, number> = {};

	if (player.position === 'QB') {
		playerStats['passingYards'] = Math.floor(
			4000 * performanceMultiplier + randomInRange(-500, 500)
		);
		playerStats['touchdowns'] = Math.floor(
			25 * performanceMultiplier + randomInRange(-5, 5)
		);
		playerStats['interceptions'] = Math.floor(
			12 * (1 - performanceMultiplier * 0.5) + randomInRange(-2, 2)
		);
	} else if (player.position === 'RB') {
		playerStats['rushingYards'] = Math.floor(
			1200 * performanceMultiplier + randomInRange(-200, 200)
		);
		playerStats['touchdowns'] = Math.floor(
			8 * performanceMultiplier + randomInRange(-2, 3)
		);
		playerStats['receptions'] = Math.floor(
			40 * performanceMultiplier + randomInRange(-10, 10)
		);
	} else if (['WR', 'TE'].includes(player.position || '')) {
		playerStats['receptions'] = Math.floor(
			60 * performanceMultiplier + randomInRange(-15, 15)
		);
		playerStats['receivingYards'] = Math.floor(
			850 * performanceMultiplier + randomInRange(-150, 150)
		);
		playerStats['touchdowns'] = Math.floor(
			6 * performanceMultiplier + randomInRange(-2, 3)
		);
	} else if (player.position === 'LB' || player.position === 'S') {
		playerStats['tackles'] = Math.floor(
			100 * performanceMultiplier + randomInRange(-20, 20)
		);
		playerStats['sacks'] = Math.floor(
			6 * performanceMultiplier + randomInRange(-2, 3)
		);
		playerStats['interceptions'] = Math.floor(
			2 * performanceMultiplier + randomInRange(-1, 2)
		);
	} else if (player.position === 'DL') {
		playerStats['tackles'] = Math.floor(
			60 * performanceMultiplier + randomInRange(-15, 15)
		);
		playerStats['sacks'] = Math.floor(
			10 * performanceMultiplier + randomInRange(-3, 3)
		);
	}

	// Salary based on year and performance
	const baseYearlySalary = player.depthChart === 'starter' ? 5000000 : 1500000;
	const salary = Math.floor(baseYearlySalary * (1 + year * 0.1));

	// Generate narrative
	let storyText = '';
	const perfGrade = performanceMultiplier * 100;

	if (wins >= 12) {
		storyText = `You and your ${player.teamName} had a breakthrough year. ` +
			`Playoff berth locked up.`;
	} else if (wins >= 9) {
		storyText = `Another solid season. Your team competed in a tough division.`;
	} else if (wins >= 6) {
		storyText = `It was a disappointing season. Injuries, chemistry issues, and ` +
			`inconsistent play plagued the team.`;
	} else {
		storyText = `A rough year. Your team struggled from the opening game. The ` +
			`pressure mounted as losses piled up.`;
	}

	// Performance-based story beats
	if (perfGrade >= 80) {
		storyText += ` You had a career year. Pro Bowl selection seemed likely.`;
	} else if (perfGrade >= 60) {
		storyText += ` You played well when healthy. The scouts were still watching.`;
	} else if (perfGrade >= 40) {
		storyText += ` Injuries limited you, and it showed in the stats. ` +
			`Next year has to be better.`;
	} else {
		storyText += ` You struggled all season. Questions about your future loomed.`;
	}

	// Awards
	const awards: string[] = [];
	if (wins >= 12 && player.depthChart === 'starter') {
		awards.push('Pro Bowl');
	}
	if (wins >= 14) {
		awards.push('Super Bowl Selection');
	}
	if (perfGrade >= 80) {
		awards.push('All-Pro');
	}

	// Stat progression
	modifyStat(player, 'athleticism', -2 + randomInRange(-2, 1));
	modifyStat(player, 'health', -5 + randomInRange(-3, 3));
	if (wins >= 10) {
		modifyStat(player, 'confidence', 5);
	}

	return {
		wins,
		losses,
		storyText,
		awards,
		salary,
		playerStats,
	};
}

//============================================
// Get a midseason event with choices
export function getNFLMidseasonEvent(
	player: Player,
	year: number
): NFLMidseasonEvent {
	const eventPool: NFLMidseasonEvent[] = [
		{
			title: 'Contract Extension Offered',
			description: 'The front office wants to extend your deal. Big money, ' +
				'but it ties you to the team for years.',
			choices: [
				{
					text: 'Sign a lucrative 4-year extension',
					effects: {
						money: 50000000,
						discipline: -5,
						popularity: 10,
					},
					flavor: 'You\'re locked in financially. Security and respect. ' +
						'Now you just have to keep performing.',
				},
				{
					text: 'Hold out for even better terms',
					effects: {
						money: 60000000,
						confidence: -8,
						athleticism: -3,
					},
					flavor: 'You push back. The team doesn\'t like it. Media chaos ' +
						'ensues. But eventually, they cave.',
				},
				{
					text: 'Decline and become a free agent soon',
					effects: {
						confidence: 8,
						popularity: 5,
						athleticism: 3,
					},
					flavor: 'You want to test free agency. One more year, then ' +
						'the open market. The team isn\'t happy.',
				},
			],
		},
		{
			title: 'Playoff Push at Midseason',
			description: 'Your team is in the thick of the playoff race. ' +
				'Every game matters now.',
			choices: [
				{
					text: 'Play through injury for the team',
					effects: {
						leadership: 10,
						health: -15,
						popularity: 15,
						draftStock: 8,
					},
					flavor: 'You gut it out. The team rallies around your toughness. ' +
						'That\'s what champions do.',
				},
				{
					text: 'Take care of your body and manage workload',
					effects: {
						health: 8,
						athleticism: 5,
						leadership: -5,
					},
					flavor: 'You\'re smart about your workload. Long-term thinking. ' +
						'The coaches respect your professionalism.',
				},
				{
					text: 'Amp up your performance for playoff bonuses',
					effects: {
						athleticism: 8,
						confidence: 10,
						money: 5000000,
					},
					flavor: 'Playoff bonuses are huge. You dig deeper than you ever ' +
						'have. Your name will be on highlight reels.',
				},
			],
		},
		{
			title: 'Trade Rumors Swirling',
			description: 'ESPN is reporting that a contender wants you. ' +
				'Your future is uncertain.',
			choices: [
				{
					text: 'Request a trade to a contender',
					effects: {
						confidence: 10,
						athleticism: 5,
						popularity: 8,
					},
					flavor: 'You go to a championship-ready team. Suddenly, ' +
						'you\'re a piece of the puzzle for something bigger.',
				},
				{
					text: 'Demand the team trade you',
					effects: {
						confidence: 15,
						discipline: -15,
						popularity: -10,
					},
					flavor: 'You create drama. The locker room fractionalizes. ' +
						'It gets ugly, but you eventually get your way.',
				},
				{
					text: 'Commit to your current team and prove doubters wrong',
					effects: {
						leadership: 12,
						discipline: 10,
						athleticism: 8,
					},
					flavor: 'You use the trade rumors as motivation. ' +
						'If they don\'t want you, everyone else will.',
				},
			],
		},
		{
			title: 'Young Star Looks Up to You',
			description: 'A rookie on the team wants you as a mentor. ' +
				'It could distract from your own prep, but it\'s meaningful.',
			choices: [
				{
					text: 'Become a mentor and leader',
					effects: {
						leadership: 15,
						discipline: 8,
						athleticism: -2,
						popularity: 12,
					},
					flavor: 'You take the rookie under your wing. Your leadership ' +
						'elevates the whole team. Culture matters.',
				},
				{
					text: 'Focus solely on your own performance',
					effects: {
						athleticism: 10,
						confidence: 8,
						leadership: -8,
					},
					flavor: 'You don\'t have time for babysitting. Every rep is ' +
						'about perfecting your craft.',
				},
				{
					text: 'Do both: balance mentorship and performance',
					effects: {
						leadership: 8,
						athleticism: 5,
						discipline: 5,
					},
					flavor: 'You find a way. A quick word here, leading by example there. ' +
						'Both flourish.',
				},
			],
		},
		{
			title: 'Media Scrutiny and Criticism',
			description: 'The press is questioning your decline. ' +
				'Social media is brutal.',
			choices: [
				{
					text: 'Embrace it as motivation',
					effects: {
						confidence: 12,
						athleticism: 8,
						discipline: 10,
					},
					flavor: 'You use the noise as fuel. The haters will see you ' +
						'in the playoffs.',
				},
				{
					text: 'Ignore it and focus inward',
					effects: {
						health: 8,
						discipline: 12,
						popularity: -5,
					},
					flavor: 'You tune it all out. Headphones in, film on. ' +
						'Only your teammates matter.',
				},
				{
					text: 'Respond publicly and defend yourself',
					effects: {
						confidence: 5,
						popularity: -8,
						discipline: -10,
					},
					flavor: 'You clap back on social media. It escalates. ' +
						'Not your best look.',
				},
			],
		},
	];

	return eventPool[randomInRange(0, eventPool.length - 1)];
}

//============================================
// Check if player should retire
export function checkRetirement(player: Player): RetirementDecision {
	const age = player.age;
	const athleticism = player.core.athleticism;
	const health = player.core.health;
	const money = player.career.money;

	// Forced retirement triggers
	if (age >= 40) {
		return {
			shouldRetire: true,
			storyText: `At ${age}, your body is done. Father Time always wins. ` +
				`The time to hang it up has come.`,
		};
	}

	if (health <= 30) {
		return {
			shouldRetire: true,
			storyText: `Your injuries are too severe. Doctors advise retirement. ` +
				`You\'re lucky to have made it this far.`,
		};
	}

	if (athleticism <= 20) {
		return {
			shouldRetire: true,
			storyText: `You\'ve lost a step. Then two steps. You\'re done as an NFL player.`,
		};
	}

	// Optional retirement considerations
	let storyText = '';
	let retirementChoice = false;

	if (age >= 35) {
		if (money >= 50000000) {
			storyText = `You\'re ${age} years old and worth over $50M. ` +
				`You could retire comfortably and pursue other dreams.`;
			retirementChoice = Math.random() > 0.4;
		} else {
			storyText = `You\'re getting older. A few more good years ` +
				`could set you up for life.`;
		}
	} else if (age >= 32) {
		if (athleticism < 40) {
			storyText = `The decline is real. At ${age}, you could still play, ` +
				`but retirement is calling.`;
			retirementChoice = Math.random() > 0.6;
		} else {
			storyText = `You still have great years ahead. The end isn\'t yet.`;
		}
	}

	return { shouldRetire: retirementChoice, storyText };
}

//============================================
// Generate legacy summary
export function generateLegacySummary(player: Player): string {
	const careerLength = player.careerHistory.filter(r => r.phase === 'nfl').length;
	const totalWins = player.careerHistory
		.filter(r => r.phase === 'nfl')
		.reduce((sum, r) => sum + r.wins, 0);

	let legacy = `${player.firstName} ${player.lastName} played ` +
		`${careerLength} seasons in the NFL with the `;

	const teams = new Set(
		player.careerHistory
			.filter(r => r.phase === 'nfl')
			.map(r => r.team)
	);
	legacy += Array.from(teams).join(', ') + '.';

	if (totalWins >= 100) {
		legacy += ` A winning player on winning teams.`;
	} else if (totalWins >= 80) {
		legacy += ` Competed at a high level for years.`;
	} else if (totalWins >= 50) {
		legacy += ` Had some good seasons along the way.`;
	} else {
		legacy += ` His time in the league was brief but valuable.`;
	}

	if (player.career.money >= 100000000) {
		legacy += ` Financial success was undeniable.`;
	}

	if (player.hidden.leadership >= 80) {
		legacy += ` A leader in the locker room who commanded respect.`;
	}

	return legacy;
}

//============================================
// Check Hall of Fame eligibility (very strict)
export function checkHallOfFame(player: Player): HallOfFameEligibility {
	const nflYears = player.careerHistory.filter(r => r.phase === 'nfl').length;
	const totalWins = player.careerHistory
		.filter(r => r.phase === 'nfl')
		.reduce((sum, r) => sum + r.wins, 0);
	const seasonRecords = player.careerHistory.filter(r => r.phase === 'nfl');

	const achievements: string[] = [];

	// Multiple Pro Bowls
	const proBowls = seasonRecords.filter(r =>
		r.awards.includes('Pro Bowl')
	).length;
	if (proBowls >= 4) {
		achievements.push(`${proBowls} Pro Bowl selections`);
	}

	// Super Bowl win(s)
	const superBowlWins = seasonRecords.filter(r =>
		r.awards.includes('Super Bowl Selection')
	).length;
	if (superBowlWins >= 1) {
		achievements.push(`${superBowlWins} Super Bowl appearance(s)`);
	}

	// All-Pro selections
	const allPro = seasonRecords.filter(r =>
		r.awards.includes('All-Pro')
	).length;
	if (allPro >= 3) {
		achievements.push(`${allPro} All-Pro selections`);
	}

	// Win percentage
	const totalGames = seasonRecords.reduce((sum, r) => sum + r.wins + r.losses, 0);
	const winPercentage = totalGames > 0 ? totalWins / totalGames : 0;

	// Hall of Fame criteria (very strict - for end game legacy)
	const eligible =
		(proBowls >= 5 && winPercentage >= 0.55) ||
		(superBowlWins >= 1 && allPro >= 4) ||
		(nflYears >= 12 && totalWins >= 120 && winPercentage >= 0.60);

	let storyText = '';
	if (eligible) {
		storyText = `Your resume speaks for itself. One day, a call from ` +
			`Canton might come. You\'ve earned consideration.`;
	} else if (achievements.length > 0) {
		storyText = `A great career, but perhaps not quite Hall of Fame caliber. ` +
			`You\'ll always have your accomplishments to be proud of.`;
	} else {
		storyText = `You had a solid NFL career, but Hall of Fame was never ` +
			`in the cards. That\'s okay. You made it to the league.`;
	}

	return { eligible, storyText, achievements };
}

//============================================
// Apply midseason event choice effects
export function applyNFLEventChoice(
	player: Player,
	effects: Record<string, number>
): void {
	for (const [key, value] of Object.entries(effects)) {
		if (key === 'money') {
			player.career.money += value;
		} else if (key === 'popularity') {
			player.career.popularity = clampStat(
				player.career.popularity + value
			);
		} else if (key === 'leadership') {
			player.hidden.leadership = clampStat(
				player.hidden.leadership + value
			);
		} else if (key === 'draftStock') {
			player.draftStock = clampStat(player.draftStock + value);
		} else if (key in player.core) {
			const stat = key as keyof typeof player.core;
			modifyStat(player, stat, value);
		}
	}
}

//============================================
// Simple test
const testPlayer: Player = {
	firstName: 'Test',
	lastName: 'Player',
	age: 30,
	phase: 'nfl',
	position: 'QB',
	positionBucket: 'passer',
	depthChart: 'starter',
	core: {
		athleticism: 75,
		technique: 80,
		footballIq: 85,
		discipline: 70,
		health: 70,
		confidence: 80,
	},
	career: { popularity: 70, money: 25000000 },
	hidden: { size: 3, leadership: 75, durability: 70 },
	seasonStats: createEmptySeasonStats(),
	currentSeason: 5,
	currentWeek: 0,
	seasonYear: 2025,
	teamName: 'Kansas City Chiefs',
	teamStrength: 90,
	gpa: 3.0,
	relationships: { 'Coach': 80 },
	storyFlags: {},
	storyLog: [],
	careerHistory: [],
	bigDecisions: [],
	recruitingStars: 5,
	collegeOffers: [],
	draftStock: 85,
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
	avatarConfig: null,
	milestones: {},
};

const draftResult = getNFLDraftResult(testPlayer);
console.assert(
	NFL_TEAMS.includes(draftResult.team),
	'Draft should assign valid NFL team'
);

const seasonResult = simulateNFLSeason(testPlayer, 1);
console.assert(
	seasonResult.wins >= 0 && seasonResult.wins <= 17,
	'Season wins should be 0-17'
);
