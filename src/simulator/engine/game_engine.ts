//============================================
// Game Engine - main game loop orchestrator
//
// Runs a complete football game from coin toss to final whistle.
// Adapted from nflsim's engine/game.py.
//
// The engine never checks league type directly. All league differences
// flow through LeagueRules and LeagueTuning interfaces.
//============================================

import {
	Phase,
	GameState,
	PlayOutcome,
	PlayResult,
} from "./state_machine.js";
import { applyPlayResult } from "./rules_engine.js";
import { LeagueRules } from "../rules/league_rules.js";
import { LeagueTuning } from "../rules/league_tuning.js";
import {
	GameTeamContext,
	MatchupAdjustment,
	computeMatchupAdjustment,
} from "../models/team_strength_model.js";
import { choosePlay } from "../models/play_call_model.js";
import { resolvePass, resolveRun, resolveKneel, resolveSpike } from "../models/play_result_model.js";
import { rand } from '../../core/rng.js';
import {
	resolveKickoff,
	resolvePunt,
	resolveFieldGoal,
	resolveExtraPoint,
	resolveTwoPoint,
} from "../models/special_teams_model.js";

// Safety limit to prevent infinite loops
const MAX_PLAYS = 300;

//============================================
// Game result returned to callers
//============================================

export interface SimulatorGameResult {
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	totalPlays: number;
	homePlays: number;
	awayPlays: number;
	playLog: string[];
	validationErrors: string[];
	winner: string | null;
}

//============================================
// Main entry point: simulate a complete game
//============================================

export function simulateGame(
	home: GameTeamContext,
	away: GameTeamContext,
	rules: LeagueRules,
	tuning: LeagueTuning,
): SimulatorGameResult {
	// Initialize game state
	const state = new GameState();
	state.home_team = home.profile.name;
	state.away_team = away.profile.name;

	const allErrors: string[] = [];

	// Pre-compute matchup adjustments for each team on offense
	const homeOnOffense = computeMatchupAdjustment(home, away);
	const awayOnOffense = computeMatchupAdjustment(away, home);

	// Coin toss
	coinToss(state);

	// Main game loop
	while (state.phase !== Phase.GAME_OVER && state.play_number < MAX_PLAYS) {
		// Validate state
		const errors = state.validate();
		if (errors.length > 0) {
			allErrors.push(...errors);
			break;
		}

		// Get matchup adjustment for current possession
		const matchup = state.possession === state.home_team
			? homeOnOffense
			: awayOnOffense;

		// Resolve one play
		const outcome = resolveOnePlay(state, rules, tuning, matchup);

		// Apply result to state
		applyPlayResult(state, outcome);

		// Clock management (skip for PAT plays)
		if (outcome.play_type !== "extra_point" && outcome.play_type !== "two_point") {
			const runoff = computeRunoff(state, outcome, rules);
			advanceClock(state, runoff);

			// Quarter end check
			if (state.quarter_seconds_remaining <= 0 && (state.phase as string) !== Phase.PAT && (state.phase as string) !== Phase.GAME_OVER) {
				transitionQuarter(state, rules);
			}
		}

		// Overtime scoring: first team to score wins (simplified)
		if (state.quarter === 5 && state.phase !== Phase.PAT) {
			if (state.home_score !== state.away_score) {
				state.phase = Phase.GAME_OVER;
			}
		}
	}

	// Safety check: hit max plays
	if (state.play_number >= MAX_PLAYS) {
		allErrors.push(`Game hit max plays limit (${MAX_PLAYS})`);
	}

	// Determine winner
	let winner: string | null = null;
	if (state.home_score > state.away_score) {
		winner = state.home_team;
	} else if (state.away_score > state.home_score) {
		winner = state.away_team;
	}

	return {
		homeTeam: state.home_team,
		awayTeam: state.away_team,
		homeScore: state.home_score,
		awayScore: state.away_score,
		totalPlays: state.play_number,
		homePlays: state.home_plays,
		awayPlays: state.away_plays,
		playLog: state.play_log,
		validationErrors: allErrors,
		winner,
	};
}

//============================================
// Coin toss: decide who kicks first
//============================================

