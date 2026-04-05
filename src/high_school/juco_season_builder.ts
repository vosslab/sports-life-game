// juco_season_builder.ts - build a JUCO season with generated teams
//
// Creates an 8-team conference with the player's team plus 7 generated opponents.
// 8-game schedule: all conference games (round-robin subset).
// Uses fictional JUCO team names, not real NCAA data.

import { TeamId } from '../season/season_types.js';
import { SeasonTeam } from '../season/team_model.js';
import { SeasonGame } from '../season/game_model.js';
import { LeagueSeason } from '../season/season_model.js';
import {
	resetGameIdCounter, nextGameId, generateRoundRobinRounds,
	validateSchedule,
} from '../season/season_builder.js';
import { randomInRange } from '../player.js';
import { CoachPersonality } from '../team.js';

//============================================
// JUCO team name prefixes
const JUCO_PREFIXES = [
	'Central', 'Western', 'Eastern', 'Northern', 'Southern',
	'Coastal', 'Valley', 'Mountain', 'Lakeside', 'Riverside',
	'Pinewood', 'Oakdale', 'Highland', 'Midlands', 'Prairie',
];

//============================================
// JUCO team mascots
const JUCO_MASCOTS = [
	'Cougars', 'Hawks', 'Wildcats', 'Bears', 'Eagles',
	'Wolves', 'Panthers', 'Mustangs', 'Bulldogs', 'Falcons',
	'Chargers', 'Pioneers', 'Lancers', 'Raiders', 'Knights',
];

//============================================
// Generate a random coach personality
function randomCoachPersonality(): CoachPersonality {
	const styles: CoachPersonality[] = ['supportive', 'demanding', 'volatile'];
	return styles[randomInRange(0, 2)];
}

//============================================
// Build a JUCO season with generated teams
export function buildJucoSeason(playerStrength: number): LeagueSeason {
	resetGameIdCounter();

	// Create the player's JUCO team
	const playerTeamId: TeamId = 'player';
	const playerTeam = new SeasonTeam(
		playerTeamId,
		'Central CC',
		'Cougars',
		playerStrength,
		randomCoachPersonality(),
		'juco_conference',
	);

	// Generate 7 conference opponents
	const teams = new Map<TeamId, SeasonTeam>();
	teams.set(playerTeamId, playerTeam);
	const conferenceTeamIds: TeamId[] = [playerTeamId];
	const usedNames = new Set<string>(['Central']);

	for (let i = 0; i < 7; i++) {
		const opponentId: TeamId = `juco_${i}`;

		// Pick unused name
		let name: string;
		do {
			name = JUCO_PREFIXES[randomInRange(0, JUCO_PREFIXES.length - 1)];
		} while (usedNames.has(name));
		usedNames.add(name);

		const mascot = JUCO_MASCOTS[randomInRange(0, JUCO_MASCOTS.length - 1)];
		const strength = randomInRange(35, 75);

		const opponent = new SeasonTeam(
			opponentId,
			`${name} CC`,
			mascot,
			strength,
			randomCoachPersonality(),
			'juco_conference',
		);

		teams.set(opponentId, opponent);
		conferenceTeamIds.push(opponentId);
	}

	// Generate round-robin schedule
	const rounds = generateRoundRobinRounds(conferenceTeamIds);
	const games: SeasonGame[] = [];
	let week = 1;

	// Use rounds to fill the 8-week season
	for (const round of rounds) {
		if (week > 8) break;
		for (const [homeId, awayId] of round) {
			const game = new SeasonGame(
				nextGameId(),
				week,
				homeId,
				awayId,
				true, // conference game
			);
			games.push(game);
		}
		week += 1;
	}

	// Validate
	const result = validateSchedule(games, 8);
	if (!result.valid) {
		console.warn('JUCO schedule validation failed:', result.errors);
	}

	// Build the LeagueSeason
	const season = new LeagueSeason(teams, games, 8, playerTeamId, 'high_school');
	return season;
}
