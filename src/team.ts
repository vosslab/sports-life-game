// team.ts - team state management and generation

import { randomInRange, clampStat } from './player.js';

//============================================
// Coach personality types
export type CoachPersonality = 'supportive' | 'demanding' | 'volatile';

//============================================
// Single opponent schedule entry
export interface ScheduleEntry {
	opponentName: string;
	opponentStrength: number;  // 1-100
	week: number;
	played: boolean;
	teamScore: number;         // 0 until played
	opponentScore: number;     // 0 until played
}

//============================================
// Depth chart entry for a position
export interface DepthChartEntry {
	position: string;
	starter: string;
	starterName: string;
	backup: string;
	benchName: string;
}

//============================================
// Full team state
export interface Team {
	teamName: string;
	strength: number;           // 1-100
	coachPersonality: CoachPersonality;
	wins: number;
	losses: number;
	schedule: ScheduleEntry[];
}

//============================================
// Conference team entry
export interface ConferenceTeam {
	name: string;
	strength: number;
	wins: number;
	losses: number;
	ties: number;
}

//============================================
// Conference standings
export interface Conference {
	name: string;
	teams: ConferenceTeam[];
}

//============================================
// Pool of team name prefixes
const TEAM_PREFIXES = [
	'North', 'South', 'East', 'West',
	'Central', 'Valley', 'Mountain', 'Riverside',
	'New', 'Pine', 'Oak', 'Cedar',
	'Spring', 'Clear', 'Sunnybrook', 'Westfield',
	'Lakeside', 'Highland', 'Meadow', 'Crest',
	'Lincoln', 'Washington', 'Jefferson', 'Madison',
	'Jackson', 'Franklin', 'Monroe', 'Adams',
];

//============================================
// Pool of team mascots - silly minor-league style
// 50% animals, 25% food, 15% plants, 10% weird
const TEAM_MASCOTS = [
	// Animals (most common)
	'Alpacas', 'Bison', 'Bumblebees', 'Bunnies', 'Cobras',
	'Cranes', 'Crickets', 'Dingos', 'Doves', 'Ferrets',
	'Foxes', 'Frogs', 'Geckos', 'Gophers', 'Gulls',
	'Hares', 'Honeybees', 'Hoppers', 'Iguanas', 'Jackrabbits',
	'Jellyfish', 'Lemurs', 'Lobsters', 'Macaws', 'Moles',
	'Narwhals', 'Newts', 'Parrots', 'Platypus', 'Poodles',
	'Prawns', 'Puffins', 'Quails', 'Raccoons', 'Rhinos',
	'Salmon', 'Seals', 'Shrimp', 'Squids', 'Swans',
	'Tadpoles', 'Toads', 'Trout', 'Turtles', 'Vipers',
	'Vultures', 'Wasps', 'Walruses', 'Weasels', 'Wombats',
	'Zebras',
	// Food (quirky)
	'Acorns', 'Avocados', 'Beets', 'Berries', 'Carrots',
	'Hot Peppers', 'Kumquats', 'Oreos', 'Spuds', 'Walnuts',
	// Plants (flavor)
	'Basil', 'Chives', 'Clovers', 'Dandelions', 'Ferns',
	'Marigolds',
	// Weird (rare)
	'Wyverns', 'Whalers',
];

//============================================
// Conference region names
const CONFERENCE_REGIONS = [
	'Northern', 'Southern', 'Eastern', 'Western',
	'Central', 'Pacific', 'Mountain', 'Valley',
];

//============================================
// Generate a random high school team opponent name
export function generateOpponentName(): string {
	const prefix = TEAM_PREFIXES[randomInRange(0, TEAM_PREFIXES.length - 1)];
	const mascot = TEAM_MASCOTS[randomInRange(0, TEAM_MASCOTS.length - 1)];
	return `${prefix} ${mascot}`;
}