function coinToss(state: GameState): void {
	const winner = rand() < 0.5 ? state.home_team : state.away_team;

	// ~60% of coin toss winners defer to receive in 2nd half
	if (rand() < 0.60) {
		// Winner defers: they receive in 2H, so they kick first
		if (winner === state.home_team) {
			state.home_receives_2h = true;
			state.possession = state.home_team;
			state.scoring_team_last = state.home_team;
		} else {
			state.home_receives_2h = false;
			state.possession = state.away_team;
			state.scoring_team_last = state.away_team;
		}
	} else {
		// Winner receives first
		if (winner === state.home_team) {
			state.home_receives_2h = false;
			state.possession = state.away_team;
			state.scoring_team_last = state.away_team;
		} else {
			state.home_receives_2h = true;
			state.possession = state.home_team;
			state.scoring_team_last = state.home_team;
		}
	}

	state.phase = Phase.KICKOFF;
	state.kickoff_reason = "start_of_game";
	state.logPlay(`Coin toss: ${winner} wins.`);
}

//============================================
// Resolve one play based on current phase
//============================================

function resolveOnePlay(
	state: GameState,
	rules: LeagueRules,
	tuning: LeagueTuning,
	matchup: MatchupAdjustment,
): PlayOutcome {
	// Kickoff phase
	if (state.phase === Phase.KICKOFF) {
		return resolveKickoff(state, tuning);
	}

	// PAT phase: decide extra point or two-point conversion
	if (state.phase === Phase.PAT) {
		return resolvePat(state, rules, tuning);
	}

	// Normal or overtime play: choose play type and execute
	if (state.phase === Phase.NORMAL || state.phase === Phase.OVERTIME) {
		const playCall = choosePlay(state, tuning);
		return executePlay(state, playCall, rules, tuning, matchup);
	}

	// Should not reach here
	return {
		play_type: "kneel",
		result: PlayResult.KNEEL,
		yards_gained: -1,
		turnover: false,
		turnover_return_yards: 0,
		touchdown: false,
		scoring_team: null,
		points: 0,
		penalty: false,
		penalty_on_offense: false,
		penalty_yards: 0,
		penalty_auto_first: false,
		clock_running: true,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: "ERROR: unexpected phase",
	};
}

//============================================
// PAT decision: extra point or two-point
//============================================

function resolvePat(
	state: GameState,
	rules: LeagueRules,
	tuning: LeagueTuning,
): PlayOutcome {
	// Score diff before PAT (the TD already added 6)
	const scoreDiff = state.score_diff - 6;

	// Go for 2 in specific late-game scenarios
	let goFor2 = false;
	if (state.quarter >= 4) {
		// Down by 2 after TD: go for 2 to tie
		// Down by 8 or 9: go for 2 to tie or get within 1
		if (scoreDiff === -2 || scoreDiff === -8 || scoreDiff === -9) {
			goFor2 = true;
		}
	}
	// Small random chance regardless
	if (rand() < 0.05) {
		goFor2 = true;
	}

	if (goFor2) {
		return resolveTwoPoint(state, rules);
	}
	return resolveExtraPoint(state, rules);
}

//============================================
// Execute a called play
//============================================

function executePlay(
	state: GameState,
	playCall: string,
	rules: LeagueRules,
	tuning: LeagueTuning,
	matchup: MatchupAdjustment,
): PlayOutcome {
	if (playCall === "pass") {
		return resolvePass(state, tuning, matchup);
	}
	if (playCall === "run") {
		return resolveRun(state, tuning, matchup);
	}
	if (playCall === "punt") {
		return resolvePunt(state, tuning);
	}
	if (playCall === "field_goal") {
		return resolveFieldGoal(state, rules, tuning);
	}
	if (playCall === "kneel") {
		return resolveKneel(state);
	}
	if (playCall === "spike") {
		return resolveSpike(state);
	}

	// Unknown play call, default to pass
	return resolvePass(state, tuning, matchup);
}

//============================================
// Clock management
//============================================

