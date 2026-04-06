//============================================
// Non-Player Game Simulator
//
// Replaces the formula-based simulateGameBetweenTeams in season_simulator.ts
// with the play-by-play engine. Uses the same engine and league rules as
// player games for consistent results.
//
// For performance: non-player games skip play log generation since nobody
// reads the play-by-play of games they didn't play in.
//============================================

import { simulateGame, SimulatorGameResult } from "../engine/game_engine.js";
import { GameTeamContext, createDefaultTeamProfile } from "../models/team_strength_model.js";
import { LeagueRules } from "../rules/league_rules.js";
import { LeagueTuning } from "../rules/league_tuning.js";

//============================================
// Simulate a game between two non-player teams
// Returns just the scores (no stat line or story needed)
export interface NonPlayerGameResult {
	homeScore: number;
	awayScore: number;
	totalPlays: number;
}

//============================================
// Run a single non-player game through the engine
export function simulateNonPlayerGame(
	homeTeamName: string,
	homeStrength: number,
	awayTeamName: string,
	awayStrength: number,
	rules: LeagueRules,
	tuning: LeagueTuning,
): NonPlayerGameResult {
	// Build minimal team contexts (no player boosts, no momentum)
	const homeContext: GameTeamContext = {
		profile: createDefaultTeamProfile(homeTeamName, homeStrength),
		momentum: 0,
		fatigue: 0,
		injuryAdjustment: 0,
		weatherAdjustment: 0,
	};

	const awayContext: GameTeamContext = {
		profile: createDefaultTeamProfile(awayTeamName, awayStrength),
		momentum: 0,
		fatigue: 0,
		injuryAdjustment: 0,
		weatherAdjustment: 0,
	};

	// Run through the engine
	const result = simulateGame(homeContext, awayContext, rules, tuning);

	return {
		homeScore: result.homeScore,
		awayScore: result.awayScore,
		totalPlays: result.totalPlays,
	};
}

//============================================
// Batch simulate all non-player games for a week
// Takes an array of matchups and returns results
export interface Matchup {
	gameId: string;
	homeTeamName: string;
	homeStrength: number;
	awayTeamName: string;
	awayStrength: number;
}

export interface BatchGameResult {
	gameId: string;
	homeScore: number;
	awayScore: number;
}

export function simulateBatchGames(
	matchups: Matchup[],
	rules: LeagueRules,
	tuning: LeagueTuning,
): BatchGameResult[] {
	const results: BatchGameResult[] = [];

	for (const matchup of matchups) {
		const result = simulateNonPlayerGame(
			matchup.homeTeamName,
			matchup.homeStrength,
			matchup.awayTeamName,
			matchup.awayStrength,
			rules,
			tuning,
		);

		results.push({
			gameId: matchup.gameId,
			homeScore: result.homeScore,
			awayScore: result.awayScore,
		});
	}

	return results;
}