//============================================
// Generate a conference with 8 teams including the player's team
export function generateConference(
	playerTeamName: string,
	playerTeamStrength: number
): Conference {
	// Pick a random region for the conference name
	const region = CONFERENCE_REGIONS[
		randomInRange(0, CONFERENCE_REGIONS.length - 1)
	];
	const conferenceName = `${region} Conference`;

	// Create the player's team as a conference team
	const playerTeam: ConferenceTeam = {
		name: playerTeamName,
		strength: playerTeamStrength,
		wins: 0,
		losses: 0,
		ties: 0,
	};

	// Generate 7 opponent teams
	const teams: ConferenceTeam[] = [playerTeam];
	for (let i = 0; i < 7; i++) {
		const opponentStrength = randomInRange(30, 85);
		const team: ConferenceTeam = {
			name: generateOpponentName(),
			strength: opponentStrength,
			wins: 0,
			losses: 0,
			ties: 0,
		};
		teams.push(team);
	}

	const conference: Conference = {
		name: conferenceName,
		teams,
	};

	return conference;
}

//============================================
// Simulate conference week for all non-player teams
export function simulateConferenceWeek(
	conference: Conference,
	playerTeamName: string,
	playerWon: boolean
): void {
	// Update player's team
	const playerTeam = conference.teams.find((t) => t.name === playerTeamName);
	if (playerTeam) {
		if (playerWon) {
			playerTeam.wins++;
		} else {
			playerTeam.losses++;
		}
	}

	// Simulate games for other teams
	for (const team of conference.teams) {
		// Skip the player's team
		if (team.name === playerTeamName) {
			continue;
		}

		// Random opponent strength
		const opponentStrength = randomInRange(30, 85);
		const strengthDiff = team.strength - opponentStrength;
		const randomFactor = randomInRange(-15, 15);
		const winProbability = strengthDiff + randomFactor;

		// Team wins if probability is positive
		if (winProbability > 0) {
			team.wins++;
		} else {
			team.losses++;
		}
	}
}

//============================================
// Get standings sorted by wins/losses
export function getStandings(conference: Conference): ConferenceTeam[] {
	// Sort by wins descending, then by losses ascending
	const sorted = [...conference.teams].sort((a, b) => {
		if (b.wins !== a.wins) {
			return b.wins - a.wins;
		}
		return a.losses - b.losses;
	});
	return sorted;
}

//============================================
// Format standings as a readable string
export function formatStandings(
	conference: Conference,
	playerTeamName: string
): string {
	const standings = getStandings(conference);
	let output = `${conference.name}:\n`;

	for (let i = 0; i < standings.length; i++) {
		const team = standings[i];
		const rank = i + 1;
		const record = `${team.wins}-${team.losses}`;
		const isPlayer = team.name === playerTeamName;
		const prefix = isPlayer ? '>>> ' : '  ';
		const rankStr = rank.toString().padStart(2, ' ');
		output += `${prefix}${rankStr}. ${team.name.padEnd(25)} ${record}\n`;
	}

	return output;
}

//============================================
// Create a new high school team
export function generateHighSchoolTeam(teamName: string): Team {
	// Team strength varies by school
	const strength = randomInRange(40, 90);

	// Coach personality is random
	const personalityChoices: CoachPersonality[] = [
		'supportive', 'demanding', 'volatile',
	];
	const coachPersonality = personalityChoices[randomInRange(0, 2)];

	// Generate 10 game schedule (matches HS_SEASON_WEEKS = 10 in main.ts)
	const scheduleLength = 10;
	const schedule: ScheduleEntry[] = [];

	for (let week = 1; week <= scheduleLength; week++) {
		const opponentStrength = randomInRange(35, 95);
		const opponent: ScheduleEntry = {
			opponentName: generateOpponentName(),
			opponentStrength,
			week,
			played: false,
			teamScore: 0,
			opponentScore: 0,
		};
		schedule.push(opponent);
	}

	const team: Team = {
		teamName,
		strength,
		coachPersonality,
		wins: 0,
		losses: 0,
		schedule,
	};

	return team;
}

//============================================
// Simple assertions for testing
const testTeam = generateHighSchoolTeam('Test High School');
console.assert(testTeam.teamName === 'Test High School', 'Team name should match');
console.assert(testTeam.strength >= 40 && testTeam.strength <= 90,
	'Team strength should be 40-90');
console.assert(['supportive', 'demanding', 'volatile'].includes(testTeam.coachPersonality),
	'Coach personality should be valid');
console.assert(testTeam.schedule.length === 10,
	'Schedule should have 10 games');
console.assert(testTeam.wins === 0 && testTeam.losses === 0,
	'New team should have 0 wins/losses');
