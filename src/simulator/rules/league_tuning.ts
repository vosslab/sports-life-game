/** League tuning parameters - simulation knobs iterated constantly for game balance */

export interface LeagueTuning {
	/** Points added to home team to model field advantage (typical 2-3 points) */
	homeFieldEdge: number;

	/** Competitive balance factor (0-1): higher = more competitive, lower = more predictable */
	parity: number;

	/** How much team strength difference affects outcome (0-1): higher = strength matters more */
	ratingGapImpact: number;

	/** How much team ranking affects game expectations (0-1): higher = ranking more predictive */
	rankingImpact: number;

	/** Target combined points scored by both teams */
	averageTotalPoints: number;

	/** Standard deviation around average total points */
	totalPointsVariance: number;

	/** Tendency toward lopsided scores (0-1): higher = more blowouts */
	blowoutFactor: number;

	/** Tendency toward tight finishes (0-1): higher = more close games */
	closeGameCompression: number;

	/** Likelihood of upset outcomes (0-1): higher = weaker teams win more often */
	upsetFactor: number;

	/** Base probability of calling a pass play (0-1) */
	passRateBase: number;

	/** Tendency to attempt fourth down conversions (0-1) */
	fourthDownAggression: number;

	/** Multiplier on base field goal success rate */
	fieldGoalAccuracy: number;

	/** Base completion rate for pass plays (0-1) */
	completionRate: number;

	/** Base sack rate per pass play (0-1) */
	sackRate: number;

	/** Base interception rate per pass attempt (0-1) */
	intRate: number;

	/** Base fumble rate on rushing plays (0-1) */
	rushFumbleRate: number;

	/** Base fumble rate on pass catches (0-1) */
	catchFumbleRate: number;

	/** Likelihood of explosive plays gaining significant yards (0-1) */
	explosivePlayRate: number;

	/** Penalty rate per play (0-1) */
	penaltyRate: number;

	/** Rate at which kickoffs result in touchbacks (0-1) */
	kickoffTouchbackRate: number;

	/** Rate at which punts result in fair catches (0-1) */
	puntFairCatchRate: number;
}
