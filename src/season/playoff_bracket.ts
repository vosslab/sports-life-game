// playoff_bracket.ts - generic playoff bracket for all phases
//
// Supports variable-size brackets with byes for higher seeds.
// Used by HS (4-team), college (championship + 4-team CFP), and
// NFL (7 seeds per conference, 4 rounds with bye).

import { TeamId, GameId, PlayoffSeed } from './season_types.js';
import { SeasonGame } from './game_model.js';
import { randomInRange } from '../player.js';

// Running playoff game id counter
let playoffGameCounter = 0;

//============================================
// Reset playoff game id counter
function nextPlayoffGameId(): GameId {
	playoffGameCounter += 1;
	return `playoff_${playoffGameCounter}`;
}

//============================================
// A single playoff round
export interface PlayoffRound {
	roundNumber: number;
	roundName: string;
	games: SeasonGame[];
}

//============================================
// The playoff bracket
export class PlayoffBracket {
	seeds: PlayoffSeed[];
	rounds: PlayoffRound[];
	currentRoundIndex: number;
	playerTeamId: TeamId;

	constructor(seeds: PlayoffSeed[], playerTeamId: TeamId) {
		this.seeds = seeds;
		this.rounds = [];
		this.currentRoundIndex = 0;
		this.playerTeamId = playerTeamId;
		// Do not reset playoffGameCounter here -- multiple brackets share the counter
	}

	//============================================
	// Build a standard single-elimination bracket.
	// Seeds are matched 1v8, 2v7, 3v6, 4v5, etc.
	// If odd number of teams, highest seed gets a bye.
	// Only round 0 gets initial matchups; advanceRound() fills later rounds.
	buildBracket(roundNames: string[]): void {
		// Pre-create all round shells (games arrays start empty)
		for (let i = 0; i < roundNames.length; i++) {
			this.rounds.push({
				roundNumber: i + 1,
				roundName: roundNames[i],
				games: [],
			});
		}

		// Populate only the first round with initial matchups
		const sortedTeamIds = this.seeds
			.sort((a, b) => a.seed - b.seed)
			.map(s => s.teamId);

		let lo = 0;
		let hi = sortedTeamIds.length - 1;

		while (lo < hi) {
			const game = new SeasonGame(
				nextPlayoffGameId(),
				0, // week 0 = playoff
				sortedTeamIds[lo],
				sortedTeamIds[hi],
				false,
			);
			this.rounds[0].games.push(game);
			lo += 1;
			hi -= 1;
		}
		// If odd team count, middle team has a bye in round 0 (no game created)
	}

	//============================================
	// Get the current round's games
	getCurrentRound(): PlayoffRound | undefined {
		if (this.currentRoundIndex >= this.rounds.length) {
			return undefined;
		}
		return this.rounds[this.currentRoundIndex];
	}

	//============================================
	// Get the player's game in the current round (if any)
	getPlayerMatchup(): SeasonGame | undefined {
		const round = this.getCurrentRound();
		if (!round) {
			return undefined;
		}
		return round.games.find(g => g.involvesTeam(this.playerTeamId));
	}

	//============================================
	// Record a playoff game result
	recordResult(gameId: GameId, homeScore: number, awayScore: number): void {
		for (const round of this.rounds) {
			const game = round.games.find(g => g.id === gameId);
			if (game) {
				game.recordResult(homeScore, awayScore);
				return;
			}
		}
	}

	//============================================
	// Check if the current round is complete
	isCurrentRoundComplete(): boolean {
		const round = this.getCurrentRound();
		if (!round) {
			return true;
		}
		return round.games.every(g => g.status === 'final');
	}

	//============================================
	// Advance to the next round, populating it with winners.
	// Includes bye teams who did not play in the current round.
	advanceRound(): boolean {
		const round = this.getCurrentRound();
		if (!round || !this.isCurrentRoundComplete()) {
			return false;
		}

		// Collect winners from current round
		const winners: TeamId[] = [];
		for (const game of round.games) {
			const winner = game.getWinner();
			if (winner) {
				winners.push(winner);
			}
		}

		// Find bye teams: seeds that have never appeared in ANY round's games
		// (only the current round's bye holder should be re-inserted once)
		const teamsEverScheduled = new Set<TeamId>();
		for (const r of this.rounds) {
			for (const game of r.games) {
				teamsEverScheduled.add(game.homeTeamId);
				teamsEverScheduled.add(game.awayTeamId);
			}
		}
		// A true bye team has no scheduled game in any round yet and is not eliminated
		for (const seed of this.seeds) {
			if (!teamsEverScheduled.has(seed.teamId) && !this.isEliminated(seed.teamId)) {
				// This team had a bye -- add them at the front (top seed advantage)
				winners.unshift(seed.teamId);
			}
		}

		this.currentRoundIndex += 1;

		// If there is a next round, populate it with winners
		const nextRound = this.getCurrentRound();
		if (nextRound && nextRound.games.length === 0) {
			// Build matchups for next round from winners (1-seed vs lowest, etc.)
			let lo = 0;
			let hi = winners.length - 1;
			while (lo < hi) {
				nextRound.games.push(new SeasonGame(
					nextPlayoffGameId(),
					0,
					winners[lo],
					winners[hi],
					false,
				));
				lo += 1;
				hi -= 1;
			}
		}

		return this.currentRoundIndex < this.rounds.length;
	}

