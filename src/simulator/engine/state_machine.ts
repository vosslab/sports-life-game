//============================================
// Game State Machine - TypeScript port of nflsim game_state.py
// Complete state of a game at any point during simulation
//============================================

// Phase of the game
export const enum Phase {
	COIN_TOSS = "COIN_TOSS",
	KICKOFF = "KICKOFF",
	NORMAL = "NORMAL",           // regular offensive play
	PAT = "PAT",                 // point-after-touchdown attempt
	OVERTIME = "OVERTIME",
	GAME_OVER = "GAME_OVER",
}

// Contextual game situation for play-calling and strategy
export const enum Situation {
	NORMAL = "NORMAL",
	TWO_MINUTE = "TWO_MINUTE",   // under 2:00 in half
	GOAL_LINE = "GOAL_LINE",     // inside 3 yard line
	RED_ZONE = "RED_ZONE",       // inside 20
	BACKED_UP = "BACKED_UP",     // inside own 10
	GARBAGE_TIME = "GARBAGE_TIME", // 3+ score lead, 4th quarter
	LATE_AND_CLOSE = "LATE_AND_CLOSE", // within 8 points, 4th quarter
}

// Outcome category of a single play
export const enum PlayResult {
	FIRST_DOWN = "FIRST_DOWN",
	SHORT_OF_FIRST = "SHORT_OF_FIRST",
	TOUCHDOWN = "TOUCHDOWN",
	TURNOVER_DOWNS = "TURNOVER_DOWNS",
	INTERCEPTION = "INTERCEPTION",
	FUMBLE_LOST = "FUMBLE_LOST",
	INCOMPLETE = "INCOMPLETE",
	SACK = "SACK",
	PENALTY_OFFENSE = "PENALTY_OFFENSE",
	PENALTY_DEFENSE = "PENALTY_DEFENSE",
	SAFETY = "SAFETY",
	FIELD_GOAL_MADE = "FIELD_GOAL_MADE",
	FIELD_GOAL_MISSED = "FIELD_GOAL_MISSED",
	PUNT = "PUNT",
	TOUCHBACK = "TOUCHBACK",
	FAIR_CATCH = "FAIR_CATCH",
	KNEEL = "KNEEL",
	SPIKE = "SPIKE",
	TWO_MINUTE_WARNING = "TWO_MINUTE_WARNING",
}

// The resolved outcome of a single play
export interface PlayOutcome {
	play_type: string; // "pass", "run", "punt", "field_goal", "kickoff", "kneel", "spike", "extra_point", "two_point"
	result: PlayResult;
	yards_gained: number;
	turnover: boolean;
	turnover_return_yards: number;
	touchdown: boolean;
	scoring_team: string | null;
	points: number;
	penalty: boolean;
	penalty_on_offense: boolean;
	penalty_yards: number;
	penalty_auto_first: boolean;
	clock_running: boolean; // does clock continue after play
	out_of_bounds: boolean;
	fumble_lost: boolean;
	interception: boolean;
	sack: boolean;
	air_yards: number;
	is_complete: boolean;
	description: string;
}

// Complete state of a game at any point
export class GameState {
	// Teams
	home_team: string = "";
	away_team: string = "";

	// Score
	home_score: number = 0;
	away_score: number = 0;

	// Possession
	possession: string = "";     // team abbreviation with the ball
	home_receives_2h: boolean = false; // who deferred in coin toss

	// Field position
	yard_line: number = 25;      // yards from possessing team's own goal (1-99)
	down: number = 1;
	yards_to_go: number = 10;
	first_down_marker: number = 35; // absolute yard line of first down

	// Clock
	quarter: number = 1;
	game_seconds_remaining: number = 3600; // full game (60 min = 3600 sec)
	quarter_seconds_remaining: number = 900; // 15 min = 900 sec
	play_clock: number = 40;

	// Timeouts (3 per half per team)
	home_timeouts: number = 3;
	away_timeouts: number = 3;

	// Phase
	phase: Phase = Phase.COIN_TOSS;

	// Kickoff tracking
	kickoff_reason: string = "";  // "start_of_game", "start_of_half", "after_score"
	scoring_team_last: string = ""; // who scored last (for kickoff direction)

	// Stats tracking
	play_number: number = 0;
	home_plays: number = 0;
	away_plays: number = 0;
	play_log: string[] = [];

	// Two-minute warning tracking per quarter
	two_min_warning_given: Map<number, boolean> = new Map([
		[1, false],
		[2, false],
		[3, false],
		[4, false],
		[5, false],
	]);

	//============================================
	// Computed getters
	//============================================

	// Team on defense
	get defense(): string {
		return this.possession === this.home_team ? this.away_team : this.home_team;
	}

