// season_builder.ts - shared schedule generation helpers
//
// Used by phase-specific builders (HS, college, NFL) to construct schedules.
// Round-robin pairing, week assignment, non-conference generation, validation.

import { TeamId, GameId } from './season_types.js';
import { SeasonGame } from './game_model.js';

// Running game id counter for unique ids within a season
let gameIdCounter = 0;

//============================================
// Reset game id counter (call at start of each new season build)
export function resetGameIdCounter(): void {
	gameIdCounter = 0;
}

//============================================
// Generate a unique game id
export function nextGameId(): GameId {
	gameIdCounter += 1;
	return `game_${gameIdCounter}`;
}

//============================================
// Generate all round-robin pairs for a set of team ids.
// For N teams, produces N*(N-1)/2 unique pairs.
// Returns array of [homeTeamId, awayTeamId] tuples.
export function generateRoundRobin(teamIds: TeamId[]): [TeamId, TeamId][] {
	const pairs: [TeamId, TeamId][] = [];

	for (let i = 0; i < teamIds.length; i++) {
		for (let j = i + 1; j < teamIds.length; j++) {
			// Randomly assign home/away
			if (Math.random() < 0.5) {
				pairs.push([teamIds[i], teamIds[j]]);
			} else {
				pairs.push([teamIds[j], teamIds[i]]);
			}
		}
	}

	return pairs;
}

//============================================
// Select a subset of pairs from a round-robin, ensuring each team
// appears a roughly equal number of times.
// Returns up to `count` pairs.
export function selectPairs(
	pairs: [TeamId, TeamId][],
	count: number,
): [TeamId, TeamId][] {
	// Shuffle the pairs first
	const shuffled = [...pairs];
	shuffleArray(shuffled);

	// Greedily select pairs, tracking how many times each team appears
	const selected: [TeamId, TeamId][] = [];
	const teamCounts = new Map<TeamId, number>();

	for (const pair of shuffled) {
		if (selected.length >= count) {
			break;
		}
		const [a, b] = pair;
		const countA = teamCounts.get(a) || 0;
		const countB = teamCounts.get(b) || 0;

		// Allow each team in at most ceil(count / teamCount * 2) games
		const maxPerTeam = Math.ceil(count * 2 / new Set([...pairs.flat()]).size);
		if (countA < maxPerTeam && countB < maxPerTeam) {
			selected.push(pair);
			teamCounts.set(a, countA + 1);
			teamCounts.set(b, countB + 1);
		}
	}

	return selected;
}

//============================================
// Assign game pairs to specific weeks, creating SeasonGame objects.
// Distributes games evenly across the week range.
// All created games are conference games by default.
export function assignWeeksToGames(
	pairs: [TeamId, TeamId][],
	startWeek: number,
	endWeek: number,
	isConference: boolean = true,
): SeasonGame[] {
	const games: SeasonGame[] = [];
	const totalWeeks = endWeek - startWeek + 1;

	// Shuffle pairs for random week assignment
	const shuffled = [...pairs];
	shuffleArray(shuffled);

	for (let i = 0; i < shuffled.length; i++) {
		const [home, away] = shuffled[i];
		// Distribute evenly across weeks
		const week = startWeek + (i % totalWeeks);
		games.push(new SeasonGame(nextGameId(), week, home, away, isConference));
	}

	return games;
}

//============================================
// Generate non-conference games for a specific team.
// Picks random opponents from the pool and assigns to specified weeks.
export function generateNonConferenceGames(
	teamId: TeamId,
	opponentPool: TeamId[],
	count: number,
	weeks: number[],
): SeasonGame[] {
	const games: SeasonGame[] = [];
	const available = [...opponentPool];
	shuffleArray(available);

	for (let i = 0; i < count && i < available.length && i < weeks.length; i++) {
		const opponentId = available[i];
		const week = weeks[i];
		// Randomly assign home/away
		if (Math.random() < 0.5) {
			games.push(new SeasonGame(nextGameId(), week, teamId, opponentId, false));
		} else {
			games.push(new SeasonGame(nextGameId(), week, opponentId, teamId, false));
		}
	}

	return games;
}

