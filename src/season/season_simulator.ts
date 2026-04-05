// season_simulator.ts - advance the season by one week
//
// Simulates non-player games using team strengths.
// Records player game results from the weekly engine.
// All results flow through LeagueSeason.recordGameResult().

import { randomInRange } from '../player.js';
import { LeagueSeason } from './season_model.js';
import { SeasonGame } from './game_model.js';
import { GameResult } from '../week_sim.js';

//============================================
// Simulate all non-player games for the current week.
// Called after the player's game has been recorded.
export function simulateNonPlayerGames(season: LeagueSeason): void {
	const currentWeek = season.getCurrentWeek();
	const weekGames = season.getGamesForWeek(currentWeek);

	for (const game of weekGames) {
		// Skip already-finalized games (including the player's game)
		if (game.status === 'final') {
			continue;
		}

		// Skip games involving the player's team (should be recorded separately)
		if (game.involvesTeam(season.playerTeamId)) {
			continue;
		}

		// Simulate the game using team strengths
		simulateGameBetweenTeams(season, game);
	}
}

//============================================
// Simulate a single game between two non-player teams
function simulateGameBetweenTeams(season: LeagueSeason, game: SeasonGame): void {
	const homeTeam = season.getTeam(game.homeTeamId);
	const awayTeam = season.getTeam(game.awayTeamId);

	if (!homeTeam || !awayTeam) {
		return;
	}

	// Base scores from team strength: (strength / 100) * 28 + random 3-17
	const homeBase = Math.floor((homeTeam.strength / 100) * 28) + randomInRange(3, 17);
	const awayBase = Math.floor((awayTeam.strength / 100) * 28) + randomInRange(3, 17);

	// Add home-field advantage (small boost)
	const homeScore = homeBase + randomInRange(0, 3);
	const awayScore = awayBase;

	// Determine if overtime is needed (handle ties)
	if (homeScore === awayScore) {
		// Simulate overtime
		const strengthDiff = homeTeam.strength - awayTeam.strength;
		const winProb = 0.5 + (strengthDiff / 200);
		const overtimePoints = randomInRange(3, 7);

		if (Math.random() < winProb) {
			season.recordGameResult(game.id, homeScore + overtimePoints, awayScore);
		} else {
			season.recordGameResult(game.id, homeScore, awayScore + overtimePoints);
		}
		return;
	}

	season.recordGameResult(game.id, homeScore, awayScore);
}

//============================================
// Record the player's game result into the season.
// Takes the GameResult from week_sim.ts simulateGame() and maps it
// to the correct SeasonGame for this week.
export function recordPlayerGameResult(
	season: LeagueSeason,
	gameResult: GameResult,
): void {
	const playerGame = season.getPlayerGame();
	if (!playerGame) {
		return;
	}

	// Map scores to home/away based on which side the player is on
	const playerTeamId = season.playerTeamId;
	if (playerGame.homeTeamId === playerTeamId) {
		season.recordGameResult(
			playerGame.id,
			gameResult.teamScore,
			gameResult.opponentScore,
		);
	} else {
		season.recordGameResult(
			playerGame.id,
			gameResult.opponentScore,
			gameResult.teamScore,
		);
	}
}

//============================================
// Get the opponent strength for the player's current game.
// Used by the weekly engine to pass to simulateGame().
export function getPlayerOpponentStrength(season: LeagueSeason): number {
	const playerGame = season.getPlayerGame();
	if (!playerGame) {
		return 50;
	}

	const opponentId = playerGame.getOpponentId(season.playerTeamId);
	if (!opponentId) {
		return 50;
	}

	const opponent = season.getTeam(opponentId);
	if (!opponent) {
		return 50;
	}

	return opponent.strength;
}

//============================================
// Get the opponent name for display
export function getPlayerOpponentName(season: LeagueSeason): string {
	const playerGame = season.getPlayerGame();
	if (!playerGame) {
		return 'TBD';
	}

	const opponentId = playerGame.getOpponentId(season.playerTeamId);
	if (!opponentId) {
		return 'TBD';
	}

	const opponent = season.getTeam(opponentId);
	if (!opponent) {
		return 'TBD';
	}

	return opponent.getDisplayName();
}