function computeRunoff(
	state: GameState,
	outcome: PlayOutcome,
	rules: LeagueRules,
): number {
	// Base clock runoffs calibrated from NFL medians
	const quarterSeconds = rules.quarterLengthMin * 60;

	// Scale runoffs proportionally to quarter length
	// NFL = 15 min quarters, HS = 12 min, etc.
	const scale = quarterSeconds / 900;

	// Scoring plays: TD celebration + PAT + kickoff = significant time
	if (outcome.touchdown || outcome.result === PlayResult.FIELD_GOAL_MADE || outcome.result === PlayResult.SAFETY) {
		return Math.round(15 * scale);
	}

	// Kickoffs: return + lineup
	if (outcome.play_type === "kickoff") {
		return Math.round(12 * scale);
	}
	// Punts: punt + return + lineup
	if (outcome.play_type === "punt") {
		return Math.round(15 * scale);
	}

	// Clock-stopping plays: clock stops but real time still passes
	// (huddle, lineup, snap cadence). NFL median ~25s for incompletions.
	if (!outcome.clock_running || outcome.out_of_bounds || outcome.result === PlayResult.INCOMPLETE) {
		return Math.round(25 * scale);
	}

	// Spike and kneel
	if (outcome.play_type === "spike") {
		return Math.round(1 * scale);
	}
	if (outcome.play_type === "kneel") {
		return Math.round(40 * scale);
	}

	// Penalty
	if (outcome.penalty) {
		return Math.round(14 * scale);
	}

	// Hurry-up mode: trailing team in last 2 min of each half
	const isHurryUp = state.score_diff < 0
		&& state.quarter_seconds_remaining <= 120
		&& (state.quarter === 2 || state.quarter === 4);
	if (isHurryUp) {
		return Math.round(18 * scale);
	}

	// Normal running play
	return Math.round(38 * scale);
}

//============================================

function advanceClock(state: GameState, runoff: number): void {
	// Only consume what's left in the quarter (don't overshoot)
	const actualRunoff = Math.min(runoff, state.quarter_seconds_remaining);
	state.quarter_seconds_remaining -= actualRunoff;
	state.game_seconds_remaining -= actualRunoff;

	// Clamp to zero
	if (state.game_seconds_remaining < 0) {
		state.game_seconds_remaining = 0;
	}
}

//============================================

function transitionQuarter(state: GameState, rules: LeagueRules): void {
	const quarterSeconds = rules.quarterLengthMin * 60;

	if (state.quarter === 2) {
		// Halftime: flip possession based on 2H receive
		state.quarter = 3;
		state.quarter_seconds_remaining = quarterSeconds;

		// Reset timeouts
		state.home_timeouts = 3;
		state.away_timeouts = 3;

		// Team that deferred receives in 2H
		if (state.home_receives_2h) {
			state.scoring_team_last = state.away_team;
		} else {
			state.scoring_team_last = state.home_team;
		}
		state.possession = state.scoring_team_last;
		state.phase = Phase.KICKOFF;
		state.kickoff_reason = "start_of_half";
		state.logPlay("** Halftime **");
	} else if (state.quarter === 4) {
		// End of regulation
		if (state.home_score === state.away_score) {
			// Overtime
			state.quarter = 5;
			state.quarter_seconds_remaining = 600; // 10-minute OT
			state.home_timeouts = 2;
			state.away_timeouts = 2;
			state.phase = Phase.KICKOFF;
			state.kickoff_reason = "start_of_game";

			// Coin toss for OT possession
			if (rand() < 0.5) {
				state.possession = state.home_team;
				state.scoring_team_last = state.home_team;
			} else {
				state.possession = state.away_team;
				state.scoring_team_last = state.away_team;
			}
			state.logPlay("** Overtime **");
		} else {
			state.phase = Phase.GAME_OVER;
			state.logPlay("** Final **");
		}
	} else if (state.quarter === 5) {
		// End of overtime - if still tied, award FG to random team
		if (state.home_score === state.away_score) {
			if (rand() < 0.5) {
				state.home_score += 3;
				state.logPlay("Home team wins with late field goal in overtime.");
			} else {
				state.away_score += 3;
				state.logPlay("Away team wins with late field goal in overtime.");
			}
		}
		state.phase = Phase.GAME_OVER;
		state.logPlay("** Final (OT) **");
	} else {
		// Q1 -> Q2, Q3 -> Q4: just advance quarter
		state.quarter += 1;
		state.quarter_seconds_remaining = quarterSeconds;
		state.logPlay(`** End of Q${state.quarter - 1} **`);
	}
}
