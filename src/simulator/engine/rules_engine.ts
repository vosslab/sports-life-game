//============================================
// Rules Engine - TypeScript port of nflsim rules.py
// Applies play results to game state and manages all state transitions:
// scoring, turnovers, down/distance, possession changes, and phase changes
//============================================

import { Phase, GameState, PlayOutcome, PlayResult } from "./state_machine.js";

// Constants
const KICKOFF_TOUCHBACK_YARD_LINE = 30;
const PUNT_TOUCHBACK_YARD_LINE = 20;

//============================================
// Main entry point: apply a play outcome to the game state
//============================================

/**
 * Apply a play outcome to the game state.
 *
 * Handles: yard advancement, down/distance, first downs, turnovers,
 * scoring, possession changes, and phase transitions. This is the heart
 * of the state machine — all transitions flow through here.
 */
export function applyPlayResult(state: GameState, outcome: PlayOutcome): void {
	state.play_number += 1;
	if (state.possession === state.home_team) {
		state.home_plays += 1;
	} else {
		state.away_plays += 1;
	}

	state.logPlay(outcome.description);

	// ---- Scoring plays ----
	if (outcome.touchdown && !outcome.turnover) {
		// Offensive touchdown: scoring team is the possessing team
		applyTouchdown(state, state.possession);
		return;
	}

	if (outcome.touchdown && outcome.turnover) {
		// Defensive/return touchdown: flip to defensive team
		applyTouchdown(state, outcome.scoring_team || state.defense);
		return;
	}

	if (outcome.result === PlayResult.SAFETY) {
		applySafety(state, outcome);
		return;
	}

	if (outcome.result === PlayResult.FIELD_GOAL_MADE) {
		applyFieldGoal(state, outcome);
		return;
	}

	if (outcome.result === PlayResult.FIELD_GOAL_MISSED) {
		applyMissedFg(state);
		return;
	}

	// ---- PAT results ----
	if (state.phase === Phase.PAT) {
		applyPatResult(state, outcome);
		return;
	}

	// ---- Kickoff results ----
	if (outcome.play_type === "kickoff") {
		applyKickoffResult(state, outcome);
		return;
	}

	// ---- Punt results ----
	if (outcome.play_type === "punt") {
		applyPuntResult(state, outcome);
		return;
	}

	// ---- Turnovers ----
	if (outcome.turnover) {
		applyTurnover(state, outcome);
		return;
	}

	// ---- Normal plays (pass, run, kneel, spike) ----
	applyNormalPlay(state, outcome);
}

//============================================
// Scoring helpers
//============================================

/**
 * Score a touchdown and set up PAT attempt.
 * Scoring team gets 6 points, ball moved to opponent's 2-yard line (yard 98),
 * phase transitions to PAT.
 */
function applyTouchdown(state: GameState, scoringTeam: string): void {
	if (scoringTeam === state.home_team) {
		state.home_score += 6;
	} else {
		state.away_score += 6;
	}

	state.scoring_team_last = scoringTeam;
	state.possession = scoringTeam;
	state.yard_line = 98; // PAT from 2-yard line (opponent's side, 100-2)
	state.down = 1;
	state.yards_to_go = 2;
	state.phase = Phase.PAT;
}

/**
 * Handle extra point or two-point conversion result.
 * Add points to the appropriate team, then set up kickoff.
 */
function applyPatResult(state: GameState, outcome: PlayOutcome): void {
	if (outcome.points > 0) {
		// Default to the team that scored the TD if scoring_team is null
		const scoringTeam = outcome.scoring_team || state.scoring_team_last;
		if (scoringTeam === state.home_team) {
			state.home_score += outcome.points;
		} else if (scoringTeam === state.away_team) {
			state.away_score += outcome.points;
		}
	}

	// After PAT completes, the team that scored the touchdown kicks off
	setupKickoff(state, state.scoring_team_last);
}

/**
 * Safety: 2 points to defense.
 * The team that was scored on (offense) gets a free kick from their own 20.
 */