	//============================================
	// Check if a team has been eliminated
	isEliminated(teamId: TeamId): boolean {
		for (const round of this.rounds) {
			for (const game of round.games) {
				if (game.status === 'final' && game.involvesTeam(teamId)) {
					const loser = game.getLoser();
					if (loser === teamId) {
						return true;
					}
				}
			}
		}
		return false;
	}

	//============================================
	// Get the champion (only valid after all rounds complete)
	getChampion(): TeamId | undefined {
		if (this.rounds.length === 0) {
			return undefined;
		}
		const finalRound = this.rounds[this.rounds.length - 1];
		if (finalRound.games.length === 0) {
			return undefined;
		}
		const finalGame = finalRound.games[0];
		if (finalGame.status !== 'final') {
			return undefined;
		}
		return finalGame.getWinner();
	}

	//============================================
	// Check if playoffs are complete
	isComplete(): boolean {
		if (this.rounds.length === 0) {
			return true;
		}
		const finalRound = this.rounds[this.rounds.length - 1];
		return finalRound.games.every(g => g.status === 'final');
	}

	//============================================
	// Simulate a non-player playoff game using team strengths
	simulatePlayoffGame(
		game: SeasonGame,
		homeStrength: number,
		awayStrength: number,
	): void {
		// Playoff games use tighter margins than regular season
		const homeBase = Math.floor((homeStrength / 100) * 28) + randomInRange(3, 14);
		const awayBase = Math.floor((awayStrength / 100) * 28) + randomInRange(3, 14);

		// Home-field advantage
		let homeScore = homeBase + randomInRange(0, 3);
		let awayScore = awayBase;

		// No ties in playoffs: overtime if needed
		if (homeScore === awayScore) {
			const overtimePoints = randomInRange(3, 7);
			const winProb = 0.5 + ((homeStrength - awayStrength) / 200);
			if (Math.random() < winProb) {
				homeScore += overtimePoints;
			} else {
				awayScore += overtimePoints;
			}
		}

		this.recordResult(game.id, homeScore, awayScore);
	}
}

//============================================
// Create an HS playoff bracket (top 4 from conference)
export function createHSPlayoffBracket(
	seeds: PlayoffSeed[],
	playerTeamId: TeamId,
): PlayoffBracket {
	const bracket = new PlayoffBracket(seeds.slice(0, 4), playerTeamId);
	// Build 2-round bracket with pre-created rounds
	bracket.rounds = [
		{ roundNumber: 1, roundName: 'Semifinal', games: [] },
		{ roundNumber: 2, roundName: 'Championship', games: [] },
	];
	// Populate first round: 1v4, 2v3
	const sorted = bracket.seeds.sort((a, b) => a.seed - b.seed);
	if (sorted.length >= 4) {
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[0].teamId, sorted[3].teamId, true,
		));
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[1].teamId, sorted[2].teamId, true,
		));
	}
	return bracket;
}

//============================================
// Create a college playoff bracket (conference championship + 4-team CFP)
export function createCollegePlayoffBracket(
	seeds: PlayoffSeed[],
	playerTeamId: TeamId,
): PlayoffBracket {
	const bracket = new PlayoffBracket(seeds.slice(0, 4), playerTeamId);
	bracket.rounds = [
		{ roundNumber: 1, roundName: 'CFP Semifinal', games: [] },
		{ roundNumber: 2, roundName: 'National Championship', games: [] },
	];
	const sorted = bracket.seeds.sort((a, b) => a.seed - b.seed);
	if (sorted.length >= 4) {
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[0].teamId, sorted[3].teamId, false,
		));
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[1].teamId, sorted[2].teamId, false,
		));
	}
	return bracket;
}

//============================================
// Create an NFL playoff bracket (7 seeds per conference, 4 rounds)
// 1-seed gets bye in wild card round
export function createNFLPlayoffBracket(
	seeds: PlayoffSeed[],
	playerTeamId: TeamId,
): PlayoffBracket {
	const bracket = new PlayoffBracket(seeds.slice(0, 7), playerTeamId);
	bracket.rounds = [
		{ roundNumber: 1, roundName: 'Wild Card', games: [] },
		{ roundNumber: 2, roundName: 'Divisional', games: [] },
		{ roundNumber: 3, roundName: 'Conference Championship', games: [] },
	];

	// Wild card: 2v7, 3v6, 4v5 (1-seed has bye)
	const sorted = bracket.seeds.sort((a, b) => a.seed - b.seed);
	if (sorted.length >= 7) {
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[1].teamId, sorted[6].teamId, true,
		));
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[2].teamId, sorted[5].teamId, true,
		));
		bracket.rounds[0].games.push(new SeasonGame(
			nextPlayoffGameId(), 0, sorted[3].teamId, sorted[4].teamId, true,
		));
	}

	return bracket;
}

//============================================
// Simple assertions
const testSeeds: PlayoffSeed[] = [
	{ teamId: 'a', seed: 1, wins: 8, losses: 2 },
	{ teamId: 'b', seed: 2, wins: 7, losses: 3 },
	{ teamId: 'c', seed: 3, wins: 6, losses: 4 },
	{ teamId: 'd', seed: 4, wins: 5, losses: 5 },
];
const testBracket = createHSPlayoffBracket(testSeeds, 'a');
console.assert(testBracket.rounds.length === 2, 'HS bracket should have 2 rounds');
console.assert(testBracket.rounds[0].games.length === 2, 'Semifinal should have 2 games');
console.assert(testBracket.isEliminated('a') === false, 'Player not eliminated before games');
