//============================================
// Play Call Model - TypeScript port of nflsim play_resolver.py
// Decides what play to call based on game context using heuristic fallbacks
//============================================

import { GameState, Situation } from "../engine/state_machine.js";
import { LeagueTuning } from "../rules/league_tuning.js";

//============================================
// Context binning helpers
//============================================

/**
 * Categorize yards to go into discrete buckets for feature alignment.
 * Mirrors nflsim's _distance_bucket() for play-calling model consistency.
 */
export function distanceBucket(ytg: number): string {
	if (ytg <= 1) return "1";
	if (ytg <= 3) return "2-3";
	if (ytg <= 6) return "4-6";
	if (ytg <= 10) return "7-10";
	if (ytg <= 15) return "11-15";
	return "16+";
}

/**
 * Categorize field position into strategic zones.
 * oppYardLine = yards from opponent's goal line (0 = goal line, 100 = own goal line).
 * Mirrors nflsim's _field_zone().
 */
export function fieldZone(oppYardLine: number): string {
	if (oppYardLine <= 3) return "goal_line";
	if (oppYardLine <= 10) return "green_zone";
	if (oppYardLine <= 20) return "red_zone";
	if (oppYardLine <= 40) return "plus_territory";
	if (oppYardLine <= 60) return "midfield";
	if (oppYardLine <= 80) return "own_territory";
	if (oppYardLine <= 90) return "own_deep";
	return "backed_up";
}

/**
 * Categorize score differential into buckets.
 * Positive diff = possessing team ahead.
 * Mirrors nflsim's _score_bucket().
 */
export function scoreBucket(diff: number): string {
	if (diff <= -17) return "down_17+";
	if (diff <= -9) return "down_9_16";
	if (diff <= -4) return "down_4_8";
	if (diff <= -1) return "down_1_3";
	if (diff === 0) return "tied";
	if (diff <= 3) return "up_1_3";
	if (diff <= 8) return "up_4_8";
	if (diff <= 16) return "up_9_16";
	return "up_17+";
}

//============================================
// Play-calling heuristics (Phase 1 fallback)
//============================================

/**
 * Calculate base pass probability with context adjustments.
 * Ported from nflsim's _pass_probability().
 *
 * Down 1-3: vary by down and yards to go
 * Situations: TWO_MINUTE (+20%), GOAL_LINE (-15%), GARBAGE_TIME (varies by score)
 * Late score adjustments: down by 8+ in Q4 gets more aggressive
 */
function passProb(
	down: number,
	ytg: number,
	situation: Situation,
	scoreDiff: number,
	quarter: number,
	secsRemaining: number,
): number {
	// Base pass rate depends on down and distance
	let base = 0.58;
	if (down === 1) {
		base = 0.52;
	} else if (down === 2) {
		base = ytg >= 7 ? 0.65 : 0.50;
	} else if (down === 3) {
		if (ytg >= 5) base = 0.82;
		else if (ytg >= 3) base = 0.65;
		else base = 0.48;
	}

	// TWO_MINUTE: hurry offense, more passing
	if (situation === Situation.TWO_MINUTE) {
		base = Math.min(0.90, base + 0.20);
	}
	// GOAL_LINE: run-heavy in scoring zone
	else if (situation === Situation.GOAL_LINE) {
		base = Math.max(0.30, base - 0.15);
	}
	// GARBAGE_TIME: leading teams run clock, trailing teams pass
	else if (situation === Situation.GARBAGE_TIME) {
		if (scoreDiff > 0) {
			// winning: conservative, run more
			base = Math.max(0.30, base - 0.20);
		} else {
			// losing: aggressive, pass more
			base = Math.min(0.85, base + 0.15);
		}
	}

	// Q4 adjustments
	if (quarter === 4) {
		if (scoreDiff < -8) {
			// down by 8+: more passing to catch up
			base = Math.min(0.85, base + 0.15);
		} else if (scoreDiff > 8) {
			// up by 8+: more running to run clock
			base = Math.max(0.35, base - 0.15);
		}
	}

	return base;
}