function applySafety(state: GameState, outcome: PlayOutcome): void {
	const defense = state.defense;
	if (defense === state.home_team) {
		state.home_score += 2;
	} else {
		state.away_score += 2;
	}

	// After safety, the team that was scored ON (offensive team) kicks
	setupKickoff(state, state.possession);
}

/**
 * Field goal made: 3 points, then kickoff.
 */
function applyFieldGoal(state: GameState, outcome: PlayOutcome): void {
	const scoringTeam = outcome.scoring_team || state.possession;
	if (scoringTeam === state.home_team) {
		state.home_score += 3;
	} else {
		state.away_score += 3;
	}

	state.scoring_team_last = scoringTeam;
	setupKickoff(state, state.scoring_team_last);
}

/**
 * Missed field goal: defense gets ball at their end zone or at the spot of kick.
 * If kick was from very deep, ball goes to own 20. Otherwise, ball is at
 * the mirrored spot (opponent's yard line inverted).
 */
function applyMissedFg(state: GameState): void {
	const kickerYardLine = state.yard_line; // where the kicking team was
	// Defense gets ball at the spot of the kick (LOS), or own 20 if deeper
	const newYardLine = Math.max(20, 100 - kickerYardLine);
	changePossession(state, newYardLine);
}

//============================================
// Kickoff and punt helpers
//============================================

/**
 * Handle kickoff return/touchback result.
 * Receiving team (the defense) takes over the ball at the appropriate spot.
 */
function applyKickoffResult(state: GameState, outcome: PlayOutcome): void {
	// Receiving team is the defense
	const receivingTeam = state.defense;
	state.possession = receivingTeam;

	if (outcome.result === PlayResult.TOUCHBACK) {
		// Touchback: ball placed at 30-yard line
		state.yard_line = KICKOFF_TOUCHBACK_YARD_LINE;
	} else if (outcome.result === PlayResult.FUMBLE_LOST) {
		// Muffed kickoff recovered by kicking team: kicking team gets ball
		const kickingTeam = state.home_team === receivingTeam ? state.away_team : state.home_team;
		state.possession = kickingTeam;
		// Ball is at return spot (touchback point + return yards)
		state.yard_line = Math.max(1, Math.min(99, 100 - (KICKOFF_TOUCHBACK_YARD_LINE + outcome.yards_gained)));
	} else {
		// Normal return: ball starts at ~own 25, returned N yards upfield
		const start = KICKOFF_TOUCHBACK_YARD_LINE;
		state.yard_line = Math.max(1, Math.min(99, start + outcome.yards_gained));
	}

	state.down = 1;
	state.yards_to_go = 10;
	state.first_down_marker = Math.min(state.yard_line + 10, 100);
	state.phase = Phase.NORMAL;
}

/**
 * Handle punt result — possession typically changes to receiving team.
 * Special cases: muffed punt (punting team recovers), blocked punt (defense recovers).
 */
function applyPuntResult(state: GameState, outcome: PlayOutcome): void {
	if (outcome.result === PlayResult.FUMBLE_LOST && !outcome.turnover) {
		// Muffed punt recovered by punting team (no turnover):
		// Keep possession, advance ball
		state.yard_line = Math.max(1, Math.min(99, state.yard_line + outcome.yards_gained));
		state.down = 1;
		state.yards_to_go = 10;
		state.first_down_marker = Math.min(state.yard_line + 10, 100);
		return;
	}

	if (outcome.result === PlayResult.FUMBLE_LOST && outcome.turnover) {
		// Blocked punt recovered by defense: possession flips
		changePossession(state, Math.max(1, Math.min(99, state.yard_line - outcome.yards_gained)));
		return;
	}

	if (outcome.result === PlayResult.TOUCHBACK) {
		// Punt downed or returned into end zone: receiving team at 20-yard line
		changePossession(state, PUNT_TOUCHBACK_YARD_LINE);
		return;
	}

	// Fair catch or normal return: calculate receiving team's position
	const netPunt = outcome.yards_gained;
	let receivingYardLine = 100 - (state.yard_line + netPunt);
	receivingYardLine = Math.max(1, Math.min(99, receivingYardLine));
	changePossession(state, receivingYardLine);
}

