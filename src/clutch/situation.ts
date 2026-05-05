// situation.ts - derive the clutch situation, build scene/atmosphere text.
//
// Split from `src/clutch_moment.ts` during M4. Pure helpers used by
// `buildClutchMoment` to map a game-state context onto a tagged situation
// and a string description for the UI to display before the player picks.

import { randomInRange } from '../player.js';
import { rand } from '../core/rng.js';
import { ClutchGameContext, ClutchSituation } from './types.js';

//============================================
// Utility helpers used across the clutch engine.
export function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(rand() * arr.length)];
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

// Shuffle array in place (Fisher-Yates) using the seeded RNG.
export function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		const temp = result[i];
		result[i] = result[j];
		result[j] = temp;
	}
	return result;
}

//============================================
// Situation detection from game context. Score margin is the primary axis
// with secondary randomized factors (field position, time pressure, playoff
// intensity) layered on for variety.
export function deriveSituation(context: ClutchGameContext): ClutchSituation {
	const margin = context.teamScore - context.opponentScore;
	const isDefensivePosition = context.positionBucket === 'defender';
	const isKicker = context.positionBucket === 'kicker';

	// Rare final_play trigger (~12% in playoffs, ~5% otherwise)
	const finalPlayChance = context.isPlayoff ? 0.12 : 0.05;
	if (rand() < finalPlayChance) {
		return 'final_play';
	}

	// Kickers get special treatment: red_zone or FG situations more often.
	if (isKicker) {
		if (margin <= 0 && margin >= -3) {
			// Down by a FG or less: game-winning kick territory
			return 'red_zone';
		}
		if (margin > 0 && margin <= 3) {
			return 'ice_game';
		}
		// Otherwise fall through to normal logic
	}

	// Random field position flavor: occasionally override with backed_up or
	// red_zone to break the margin-always-determines-situation pattern.
	const fieldPositionRoll = rand();
	if (fieldPositionRoll < 0.08 && margin <= 0) {
		return 'backed_up';
	}
	if (fieldPositionRoll < 0.15 && margin >= -3 && margin <= 3) {
		return 'red_zone';
	}

	// Primary margin-based logic
	if (margin < -7) {
		// Down big: comeback or occasionally backed_up
		if (rand() < 0.2) {
			return 'backed_up';
		}
		return 'comeback_drive';
	}
	if (margin >= -7 && margin < -3) {
		// Down 4-7: mostly comeback, sometimes red_zone if close enough
		if (rand() < 0.3) {
			return 'red_zone';
		}
		return 'comeback_drive';
	}
	if (margin >= -3 && margin < 0) {
		// Down 1-3: FG ties or wins. Multiple viable situations.
		const roll = rand();
		if (roll < 0.35) {
			return 'red_zone';
		}
		if (roll < 0.55) {
			return 'tie_game';
		}
		return 'comeback_drive';
	}
	if (margin === 0) {
		return 'tie_game';
	}
	if (margin >= 1 && margin <= 3) {
		// Slim lead: tense
		if (isDefensivePosition) {
			return 'must_have_stop';
		}
		if (rand() < 0.4) {
			return 'ice_game';
		}
		return 'hold_lead';
	}
	if (margin >= 4 && margin <= 7) {
		if (isDefensivePosition) {
			return 'must_have_stop';
		}
		return 'hold_lead';
	}
	// Up 8-10: offense ices it, defense must hold
	if (isDefensivePosition) {
		return 'must_have_stop';
	}
	return 'ice_game';
}

//============================================
// Situation-specific scene text generators
type SceneBuilder = (
	ctx: ClutchGameContext, time: string, fieldPos: string,
) => string;

const SITUATION_SCENES: Record<ClutchSituation, SceneBuilder> = {
	comeback_drive: (ctx, time, fieldPos) => {
		const deficit = ctx.opponentScore - ctx.teamScore;
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on ${fieldPos}. `
			+ `Down ${deficit}. You need this drive.`;
	},
	hold_lead: (ctx, time, fieldPos) => {
		const lead = ctx.teamScore - ctx.opponentScore;
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on ${fieldPos}. `
			+ `Up ${lead}. One more first down could seal this.`;
	},
	tie_game: (ctx, time, fieldPos) => {
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on ${fieldPos}. `
			+ `All tied up. Next score probably wins it.`;
	},
	red_zone: (ctx, time, _fieldPos) => {
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on the opponent's ${randomInRange(5, 15)}. `
			+ `Red zone. This is your chance.`;
	},
	backed_up: (ctx, time, _fieldPos) => {
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on your own ${randomInRange(3, 12)}. `
			+ `Backed up deep. A mistake here is catastrophic.`;
	},
	must_have_stop: (ctx, time, fieldPos) => {
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Opponent has the ball on ${fieldPos}. `
			+ `You need a stop here. Everything rides on this play.`;
	},
	ice_game: (ctx, time, fieldPos) => {
		const lead = ctx.teamScore - ctx.opponentScore;
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `${time} left in the 4th. Ball on ${fieldPos}. `
			+ `Up ${lead}. Time to put them away for good.`;
	},
	final_play: (ctx, _time, fieldPos) => {
		const margin = ctx.teamScore - ctx.opponentScore;
		let stakeStr: string;
		if (margin < 0) {
			stakeStr = `Down ${Math.abs(margin)}. This is the last play. Everything on the line.`;
		} else if (margin > 0) {
			stakeStr = `Up ${margin}. One final play to survive. Do not let them score.`;
		} else {
			stakeStr = 'Tied. One play left. Someone becomes the hero.';
		}
		return `Score: ${ctx.teamName} ${ctx.teamScore} - ${ctx.opponentName} ${ctx.opponentScore}. `
			+ `0:00 on the clock. Ball on ${fieldPos}. `
			+ `${stakeStr}`;
	},
};

