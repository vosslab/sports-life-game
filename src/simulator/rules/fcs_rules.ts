//============================================
// FCS (Football Championship Subdivision) Rules and Tuning
//
// NCAA Division I FCS football: more structured than high school,
// less parity than NFL. Rankings matter. Top programs dominate.
// Stronger home-field advantage than NFL. Bigger scoring variance.
//============================================

import type { LeagueRules } from "./league_rules.js";
import type { LeagueTuning } from "./league_tuning.js";

export const FCS_RULES: LeagueRules = {
	id: "fcs",
	quarterLengthMin: 15,       // same as NFL
	overtimeType: "college",    // alternating possessions from 25-yard line
	fieldGoalMaxRange: 45,      // decent college kickers
	patSuccessRate: 0.88,       // good but not NFL-level
	twoPointRate: 0.45,
};

export const FCS_TUNING: LeagueTuning = {
	homeFieldEdge: 3.5,         // stronger home field than NFL
	parity: 0.5,                // moderate: good teams win but upsets happen
	ratingGapImpact: 0.9,       // team quality matters more than NFL
	rankingImpact: 0.3,         // rankings affect expectations and confidence
	averageTotalPoints: 48,     // slightly higher scoring than NFL
	totalPointsVariance: 14,    // more spread than NFL
	blowoutFactor: 0.6,         // top teams roll weak opponents
	closeGameCompression: 0.4,  // less game management than NFL
	upsetFactor: 0.25,          // upsets happen but less than NFL
	passRateBase: 0.50,         // balanced but slightly more run
	fourthDownAggression: 0.18, // moderate aggressiveness
	fieldGoalAccuracy: 0.75,    // functional kicking
	completionRate: 0.58,       // below NFL but competent
	sackRate: 0.06,             // slightly less than NFL
	intRate: 0.03,              // more mistakes than NFL
	rushFumbleRate: 0.02,
	catchFumbleRate: 0.015,
	explosivePlayRate: 0.07,    // more big plays than NFL
	penaltyRate: 0.14,          // similar to NFL
	kickoffTouchbackRate: 0.40, // weaker legs than NFL
	puntFairCatchRate: 0.35,
};
