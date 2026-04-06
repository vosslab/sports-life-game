//============================================
// Special Teams Model - TypeScript port of nflsim special_teams.py
// Handles kickoffs, punts, field goals, PAT conversions
//============================================

import { GameState, PlayOutcome, PlayResult } from "../engine/state_machine.js";
import { LeagueRules } from "../rules/league_rules.js";
import { LeagueTuning } from "../rules/league_tuning.js";

//============================================
// Helper: Box-Muller normal distribution
//============================================

function randomNormal(mean: number, stddev: number): number {
	// Box-Muller transform to generate normal distribution from uniform random
	const u1 = Math.random();
	const u2 = Math.random();
	const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	return mean + z0 * stddev;
}

//============================================
// Kickoff
//============================================

export function resolveKickoff(
	state: GameState,
	tuning: LeagueTuning
): PlayOutcome {
	// Touchback probability (typically 55%)
	if (Math.random() < tuning.kickoffTouchbackRate) {
		return {
			play_type: "kickoff",
			result: PlayResult.TOUCHBACK,
			yards_gained: 0,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: "Kickoff, touchback.",
		};
	}

	// Normal return: mean 24 yards, stddev 8 yards
	let returnYards = Math.max(0, Math.round(randomNormal(24, 8)));
	returnYards = Math.min(returnYards, 100); // can't return past own endzone

	// Return touchdown (1% chance)
	if (Math.random() < 0.01) {
		return {
			play_type: "kickoff",
			result: PlayResult.TOUCHDOWN,
			yards_gained: returnYards,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: true,
			scoring_team: state.possession === state.home_team ? state.away_team : state.home_team, // receiving team (defense)
			points: 6,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `Kickoff returned for a TOUCHDOWN! (${returnYards} yards)`,
		};
	}

	// Fumble on return (1% chance)
	if (Math.random() < 0.01) {
		return {
			play_type: "kickoff",
			result: PlayResult.FUMBLE_LOST,
			yards_gained: returnYards,
			turnover: true,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: true,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `Kickoff return, FUMBLE! Recovered by kicking team at the ${returnYards} yard line.`,
		};
	}

	// Normal return
	return {
		play_type: "kickoff",
		result: PlayResult.SHORT_OF_FIRST,
		yards_gained: returnYards,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: false,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: `Kickoff returned ${returnYards} yards.`,
	};
}

//============================================
// Punt
//============================================

export function resolvePunt(
	state: GameState,
	tuning: LeagueTuning
): PlayOutcome {
	// Max punt distance limited by field position (can't punt past endzone)
	const maxPunt = state.opponent_yard_line;

	// Average punt ~45 yards, limited by field position
	const puntDistance = Math.max(
		20,
		Math.min(Math.round(randomNormal(45, 8)), maxPunt)
	);

	// Blocked punt (1.5% chance)
	if (Math.random() < 0.015) {
		const blockRecoveryYards = Math.floor(Math.random() * 15);
		return {
			play_type: "punt",
			result: PlayResult.FUMBLE_LOST,
			yards_gained: -blockRecoveryYards,
			turnover: true,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: true,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: "Punt BLOCKED! Recovered by defense.",
		};
	}

	// Calculate where ball lands (from own goal)
	const landYard = state.yard_line + puntDistance;

	// Touchback if punt reaches endzone
	if (landYard >= 100) {
		return {
			play_type: "punt",
			result: PlayResult.TOUCHBACK,
			yards_gained: puntDistance,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `Punt ${puntDistance} yards, touchback.`,
		};
	}

	// Fair catch chance
	if (Math.random() < tuning.puntFairCatchRate) {
		return {
			play_type: "punt",
			result: PlayResult.FAIR_CATCH,
			yards_gained: puntDistance,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `Punt ${puntDistance} yards, fair catch.`,
		};
	}

	// Return yards: mean 9, stddev 5
	const returnYards = Math.max(0, Math.round(randomNormal(9, 5)));

	// Muffed punt (2% chance) - punting team recovers, keeps ball
	if (Math.random() < 0.02) {
		return {
			play_type: "punt",
			result: PlayResult.FUMBLE_LOST,
			yards_gained: puntDistance,
			turnover: false, // punting team recovers = no turnover
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: true,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `Punt ${puntDistance} yards, MUFFED! Punting team recovers.`,
		};
	}

	// Punt return touchdown (1% chance)
	if (Math.random() < 0.01) {
		return {
			play_type: "punt",
			result: PlayResult.TOUCHDOWN,
			yards_gained: puntDistance,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: true,
			scoring_team: state.possession === state.home_team ? state.away_team : state.home_team, // return team (defense)
			points: 6,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: "Punt returned for a TOUCHDOWN!",
		};
	}

	// Normal punt with return
	const netPuntYards = puntDistance - returnYards;
	return {
		play_type: "punt",
		result: PlayResult.PUNT,
		yards_gained: netPuntYards,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: false,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: `Punt ${puntDistance} yards, returned ${returnYards} yards.`,
	};
}

