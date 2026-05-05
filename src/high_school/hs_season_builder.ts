// hs_season_builder.ts - build a high school season using the new season layer
//
// Creates an 8-team conference with the player's team plus 7 generated opponents.
// 10-game schedule: 7 conference (round-robin subset) + 3 non-conference.
// Supports parameterized configuration for testing and analysis tools.

import { TeamId } from '../season/season_types.js';
import { SeasonTeam } from '../season/team_model.js';
import { SeasonGame } from '../season/game_model.js';
import { LeagueSeason } from '../season/season_model.js';
import {
	resetGameIdCounter, nextGameId, generateRoundRobinRounds,
	generateBipartiteRotation, shuffleArray, validateSchedule,
} from '../season/season_builder.js';
import { generateOpponentName } from '../team.js';
import { randomInRange } from '../player.js';
import { CoachPersonality } from '../team.js';

//============================================
// High school conference region names
const HS_CONFERENCE_REGIONS = [
	'Northern', 'Southern', 'Eastern', 'Western',
	'Central', 'Pacific', 'Mountain', 'Valley',
];

//============================================
// Configuration for parameterized high school season building
export interface HighSchoolSeasonConfig {
	playerTeamName: string;
	playerMascot: string;
	playerStrength: number;
	conferenceTeams?: number;      // default 8
	gamesPerTeam?: number;         // default 10
	nonConferenceTeams?: number;   // default 8 (same as conferenceTeams)
}

//============================================
// Build a complete high school season with optional configuration
export function buildHighSchoolSeasonConfigured(
	config: HighSchoolSeasonConfig,
): LeagueSeason {
	const conferenceTeams = config.conferenceTeams ?? 8;
	const gamesPerTeam = config.gamesPerTeam ?? 10;
	const nonConferenceTeams = config.nonConferenceTeams ?? conferenceTeams;

	// Validate configuration
	if (conferenceTeams < 2 || conferenceTeams % 2 !== 0) {
		throw new Error(
			`conferenceTeams must be even and >= 2 (got ${conferenceTeams})`,
		);
	}
	if (gamesPerTeam < 1) {
		throw new Error(
			`gamesPerTeam must be >= 1 (got ${gamesPerTeam})`,
		);
	}

	// Calculate how many conference games are played
	const maxConfGames = conferenceTeams - 1; // single round-robin
	const maxTotalGames = maxConfGames * 2;   // double round-robin

	if (gamesPerTeam > maxTotalGames) {
		throw new Error(
			`gamesPerTeam ${gamesPerTeam} exceeds max for ${conferenceTeams} ` +
			`teams (double round-robin: ${maxTotalGames})`,
		);
	}

	// Check if we have enough non-conf teams if needed
	if (gamesPerTeam > maxConfGames && nonConferenceTeams < gamesPerTeam - maxConfGames) {
		throw new Error(
			`gamesPerTeam ${gamesPerTeam} requires ${gamesPerTeam - maxConfGames} ` +
			`non-conf games, but only ${nonConferenceTeams} non-conf teams available`,
		);
	}

	resetGameIdCounter();

	// Create the player's team
	const playerTeamId: TeamId = 'player';
	const playerTeam = new SeasonTeam(
		playerTeamId,
		config.playerTeamName,
		config.playerMascot,
		config.playerStrength,
		randomCoachPersonality(),
		'main_conference',
	);

	// Generate conference opponents
	const teams = new Map<TeamId, SeasonTeam>();
	teams.set(playerTeamId, playerTeam);
	const conferenceTeamIds: TeamId[] = [playerTeamId];

	for (let i = 0; i < conferenceTeams - 1; i++) {
		const opponentId = `conf_${i}`;
		const opponentName = generateOpponentName();
		const parts = opponentName.split(' ');
		const mascot = parts.pop() || 'Team';
		const name = parts.join(' ') || 'Unknown';
		const strength = randomInRange(35, 90);

		const opponent = new SeasonTeam(
			opponentId,
			name,
			mascot,
			strength,
			randomCoachPersonality(),
			'main_conference',
		);
		teams.set(opponentId, opponent);
		conferenceTeamIds.push(opponentId);
	}

	// Generate non-conference opponents
	const nonConfTeamIds: TeamId[] = [];
	for (let i = 0; i < nonConferenceTeams; i++) {
		const ncId = `nonconf_${i}`;
		const ncName = generateOpponentName();
		const parts = ncName.split(' ');
		const mascot = parts.pop() || 'Team';
		const name = parts.join(' ') || 'Unknown';
		const strength = randomInRange(30, 85);

		const ncTeam = new SeasonTeam(
			ncId,
			name,
			mascot,
			strength,
			randomCoachPersonality(),
		);
		teams.set(ncId, ncTeam);
		nonConfTeamIds.push(ncId);
	}

	// Build schedule
	const allGames = buildHSSchedule(
		conferenceTeamIds,
		nonConfTeamIds,
		gamesPerTeam,
	);

	// Validate schedule
	const validation = validateSchedule(allGames, gamesPerTeam);
	if (!validation.valid) {
		// Suppress imbalance warnings for non-conf padding (by design)
		const hasNonConfPadding = gamesPerTeam > maxConfGames;
		const filterErrors = hasNonConfPadding
			? validation.errors.filter(e => !e.includes('imbalance'))
			: validation.errors;
		if (filterErrors.length > 0) {
			console.warn('HS schedule validation warnings:', filterErrors);
		}
	}

	// Pick a conference name (unused but generated for consistency with original)
	void HS_CONFERENCE_REGIONS[
		randomInRange(0, HS_CONFERENCE_REGIONS.length - 1)
	];

	return new LeagueSeason(teams, allGames, gamesPerTeam, playerTeamId, 'high_school');
}

