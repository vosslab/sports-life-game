// hs_season_builder.ts - build a high school season using the new season layer
//
// Creates an 8-team conference with the player's team plus 7 generated opponents.
// 10-game schedule: 7 conference (round-robin subset) + 3 non-conference.

import { TeamId } from '../season/season_types.js';
import { SeasonTeam } from '../season/team_model.js';
import { SeasonGame } from '../season/game_model.js';
import { LeagueSeason } from '../season/season_model.js';
import {
	resetGameIdCounter, nextGameId, generateRoundRobinRounds,
	generateNonConferenceGames, shuffleArray, validateSchedule,
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
// Build a complete high school season
export function buildHighSchoolSeason(
	playerTeamName: string,
	playerMascot: string,
	playerStrength: number,
): LeagueSeason {
	resetGameIdCounter();

	// Create the player's team
	const playerTeamId: TeamId = 'player';
	const playerTeam = new SeasonTeam(
		playerTeamId,
		playerTeamName,
		playerMascot,
		playerStrength,
		randomCoachPersonality(),
		'main_conference',
	);

	// Generate 7 conference opponents
	const teams = new Map<TeamId, SeasonTeam>();
	teams.set(playerTeamId, playerTeam);
	const conferenceTeamIds: TeamId[] = [playerTeamId];

	for (let i = 0; i < 7; i++) {
		const opponentId = `conf_${i}`;
		const opponentName = generateOpponentName();
		// Split into name and mascot parts
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

	// Generate 3 non-conference opponents (not in standings, just for schedule)
	const nonConfTeamIds: TeamId[] = [];
	for (let i = 0; i < 3; i++) {
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

	// Build schedule: 7 conference + 3 non-conference = 10 games for player
	const allGames = buildHSSchedule(
		playerTeamId,
		conferenceTeamIds,
		nonConfTeamIds,
	);

	// Validate schedule
	const validation = validateSchedule(allGames, 10);
	if (!validation.valid) {
		console.warn('HS schedule validation warnings:', validation.errors);
	}

	// Pick a conference name
	const region = HS_CONFERENCE_REGIONS[
		randomInRange(0, HS_CONFERENCE_REGIONS.length - 1)
	];

	return new LeagueSeason(teams, allGames, 10, playerTeamId, 'high_school');
}

//============================================
// Build the 10-week schedule for an HS conference.
// Uses proper round-robin rounds so ALL teams play every week.
// 8 teams = 7 rounds of 4 games. 7 rounds fill 7 of the 10 weeks.
// All conference teams get non-conference games in the remaining 3 weeks.
function buildHSSchedule(
	playerTeamId: TeamId,
	conferenceTeamIds: TeamId[],
	nonConfTeamIds: TeamId[],
): SeasonGame[] {
	// Generate conflict-free round-robin rounds for all 8 conference teams
	const rounds = generateRoundRobinRounds(conferenceTeamIds);

	// Assign each round to a week. Reserve 3 weeks for non-conf games.
	// Conference rounds go into 7 of the 10 weeks.
	const confWeeks = [1, 2, 3, 5, 6, 8, 9];
	const ncWeeks = [4, 7, 10];

	const allGames: SeasonGame[] = [];

	// Create conference games from the round-robin rounds
	for (let r = 0; r < rounds.length && r < confWeeks.length; r++) {
		const week = confWeeks[r];
		for (const [home, away] of rounds[r]) {
			allGames.push(new SeasonGame(nextGameId(), week, home, away, true));
		}
	}

	// Player's 3 non-conference games
	const playerNonConfGames = generateNonConferenceGames(
		playerTeamId, nonConfTeamIds, 3, ncWeeks,
	);
	allGames.push(...playerNonConfGames);

	// Schedule non-conference games for ALL other conference teams
	// Each non-conference team can only play once per team (they only exist for these weeks)
	const availableNonConfTeams = [...nonConfTeamIds];
	shuffleArray(availableNonConfTeams);
	let ncTeamIndex = 0;

	for (const week of ncWeeks) {
		for (const confTeam of conferenceTeamIds) {
			// Skip the player team (already has non-conf games)
			if (confTeam === playerTeamId) {
				continue;
			}

			// Check if this team already has a game this week
			const hasGameThisWeek = allGames.some(g =>
				g.week === week && (g.homeTeamId === confTeam || g.awayTeamId === confTeam)
			);

			if (!hasGameThisWeek && ncTeamIndex < availableNonConfTeams.length) {
				// Assign a non-conference opponent
				const opponentId = availableNonConfTeams[ncTeamIndex];
				ncTeamIndex++;

				// Randomly assign home/away
				if (Math.random() < 0.5) {
					allGames.push(new SeasonGame(nextGameId(), week, confTeam, opponentId, false));
				} else {
					allGames.push(new SeasonGame(nextGameId(), week, opponentId, confTeam, false));
				}
			}
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
