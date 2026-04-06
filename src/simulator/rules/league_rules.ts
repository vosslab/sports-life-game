/** League rules interface - sport-specific rules that are stable and rarely change */

export interface LeagueRules {
	/** Unique identifier for the league */
	id: "ihsa" | "fcs" | "nfl";

	/** Tier of play (high school only) */
	tier?: "frosh_soph" | "varsity";

	/** Length of each quarter in minutes */
	quarterLengthMin: number;

	/** Type of overtime rules to apply */
	overtimeType: "hs" | "college" | "nfl";

	/** Maximum successful field goal range in yards */
	fieldGoalMaxRange: number;

	/** Base success rate for point-after-touchdown attempts (0-1) */
	patSuccessRate: number;

	/** Success rate for two-point conversion attempts (0-1) */
	twoPointRate: number;
}
