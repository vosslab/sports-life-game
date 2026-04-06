//============================================
// Clutch Checkpoint - Bridge between game engine and clutch moment system
//============================================
//
// The clutch system integrates with the game engine without mutating GameState.
// Instead, the engine calls shouldTriggerClutch() to decide whether to enter
// a clutch moment UI. If triggered, buildClutchCheckpoint() extracts relevant
// game data into a snapshot. The player then makes a choice. Finally,
// clutchResultToPlayOutcome() converts the clutch outcome back into a concrete
// play outcome that the engine can process normally.
//
// This maintains clean separation: the clutch system is UI/narrative; the engine
// continues with regular play simulation, modified only by the resulting PlayOutcome.

import { GameState, Phase, Situation, PlayOutcome, PlayResult } from './state_machine.js';

//============================================
// Types

export interface ClutchCheckpoint {
	quarter: number;
	timeRemaining: number;              // seconds in current quarter
	down: number;
	distance: number;                    // yards to first down
	yardLine: number;                    // yards from own goal (1-99)
	offenseTeamId: string;
	defenseTeamId: string;
	scoreDiff: number;                   // from player team perspective
	situation: string;                   // Situation enum value
	isPlayoff: boolean;
}

export interface ClutchResult {
	tier: 'big_success' | 'partial_success' | 'failure' | 'disaster';
	situationType: string;
}

//============================================
// Clutch trigger logic

export function shouldTriggerClutch(
	state: GameState,
	playerTeamId: string,
	isStarter: boolean,
	isPlayoff: boolean,
): boolean {
	// Clutch moments only in Q4 or OT
	if (state.quarter < 4) {
		return false;
	}

	// Only starters can have clutch moments
	if (!isStarter) {
		return false;
	}

	// Score margin must be close (within 10 points)
	const absMargin = Math.abs(state.score_diff);
	if (absMargin > 10) {
		return false;
	}

	// Only in NORMAL or OVERTIME phase (skip PAT, KICKOFF, etc.)
	if (state.phase !== Phase.NORMAL && state.phase !== Phase.OVERTIME) {
		return false;
	}

	// Situation must be clutch-relevant
	const clutchSituations: Record<string, boolean> = {
		[Situation.LATE_AND_CLOSE]: true,
		[Situation.TWO_MINUTE]: true,
		[Situation.RED_ZONE]: true,
		[Situation.GOAL_LINE]: true,
	};
	if (!clutchSituations[state.situation]) {
		return false;
	}

	// Random gate: higher chance in playoffs
	const triggerChance = isPlayoff ? 0.25 : 0.15;
	if (Math.random() > triggerChance) {
		return false;
	}

	return true;
}

//============================================
// Checkpoint extraction

export function buildClutchCheckpoint(
	state: GameState,
	playerTeamId: string,
	isPlayoff: boolean,
): ClutchCheckpoint {
	// Determine score diff from player team perspective
	let scoreDiff = state.score_diff;
	if (state.possession !== playerTeamId) {
		// Player is on defense: invert the sign
		scoreDiff = -scoreDiff;
	}

	return {
		quarter: state.quarter,
		timeRemaining: state.quarter_seconds_remaining,
		down: state.down,
		distance: state.yards_to_go,
		yardLine: state.yard_line,
		offenseTeamId: state.possession,
		defenseTeamId: state.defense,
		scoreDiff: scoreDiff,
		situation: state.situation,
		isPlayoff: isPlayoff,
	};
}

//============================================
// Play outcome generation from clutch result
//
// Maps clutch tier + situation into a concrete play outcome.
// Each outcome includes realistic description and correct PlayResult enum.