//============================================
// Validate a schedule: no team plays twice in one week,
// and every week in [1..seasonLength] has at least one game.
export function validateSchedule(
	games: SeasonGame[],
	seasonLength: number,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check for double-bookings: no team plays twice in one week
	const weekTeamMap = new Map<number, Set<TeamId>>();
	for (const game of games) {
		if (!weekTeamMap.has(game.week)) {
			weekTeamMap.set(game.week, new Set());
		}
		const weekTeams = weekTeamMap.get(game.week)!;

		if (weekTeams.has(game.homeTeamId)) {
			errors.push(`Team ${game.homeTeamId} plays twice in week ${game.week}`);
		}
		if (weekTeams.has(game.awayTeamId)) {
			errors.push(`Team ${game.awayTeamId} plays twice in week ${game.week}`);
		}
		weekTeams.add(game.homeTeamId);
		weekTeams.add(game.awayTeamId);
	}

	// Check that every week has at least one game
	for (let week = 1; week <= seasonLength; week++) {
		const weekGames = games.filter(g => g.week === week);
		if (weekGames.length === 0) {
			errors.push(`Week ${week} has no scheduled games`);
		}
	}

	return { valid: errors.length === 0, errors };
}

//============================================
// Fisher-Yates shuffle (in-place)
export function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

//============================================
//============================================
// Generate a conflict-free round-robin schedule.
// Uses the "circle method": fix one team, rotate the rest.
// For N teams (must be even), produces (N-1) rounds of N/2 games each.
// Every team plays exactly once per round. No conflicts.
// Returns an array of rounds, where each round is an array of [home, away] pairs.
export function generateRoundRobinRounds(
	teamIds: TeamId[],
): [TeamId, TeamId][][] {
	// Must have even number of teams
	const ids = [...teamIds];
	if (ids.length % 2 !== 0) {
		ids.push('_bye_');
	}
	const n = ids.length;

	// Fix the first team, rotate the rest
	const fixed = ids[0];
	const rotating = ids.slice(1);
	const rounds: [TeamId, TeamId][][] = [];

	for (let round = 0; round < n - 1; round++) {
		const roundGames: [TeamId, TeamId][] = [];

		// Fixed team plays the top of the rotating list
		const opponent = rotating[0];
		if (fixed !== '_bye_' && opponent !== '_bye_') {
			// Alternate home/away by round
			if (round % 2 === 0) {
				roundGames.push([fixed, opponent]);
			} else {
				roundGames.push([opponent, fixed]);
			}
		}

		// Pair remaining rotating teams from outside in
		for (let i = 1; i < n / 2; i++) {
			const team1 = rotating[i];
			const team2 = rotating[n - 2 - i];
			if (team1 !== '_bye_' && team2 !== '_bye_') {
				// Alternate home/away
				if (i % 2 === 0) {
					roundGames.push([team1, team2]);
				} else {
					roundGames.push([team2, team1]);
				}
			}
		}

		rounds.push(roundGames);

		// Rotate: move last element to front
		rotating.unshift(rotating.pop()!);
	}

	// Shuffle the round order so the schedule isn't predictable
	shuffleArray(rounds);

	return rounds;
}

// Simple assertions
const rrPairs = generateRoundRobin(['a', 'b', 'c', 'd']);
// 4 teams should produce 4*3/2 = 6 pairs
console.assert(rrPairs.length === 6, 'Round-robin of 4 teams should produce 6 pairs');

// Verify all pairs are unique combinations
const pairSet = new Set(rrPairs.map(([a, b]) => [a, b].sort().join('-')));
console.assert(pairSet.size === 6, 'All 6 pairs should be unique');

// 8 teams should produce 28 pairs
const rr8 = generateRoundRobin(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
console.assert(rr8.length === 28, 'Round-robin of 8 teams should produce 28 pairs');

// Round-robin rounds: 8 teams should produce 7 rounds of 4 games each
const rrRounds = generateRoundRobinRounds(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
console.assert(rrRounds.length === 7, 'RR rounds for 8 teams should be 7');
console.assert(rrRounds[0].length === 4, 'Each RR round should have 4 games');

// Verify no team plays twice in any round
for (const round of rrRounds) {
	const teamsInRound = new Set<string>();
	for (const [a, b] of round) {
		console.assert(!teamsInRound.has(a), `Team ${a} double-booked in round`);
		console.assert(!teamsInRound.has(b), `Team ${b} double-booked in round`);
		teamsInRound.add(a);
		teamsInRound.add(b);
	}
}
