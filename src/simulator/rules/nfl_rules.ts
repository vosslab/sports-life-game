import type { LeagueRules } from "./league_rules.js";
import type { LeagueTuning } from "./league_tuning.js";

/** NFL-specific rules - standard 15-minute quarters with NFL overtime format */
export const NFL_RULES: LeagueRules = {
	id: "nfl",
	quarterLengthMin: 15,
	overtimeType: "nfl",
	fieldGoalMaxRange: 58,
	patSuccessRate: 0.94,
	twoPointRate: 0.48,
};

/** NFL tuning parameters - calibrated from nflsim model for realistic outcomes */
export const NFL_TUNING: LeagueTuning = {
	// Game outcome factors
	homeFieldEdge: 2.5,
	parity: 0.8,
	ratingGapImpact: 0.6,
	rankingImpact: 0.1,

	// Scoring distribution
	averageTotalPoints: 44,
	totalPointsVariance: 12,
	blowoutFactor: 0.3,
	closeGameCompression: 0.7,
	upsetFactor: 0.35,

	// Play calling
	passRateBase: 0.58,
	fourthDownAggression: 0.15,

	// Accuracy and efficiency
	fieldGoalAccuracy: 0.85,
	completionRate: 0.65,
	sackRate: 0.065,
	intRate: 0.025,

	// Fumbles
	rushFumbleRate: 0.015,
	catchFumbleRate: 0.01,

	// Big plays and penalties
	explosivePlayRate: 0.05,
	penaltyRate: 0.14,

	// Special teams
	kickoffTouchbackRate: 0.55,
	puntFairCatchRate: 0.40,
};
