// game_model.ts - one scheduled game in a season
//
// This is the atomic truth for records. A game stores whether it happened
// and what the result was. Team records and standings are derived from these.

import { GameId, TeamId, GameStatus } from './season_types.js';

//============================================
// A single game on the season schedule
export class SeasonGame {
	id: GameId;
	week: number;
	homeTeamId: TeamId;
	awayTeamId: TeamId;
	status: GameStatus;
	homeScore: number | undefined;
	awayScore: number | undefined;
	isConferenceGame: boolean;

	constructor(
		id: GameId,
		week: number,
		homeTeamId: TeamId,
		awayTeamId: TeamId,
		isConferenceGame: boolean = false,
	) {
		this.id = id;
		this.week = week;
		this.homeTeamId = homeTeamId;
		this.awayTeamId = awayTeamId;
		this.isConferenceGame = isConferenceGame;
		this.status = 'scheduled';
		this.homeScore = undefined;
		this.awayScore = undefined;
	}

	//============================================
	// Record the final result. Sets status to "final".
	recordResult(homeScore: number, awayScore: number): void {
		this.homeScore = homeScore;
		this.awayScore = awayScore;
		this.status = 'final';
	}

	//============================================
	// Returns the winning team id, or undefined for a tie
	getWinner(): TeamId | undefined {
		if (this.status !== 'final') {
			return undefined;
		}
		if (this.homeScore === undefined || this.awayScore === undefined) {
			return undefined;
		}
		if (this.homeScore > this.awayScore) {
			return this.homeTeamId;
		}
		if (this.awayScore > this.homeScore) {
			return this.awayTeamId;
		}
		// Tie
		return undefined;
	}

	//============================================
	// Returns the losing team id, or undefined for a tie
	getLoser(): TeamId | undefined {
		if (this.status !== 'final') {
			return undefined;
		}
		if (this.homeScore === undefined || this.awayScore === undefined) {
			return undefined;
		}
		if (this.homeScore > this.awayScore) {
			return this.awayTeamId;
		}
		if (this.awayScore > this.homeScore) {
			return this.homeTeamId;
		}
		// Tie
		return undefined;
	}

	//============================================
	// Check if a specific team is in this game
	involvesTeam(teamId: TeamId): boolean {
		return this.homeTeamId === teamId || this.awayTeamId === teamId;
	}

	//============================================
	// Get the opponent for a specific team in this game
	getOpponentId(teamId: TeamId): TeamId | undefined {
		if (this.homeTeamId === teamId) {
			return this.awayTeamId;
		}
		if (this.awayTeamId === teamId) {
			return this.homeTeamId;
		}
		return undefined;
	}

	//============================================
	// Get score from a specific team's perspective
	getTeamScore(teamId: TeamId): number | undefined {
		if (this.status !== 'final') {
			return undefined;
		}
		if (this.homeTeamId === teamId) {
			return this.homeScore;
		}
		if (this.awayTeamId === teamId) {
			return this.awayScore;
		}
		return undefined;
	}

	//============================================
	// Get opponent score from a specific team's perspective
	getOpponentScore(teamId: TeamId): number | undefined {
		if (this.status !== 'final') {
			return undefined;
		}
		if (this.homeTeamId === teamId) {
			return this.awayScore;
		}
		if (this.awayTeamId === teamId) {
			return this.homeScore;
		}
		return undefined;
	}
}

//============================================
// Simple assertions
const testGame = new SeasonGame('g1', 1, 'home', 'away', true);
console.assert(testGame.status === 'scheduled', 'New game should be scheduled');
console.assert(testGame.getWinner() === undefined, 'Unplayed game has no winner');
console.assert(testGame.involvesTeam('home') === true, 'Home team should be involved');
console.assert(testGame.involvesTeam('other') === false, 'Other team should not be involved');
console.assert(testGame.getOpponentId('home') === 'away', 'Opponent of home is away');

testGame.recordResult(28, 14);
console.assert(testGame.status === 'final', 'Played game should be final');
console.assert(testGame.getWinner() === 'home', 'Home team won 28-14');
console.assert(testGame.getLoser() === 'away', 'Away team lost 28-14');
console.assert(testGame.getTeamScore('home') === 28, 'Home score should be 28');
console.assert(testGame.getOpponentScore('home') === 14, 'Opponent score from home perspective should be 14');

// Tie game test
const tieGame = new SeasonGame('g2', 2, 'a', 'b');
tieGame.recordResult(21, 21);
console.assert(tieGame.getWinner() === undefined, 'Tie game has no winner');
console.assert(tieGame.getLoser() === undefined, 'Tie game has no loser');