//============================================
// Build a complete high school season (backward compatible)
export function buildHighSchoolSeason(
	playerTeamName: string,
	playerMascot: string,
	playerStrength: number,
): LeagueSeason {
	return buildHighSchoolSeasonConfigured({
		playerTeamName,
		playerMascot,
		playerStrength,
		conferenceTeams: 8,
		gamesPerTeam: 10,
		nonConferenceTeams: 8,
	});
}

//============================================
// Build the schedule for an HS conference with configurable game count.
// Uses proper round-robin rounds so teams play every week without conflicts.
// If gamesPerTeam <= conferenceTeams-1: single round-robin (conference only)
// If gamesPerTeam > conferenceTeams-1: add non-conf games for the remainder
function buildHSSchedule(
	conferenceTeamIds: TeamId[],
	nonConfTeamIds: TeamId[],
	gamesPerTeam: number,
): SeasonGame[] {
	// Generate conflict-free round-robin rounds
	const allRounds = generateRoundRobinRounds(conferenceTeamIds);
	const maxConfGamesPerTeam = conferenceTeamIds.length - 1;

	const allGames: SeasonGame[] = [];
	let currentWeek = 1;

	// Conference round-robin games
	const confRoundsToUse = Math.min(gamesPerTeam, maxConfGamesPerTeam);
	for (let r = 0; r < confRoundsToUse; r++) {
		for (const [home, away] of allRounds[r]) {
			allGames.push(new SeasonGame(nextGameId(), currentWeek, home, away, true));
		}
		currentWeek++;
	}

	// Non-conference games (if needed)
	if (gamesPerTeam > maxConfGamesPerTeam) {
		const nonConfGamesToSchedule = gamesPerTeam - maxConfGamesPerTeam;
		const confOrdered = [...conferenceTeamIds];
		shuffleArray(confOrdered);
		const ncOrdered = [...nonConfTeamIds];
		shuffleArray(ncOrdered);

		const ncRounds = generateBipartiteRotation(
			confOrdered,
			ncOrdered,
			nonConfGamesToSchedule,
		);
		for (let r = 0; r < ncRounds.length; r++) {
			for (const [home, away] of ncRounds[r]) {
				allGames.push(new SeasonGame(nextGameId(), currentWeek, home, away, false));
			}
			currentWeek++;
		}
	}

	return allGames;
}

//============================================
// Random coach personality
function randomCoachPersonality(): CoachPersonality {
	const choices: CoachPersonality[] = ['supportive', 'demanding', 'volatile'];
	return choices[randomInRange(0, 2)];
}