//============================================
// Atmosphere text keyed by situation + context
function getAtmosphere(situation: ClutchSituation, context: ClutchGameContext): string {
	const isPlayoff = context.isPlayoff;

	// Situation-specific atmosphere pools
	const pools: Record<string, string[]> = {
		comeback_drive: [
			'The crowd is nervous. Everyone knows this might be the last chance.',
			'Your teammates on the sideline are standing. Nobody is sitting down.',
			'The noise is deafening. You can barely hear the play call.',
			'You glance at the scoreboard. No time to waste.',
		],
		hold_lead: [
			'The defense is exhausted. They need you to finish this.',
			'The clock is your friend. Burn it.',
			'Your coach is yelling to run the ball and eat clock.',
			'The other sideline is panicking. They know time is running out.',
		],
		tie_game: [
			'Both sidelines are silent. Everyone knows what is at stake.',
			'The scoreboard reads even. Someone has to blink first.',
			'You can hear your own heartbeat in the huddle.',
			'This is the kind of moment you dreamed about as a kid.',
		],
		red_zone: [
			'The end zone is right there. You can almost touch it.',
			'The defense is stacking the box. They know you are going for it.',
			'The crowd is on its feet. They can taste it.',
			'Short field. Big opportunity. Do not waste it.',
		],
		backed_up: [
			'The safety is playing deep. They are daring you to throw short.',
			'One bad snap and this game is over.',
			'The punter is warming up on the sideline. Just in case.',
			'Your own end zone is right behind you. No room for error.',
		],
		must_have_stop: [
			'The offense is marching. You have to make a play.',
			'Your teammates are gassed. One more stop is all you need.',
			'The quarterback is calling an audible. He sees something.',
			'This is why you practice. This exact moment.',
		],
		ice_game: [
			'The opposing sideline looks deflated.',
			'One more first down and this is over.',
			'Your coach wants you to finish strong. Send a message.',
			'The crowd is already celebrating. Do not let them down.',
		],
		final_play: [
			'This is it. One play. Win or lose.',
			'The clock reads 0:00. The refs are letting this play finish.',
			'Everyone in the stadium is on their feet.',
			'Your whole season comes down to this single snap.',
			'You can hear your own heartbeat through the helmet.',
			'The announcer just said your name to millions of people.',
		],
	};

	const playoffExtras = [
		'The cameras are all on you. National broadcast.',
		'This is playoff football. Every play is magnified.',
		'Scouts and GMs are watching from the press box.',
		'Millions of people are watching this live right now.',
	];

	const pool = pools[situation] ?? pools['tie_game'];
	if (isPlayoff && rand() < 0.4) {
		return pickRandom(playoffExtras);
	}
	return pickRandom(pool);
}

//============================================
// Generate the scene text with situation-specific framing
export function generateScene(
	context: ClutchGameContext,
	situation: ClutchSituation,
): string {
	const minutes = randomInRange(1, 4);
	const seconds = randomInRange(0, 59);
	const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

	// Field position varies by situation
	let yardLine: number;
	if (situation === 'red_zone') {
		yardLine = randomInRange(55, 90);  // near opponent end zone
	} else if (situation === 'backed_up') {
		yardLine = randomInRange(3, 12);   // near own end zone
	} else {
		yardLine = randomInRange(20, 60);  // midfield area
	}

	let fieldPosStr: string;
	if (yardLine <= 50) {
		fieldPosStr = `your own ${yardLine}`;
	} else {
		fieldPosStr = `the opponent's ${100 - yardLine}`;
	}

	const sceneBuilder = SITUATION_SCENES[situation];
	const baseScene = sceneBuilder(context, timeStr, fieldPosStr);
	const atmosphere = getAtmosphere(situation, context);

	return `${baseScene} ${atmosphere}`;
}

//============================================
// Decide whether a clutch moment should fire for this context.
export function shouldTrigger(context: ClutchGameContext): boolean {
	if (!context.isPlayoff && !context.isKeyGame) {
		return false;
	}
	if (!context.isStarter) {
		return false;
	}
	const margin = Math.abs(context.teamScore - context.opponentScore);
	if (margin > 10) {
		return false;
	}
	return true;
}
