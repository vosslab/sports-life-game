// nfl_season_builder.ts - build an NFL season with 32 real teams
//
// Creates full 32-team league in 2 conferences x 4 divisions.
// 17-game schedule (simplified v1): division rivals twice, plus
// cross-division and cross-conference opponents.

import { TeamId } from '../season/season_types.js';
import { SeasonTeam } from '../season/team_model.js';
import { SeasonGame } from '../season/game_model.js';
import { LeagueSeason } from '../season/season_model.js';
import {
	resetGameIdCounter, nextGameId, shuffleArray, validateSchedule,
} from '../season/season_builder.js';
import { randomInRange } from '../player.js';
import { CoachPersonality } from '../team.js';

//============================================
// NFL team data: conference, division, display name, strength range
interface NFLTeamData {
	name: string;
	conference: string;   // "AFC" or "NFC"
	division: string;     // "East", "West", "North", "South"
	strength: number;     // base strength 50-95
}

//============================================
// Full 32-team NFL roster with divisions
const NFL_ROSTER: NFLTeamData[] = [
	// AFC East
	{ name: 'Buffalo Bills', conference: 'AFC', division: 'East', strength: 82 },
	{ name: 'Miami Dolphins', conference: 'AFC', division: 'East', strength: 78 },
	{ name: 'New England Patriots', conference: 'AFC', division: 'East', strength: 70 },
	{ name: 'New York Jets', conference: 'AFC', division: 'East', strength: 72 },
	// AFC North
	{ name: 'Baltimore Ravens', conference: 'AFC', division: 'North', strength: 85 },
	{ name: 'Cincinnati Bengals', conference: 'AFC', division: 'North', strength: 80 },
	{ name: 'Cleveland Browns', conference: 'AFC', division: 'North', strength: 65 },
	{ name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North', strength: 75 },
	// AFC South
	{ name: 'Houston Texans', conference: 'AFC', division: 'South', strength: 80 },
	{ name: 'Indianapolis Colts', conference: 'AFC', division: 'South', strength: 68 },
	{ name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South', strength: 72 },
	{ name: 'Tennessee Titans', conference: 'AFC', division: 'South', strength: 65 },
	// AFC West
	{ name: 'Denver Broncos', conference: 'AFC', division: 'West', strength: 70 },
	{ name: 'Kansas City Chiefs', conference: 'AFC', division: 'West', strength: 92 },
	{ name: 'Las Vegas Raiders', conference: 'AFC', division: 'West', strength: 62 },
	{ name: 'Los Angeles Chargers', conference: 'AFC', division: 'West', strength: 78 },
	// NFC East
	{ name: 'Dallas Cowboys', conference: 'NFC', division: 'East', strength: 76 },
	{ name: 'New York Giants', conference: 'NFC', division: 'East', strength: 60 },
	{ name: 'Philadelphia Eagles', conference: 'NFC', division: 'East', strength: 88 },
	{ name: 'Washington Commanders', conference: 'NFC', division: 'East', strength: 72 },
	// NFC North
	{ name: 'Chicago Bears', conference: 'NFC', division: 'North', strength: 68 },
	{ name: 'Detroit Lions', conference: 'NFC', division: 'North', strength: 85 },
	{ name: 'Green Bay Packers', conference: 'NFC', division: 'North', strength: 80 },
	{ name: 'Minnesota Vikings', conference: 'NFC', division: 'North', strength: 78 },
	// NFC South
	{ name: 'Atlanta Falcons', conference: 'NFC', division: 'South', strength: 70 },
	{ name: 'Carolina Panthers', conference: 'NFC', division: 'South', strength: 58 },
	{ name: 'New Orleans Saints', conference: 'NFC', division: 'South', strength: 68 },
	{ name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South', strength: 75 },
	// NFC West
	{ name: 'Arizona Cardinals', conference: 'NFC', division: 'West', strength: 62 },
	{ name: 'Los Angeles Rams', conference: 'NFC', division: 'West', strength: 74 },
	{ name: 'San Francisco 49ers', conference: 'NFC', division: 'West', strength: 90 },
	{ name: 'Seattle Seahawks', conference: 'NFC', division: 'West', strength: 72 },
];

//============================================
// Build a complete NFL season
export function buildNFLSeason(
	playerTeamName: string,
): LeagueSeason {
	resetGameIdCounter();

	// Find the player's team data
	const playerData = NFL_ROSTER.find(t => t.name === playerTeamName);
	if (!playerData) {
		// Fallback: assign to a random team
		const fallback = NFL_ROSTER[randomInRange(0, NFL_ROSTER.length - 1)];
		return buildNFLSeasonWithData(fallback.name);
	}

	return buildNFLSeasonWithData(playerTeamName);
}

//============================================
// Internal: build the season from known team name
function buildNFLSeasonWithData(playerTeamName: string): LeagueSeason {
	const teams = new Map<TeamId, SeasonTeam>();
	let playerTeamId = '';

	// Create all 32 teams with season-level strength variance
	for (const data of NFL_ROSTER) {
		// Add random variance per season (-8 to +8)
		const seasonStrength = Math.max(40, Math.min(99,
			data.strength + randomInRange(-8, 8)
		));

		const teamId = makeTeamId(data.name);
		const parts = splitTeamName(data.name);

		const team = new SeasonTeam(
			teamId,
			parts.city,
			parts.mascot,
			seasonStrength,
			randomCoachPersonality(),
			data.conference,
			data.division,
		);
		teams.set(teamId, team);

		if (data.name === playerTeamName) {
			playerTeamId = teamId;
		}
	}

	// Generate the 17-game schedule
	const allGames = buildNFLSchedule(teams, playerTeamId);

	// Validate (may have warnings for simplified schedule)
	const validation = validateSchedule(allGames, 17);
	if (!validation.valid) {
		console.warn('NFL schedule validation warnings:', validation.errors);
	}

	return new LeagueSeason(teams, allGames, 17, playerTeamId, 'nfl');
}

//============================================
// Build the simplified 17-game NFL schedule
// Each team plays: 6 division (3 rivals x 2), 4 same-conf cross-div,
// 4 cross-conference, 3 remaining from same conference
function buildNFLSchedule(
	teams: Map<TeamId, SeasonTeam>,
	playerTeamId: TeamId,
): SeasonGame[] {
	const allGames: SeasonGame[] = [];
	const teamIds = Array.from(teams.keys());

	// Group teams by conference and division
	const divisions = new Map<string, TeamId[]>();
	for (const [teamId, team] of teams) {
		const key = `${team.conferenceId}_${team.divisionId}`;
		if (!divisions.has(key)) {
			divisions.set(key, []);
		}
		divisions.get(key)!.push(teamId);
	}

	// Track games per team to avoid going over 17
	const teamGameCount = new Map<TeamId, number>();
	for (const id of teamIds) {
		teamGameCount.set(id, 0);
	}

	// Track existing matchups to avoid duplicates (except division rivals)
	const matchupSet = new Set<string>();

	// Helper to add a game if both teams have room
	function addGame(
		home: TeamId, away: TeamId, week: number, isConf: boolean,
		allowDouble: boolean = false,
	): boolean {
		const homeCount = teamGameCount.get(home) || 0;
		const awayCount = teamGameCount.get(away) || 0;
		if (homeCount >= 17 || awayCount >= 17) {
			return false;
		}

		const matchupKey = [home, away].sort().join('_');
		if (!allowDouble && matchupSet.has(matchupKey)) {
			return false;
		}

		allGames.push(new SeasonGame(nextGameId(), week, home, away, isConf));
		teamGameCount.set(home, homeCount + 1);
		teamGameCount.set(away, awayCount + 1);
		matchupSet.add(matchupKey);
		return true;
	}

	// Phase 1: Division games (6 per team, play each rival twice)
	let weekCounter = 1;
	for (const [, divTeams] of divisions) {
		for (let i = 0; i < divTeams.length; i++) {
			for (let j = i + 1; j < divTeams.length; j++) {
				// First meeting
				const week1 = weekCounter;
				addGame(divTeams[i], divTeams[j], week1, true, true);
				weekCounter = (weekCounter % 17) + 1;

				// Second meeting (reverse home/away)
				const week2 = weekCounter;
				addGame(divTeams[j], divTeams[i], week2, true, true);
				weekCounter = (weekCounter % 17) + 1;
			}
		}
	}

	// Phase 2: Cross-division same-conference games (4 per team target)
	for (const [teamId, team] of teams) {
		const currentCount = teamGameCount.get(teamId) || 0;
		if (currentCount >= 10) {
			continue;
		}

		// Find teams in same conference, different division
		const crossDivOpponents = teamIds.filter(oppId => {
			const opp = teams.get(oppId)!;
			return opp.conferenceId === team.conferenceId
				&& opp.divisionId !== team.divisionId
				&& oppId !== teamId;
		});
		shuffleArray(crossDivOpponents);

		let added = 0;
		for (const oppId of crossDivOpponents) {
			if (added >= 4) {
				break;
			}
			const week = (weekCounter % 17) + 1;
			if (addGame(teamId, oppId, week, true)) {
				added += 1;
				weekCounter += 1;
			}
		}
	}

	// Phase 3: Cross-conference games (4 per team target)
	for (const [teamId, team] of teams) {
		const currentCount = teamGameCount.get(teamId) || 0;
		if (currentCount >= 14) {
			continue;
		}

		// Find teams in opposite conference
		const crossConfOpponents = teamIds.filter(oppId => {
			const opp = teams.get(oppId)!;
			return opp.conferenceId !== team.conferenceId && oppId !== teamId;
		});
		shuffleArray(crossConfOpponents);

		let added = 0;
		for (const oppId of crossConfOpponents) {
			if (added >= 4) {
				break;
			}
			const week = (weekCounter % 17) + 1;
			if (addGame(teamId, oppId, week, false)) {
				added += 1;
				weekCounter += 1;
			}
		}
	}

	// Phase 4: Fill remaining games to reach 17 per team
	for (const [teamId, ] of teams) {
		const currentCount = teamGameCount.get(teamId) || 0;
		const team = teams.get(teamId)!;
		if (currentCount >= 17) {
			continue;
		}

		// Fill with same-conference opponents
		const remaining = teamIds.filter(oppId => {
			return oppId !== teamId && (teamGameCount.get(oppId) || 0) < 17;
		});
		shuffleArray(remaining);

		for (const oppId of remaining) {
			if ((teamGameCount.get(teamId) || 0) >= 17) {
				break;
			}
			const opp = teams.get(oppId)!;
			const isConf = opp.conferenceId === team.conferenceId;
			const week = (weekCounter % 17) + 1;
			if (addGame(teamId, oppId, week, isConf)) {
				weekCounter += 1;
			}
		}
	}

	return allGames;
}

//============================================
// Create a stable team id from the full team name
function makeTeamId(fullName: string): TeamId {
	return fullName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

//============================================
// Split "Kansas City Chiefs" into { city: "Kansas City", mascot: "Chiefs" }
function splitTeamName(fullName: string): { city: string; mascot: string } {
	const parts = fullName.split(' ');
	const mascot = parts.pop() || 'Team';
	const city = parts.join(' ') || fullName;
	return { city, mascot };
}

//============================================
// Random coach personality
function randomCoachPersonality(): CoachPersonality {
	const choices: CoachPersonality[] = ['supportive', 'demanding', 'volatile'];
	return choices[randomInRange(0, 2)];
}

//============================================
// Simple assertions
console.assert(NFL_ROSTER.length === 32, 'NFL roster should have 32 teams');
console.assert(makeTeamId('Kansas City Chiefs') === 'kansas_city_chiefs', 'Team id generation');
const split = splitTeamName('San Francisco 49ers');
console.assert(split.city === 'San Francisco', 'City should be San Francisco');
console.assert(split.mascot === '49ers', 'Mascot should be 49ers');