/**
 * Calculate probability of going for it on 4th down.
 * Ported from nflsim's _fourth_down_go_prob().
 *
 * Base: depends on yards to go (short = more likely to go)
 * Field position: inside opp 45-yard line increases prob
 * Q4 trailing: much more aggressive, especially late
 * Own territory: conservative
 */
function fourthDownGoProb(
	ytg: number,
	oppYardLine: number,
	scoreDiff: number,
	quarter: number,
	secsRemaining: number,
): number {
	// Base probability by distance
	let prob = 0.05;
	if (ytg <= 1) prob = 0.40;
	else if (ytg <= 2) prob = 0.25;
	else if (ytg <= 3) prob = 0.15;

	// More likely inside opponent territory around midfield
	if (oppYardLine <= 45 && oppYardLine > 38) {
		prob += 0.15;
	}

	// Q4 trailing: much more aggressive
	if (quarter === 4 && scoreDiff < 0) {
		prob += 0.25;
		// Very late (<=5 min): even more desperate
		if (secsRemaining <= 300) {
			prob += 0.20;
		}
	}

	// Own territory: very conservative
	if (oppYardLine > 60) {
		prob *= 0.3;
	}

	return Math.min(0.95, prob);
}

//============================================
// Main play-calling logic
//============================================

/**
 * Decide what play to call given game state.
 * Returns one of: "pass", "run", "punt", "field_goal", "kneel", "spike"
 *
 * Decision tree:
 * 1. Kneel: winning late in Q4 with no defensive timeouts
 * 2. Spike: losing with <60s, low probability
 * 3. 4th down: FG, go-for-it, or punt
 * 4. 1st-3rd: pass or run based on probability
 *
 * Uses Math.random() for all stochastic decisions.
 */
export function choosePlay(state: GameState, tuning: LeagueTuning): string {
	const down = state.down;
	const scoreDiff = state.score_diff;
	const quarter = state.quarter;
	const secsRemaining = state.quarter_seconds_remaining;
	const ytg = state.yards_to_go;
	const oppYardLine = state.opponent_yard_line;

	// Kneel to run out the clock: winning, Q4, <=2:00, defense no timeouts, down <= 3
	// Prevents defense from using their last timeouts when game is decided
	const defTimeouts =
		state.possession === state.home_team
			? state.away_timeouts
			: state.home_timeouts;

	if (
		scoreDiff > 0 &&
		quarter === 4 &&
		secsRemaining <= 120 &&
		defTimeouts === 0 &&
		down <= 3
	) {
		return "kneel";
	}

	// Spike to stop the clock: losing, <60s left, Q2 or Q4, down <= 3
	// Low probability (15%) to avoid excessive clock-stopping
	if (
		scoreDiff < 0 &&
		secsRemaining <= 60 &&
		(quarter === 2 || quarter === 4) &&
		down <= 3
	) {
		if (Math.random() < 0.15) {
			return "spike";
		}
	}

	// ── 4th down decisions ──
	if (down === 4) {
		const fgDistance = state.field_goal_distance;

		// Attempt FG if within range and reasonable field position
		// 55 yards is typical FG max range; requires positioning within ~38 yards of goal
		if (fgDistance <= 55 && oppYardLine <= 38) {
			return "field_goal";
		}

		// Go for it or punt based on context
		const goProb = fourthDownGoProb(ytg, oppYardLine, scoreDiff, quarter, secsRemaining);
		if (Math.random() < goProb) {
			// Go for it: slightly more pass-heavy (55% pass)
			return Math.random() < 0.55 ? "pass" : "run";
		}

		// Default to punt
		return "punt";
	}

	// ── 1st-3rd down: pass or run ──
	const passProb_ = passProb(
		down,
		ytg,
		state.situation,
		scoreDiff,
		quarter,
		secsRemaining,
	);
	return Math.random() < passProb_ ? "pass" : "run";
}
