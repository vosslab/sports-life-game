//============================================
// Team Box Score - Accumulates play-level stats into team-level statistics
// Adapted from nflsim's box_score.py
//============================================

import { PlayOutcome, PlayResult } from "../engine/state_machine.js";

//============================================
// Team-level box score
export interface TeamBoxScore {
	totalPlays: number;
	passAttempts: number;
	passCompletions: number;
	passYards: number;
	passTds: number;
	interceptions: number;
	sacks: number;
	sackYards: number;
	rushAttempts: number;
	rushYards: number;
	rushTds: number;
	fumblesLost: number;
	firstDowns: number;
	thirdDownAttempts: number;
	thirdDownConversions: number;
	penalties: number;
	penaltyYards: number;
	fgAttempts: number;
	fgMade: number;
	xpAttempts: number;
	xpMade: number;
	punts: number;
	totalYards: number;
	totalTds: number;
	turnovers: number;
}

//============================================
// Create an empty box score initialized to zero
export function createEmptyBoxScore(): TeamBoxScore {
	return {
		totalPlays: 0,
		passAttempts: 0,
		passCompletions: 0,
		passYards: 0,
		passTds: 0,
		interceptions: 0,
		sacks: 0,
		sackYards: 0,
		rushAttempts: 0,
		rushYards: 0,
		rushTds: 0,
		fumblesLost: 0,
		firstDowns: 0,
		thirdDownAttempts: 0,
		thirdDownConversions: 0,
		penalties: 0,
		penaltyYards: 0,
		fgAttempts: 0,
		fgMade: 0,
		xpAttempts: 0,
		xpMade: 0,
		punts: 0,
		totalYards: 0,
		totalTds: 0,
		turnovers: 0,
	};
}

//============================================
// Record a single play into the box score
export function recordPlay(
	box: TeamBoxScore,
	outcome: PlayOutcome,
	preDown: number,
): void {
	// Increment total play count
	box.totalPlays += 1;

	// Pass play stats
	if (outcome.play_type === "pass") {
		box.passAttempts += 1;
		if (outcome.is_complete) {
			box.passCompletions += 1;
		}
		box.passYards += outcome.yards_gained;
		if (outcome.touchdown) {
			box.passTds += 1;
		}
		if (outcome.interception) {
			box.interceptions += 1;
		}
		if (outcome.sack) {
			box.sacks += 1;
			box.sackYards += -outcome.yards_gained; // sacks are negative yards
		}
	}

	// Run play stats
	if (outcome.play_type === "run") {
		box.rushAttempts += 1;
		box.rushYards += outcome.yards_gained;
		if (outcome.touchdown) {
			box.rushTds += 1;
		}
	}

	// Penalty stats
	if (outcome.penalty) {
		box.penalties += 1;
		box.penaltyYards += outcome.penalty_yards;
	}

	// Turnover stats
	if (outcome.fumble_lost) {
		box.fumblesLost += 1;
	}
	if (outcome.interception) {
		// Already counted above in interceptions
	}

	// Field goal stats
	if (outcome.play_type === "field_goal") {
		box.fgAttempts += 1;
		if (outcome.result === PlayResult.FIELD_GOAL_MADE) {
			box.fgMade += 1;
		}
	}

	// Extra point stats
	if (outcome.play_type === "extra_point") {
		box.xpAttempts += 1;
		if (outcome.result === PlayResult.TOUCHDOWN) {
			box.xpMade += 1;
		}
	}

	// Punt stats
	if (outcome.play_type === "punt") {
		box.punts += 1;
	}

	// First down tracking (on offense)
	// Record if current play results in first down
	if (outcome.result === PlayResult.FIRST_DOWN) {
		box.firstDowns += 1;
	}

	// Third down tracking
	if (preDown === 3) {
		box.thirdDownAttempts += 1;
		if (outcome.result === PlayResult.FIRST_DOWN) {
			box.thirdDownConversions += 1;
		}
	}

	// Accumulate derived stats
	updateDerivedStats(box);
}

//============================================
// Recompute derived stats (totalYards, totalTds, turnovers)
function updateDerivedStats(box: TeamBoxScore): void {
	box.totalYards = box.passYards + box.rushYards;
	box.totalTds = box.passTds + box.rushTds;
	box.turnovers = box.interceptions + box.fumblesLost;
}