//============================================
// Turnover helpers
//============================================

/**
 * Handle turnovers (interceptions and fumbles).
 * Defense gets the ball at the spot of the turnover, plus any return yards.
 */
function applyTurnover(state: GameState, outcome: PlayOutcome): void {
	if (outcome.interception) {
		// Interception: defense gets ball at approximate INT spot
		// INT happens near where the pass was targeted (air_yards from LOS)
		let intSpot = state.yard_line + Math.max(0, outcome.air_yards);
		intSpot = Math.min(99, intSpot);

		// Return yards move toward the intercepting team's (defense's) goal
		// From the INT spot perspective, flip and add return yards
		let returnSpot = 100 - intSpot + outcome.turnover_return_yards;
		returnSpot = Math.max(1, Math.min(99, returnSpot));

		changePossession(state, returnSpot);
	} else if (outcome.fumble_lost) {
		// Fumble: ball loose at the spot where it was fumbled
		let fumbleSpot = state.yard_line + outcome.yards_gained;
		fumbleSpot = Math.max(1, Math.min(99, fumbleSpot));

		// Flip perspective: defense gets ball (mirror the yard line)
		let newSpot = 100 - fumbleSpot;
		newSpot = Math.max(1, Math.min(99, newSpot));

		changePossession(state, newSpot);
	}
}

//============================================
// Normal play helper
//============================================

/**
 * Handle normal offensive plays: advance yards, check first down, manage downs.
 * If down > 4, turnover on downs (possession flips).
 */
function applyNormalPlay(state: GameState, outcome: PlayOutcome): void {
	const yards = outcome.yards_gained;

	// Advance the ball
	state.yard_line += yards;
	state.yard_line = Math.max(1, Math.min(99, state.yard_line));

	// Check first down
	if (outcome.penalty && outcome.penalty_auto_first) {
		// Defensive penalty that auto-grants first down
		awardFirstDown(state);
	} else if (outcome.penalty && outcome.penalty_on_offense) {
		// Offensive penalty: replay down with adjusted yards to go
		state.yards_to_go = Math.min(state.yards_to_go + outcome.penalty_yards, 99);
	} else if (yards >= state.yards_to_go || outcome.result === PlayResult.FIRST_DOWN) {
		// Gained enough for first down
		awardFirstDown(state);
	} else {
		// Short of first down: reduce yards to go and increment down
		state.yards_to_go -= yards;
		state.yards_to_go = Math.max(1, state.yards_to_go);
		state.down += 1;

		if (state.down > 4) {
			// Turnover on downs: flip possession at current spot
			changePossession(state, 100 - state.yard_line);
		}
	}
}

//============================================
// Down and possession management
//============================================

/**
 * Award a first down: reset down to 1 and set yards to go.
 * Yards to go is 10 or remaining distance to endzone, whichever is less.
 */
function awardFirstDown(state: GameState): void {
	state.down = 1;
	const remainingToEndzone = 100 - state.yard_line;
	state.yards_to_go = Math.min(10, remainingToEndzone);
	state.first_down_marker = Math.min(state.yard_line + state.yards_to_go, 100);
}

/**
 * Change possession to the other team at the given yard line.
 * Reset downs to 1 and set yards to go appropriately.
 */
function changePossession(state: GameState, newYardLine: number): void {
	state.possession = state.defense;
	state.yard_line = Math.max(1, Math.min(99, newYardLine));
	state.down = 1;
	const remainingToEndzone = 100 - state.yard_line;
	state.yards_to_go = Math.min(10, remainingToEndzone);
	state.first_down_marker = Math.min(state.yard_line + state.yards_to_go, 100);
}

/**
 * Set up state for a kickoff.
 * Kicking team gets the ball at their own 35-yard line, ready for kickoff.
 */
function setupKickoff(state: GameState, kickingTeam: string): void {
	state.possession = kickingTeam;
	state.yard_line = 35; // kickoff from own 35
	state.down = 1;
	state.yards_to_go = 10;
	state.phase = Phase.KICKOFF;
	state.kickoff_reason = "after_score";
}
