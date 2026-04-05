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
import { getNFLTeams, NFLTeamEntry } from '../nfl.js';

//============================================
// NFL team data used internally for season building
interface NFLTeamData {
	name: string;
	conference: string;   // "AFC" or "NFC"
	division: string;     // "East", "West", "North", "South"
	strength: number;     // base strength 55-90
}

//============================================
// Build NFL roster from CSV data with random strength values
function buildNFLRoster(): NFLTeamData[] {
	const csvTeams = getNFLTeams();

	// Extract division short name from CSV "NFC West" -> "West"
	return csvTeams.map((entry: NFLTeamEntry) => {
		// Division column is "NFC West" etc., extract the short part
		const divParts = entry.division.split(' ');
		const divisionShort = divParts.length > 1 ? divParts[1] : divParts[0];

		return {
			name: entry.name,
			conference: entry.conference,
			division: divisionShort,
			// Random base strength each season (55-90 range)
			strength: randomInRange(55, 90),
		};
	});
}

//============================================
// Build a complete NFL season
export function buildNFLSeason(
	playerTeamName: string,
): LeagueSeason {
	resetGameIdCounter();

	// Build roster from CSV data each season (strengths randomized)
	const roster = buildNFLRoster();

	// Find the player's team data
	const playerData = roster.find(t => t.name === playerTeamName);
	if (!playerData) {
		// Fallback: assign to a random team
		const fallback = roster[randomInRange(0, roster.length - 1)];
		return buildNFLSeasonWithData(fallback.name, roster);
	}

	return buildNFLSeasonWithData(playerTeamName, roster);
}

//============================================
// Internal: build the season from known team name
function buildNFLSeasonWithData(
	playerTeamName: string,
	roster: NFLTeamData[],
): LeagueSeason {
	const teams = new Map<TeamId, SeasonTeam>();
	let playerTeamId = '';

	// Create all 32 teams (strength already randomized in buildNFLRoster)
	for (const data of roster) {
		const seasonStrength = data.strength;

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
console.assert(getNFLTeams().length === 32 || getNFLTeams().length === 0,
	'NFL roster should have 32 teams when loaded');
console.assert(makeTeamId('Kansas City Chiefs') === 'kansas_city_chiefs', 'Team id generation');
const split = splitTeamName('San Francisco 49ers');
console.assert(split.city === 'San Francisco', 'City should be San Francisco');
console.assert(split.mascot === '49ers', 'Mascot should be 49ers');