//============================================
// Field Goal
//============================================

export function resolveFieldGoal(
	state: GameState,
	rules: LeagueRules,
	tuning: LeagueTuning
): PlayOutcome {
	const distance = state.field_goal_distance;

	// Auto-miss if beyond max range
	if (distance > rules.fieldGoalMaxRange) {
		return {
			play_type: "field_goal",
			result: PlayResult.FIELD_GOAL_MISSED,
			yards_gained: 0,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `${distance}-yard field goal is NO GOOD.`,
		};
	}

	// Interpolate success probability from distance curve
	// Base curve (normalized to NFL 85% baseline):
	// 20y: 97%, 30y: 85%, 40y: 75%, 50y: 62%, 55y: 58%, 60y: 40%
	let baseProb = 0;

	if (distance <= 20) {
		// Linear interpolation 20-30y
		baseProb = 0.97 - (distance - 20) * 0.0012;
	} else if (distance <= 30) {
		baseProb = 0.97 - (distance - 20) * 0.012;
	} else if (distance <= 40) {
		baseProb = 0.85 - (distance - 30) * 0.01;
	} else if (distance <= 50) {
		baseProb = 0.75 - (distance - 40) * 0.013;
	} else if (distance <= 55) {
		baseProb = 0.62 - (distance - 50) * 0.008;
	} else if (distance <= 60) {
		baseProb = 0.58 - (distance - 55) * 0.036;
	} else {
		baseProb = 0.4 - (distance - 60) * 0.04;
	}

	// Scale by tuning.fieldGoalAccuracy, normalized to NFL baseline of 0.85
	const normalizedTuning = tuning.fieldGoalAccuracy / 0.85;
	const successProb = Math.max(0, Math.min(1, baseProb * normalizedTuning));

	if (Math.random() < successProb) {
		return {
			play_type: "field_goal",
			result: PlayResult.FIELD_GOAL_MADE,
			yards_gained: 0,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: state.possession,
			points: 3,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: `${distance}-yard field goal is GOOD!`,
		};
	}

	return {
		play_type: "field_goal",
		result: PlayResult.FIELD_GOAL_MISSED,
		yards_gained: 0,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: false,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: `${distance}-yard field goal is NO GOOD.`,
	};
}

//============================================
// Extra Point (PAT)
//============================================

export function resolveExtraPoint(
	state: GameState,
	rules: LeagueRules
): PlayOutcome {
	const successProb = rules.patSuccessRate;

	if (Math.random() < successProb) {
		return {
			play_type: "extra_point",
			result: PlayResult.FIELD_GOAL_MADE,
			yards_gained: 0,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false,
			scoring_team: state.possession,
			points: 1,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: "Extra point is GOOD.",
		};
	}

	return {
		play_type: "extra_point",
		result: PlayResult.FIELD_GOAL_MISSED,
		yards_gained: 0,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: false,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: "Extra point is NO GOOD.",
	};
}

//============================================
// Two-Point Conversion
//============================================

export function resolveTwoPoint(
	state: GameState,
	rules: LeagueRules
): PlayOutcome {
	const successProb = rules.twoPointRate;

	if (Math.random() < successProb) {
		return {
			play_type: "two_point",
			result: PlayResult.TOUCHDOWN,
			yards_gained: 0,
			turnover: false,
			turnover_return_yards: 0,
			touchdown: false, // it's a conversion, not a TD
			scoring_team: state.possession,
			points: 2,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			fumble_lost: false,
			interception: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			description: "Two-point conversion is GOOD!",
		};
	}

	return {
		play_type: "two_point",
		result: PlayResult.SHORT_OF_FIRST,
		yards_gained: 0,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: false,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: "Two-point conversion FAILED.",
	};
}