	// Score differential from possessing team's perspective
	get score_diff(): number {
		if (this.possession === this.home_team) {
			return this.home_score - this.away_score;
		}
		return this.away_score - this.home_score;
	}

	// Current half (1 or 2)
	get half(): number {
		return this.quarter <= 2 ? 1 : 2;
	}

	// Classify the current game situation based on context
	get situation(): Situation {
		const q = this.quarter;
		const secs = this.quarter_seconds_remaining;
		const diff = this.score_diff;

		// Two-minute situations
		if (secs <= 120 && (q === 2 || q === 4)) {
			return Situation.TWO_MINUTE;
		}

		// Fourth quarter situations
		if (q === 4) {
			if (Math.abs(diff) > 16) {
				return Situation.GARBAGE_TIME;
			}
			if (Math.abs(diff) <= 8) {
				return Situation.LATE_AND_CLOSE;
			}
		}

		// Field position situations
		if (this.yard_line >= 90) {
			// inside opponent's 10
			return Situation.GOAL_LINE;
		}
		if (this.yard_line >= 80) {
			// inside opponent's 20
			return Situation.RED_ZONE;
		}
		if (this.yard_line <= 10) {
			// backed up inside own 10
			return Situation.BACKED_UP;
		}

		return Situation.NORMAL;
	}

	// Yards from opponent's goal line (distance to endzone)
	get opponent_yard_line(): number {
		return 100 - this.yard_line;
	}

	// Distance of a field goal attempt from current position (add 17 for snap+hold)
	get field_goal_distance(): number {
		return this.opponent_yard_line + 17;
	}

	// Current score of the possession team
	get possession_score(): number {
		return this.possession === this.home_team ? this.home_score : this.away_score;
	}

	// Current score of the defense team
	get defense_score(): number {
		return this.possession === this.home_team ? this.away_score : this.home_score;
	}

	//============================================
	// Methods
	//============================================

	// Check invariants. Returns list of violations (empty = valid).
	validate(): string[] {
		const errors: string[] = [];

		// Don't validate field state once game is over
		if (this.phase === Phase.GAME_OVER) {
			return errors;
		}

		// Yard line must be between 1-99 (1 is own goal, 99 is opponent endzone)
		if (this.yard_line < 1 || this.yard_line > 99) {
			errors.push(`yard_line out of bounds: ${this.yard_line}`);
		}

		// Down must be 1-4
		if (this.down < 1 || this.down > 4) {
			errors.push(`invalid down: ${this.down}`);
		}

		// Yards to go must be positive
		if (this.yards_to_go < 1) {
			errors.push(`invalid yards_to_go: ${this.yards_to_go}`);
		}

		// Quarter must be 1-5 (5 for overtime)
		if (this.quarter < 1 || this.quarter > 5) {
			errors.push(`invalid quarter: ${this.quarter}`);
		}

		// Time remaining must be non-negative
		if (this.quarter_seconds_remaining < 0) {
			errors.push(`negative quarter_seconds: ${this.quarter_seconds_remaining}`);
		}

		if (this.game_seconds_remaining < 0) {
			errors.push(`negative game_seconds: ${this.game_seconds_remaining}`);
		}

		// Timeouts must be 0-3
		if (this.home_timeouts < 0 || this.home_timeouts > 3) {
			errors.push(`invalid home_timeouts: ${this.home_timeouts}`);
		}

		if (this.away_timeouts < 0 || this.away_timeouts > 3) {
			errors.push(`invalid away_timeouts: ${this.away_timeouts}`);
		}

		// Possession must be assigned (except during coin toss)
		if (this.possession !== this.home_team && this.possession !== this.away_team && this.phase !== Phase.COIN_TOSS) {
			errors.push(`invalid possession: ${this.possession}`);
		}

		return errors;
	}

	// Append a play description to the log
	logPlay(desc: string): void {
		const clockStr = this.clockStr();
		const fieldPosStr = this.fieldPosStr();
		const logEntry = `Q${this.quarter} ${clockStr} | ${this.possession} ${this.down}&${this.yards_to_go} at ${fieldPosStr} | ${desc}`;
		this.play_log.push(logEntry);
	}

	//============================================
	// Private helper methods
	//============================================

	// Format quarter seconds as MM:SS
	private clockStr(): string {
		const mins = Math.floor(this.quarter_seconds_remaining / 60);
		const secs = this.quarter_seconds_remaining % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	// Format field position string
	private fieldPosStr(): string {
		if (this.yard_line === 50) {
			return "50";
		}
		if (this.yard_line < 50) {
			return `${this.possession} ${this.yard_line}`;
		}
		const opp = this.defense;
		return `${opp} ${100 - this.yard_line}`;
	}
}