export function clutchResultToPlayOutcome(
	clutchOutcome: ClutchResult,
	checkpoint: ClutchCheckpoint,
): PlayOutcome {
	const { tier, situationType } = clutchOutcome;

	// Default base outcome (overrides below set specific fields)
	const outcome: PlayOutcome = {
		play_type: 'pass',
		result: PlayResult.INCOMPLETE,
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
		clock_running: true,
		out_of_bounds: false,
		fumble_lost: false,
		interception: false,
		sack: false,
		air_yards: 0,
		is_complete: false,
		description: '',
	};

	//============================================
	// BIG SUCCESS outcomes
	if (tier === 'big_success') {
		if (
			situationType === 'comeback_drive' ||
			situationType === 'hold_lead'
		) {
			// Big success on offense: pass for TD
			outcome.play_type = 'pass';
			outcome.result = PlayResult.TOUCHDOWN;
			outcome.touchdown = true;
			outcome.scoring_team = checkpoint.offenseTeamId;
			outcome.points = 6;
			outcome.is_complete = true;
			outcome.air_yards = Math.min(
				checkpoint.yardLine - 1,
				30,
			);
			outcome.yards_gained = checkpoint.yardLine - 1;
			outcome.description = `Pinpoint pass for a touchdown! Clutch completion in the endzone.`;
		} else if (situationType === 'must_have_stop') {
			// Big success on defense: sack or INT
			if (Math.random() < 0.5) {
				outcome.play_type = 'pass';
				outcome.result = PlayResult.INTERCEPTION;
				outcome.turnover = true;
				outcome.interception = true;
				outcome.yards_gained = 0;
				outcome.description = `Huge interception! Clutch defensive play seals the victory.`;
			} else {
				outcome.play_type = 'pass';
				outcome.result = PlayResult.SACK;
				outcome.turnover = false;
				outcome.sack = true;
				outcome.yards_gained = -8;
				outcome.description = `Devastating sack! Defense dominates on the critical play.`;
			}
		} else {
			// Default big success: run for first down
			outcome.play_type = 'run';
			outcome.result = PlayResult.FIRST_DOWN;
			outcome.yards_gained = Math.max(checkpoint.distance, 5);
			outcome.clock_running = true;
			outcome.description = `Explosive run gains critical yards in the clutch.`;
		}
	}
	//============================================
	// PARTIAL SUCCESS outcomes
	else if (tier === 'partial_success') {
		if (situationType === 'comeback_drive') {
			// Partial success: pass for meaningful gain (15-25 yards, first down)
			outcome.play_type = 'pass';
			outcome.result = PlayResult.FIRST_DOWN;
			outcome.is_complete = true;
			const gain = 15 + Math.floor(Math.random() * 11);
			outcome.yards_gained = gain;
			outcome.air_yards = gain;
			outcome.description = `Solid pass completes for a first down. Drive stays alive.`;
		} else if (situationType === 'hold_lead') {
			// Partial success: short run gain (4-8 yards)
			outcome.play_type = 'run';
			outcome.result = PlayResult.FIRST_DOWN;
			const gain = 4 + Math.floor(Math.random() * 5);
			outcome.yards_gained = gain;
			outcome.clock_running = true;
			outcome.description = `Solid running play moves the chains on crucial down.`;
		} else {
			// Default partial: incomplete or short gain
			outcome.play_type = 'pass';
			outcome.result = PlayResult.INCOMPLETE;
			outcome.yards_gained = 0;
			outcome.description = `Play gains a few yards but falls short of expectations.`;
		}
	}
	//============================================
	// FAILURE outcomes
	else if (tier === 'failure') {
		if (situationType === 'comeback_drive') {
			// Failure: incomplete pass, no gain
			outcome.play_type = 'pass';
			outcome.result = PlayResult.INCOMPLETE;
			outcome.yards_gained = 0;
			outcome.is_complete = false;
			outcome.description = `Pass sails incomplete. Offense wastes a down.`;
		} else if (situationType === 'hold_lead') {
			// Failure: short run, minimal or negative yards
			outcome.play_type = 'run';
			outcome.result = PlayResult.SHORT_OF_FIRST;
			const gain = -2 + Math.floor(Math.random() * 5);
			outcome.yards_gained = gain;
			outcome.clock_running = true;
			outcome.description = `Run play stuffed at the line. No gain.`;
		} else {
			// Default failure: short of first down
			outcome.play_type = 'run';
			outcome.result = PlayResult.SHORT_OF_FIRST;
			outcome.yards_gained = 1;
			outcome.description = `Play falls short on critical down.`;
		}
	}
	//============================================
	// DISASTER outcomes (always turnover or major loss)
	else if (tier === 'disaster') {
		const isInt = Math.random() < 0.6;

		if (isInt) {
			// Interception returned for TD
			outcome.play_type = 'pass';
			outcome.result = PlayResult.INTERCEPTION;
			outcome.turnover = true;
			outcome.interception = true;
			outcome.yards_gained = 0;
			outcome.turnover_return_yards = checkpoint.yardLine - 1;
			outcome.touchdown = true;
			outcome.scoring_team = checkpoint.defenseTeamId;
			outcome.points = 6;
			outcome.description = `Catastrophic interception! Returned for a touchdown. Game over.`;
		} else {
			// Fumble lost, opponent scores
			outcome.play_type = 'run';
			outcome.result = PlayResult.FUMBLE_LOST;
			outcome.turnover = true;
			outcome.fumble_lost = true;
			outcome.yards_gained = 0;
			outcome.turnover_return_yards = checkpoint.yardLine - 1;
			outcome.touchdown = true;
			outcome.scoring_team = checkpoint.defenseTeamId;
			outcome.points = 6;
			outcome.description = `Fumble recovered for a touchdown by the defense! Devastating turn.`;
		}
	}

	return outcome;
}
