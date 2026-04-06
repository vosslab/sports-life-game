//============================================
// Play Result Model - TypeScript port of nflsim play_resolver.py
// Resolves individual plays into outcomes
//============================================

import { GameState, PlayOutcome, PlayResult, Situation } from "../engine/state_machine.js";
import { LeagueTuning } from "../rules/league_tuning.js";
import { MatchupAdjustment } from "./team_strength_model.js";

//============================================
// Helper functions for randomness
//============================================

/**
 * Generate a random number from a normal distribution using Box-Muller transform.
 */
function randomNormal(mean: number, stddev: number): number {
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	return mean + z * stddev;
}

/**
 * Generate a random number from an exponential distribution.
 * Uses inverse transform: -lambda * ln(random())
 */
function randomExponential(lambda: number): number {
	// Use 1-random to avoid log(0) which produces Infinity
	return -lambda * Math.log(1 - Math.random());
}

/**
 * Generate a uniform random integer in [min, max] inclusive.
 */
function randomInRange(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

//============================================
// Play resolution functions
//============================================

/**
 * Resolve a pass play into a play outcome.
 *
 * Flow:
 * 1. Sack check with matchup adjustment (-3 to -12 yards, 12% fumble rate)
 * 2. Completion check with matchup adjustment
 * 3. If incomplete:
 *    - INT check: 15% pick-six with return yards normal(15, 10)
 * 4. If complete:
 *    - Sample yards: exponential(7) air + exponential(5) YAC
 *    - Apply matchup.passYardMult
 *    - Clamp to endzone (TD)
 *    - Fumble after catch check
 *    - 15% out of bounds rate
 */
export function resolvePass(
	state: GameState,
	tuning: LeagueTuning,
	matchup: MatchupAdjustment,
): PlayOutcome {
	// Sack check (adjusted by matchup)
	const sackRateBase = tuning.sackRate;
	const sacked = Math.random() < (sackRateBase * matchup.sackRateMult);

	if (sacked) {
		const sackYards = randomInRange(-12, -3);
		const fumbleRate = 0.12;

		if (Math.random() < fumbleRate) {
			return {
				play_type: "pass",
				result: PlayResult.FUMBLE_LOST,
				yards_gained: sackYards,
				sack: true,
				turnover: true,
				fumble_lost: true,
				interception: false,
				touchdown: false,
				scoring_team: null,
				points: 0,
				penalty: false,
				penalty_on_offense: false,
				penalty_yards: 0,
				penalty_auto_first: false,
				clock_running: true,
				out_of_bounds: false,
				air_yards: 0,
				is_complete: false,
				turnover_return_yards: 0,
				description: `Sacked for ${sackYards} yards, FUMBLE! Recovered by defense.`,
			};
		}

		return {
			play_type: "pass",
			result: PlayResult.SACK,
			yards_gained: sackYards,
			sack: true,
			turnover: false,
			fumble_lost: false,
			interception: false,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: true,
			out_of_bounds: false,
			air_yards: 0,
			is_complete: false,
			turnover_return_yards: 0,
			description: `Sacked for ${sackYards} yards.`,
		};
	}

	// Completion check (adjusted by matchup)
	const completionRateBase = tuning.completionRate;
	const completed = Math.random() < (completionRateBase * matchup.compRateMult);

	if (!completed) {
		// Interception check (adjusted by matchup)
		const intRateBase = tuning.intRate;
		const intRate = intRateBase * matchup.intRateMult;

		if (Math.random() < intRate) {
			const intReturn = Math.max(0, Math.round(randomNormal(15, 10)));
			const isPickSix = Math.random() < 0.15;

			if (isPickSix) {
				return {
					play_type: "pass",
					result: PlayResult.INTERCEPTION,
					yards_gained: 0,
					turnover: true,
					interception: true,
					turnover_return_yards: intReturn,
					touchdown: true,
					scoring_team: state.defense,
					points: 6,
					penalty: false,
					penalty_on_offense: false,
					penalty_yards: 0,
					penalty_auto_first: false,
					clock_running: false,
					out_of_bounds: false,
					sack: false,
					fumble_lost: false,
					air_yards: 0,
					is_complete: false,
					description: "INTERCEPTED! Returned for a TOUCHDOWN!",
				};
			}

			return {
				play_type: "pass",
				result: PlayResult.INTERCEPTION,
				yards_gained: 0,
				turnover: true,
				interception: true,
				turnover_return_yards: intReturn,
				touchdown: false,
				scoring_team: null,
				points: 0,
				penalty: false,
				penalty_on_offense: false,
				penalty_yards: 0,
				penalty_auto_first: false,
				clock_running: false,
				out_of_bounds: false,
				sack: false,
				fumble_lost: false,
				air_yards: 0,
				is_complete: false,
				description: `INTERCEPTED! Returned ${intReturn} yards.`,
			};
		}

		// Incomplete pass
		return {
			play_type: "pass",
			result: PlayResult.INCOMPLETE,
			yards_gained: 0,
			is_complete: false,
			turnover: false,
			fumble_lost: false,
			interception: false,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			sack: false,
			air_yards: 0,
			turnover_return_yards: 0,
			description: "Pass incomplete.",
		};
	}

	// Complete pass — sample yards (adjusted by matchup)
	// Real NFL avg completion = ~6.5 yards. Use air=4, yac=2.5 for mean ~6.5.
	let airYards = Math.floor(randomExponential(4));
	let yac = Math.max(0, Math.floor(randomExponential(2.5)));
	let totalYards = airYards + yac;

	// Apply pass yard matchup multiplier
	if (matchup.passYardMult !== 1.0) {
		totalYards = Math.round(totalYards * matchup.passYardMult);
		airYards = Math.round(airYards * matchup.passYardMult);
	}

	// Clamp to endzone (touchdown)
	const oppYL = state.opponent_yard_line;
	if (totalYards >= oppYL) {
		return {
			play_type: "pass",
			result: PlayResult.TOUCHDOWN,
			yards_gained: oppYL,
			air_yards: airYards,
			is_complete: true,
			touchdown: true,
			scoring_team: state.possession,
			points: 6,
			turnover: false,
			fumble_lost: false,
			interception: false,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			sack: false,
			turnover_return_yards: 0,
			description: `Pass complete for ${oppYL} yards, TOUCHDOWN!`,
		};
	}

	// Clamp negative (screen passes tackled behind LOS)
	totalYards = Math.max(totalYards, -(state.yard_line - 1));

	// Fumble after catch (adjusted by matchup)
	const catchFumbleRate = tuning.catchFumbleRate * matchup.fumbleRateMult;
	if (Math.random() < catchFumbleRate) {
		return {
			play_type: "pass",
			result: PlayResult.FUMBLE_LOST,
			yards_gained: totalYards,
			air_yards: airYards,
			is_complete: true,
			turnover: true,
			fumble_lost: true,
			interception: false,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: true,
			out_of_bounds: false,
			sack: false,
			turnover_return_yards: 0,
			description: `Pass complete for ${totalYards} yards, FUMBLE! Recovered by defense.`,
		};
	}

	// Out of bounds check
	const oobRate = 0.15;
	const outOfBounds = Math.random() < oobRate;

	// Determine result
	let result = PlayResult.SHORT_OF_FIRST;
	if (totalYards >= state.yards_to_go) {
		result = PlayResult.FIRST_DOWN;
	}

	const oobStr = outOfBounds ? " (out of bounds)" : "";
	return {
		play_type: "pass",
		result,
		yards_gained: totalYards,
		air_yards: airYards,
		is_complete: true,
		out_of_bounds: outOfBounds,
		clock_running: !outOfBounds,
		turnover: false,
		fumble_lost: false,
		interception: false,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		sack: false,
		turnover_return_yards: 0,
		description: `Pass complete for ${totalYards} yards.${oobStr}`,
	};
}

/**
 * Resolve a run play into a play outcome.
 *
 * Flow:
 * 1. Sample yards:
 *    - 5% chance of explosive play (15-50 yards)
 *    - Otherwise normal(4.2, 3.5) clamped to -5
 * 2. Apply matchup.rushYardMult
 * 3. Clamp to endzone (TD)
 * 4. Safety check (if yard_line + yards <= 0)
 * 5. Fumble check with matchup adjustment
 * 6. 8% out of bounds rate
 */
export function resolveRun(
	state: GameState,
	tuning: LeagueTuning,
	matchup: MatchupAdjustment,
): PlayOutcome {
	// Sample yards (adjusted by matchup)
	let yards: number;
	if (Math.random() < tuning.explosivePlayRate) {
		// Explosive play (big gain)
		yards = randomInRange(12, 40);
	} else {
		// Normal run
		yards = Math.round(randomNormal(4.2, 3.5));
		yards = Math.max(-5, yards);
	}

	// Apply rush yard matchup multiplier
	if (matchup.rushYardMult !== 1.0) {
		yards = Math.round(yards * matchup.rushYardMult);
	}

	// Clamp to endzone (touchdown)
	const oppYL = state.opponent_yard_line;
	if (yards >= oppYL) {
		return {
			play_type: "run",
			result: PlayResult.TOUCHDOWN,
			yards_gained: oppYL,
			touchdown: true,
			scoring_team: state.possession,
			points: 6,
			turnover: false,
			fumble_lost: false,
			interception: false,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: false,
			out_of_bounds: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			turnover_return_yards: 0,
			description: `Rush for ${oppYL} yards, TOUCHDOWN!`,
		};
	}

	// Safety check (tackled in own endzone)
	if (state.yard_line + yards <= 0) {
		return {
			play_type: "run",
			result: PlayResult.SAFETY,
			yards_gained: yards,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			points: 2,
			scoring_team: state.defense,
			turnover: false,
			fumble_lost: false,
			interception: false,
			touchdown: false,
			clock_running: false,
			out_of_bounds: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			turnover_return_yards: 0,
			description: "Tackled in the end zone, SAFETY!",
		};
	}

	// Fumble check (adjusted by matchup)
	const rushFumbleRate = tuning.rushFumbleRate * matchup.fumbleRateMult;
	if (Math.random() < rushFumbleRate) {
		return {
			play_type: "run",
			result: PlayResult.FUMBLE_LOST,
			yards_gained: yards,
			turnover: true,
			fumble_lost: true,
			interception: false,
			touchdown: false,
			scoring_team: null,
			points: 0,
			penalty: false,
			penalty_on_offense: false,
			penalty_yards: 0,
			penalty_auto_first: false,
			clock_running: true,
			out_of_bounds: false,
			sack: false,
			air_yards: 0,
			is_complete: false,
			turnover_return_yards: 0,
			description: `Rush for ${yards} yards, FUMBLE! Recovered by defense.`,
		};
	}

	// Out of bounds check
	const oobRate = 0.08;
	const outOfBounds = Math.random() < oobRate;

	// Determine result
	let result = PlayResult.SHORT_OF_FIRST;
	if (yards >= state.yards_to_go) {
		result = PlayResult.FIRST_DOWN;
	}

	const oobStr = outOfBounds ? " (out of bounds)" : "";
	return {
		play_type: "run",
		result,
		yards_gained: yards,
		out_of_bounds: outOfBounds,
		clock_running: !outOfBounds,
		turnover: false,
		fumble_lost: false,
		interception: false,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		turnover_return_yards: 0,
		description: `Rush for ${yards} yards.${oobStr}`,
	};
}

/**
 * Resolve a QB kneel play.
 * Result: -1 yard, clock running.
 */
export function resolveKneel(state: GameState): PlayOutcome {
	return {
		play_type: "kneel",
		result: PlayResult.KNEEL,
		yards_gained: -1,
		clock_running: true,
		turnover: false,
		fumble_lost: false,
		interception: false,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		out_of_bounds: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		turnover_return_yards: 0,
		description: "QB kneel.",
	};
}

/**
 * Resolve a QB spike play.
 * Result: 0 yards, clock stopped.
 */
export function resolveSpike(state: GameState): PlayOutcome {
	return {
		play_type: "spike",
		result: PlayResult.SPIKE,
		yards_gained: 0,
		clock_running: false,
		turnover: false,
		fumble_lost: false,
		interception: false,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		out_of_bounds: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		turnover_return_yards: 0,
		description: "QB spikes the ball.",
	};
}
