//============================================
// IHSA (Illinois High School Association) Rules and Tuning
//
// Two presets: Freshman/Sophomore and Varsity.
// Same engine, same interface, different constants.
//
// HS football is chaotic: big talent gaps, weak kicking, run-heavy,
// lots of turnovers and penalties. Frosh/soph is even more extreme.
//============================================

import type { LeagueRules } from "./league_rules.js";
import type { LeagueTuning } from "./league_tuning.js";

//============================================
// Freshman/Sophomore rules and tuning
//============================================

export const IHSA_FROSH_SOPH_RULES: LeagueRules = {
	id: "ihsa",
	tier: "frosh_soph",
	quarterLengthMin: 10,       // shorter quarters than varsity
	overtimeType: "hs",         // Kansas tiebreaker style
	fieldGoalMaxRange: 30,      // barely functional kicking
	patSuccessRate: 0.70,       // miss a lot of extra points
	twoPointRate: 0.35,         // low conversion rate
};

export const IHSA_FROSH_SOPH_TUNING: LeagueTuning = {
	homeFieldEdge: 3.0,         // home crowd matters more for kids
	parity: 0.2,                // huge talent gaps between programs
	ratingGapImpact: 1.5,       // one good athlete dominates everything
	rankingImpact: 0.0,         // no rankings at FS level
	averageTotalPoints: 45,     // high scoring, lots of big plays
	totalPointsVariance: 20,    // wildly variable outcomes
	blowoutFactor: 1.4,         // very common blowouts
	closeGameCompression: 0.2,  // little late-game strategy
	upsetFactor: 0.15,          // weak teams rarely win
	passRateBase: 0.30,         // very run-heavy offense
	fourthDownAggression: 0.25, // coaches go for it more
	fieldGoalAccuracy: 0.45,    // kicking is unreliable
	completionRate: 0.40,       // lots of drops and bad throws
	sackRate: 0.04,             // fewer dropbacks = fewer sacks
	intRate: 0.05,              // bad decision making, tipped balls
	rushFumbleRate: 0.04,       // sloppy ball handling
	catchFumbleRate: 0.03,      // can't hold on to the ball
	explosivePlayRate: 0.08,    // broken tackles go for TDs sometimes
	penaltyRate: 0.18,          // false starts, offsides constantly
	kickoffTouchbackRate: 0.20, // weak leg, short kicks
	puntFairCatchRate: 0.15,    // returners try to run it back
};

//============================================
// Varsity rules and tuning
//============================================

export const IHSA_VARSITY_RULES: LeagueRules = {
	id: "ihsa",
	tier: "varsity",
	quarterLengthMin: 12,       // standard HS quarter length
	overtimeType: "hs",
	fieldGoalMaxRange: 38,      // can kick a bit
	patSuccessRate: 0.80,       // more reliable than FS
	twoPointRate: 0.40,
};

export const IHSA_VARSITY_TUNING: LeagueTuning = {
	homeFieldEdge: 2.5,
	parity: 0.3,                // still big gaps, but less extreme
	ratingGapImpact: 1.2,       // stars still matter a lot
	rankingImpact: 0.05,        // minimal ranking effect
	averageTotalPoints: 42,
	totalPointsVariance: 16,
	blowoutFactor: 1.2,         // common but less extreme than FS
	closeGameCompression: 0.3,  // some late-game awareness
	upsetFactor: 0.20,
	passRateBase: 0.40,         // more passing than FS
	fourthDownAggression: 0.20,
	fieldGoalAccuracy: 0.55,    // weak but functional
	completionRate: 0.50,       // better but still below college
	sackRate: 0.05,
	intRate: 0.04,              // fewer bad decisions
	rushFumbleRate: 0.03,
	catchFumbleRate: 0.02,
	explosivePlayRate: 0.09,    // still more than NFL
	penaltyRate: 0.15,
	kickoffTouchbackRate: 0.30,
	puntFairCatchRate: 0.25,
};
