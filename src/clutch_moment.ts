// clutch_moment.ts - 4th quarter clutch moment system
//
// Self-contained addon module. The existing game sim stays untouched.
// Weekly engine calls buildClutchMoment() and resolveClutchMoment() only.
//
// Two axes of variation: position bucket + situation type.
// Choices are drawn from larger pools and randomized each time.

import { Player, PositionBucket, Position, randomInRange } from './player.js';

//============================================
// Types

export interface ClutchGameContext {
	teamName: string;
	opponentName: string;
	teamScore: number;
	opponentScore: number;
	isPlayoff: boolean;
	isKeyGame: boolean;
	isStarter: boolean;
	position: Position | null;
	positionBucket: PositionBucket | null;
}

export type ClutchRisk = 'safe' | 'balanced' | 'heroic';

export interface ClutchChoice {
	id: string;
	label: string;
	description: string;
	risk: ClutchRisk;
	keyStat: keyof Player['core'];
}

export type MomentumTag = 'heroic' | 'steady' | 'costly';

export type ClutchSituation =
	| 'comeback_drive'
	| 'hold_lead'
	| 'tie_game'
	| 'red_zone'
	| 'backed_up'
	| 'must_have_stop'
	| 'ice_game'
	| 'final_play';

export interface ClutchResult {
	success: boolean;
	points: number;
	narrative: string;
	spotlightText: string;
	momentumTag: MomentumTag;
	situationType: ClutchSituation;
	// Legacy tag: non-empty string means this was a signature moment worth logging
	legacyTag: string;
}

export interface ClutchMoment {
	scene: string;
	situationType: ClutchSituation;
	choices: ClutchChoice[];
}

//============================================
// Base success rates by risk tier
const BASE_RATES: Record<ClutchRisk, number> = {
	safe: 0.75,
	balanced: 0.50,
	heroic: 0.30,
};

//============================================
// Choice template with multiple narrative variants per outcome
interface ChoiceTemplate {
	id: string;
	label: string;
	description: string;
	risk: ClutchRisk;
	keyStat: keyof Player['core'];
	// Situations this choice can appear in (empty = all situations)
	situations: ClutchSituation[];
	bigSuccessNarrative: string[];
	successNarrative: string[];
	failureNarrative: string[];
	disasterNarrative: string[];
}

//============================================
// Utility functions
function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

// Shuffle array in place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = result[i];
		result[i] = result[j];
		result[j] = temp;
	}
	return result;
}

//============================================
// Situation detection from game context
// Uses score margin as primary axis, with randomized secondary factors
// (field position, time pressure, playoff intensity) for variety.
function deriveSituation(context: ClutchGameContext): ClutchSituation {
	const margin = context.teamScore - context.opponentScore;
	const absMargin = Math.abs(margin);
	const isDefensivePosition = context.positionBucket === 'defender';
	const isKicker = context.positionBucket === 'kicker';

	// Rare final_play trigger (~12% in playoffs, ~5% otherwise)
	// Represents Hail Mary, last-second FG, final defensive stand
	const finalPlayChance = context.isPlayoff ? 0.12 : 0.05;
	if (Math.random() < finalPlayChance) {
		return 'final_play';
	}

	// Kickers get special treatment: red_zone or field goal situations more often
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

	// Random field position flavor: occasionally override with backed_up or red_zone
	// to break the margin-always-determines-situation pattern
	const fieldPositionRoll = Math.random();
	if (fieldPositionRoll < 0.08 && margin <= 0) {
		// Rare backed_up only when trailing or tied (bad punt, penalty, etc.)
		return 'backed_up';
	}
	if (fieldPositionRoll < 0.15 && margin >= -3 && margin <= 3) {
		// Occasional red_zone for very close games only
		return 'red_zone';
	}

	// Primary margin-based logic
	if (margin < -7) {
		// Down big: comeback or occasionally backed_up
		if (Math.random() < 0.2) {
			return 'backed_up';
		}
		return 'comeback_drive';
	}
	if (margin >= -7 && margin < -3) {
		// Down 4-7: mostly comeback, sometimes red_zone if close enough
		if (Math.random() < 0.3) {
			return 'red_zone';
		}
		return 'comeback_drive';
	}
	if (margin >= -3 && margin < 0) {
		// Down 1-3: FG ties or wins. Multiple viable situations.
		const roll = Math.random();
		if (roll < 0.35) {
			return 'red_zone';
		}
		if (roll < 0.55) {
			return 'tie_game';  // feels like a swing moment
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
		// Offense sometimes needs to ice it, sometimes protect
		if (Math.random() < 0.4) {
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
const SITUATION_SCENES: Record<ClutchSituation, (ctx: ClutchGameContext, time: string, fieldPos: string) => string> = {
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
	red_zone: (ctx, time, fieldPos) => {
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

	// Add playoff-specific lines
	const playoffExtras = [
		'The cameras are all on you. National broadcast.',
		'This is playoff football. Every play is magnified.',
		'Scouts and GMs are watching from the press box.',
		'Millions of people are watching this live right now.',
	];

	const pool = pools[situation] ?? pools['tie_game'];
	if (isPlayoff && Math.random() < 0.4) {
		return pickRandom(playoffExtras);
	}
	return pickRandom(pool);
}

//============================================
// Scoring maps by situation (what the score delta "means" narratively)
// Same numeric effect, different framing
interface ScoringMap {
	bigSuccess: number;
	partialSuccess: number;
	failure: number;
	disaster: number;
}

const SCORING_MAPS: Record<ClutchSituation, ScoringMap> = {
	comeback_drive: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	hold_lead: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
	tie_game: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	red_zone: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	backed_up: { bigSuccess: 3, partialSuccess: 0, failure: -3, disaster: -7 },
	must_have_stop: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
	ice_game: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	final_play: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
};

//============================================
// QB choice pools keyed by situation
const ALL_QB_CHOICES: ChoiceTemplate[] = [
	// --- Comeback options ---
	{
		id: 'qb_sideline_zip',
		label: 'Zip one to the sideline',
		description: 'Stop the clock and move the chains.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['comeback_drive'],
		bigSuccessNarrative: [
			'Bullet to the sideline. He steps out at the 10. Clock stops. You are in business!',
			'Perfect out route. Your man gets both feet in and steps out. First and goal!',
		],
		successNarrative: [
			'Quick out to the sideline. Caught. Clock stops. First down.',
			'Sideline throw, clean catch. Chains move and the clock is stopped.',
		],
		failureNarrative: [
			'Sideline throw just out of reach. Incomplete. Clock stops but you lose a down.',
			'He could not get both feet in. Ruled out of bounds. Incomplete.',
		],
		disasterNarrative: [],
	},
	{
		id: 'qb_scramble_comeback',
		label: 'Trust your legs',
		description: 'Scramble and try to make something happen.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'backed_up'],
		bigSuccessNarrative: [
			'You tuck it and run. Juke the linebacker. Spin off the safety. Nobody can catch you! Touchdown!',
			'Scramble drill. You weave through traffic and dive into the end zone!',
		],
		successNarrative: [
			'You take off. Pick up 12 on the scramble. First down.',
			'Nothing open downfield so you run for it. Big gain to the red zone.',
		],
		failureNarrative: [
			'You try to run but the defensive end corrals you. Short gain.',
			'Scrambled right into pressure. Sacked for a loss.',
		],
		disasterNarrative: [
			'You try to make a hero play and the ball gets stripped. Fumble!',
			'Scramble goes wrong. You try to throw on the run and it is intercepted.',
		],
	},
	{
		id: 'qb_deep_shot',
		label: 'Take the deep shot now',
		description: 'One throw could change everything.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive', 'tie_game'],
		bigSuccessNarrative: [
			'You launch it 50 yards. Your receiver runs under it in stride. Touchdown!',
			'Deep ball, double coverage, does not matter. Your arm just made a statement. Touchdown!',
		],
		successNarrative: [
			'Heave to the end zone. Your receiver goes up over the corner. Caught! Touchdown!',
			'Bomb down the sideline. Perfect throw, perfect catch. The crowd erupts.',
		],
		failureNarrative: [
			'Deep ball sails out of bounds. You put too much on it.',
			'Receiver could not get separation. Ball falls incomplete.',
		],
		disasterNarrative: [
			'You heave it deep but the safety reads it all the way. Picked off.',
			'Underthrown deep ball. Corner steps in front. Interception returned to midfield.',
		],
	},
	// --- Hold lead / ice game options ---
	{
		id: 'qb_checkdown_clock',
		label: 'Check down and run the clock',
		description: 'Safe completion. Burn time. Win the game.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Check down to the flat and your back breaks a tackle. First down! Clock is bleeding.',
			'Short throw, the receiver makes a man miss and picks up 15. That might ice it!',
		],
		successNarrative: [
			'Dump pass to the back. He picks up five. First down. Keep the clock moving.',
			'Quick out to the tight end. Eight yards. Chains move. Clock burns.',
			'Short completion underneath. He stays in bounds. Clock keeps running. That is a smart play.',
		],
		failureNarrative: [
			'Short pass batted down at the line. Clock stops.',
			'Check down lands in the dirt. Incomplete. Clock stops.',
		],
		disasterNarrative: [],
	},
	{
		id: 'qb_bootleg',
		label: 'Keep it on a bootleg',
		description: 'Freeze the defense with a fake. Pick up the first if you can.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Play fake sells perfectly. You bootleg left and walk into the end zone! Dagger!',
			'Everyone bites on the run fake. You keep it, turn the corner. Touchdown! Game over!',
		],
		successNarrative: [
			'Bootleg right. Defense bites on the fake. You pick up 10 and slide. First down.',
			'Naked bootleg. Linebacker freezes. You scramble for the first. Clock running.',
		],
		failureNarrative: [
			'The end read it. He did not bite on the fake. You throw it away.',
			'Bootleg got blown up. The corner crashed down. No gain.',
		],
		disasterNarrative: [
			'The defense was not fooled. Sack, fumble. They recover.',
			'You try to force a throw on the run. It is tipped and intercepted!',
		],
	},
	{
		id: 'qb_dagger',
		label: 'Dagger throw over the middle',
		description: 'Put this game away with one strike.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Thread the needle over the middle. Receiver catches it in stride. Touchdown! That is the dagger!',
			'You zip it into a window that barely exists. 35-yard gain. Game. Over.',
		],
		successNarrative: [
			'Over the middle to the tight end. First down at the 20. This might be it.',
			'Seam route. Ball placed perfectly. First down and the clock is running.',
		],
		failureNarrative: [
			'Linebacker dropped into the lane. You throw it away.',
			'Coverage was tighter than you thought. Incomplete.',
		],
		disasterNarrative: [
			'Safety was sitting on that throw. Intercepted! They have new life!',
			'The linebacker read your eyes. Pick! The other team is alive again!',
		],
	},
	// --- Tie game options ---
	{
		id: 'qb_playaction_tie',
		label: 'Trust your read over the middle',
		description: 'If the linebacker bites, the middle opens up.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['tie_game', 'red_zone'],
		bigSuccessNarrative: [
			'Perfect read. The play fake freezes everyone. Wide open in the end zone. Touchdown!',
			'You see the blitz, adjust the protection, and hit the hot route. Walk-in score!',
		],
		successNarrative: [
			'The linebacker bites. Seam route wide open. First down at the 5.',
			'You read the coverage perfectly. Tight end sneaks behind the linebackers. Huge gain.',
		],
		failureNarrative: [
			'Linebacker did not bite. Receiver was blanketed. You throw it away.',
			'Coverage held. The window was never there. Incomplete.',
		],
		disasterNarrative: [
			'Safety read your eyes the whole way. Intercepted!',
			'Linebacker dropped into the passing lane. Pick.',
		],
	},
	// --- Red zone options ---
	{
		id: 'qb_back_shoulder',
		label: 'Back-shoulder fade to the corner',
		description: 'Only your guy can get it. If the throw is right.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'Back shoulder, toe-tap. Only he could catch that. Touchdown!',
			'Perfect placement. The corner never had a chance. Score!',
		],
		successNarrative: [
			'Back shoulder throw, caught at the 1. First and goal.',
			'Fade to the corner of the end zone. Caught! Touchdown!',
		],
		failureNarrative: [
			'Fade falls just out of reach. He got a hand on it but could not hold on.',
			'The corner blanketed him. You had to throw it away.',
		],
		disasterNarrative: [
			'Underthrown fade. The corner turns and picks it off in the end zone.',
			'Safety jumped the route from the back side. Interception.',
		],
	},
	{
		id: 'qb_sneak',
		label: 'QB sneak on the hard count',
		description: 'Catch them jumping. Dive for the line.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'Hard count draws them offside! Free play! You throw it up and your man catches a touchdown!',
			'You catch them on the snap count. Dive forward. Touchdown! Just barely across!',
		],
		successNarrative: [
			'Sneak forward behind the center. Picks up 2. First down.',
			'You dive over the pile. Spot of the ball at the 1. First and goal.',
		],
		failureNarrative: [
			'Sneak stuffed at the line. No gain.',
			'They were ready for it. The pile pushes you back a yard.',
		],
		disasterNarrative: [],
	},
	// --- Backed up options ---
	{
		id: 'qb_escape_pocket',
		label: 'Quick throw to escape pressure',
		description: 'Get rid of it before they get to you.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['backed_up'],
		bigSuccessNarrative: [
			'Quick slant picked up 15. Out of the shadow of your own end zone!',
			'Rapid release. The receiver takes it up the sideline for a huge gain!',
		],
		successNarrative: [
			'Quick out. Caught for 6. First down. You can breathe.',
			'Short throw to the flat. He gets 4 yards and goes out of bounds.',
		],
		failureNarrative: [
			'Quick throw batted at the line. Incomplete.',
			'Nobody was open quick enough. You eat the sack.',
		],
		disasterNarrative: [],
	},
	// --- Must have stop (QB should not appear here, but just in case) ---
	{
		id: 'qb_clutch_audible',
		label: 'Read the defense and audible',
		description: 'You see something. Change the play.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You read the blitz, audible to a screen, and your back takes it to the house!',
			'Perfect audible. They were in the wrong defense. Easy score.',
		],
		successNarrative: [
			'You catch them in a bad look. Audible to the hot route. First down.',
			'The defense showed their hand. You audibled and picked up a big gain.',
		],
		failureNarrative: [
			'The audible confused your own lineman. Play broke down.',
			'You changed the play but the defense adjusted too. No gain.',
		],
		disasterNarrative: [
			'Wrong read on the audible. The corner jumped the route. Interception.',
			'The audible call did not reach the receiver. Miscommunication. Picked off.',
		],
	},
	// --- Final play options ---
	{
		id: 'qb_hail_mary',
		label: 'Hail Mary to the end zone',
		description: 'Heave it as far as you can. Pray somebody comes down with it.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You launch it to the end zone. Bodies everywhere. Your man comes down with it! TOUCHDOWN! The stadium explodes!',
			'Hail Mary from 45 yards out. It hangs in the air forever. Caught in triple coverage. TOUCHDOWN!',
		],
		successNarrative: [
			'Heave to the end zone. Tipped once, tipped twice, and your tight end pulls it in. Score!',
			'You throw it into the pile. Your receiver outfights two defenders. Touchdown!',
		],
		failureNarrative: [
			'Hail Mary launched. A sea of hands. Knocked away. Game over.',
			'You put everything into it. The ball falls through outstretched fingers. That is it.',
		],
		disasterNarrative: [
			'Hail Mary intercepted. The safety was waiting behind everyone. It is over.',
			'Underthrown Hail Mary. Picked off and returned. Final insult.',
		],
	},
	{
		id: 'qb_final_scramble',
		label: 'Scramble and find someone',
		description: 'Buy time. Something might open up.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You scramble left, then right. The defense loses you. You find a man wide open in the end zone. TOUCHDOWN!',
			'Broken play. You roll out, pump fake, and throw across your body. Somehow it gets there. Score!',
		],
		successNarrative: [
			'You scramble and dump it to a crossing route. He takes it inside the 5. Clock runs out but you scored!',
			'Escape the pocket and throw on the run. Caught at the 2. He dives in. Touchdown!',
		],
		failureNarrative: [
			'You scramble but nobody can get open. Time runs out in your hands.',
			'Rolled out but the defense contained you. You throw it away as the clock hits zero.',
		],
		disasterNarrative: [
			'Tried to force one on the run. Intercepted. Heartbreaking way to end it.',
			'Scramble goes wrong. Sacked as time expires.',
		],
	},
];

//============================================
// RB choice pools
const ALL_RB_CHOICES: ChoiceTemplate[] = [
	{
		id: 'rb_follow_blocks',
		label: 'Follow your blockers',
		description: 'Trust the hole. Grind out the yards.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Followed the lead block perfectly and burst through for a 20-yard gain!',
			'The hole opens up and you are gone. First down and then some!',
		],
		successNarrative: [
			'Hit the hole hard. Four yards. First down.',
			'Good eyes through the gap. Picked up six before contact.',
		],
		failureNarrative: [
			'No hole. Stuffed at the line for a one-yard gain.',
			'The blocking broke down. You got what you could.',
		],
		disasterNarrative: [],
	},
	{
		id: 'rb_bounce_outside',
		label: 'Bounce it outside',
		description: 'If you turn the corner, it is open field.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'tie_game', 'hold_lead'],
		bigSuccessNarrative: [
			'Turn the corner and nobody can catch you. Untouched. Touchdown!',
			'You hit the edge at full speed. The safety takes a bad angle. Gone!',
		],
		successNarrative: [
			'Bounce outside, turn the corner. Daylight. Big gain.',
			'Speed to the edge. You outrun the linebacker. First and goal.',
		],
		failureNarrative: [
			'The defensive end set the edge. Tackled for a loss.',
			'Tried to bounce it but the corner was sealed.',
		],
		disasterNarrative: [
			'Tried to reverse field and the ball popped loose. Fumble!',
			'Hit hard at the edge. The ball squirts out. Turnover.',
		],
	},
	{
		id: 'rb_truck',
		label: 'Lower your shoulder',
		description: 'Fight for every inch. Risk the fumble.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive', 'tie_game', 'red_zone'],
		bigSuccessNarrative: [
			'You truck the safety so hard his helmet pops off. Nobody else wants to try. Touchdown!',
			'Three defenders bounce off you as you power into the end zone!',
		],
		successNarrative: [
			'You lower the boom on the linebacker. He goes backwards. First down.',
			'Contact at the five. You drive your legs. They cannot bring you down.',
		],
		failureNarrative: [
			'Lowered the shoulder but the pile pushed you back. No gain.',
			'Met at the line by the whole front. Stuffed.',
		],
		disasterNarrative: [
			'The hit jars the ball loose. Fumble. Defense recovers.',
			'Massive shot. Ball pops out. Turnover.',
		],
	},
	{
		id: 'rb_cutback',
		label: 'Cut back against the grain',
		description: 'The defense is flowing one way. Go the other.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['comeback_drive', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'Cutback lane is wide open! You reverse field and nobody is home. Touchdown!',
			'One sharp cut and you split the defense. Gone for a huge gain!',
		],
		successNarrative: [
			'Great read. You plant and cut back. 8 yards the other way. First down.',
			'The defense overflowed. You cut back and picked up a big chunk.',
		],
		failureNarrative: [
			'You tried to cut back but the backside end stayed home. Loss of 2.',
			'Cutback went nowhere. The linebacker was waiting.',
		],
		disasterNarrative: [
			'Tried to reverse field and got hit from behind. Ball comes loose. Fumble!',
			'The cutback left you exposed. Big hit. Fumble recovered by the defense.',
		],
	},
	{
		id: 'rb_leap',
		label: 'Leap over the pile',
		description: 'Go airborne. Land in the end zone or land on your back.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'You go airborne! Leap over the entire pile and land in the end zone! Touchdown! Unbelievable!',
			'Hurdled the whole defensive line. The crowd cannot believe what they just saw. Score!',
		],
		successNarrative: [
			'You dive over the top. Reaches the ball across the goal line. Touchdown!',
			'Leap at the pile. You stretch the ball over. Just barely in!',
		],
		failureNarrative: [
			'You tried to go over but got caught in the pile. No gain.',
			'Leap came up short. Stuffed at the line.',
		],
		disasterNarrative: [
			'You went airborne but the ball got knocked out at the peak. Fumble! Opponent recovers!',
			'Tried to leap and got upended. Hit the ground hard. Ball squirts free. Turnover.',
		],
	},
	{
		id: 'rb_clock_grind',
		label: 'Take what they give you',
		description: 'Run hard between the tackles. Eat clock.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Simple run. But the hole was massive. 15 yards. That might be the dagger!',
			'Straight ahead, breaks one tackle, second level is empty. First down!',
		],
		successNarrative: [
			'Three yards. Clock running. Exactly what the coach wanted.',
			'Runs between the tackles for 4. First down. The defense is gassed.',
			'Gain of 3. He stays in bounds. Another 40 seconds drained. That might be enough.',
		],
		failureNarrative: [
			'Stuffed for one. But the clock keeps ticking.',
			'No hole. Gain of nothing. But 30 seconds burned off the clock.',
		],
		disasterNarrative: [],
	},
	// --- Final play ---
	{
		id: 'rb_dive_for_pylon',
		label: 'Dive for the pylon',
		description: 'Last play. Stretch the ball out. Reach for it.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You stretch the ball out as you dive. The tip of the ball crosses the plane. TOUCHDOWN! Review confirms it!',
			'Full extension dive. The ball touches the pylon before your knee is down. Score! Game over!',
		],
		successNarrative: [
			'You dive and reach. The ball breaks the plane by an inch. Touchdown!',
			'Stretch play. You extend with everything. The ref signals touchdown!',
		],
		failureNarrative: [
			'You dive but they stop you a yard short. Ball at the 1. But time has expired.',
			'Reached for the pylon but the safety knocked you out of bounds at the 2.',
		],
		disasterNarrative: [
			'Dive for the pylon and the ball gets knocked loose. Fumble as time expires.',
			'Tried to extend but the ball was stripped at the goal line. Heartbreak.',
		],
	},
];

//============================================
// WR/TE choice pools
const ALL_WR_CHOICES: ChoiceTemplate[] = [
	{
		id: 'wr_crisp_route',
		label: 'Run a crisp route',
		description: 'Make the catch. Secure the ball.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['comeback_drive', 'tie_game', 'hold_lead'],
		bigSuccessNarrative: [
			'Route so crisp the defender slips. Easy catch, easy score!',
			'Perfect route. You waltz into the end zone untouched.',
		],
		successNarrative: [
			'Sharp cut. Clean catch. First down.',
			'Textbook route. The ball hits you right in the numbers.',
		],
		failureNarrative: [
			'Good route but the ball was just off your fingertips.',
			'You got open but the throw was behind you.',
		],
		disasterNarrative: [],
	},
	{
		id: 'wr_double_move',
		label: 'Sell the double move',
		description: 'Fake the out, break inside. If he bites, you are gone.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['comeback_drive', 'tie_game'],
		bigSuccessNarrative: [
			'The corner bites on the first move. Five yards clear. Catch in stride. Touchdown!',
			'Double move worked perfectly. Safety bit, corner lost. Easy touchdown.',
		],
		successNarrative: [
			'Double move fools the corner. Wide open down the seam.',
			'Pump fake freezes the safety. You blow past him. Big gain.',
		],
		failureNarrative: [
			'The corner did not bite. He stayed on your hip.',
			'Safety read it. Double coverage. Ball thrown away.',
		],
		disasterNarrative: [
			'Corner jumped the inside break. Stepped right in front. Interception.',
			'Safety read the route combo. Tipped ball, intercepted.',
		],
	},
	{
		id: 'wr_contested',
		label: 'Go up and get it',
		description: 'Contested ball. You or him.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'red_zone', 'tie_game'],
		bigSuccessNarrative: [
			'You outjump the corner by a foot. One-handed grab in the end zone!',
			'Moss the defender. Catch of the year. Stadium goes crazy. Touchdown!',
		],
		successNarrative: [
			'Jump ball in traffic. You rip it away from the defender. First down.',
			'Contested catch at the sideline. You highpoint the ball. Incredible.',
		],
		failureNarrative: [
			'Went up but the defender knocked it away.',
			'Could not come down with it. The corner made a good play.',
		],
		disasterNarrative: [
			'Went up but the ball deflected right to the safety. Pick.',
			'Tipped at the highest point. Falls into the defender hands.',
		],
	},
	{
		id: 'wr_toe_tap',
		label: 'Toe-tap at the sideline',
		description: 'Get both feet in. That is all that matters.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['comeback_drive', 'red_zone', 'hold_lead'],
		bigSuccessNarrative: [
			'Toe-tap, both feet down, catches it falling out of bounds in the end zone! Touchdown!',
			'Unbelievable body control. He gets both feet in at the sideline. Score!',
		],
		successNarrative: [
			'Sideline catch. Both feet in. First down. Reviewed and confirmed.',
			'Toe-tap along the boundary. Great body awareness. Chains move.',
		],
		failureNarrative: [
			'One foot on the line. Ruled out of bounds. Incomplete.',
			'Great catch but the replay shows the toe was on the white. Incomplete.',
		],
		disasterNarrative: [],
	},
	{
		id: 'wr_yac',
		label: 'Catch and create after the catch',
		description: 'Catch the short one and make them miss.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['hold_lead', 'ice_game', 'tie_game'],
		bigSuccessNarrative: [
			'Short catch, spin move, broken tackle. He is gone! Touchdown!',
			'Catches the slant and turns on the jets. 40 yards after the catch!',
		],
		successNarrative: [
			'Quick slant, catch, and a nice move. 12 yards after the catch.',
			'Short throw, makes one guy miss, picks up 15. First down.',
		],
		failureNarrative: [
			'Caught it but immediately tackled. 2-yard gain.',
			'Short throw but the corner closed fast. No room to work.',
		],
		disasterNarrative: [
			'Caught it but the hit came immediately. Ball jarred loose. Fumble!',
			'Made the catch but got stripped going upfield. Turnover.',
		],
	},
	{
		id: 'wr_block_and_seal',
		label: 'Seal your man and spring the runner',
		description: 'You might not touch the ball, but you can spring the play.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Devastating block at the point of attack. The runner goes 20 yards!',
			'You pancake the corner. Your back goes untouched into the end zone!',
		],
		successNarrative: [
			'Clean block on the edge. The runner picks up the first down.',
			'Good seal block. Your man gets 5 yards thanks to you.',
		],
		failureNarrative: [
			'You tried to block but the defender slipped off. No impact.',
			'Your man fought through the block and made the tackle.',
		],
		disasterNarrative: [],
	},
	// --- Final play ---
	{
		id: 'wr_hail_mary_jump',
		label: 'Win the jump ball in the end zone',
		description: 'The ball is coming your way. Outfight everyone for it.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'The Hail Mary comes down. Three defenders around you. You rip it out of the air. TOUCHDOWN!',
			'You climb the ladder and snatch it at the highest point. Nobody can believe it. Score!',
		],
		successNarrative: [
			'The ball bounces off a defender hands right to you. You pull it in. Touchdown!',
			'You fight for position and come down with the tip. Reviewed and confirmed. Score!',
		],
		failureNarrative: [
			'You went up for it but the defender tipped it away. Game over.',
			'Jostling in the end zone. The ball falls through your hands. That is the season.',
		],
		disasterNarrative: [
			'You went up but the safety snatched it right over you. Intercepted.',
			'The ball bounced off your hands to a defender. Picked off as time expires.',
		],
	},
];

//============================================
// Lineman choice pools (OL/DL)
const ALL_LINEMAN_CHOICES: ChoiceTemplate[] = [
	{
		id: 'line_hold_assignment',
		label: 'Hold your assignment',
		description: 'Stay home. Do your job.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'Dominant block. You pancake your man and the runner walks in!',
			'You seal the edge so clean the back does not even get touched.',
		],
		successNarrative: [
			'Solid block. Your man goes nowhere. The play works.',
			'You hold the edge. The runner finds a lane. First down.',
		],
		failureNarrative: [
			'Held your ground but the play was designed the other way.',
			'Good block but the play got blown up elsewhere.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_double_team',
		label: 'Double the star pass rusher',
		description: 'Take their best player out of the play entirely.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['comeback_drive', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'You drive their star five yards off the ball. The QB has forever. Touchdown pass!',
			'Total domination at the point of attack. Score!',
		],
		successNarrative: [
			'Double team seals their best player. The QB has all day.',
			'You and the guard crush the defensive end. Play works perfectly.',
		],
		failureNarrative: [
			'He split the double team. Got a hand on the quarterback.',
			'Tried the combo block but the stunt confused you.',
		],
		disasterNarrative: [
			'He blew through both of you. Strip sack!',
			'Double team whiffed completely. Free rusher. Sack and fumble.',
		],
	},
	{
		id: 'line_shoot_gap',
		label: 'Shoot the gap',
		description: 'Guess right and it is a huge play. Guess wrong, disaster.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'Timed it perfectly. You hit the runner so hard the ball pops out. Fumble recovery!',
			'You explode through the gap. Sack! Momentum swing!',
		],
		successNarrative: [
			'You fire into the backfield. Hit the runner behind the line.',
			'Right gap, right time. You blow up the play.',
		],
		failureNarrative: [
			'Wrong gap. They ran right past where you were.',
			'You guessed run but it was a pass.',
		],
		disasterNarrative: [
			'You bit hard and left a gaping hole. Walk-in touchdown.',
			'Completely wrong read. They go 40 yards through the gap you abandoned.',
		],
	},
	{
		id: 'line_pull_and_lead',
		label: 'Pull and lead the way',
		description: 'Get out in space and pave a path.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'red_zone', 'hold_lead'],
		bigSuccessNarrative: [
			'You pull around and obliterate the linebacker. Your back walks in!',
			'Perfect pull. You flatten the safety at the second level. Touchdown run!',
		],
		successNarrative: [
			'You pull and get a clean block at the second level. Big gain.',
			'Lead block around the edge. The runner follows you for 10.',
		],
		failureNarrative: [
			'You got out in space but whiffed on the block.',
			'The linebacker was faster than you. He made the tackle before you got there.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_drive_block',
		label: 'Drive block straight ahead',
		description: 'Move the pile. Create a crease.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['red_zone', 'hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'You drive your man back 5 yards. The runner walks through untouched!',
			'Pancake block! Your man is flat on his back. The play goes for a score!',
		],
		successNarrative: [
			'Good push at the point of attack. The runner picks up 3.',
			'You move the pile. Just enough for a first down.',
		],
		failureNarrative: [
			'Stalemate at the line. No push.',
			'He anchored and held his ground. No crease to speak of.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_swim_move',
		label: 'Hit him with the swim move',
		description: 'Get around the blocker with technique.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['must_have_stop', 'comeback_drive'],
		bigSuccessNarrative: [
			'Beautiful swim move. You are past the tackle. Sack! The ball comes out! Fumble!',
			'He never saw it coming. You swim past him and hit the QB. Strip sack!',
		],
		successNarrative: [
			'Swim move works. You get pressure on the quarterback. Incomplete pass.',
			'You beat the tackle clean. Sack! Third and long.',
		],
		failureNarrative: [
			'He caught your arm on the swim. You are locked up.',
			'Tried the swim but he recovered. No pressure.',
		],
		disasterNarrative: [
			'You committed too hard on the move. Screen pass goes right where you were. Big gain.',
			'Swim move left the lane open. Runner goes right past you.',
		],
	},
	// --- Final play ---
	{
		id: 'line_goal_line_trench',
		label: 'Win the trench battle at the goal line',
		description: 'Last play. Move the pile or hold the line.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You drive your man back and create a crease. Your runner dives through. TOUCHDOWN!',
			'Absolute domination at the point of attack. The pile moves forward. Score!',
		],
		successNarrative: [
			'You hold the line. No penetration. Your runner finds a gap. He is in!',
			'You win the leverage battle. Just enough push. Touchdown.',
		],
		failureNarrative: [
			'Stalemate at the goal line. The pile goes nowhere. Game over.',
			'You push but they push back harder. Stuffed at the line.',
		],
		disasterNarrative: [
			'You get driven back into your own runner. Fumble at the goal line!',
			'The defense blows through the line. Strip sack on the final play.',
		],
	},
];

//============================================
// Defender choice pools (LB/CB/S)
const ALL_DEFENDER_CHOICES: ChoiceTemplate[] = [
	{
		id: 'def_stay_zone',
		label: 'Stay in your zone',
		description: 'Do not get beat deep. Make them earn it underneath.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['must_have_stop', 'hold_lead', 'tie_game'],
		bigSuccessNarrative: [
			'Your zone discipline forces a bad throw. You undercut it and pick it off!',
			'Patient in coverage. The QB throws right into your zone. Interception!',
		],
		successNarrative: [
			'You stay home and make the tackle. Short gain. They have to punt.',
			'Textbook zone coverage. Nothing open. They settle for a check down. Fourth down.',
			'You take away the deep ball. They gain three underneath. Not enough. Punt team comes on.',
		],
		failureNarrative: [
			'You stayed back but they dink-and-dunked past you. First down.',
			'Conservative coverage. They moved the chains underneath.',
			'You gave too much cushion. Short throw, easy catch, first down.',
		],
		disasterNarrative: [],
	},
	{
		id: 'def_jump_route',
		label: 'Jump the route',
		description: 'You have seen this formation before. If you are right, it is a pick.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You jump the route before the ball is even out. Pick six! Touchdown!',
			'Intercepted and nothing but open field ahead. You take it all the way back!',
		],
		successNarrative: [
			'You read the QB eyes and jump the slant. Interception!',
			'Film study pays off. You knew that route was coming. Pick.',
		],
		failureNarrative: [
			'You jumped early but it was a pump fake. The receiver ran past you.',
			'Guessed wrong. They hit the crossing route behind you.',
		],
		disasterNarrative: [
			'You bit on the fake. Wide open receiver behind you. Touchdown!',
			'Jumped the wrong route. Your man caught it in stride. Easy score.',
		],
	},
	{
		id: 'def_blitz',
		label: 'Sell out on the blitz',
		description: 'Get there or get burned. No middle ground.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['must_have_stop', 'tie_game'],
		bigSuccessNarrative: [
			'Blind side hit! The ball pops out. You fall on it! Fumble recovery!',
			'You get there and he never sees you coming. Strip sack!',
		],
		successNarrative: [
			'Blitz gets home! You hit the QB as he throws. Incomplete.',
			'Untouched off the edge. Sack! Third and long.',
		],
		failureNarrative: [
			'Blitz picked up. QB steps up clean and finds the open man.',
			'You got blocked at the line. They had the hot route ready.',
		],
		disasterNarrative: [
			'They saw the blitz. Quick screen. Your man scores untouched.',
			'Blitz left the middle wide open. Touchdown.',
		],
	},
	{
		id: 'def_tackle_for_loss',
		label: 'Read and react downhill',
		description: 'Trust your eyes. If it is a run, blow it up.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['must_have_stop', 'hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'You read run perfectly. Tackle for loss! The runner fumbles! Your ball!',
			'You shoot the gap. Blow up the play in the backfield. Turnover on downs!',
		],
		successNarrative: [
			'You key on the guard and fill the hole. Runner goes nowhere. They face 4th and long.',
			'Textbook run fit. Tackle for a loss of 2. Third and long.',
			'You read the mesh point and crash the handoff. Stopped for no gain. Punt unit jogs on.',
		],
		failureNarrative: [
			'It was a pass all along. You are out of position.',
			'Read run but the play action fooled you. Tight end is open behind you.',
		],
		disasterNarrative: [
			'You crashed too hard on the run fake. Play action, wide open man, touchdown.',
			'Committed to the run stop. Screen pass goes right past you for a huge gain.',
		],
	},
	{
		id: 'def_press_coverage',
		label: 'Press at the line and jam him',
		description: 'Disrupt the timing. Get physical.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['must_have_stop', 'hold_lead', 'backed_up'],
		bigSuccessNarrative: [
			'You jam him at the line and the timing is completely off. QB panics and throws it away.',
			'Press coverage. He cannot get off the line. QB holds it too long. Sack!',
		],
		successNarrative: [
			'Good jam at the line. The throw is late. Incomplete.',
			'You get hands on him and slow his release. The QB throws it elsewhere.',
		],
		failureNarrative: [
			'He got off the press with a swim move. Got behind you.',
			'Tried to jam but he was too quick. He is open underneath.',
		],
		disasterNarrative: [],
	},
	{
		id: 'def_disguise_coverage',
		label: 'Disguise your coverage and bait the throw',
		description: 'Show one look, play another. Make the QB guess wrong.',
		risk: 'heroic',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You disguise Cover 2 as Cover 0. The QB throws right to you. Pick six!',
			'Showed blitz, dropped back. He threw it right where you ended up. Interception!',
		],
		successNarrative: [
			'Your disguise worked. The QB hesitated. Sack by your teammate.',
			'Showed man, played zone. The throw goes to nobody. Incomplete.',
		],
		failureNarrative: [
			'The QB saw through the disguise. He found the soft spot.',
			'Your trick did not work. He audibled to the right play.',
		],
		disasterNarrative: [
			'Your disguise backfired. You were in no man is land. Easy touchdown.',
			'The receiver ran right through the seam your disguise created. Score.',
		],
	},
	// --- Final play ---
	{
		id: 'def_goal_line_stand',
		label: 'Sell out for the goal line stand',
		description: 'Last play. They need one yard. Do not let them get it.',
		risk: 'heroic',
		keyStat: 'discipline',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You plug the hole and stop the runner cold. Goal line stand! The defense wins the game!',
			'You meet the runner at the line. He goes nowhere. Denied! What a stop!',
		],
		successNarrative: [
			'You fill the gap. He tries to leap but you swat him down. Stuffed at the 1.',
			'The whole defense rallies. You make the tackle. No score. Game over. You win.',
		],
		failureNarrative: [
			'He dives over the pile. The ball crosses the plane. Touchdown. They win.',
			'You had the angle but he slipped through your hands. Score. Game over.',
		],
		disasterNarrative: [
			'You overcommit and he bounces outside. Nobody is there. Walk-in touchdown.',
			'You crash inside and the QB keeps it on the read option. Wide open. Touchdown.',
		],
	},
	{
		id: 'def_final_strip',
		label: 'Go for the strip',
		description: 'Last chance. Rip that ball out.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You punch the ball out at the 3-yard line! Your teammate dives on it! Game over!',
			'Strip! The ball comes loose! Fumble recovery! What a play to end the game!',
		],
		successNarrative: [
			'You tackle him and the ball comes loose. Reviewed. Fumble before crossing the line. Your ball!',
			'You rip at the ball as he reaches. It pops out. Down by contact, but he was short. Game over.',
		],
		failureNarrative: [
			'You went for the strip instead of the tackle. He keeps his feet and scores.',
			'Tried to punch it out but he held on. Touchdown. You should have just tackled him.',
		],
		disasterNarrative: [
			'You whiffed on the strip. He walks in untouched. Not even close.',
			'Your strip attempt was a swing and a miss. Easy score.',
		],
	},
];

//============================================
// Kicker choice pools
const ALL_KICKER_CHOICES: ChoiceTemplate[] = [
	{
		id: 'kick_routine',
		label: 'Trust your normal swing',
		description: 'Routine kick. Nail the fundamentals.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['tie_game', 'comeback_drive', 'hold_lead'],
		bigSuccessNarrative: [
			'Absolutely crushed it. Good from 32 and it would have been good from 52.',
			'Pure stroke. Right through the middle with room to spare.',
		],
		successNarrative: [
			'Right down the middle. Good. Three points.',
			'Smooth approach, clean contact. Splits the uprights.',
		],
		failureNarrative: [
			'Pulled it left. The kick hooks wide. No good.',
			'Short approach felt off. Drifts wide right.',
		],
		disasterNarrative: [],
	},
	{
		id: 'kick_low_drive',
		label: 'Drive it low and hard',
		description: 'Line drive into the wind. Gutsy.',
		risk: 'balanced',
		keyStat: 'confidence',
		situations: ['tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'Low rocket right through the rush. Good! Absolutely fearless in the wind.',
			'Knuckleball through the uprights. The wind could not touch it.',
		],
		successNarrative: [
			'Low line drive just clears the crossbar. Good!',
			'Drilled it hard and flat. Barely clears the rush but it is through.',
		],
		failureNarrative: [
			'Too low. Blocked at the line of scrimmage.',
			'Line drive hits the upright. Bounces back. No good.',
		],
		disasterNarrative: [
			'Blocked! Defense scoops it up and returns it for a touchdown!',
			'The kick is blocked and recovered in the end zone. Touchdown!',
		],
	},
	{
		id: 'kick_long_bomb',
		label: 'Go for the long bomb',
		description: '50+ yards. Career-defining or career-haunting.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'54 yards. Right down the pipe. Ice in his veins! Stadium erupts!',
			'From 56 yards out... he hammers it... GOOD! Career-best!',
		],
		successNarrative: [
			'From 52 yards... it has the distance... it is good! Barely.',
			'Long attempt. The kick is up... and it sneaks inside the left upright.',
		],
		failureNarrative: [
			'Long attempt falls short. Did not have the leg.',
			'From 53... no good. Drifts wide as it fades.',
		],
		disasterNarrative: [
			'Way short! Defense fields it and runs it back.',
			'Shanked it badly. The return man picks it up with room to run.',
		],
	},
	{
		id: 'kick_onside',
		label: 'Attempt an onside kick',
		description: 'You need the ball back. All or nothing.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive'],
		bigSuccessNarrative: [
			'Onside kick! It bounces off a defender and your team recovers! You have the ball back!',
			'Perfect top-spin. It hops right into your teammate hands. Recovered!',
		],
		successNarrative: [
			'Onside kick, chaotic scramble. Your team dives on it! Recovered!',
			'Risky onside kick. The ball takes a crazy bounce but your team gets it!',
		],
		failureNarrative: [
			'The opposing team was ready for it. They recover easily.',
			'Onside kick goes right to their front line. No chance.',
		],
		disasterNarrative: [
			'Onside kick squibs and the returner picks it up. Returned for a touchdown!',
			'Everyone saw it coming. They grab it and run it back. Disaster.',
		],
	},
	{
		id: 'kick_pin_deep',
		label: 'Pin them deep with a coffin corner',
		description: 'Punt it out of bounds inside the 10.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Perfect coffin corner. The ball goes out at the 2. They are buried.',
			'Pinpoint punt. It rolls dead at the 3-yard line. Your defense loves you.',
		],
		successNarrative: [
			'Good punt. Rolls out of bounds at the 8. Long field for them.',
			'Solid coffin corner kick. They start at the 12.',
		],
		failureNarrative: [
			'Tried to pin them but the punt went into the end zone. Touchback at the 25.',
			'Angled kick was too strong. Through the end zone for a touchback.',
		],
		disasterNarrative: [
			'Shanked it! The punt goes 15 yards. They have great field position.',
			'The coffin corner kick veers badly. Returned to midfield.',
		],
	},
	// --- Final play ---
	{
		id: 'kick_game_winner',
		label: 'Game-winning field goal',
		description: 'This is the kick. Make it and you are a hero. Miss it and...',
		risk: 'balanced',
		keyStat: 'confidence',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'The snap is good. The hold is down. You swing through it. GOOD! Game winner! Your teammates tackle you!',
			'Right down the pipe. No doubt about it. The kick is GOOD! You just won the game!',
		],
		successNarrative: [
			'It barely clears the crossbar. Good! You win! The sideline erupts.',
			'Hooks at the last second but sneaks inside the upright. Good! What a finish!',
		],
		failureNarrative: [
			'You push it right. The kick drifts wide. No good. Season over.',
			'It had the distance but not the direction. Wide left. Game over.',
		],
		disasterNarrative: [
			'Blocked! The kick is blocked and returned! They score! Unbelievable ending.',
			'You shank it completely. Not even close. The other team storms the field.',
		],
	},
	{
		id: 'kick_block_attempt',
		label: 'Get a hand on it',
		description: 'They are kicking for the win. Time your jump.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You get a hand on it! Blocked! The kick is no good! You saved the game!',
			'Perfect timing! You leap and deflect the kick! The bench goes wild!',
		],
		successNarrative: [
			'You get enough of a push to disrupt the timing. The kick hooks wide. No good!',
			'You tip the kick just enough. It falls short of the crossbar. You survive!',
		],
		failureNarrative: [
			'You time the jump but the ball sails over your fingertips. Good. They win.',
			'You tried to get there but the holder got it down clean. The kick splits the uprights.',
		],
		disasterNarrative: [
			'You jumped offsides. Penalty. They move up 5 yards and kick the easy winner.',
			'Roughing the kicker. First down. They run out the clock and win.',
		],
	},
];

//============================================
// Map position buckets to their full choice pools
function getChoicePool(
	positionBucket: PositionBucket | null,
	position: Position | null,
): ChoiceTemplate[] {
	if (!positionBucket) {
		return ALL_DEFENDER_CHOICES;
	}
	switch (positionBucket) {
		case 'passer':
			return ALL_QB_CHOICES;
		case 'runner_receiver':
			if (position === 'RB') {
				return ALL_RB_CHOICES;
			}
			return ALL_WR_CHOICES;
		case 'lineman':
			return ALL_LINEMAN_CHOICES;
		case 'defender':
			return ALL_DEFENDER_CHOICES;
		case 'kicker':
			return ALL_KICKER_CHOICES;
		default:
			return ALL_DEFENDER_CHOICES;
	}
}

//============================================
// Pick 3 choices with risk spread from the pool
// Filters by situation first, then picks one per risk tier if possible,
// backfilling from any-risk if a tier is empty.
function pickThreeWithRiskSpread(
	pool: ChoiceTemplate[],
	situation: ClutchSituation,
): ChoiceTemplate[] {
	// Filter to choices that match this situation (or have empty situations = all)
	const eligible = pool.filter(c =>
		c.situations.length === 0 || c.situations.includes(situation)
	);

	// Separate by risk tier
	const safes = shuffle(eligible.filter(c => c.risk === 'safe'));
	const balanceds = shuffle(eligible.filter(c => c.risk === 'balanced'));
	const heroics = shuffle(eligible.filter(c => c.risk === 'heroic'));

	const picked: ChoiceTemplate[] = [];

	// Pick one from each tier if available
	if (safes.length > 0) {
		picked.push(safes[0]);
	}
	if (balanceds.length > 0) {
		picked.push(balanceds[0]);
	}
	if (heroics.length > 0) {
		picked.push(heroics[0]);
	}

	// If we still need more (some tier was empty), fill from leftover eligible
	if (picked.length < 3) {
		const pickedIds = new Set(picked.map(c => c.id));
		const leftovers = shuffle(eligible.filter(c => !pickedIds.has(c.id)));
		for (const leftover of leftovers) {
			if (picked.length >= 3) {
				break;
			}
			picked.push(leftover);
		}
	}

	// If we still do not have 3 (not enough situation-specific choices), pull from all
	if (picked.length < 3) {
		const pickedIds = new Set(picked.map(c => c.id));
		const fallbacks = shuffle(pool.filter(c => !pickedIds.has(c.id)));
		for (const fallback of fallbacks) {
			if (picked.length >= 3) {
				break;
			}
			picked.push(fallback);
		}
	}

	return picked;
}

//============================================
// Post-play spotlight text by outcome tier
const SPOTLIGHT_BIG_SUCCESS: string[] = [
	'Your teammates mob you on the sideline.',
	'The student section starts chanting your name.',
	'Scouts in attendance take notice.',
	'Local papers will talk about that one all week.',
	'The bench erupts. That was a statement.',
	'Your coach is pumping his fist on the sideline.',
	'That might be the play people remember from this season.',
	'The crowd is going absolutely berserk.',
];

const SPOTLIGHT_PARTIAL_SUCCESS: string[] = [
	'Your coach gives you a nod. Job done.',
	'Not flashy, but effective.',
	'Quiet confidence. You did your job.',
	'The sideline gives you a few claps.',
	'Smart play. Exactly what was needed.',
	'The veterans on the bench approve. That was the right call.',
];

const SPOTLIGHT_FAILURE: string[] = [
	'You jog to the sideline, head down.',
	'The crowd groans.',
	'Coach pats you on the helmet. Next play.',
	'Tough break. Nothing you can do about it now.',
	'You shake it off. Football is a next-play game.',
	'Nobody says anything as you come off the field.',
];

const SPOTLIGHT_DISASTER: string[] = [
	'The opposing sideline erupts.',
	'Your coach slams his clipboard.',
	'Silence from your sideline. Nobody makes eye contact.',
	'The crowd turns on you. That one stings.',
	'You wish you could take that one back.',
	'The replay on the jumbotron makes it worse.',
];

//============================================
// Legacy tag generators based on outcome quality
function generateLegacyTag(
	situation: ClutchSituation,
	risk: ClutchRisk,
	success: boolean,
	isBigSuccess: boolean,
	isPlayoff: boolean,
): string {
	// Final play moments are always memorable if big success or disaster
	if (situation === 'final_play') {
		if (isBigSuccess) {
			if (isPlayoff) {
				return 'Won the game on the final play of a playoff game. Instant legend.';
			}
			return 'Won the game on the very last play. A moment nobody will forget.';
		}
		if (!success && risk === 'heroic') {
			if (isPlayoff) {
				return 'The final play of a playoff game went wrong. A memory that will linger.';
			}
			return 'The last play failed. A tough way to end a game.';
		}
		return '';
	}

	// Heroic big successes are always signature moments
	if (isBigSuccess && risk === 'heroic') {
		if (isPlayoff) {
			return 'Playoff heroics: a career-defining play under the brightest lights.';
		}
		if (situation === 'comeback_drive') {
			return 'Led a clutch comeback drive that will be talked about all season.';
		}
		if (situation === 'tie_game') {
			return 'Made the play that broke the tie when it mattered most.';
		}
		return 'Delivered a signature moment on the biggest stage.';
	}

	// Balanced big successes only logged in playoffs (not safe -- safe is routine)
	if (isBigSuccess && risk === 'balanced' && isPlayoff) {
		return 'Came up big in the playoffs.';
	}

	// Heroic disasters in playoffs are memorable for the wrong reasons
	if (!success && risk === 'heroic' && isPlayoff) {
		return 'A costly gamble in the playoffs that backfired.';
	}
	return '';
}

//============================================
// Reputation text shown after resolution (for career tracking)
function getReputationText(player: Player, momentumTag: MomentumTag): string {
	if (momentumTag !== 'heroic') {
		return '';
	}
	// Check milestone flags set by trackClutchOutcome
	if (player.storyFlags['clutch_wins_5']) {
		return 'They call you Mr. Clutch now. The reputation is cemented.';
	}
	if (player.storyFlags['clutch_wins_3']) {
		return 'You are building a reputation for late-game poise.';
	}
	if (player.storyFlags['clutch_total_5']) {
		return 'People are starting to call you a big-game player.';
	}
	if (player.storyFlags['clutch_total_3']) {
		return 'You have been here before. The big moments do not scare you.';
	}
	return '';
}

//============================================
// Check if a clutch moment should trigger
function shouldTrigger(context: ClutchGameContext): boolean {
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

//============================================
// Generate the scene text with situation-specific framing
function generateScene(
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
// PUBLIC API: Build a clutch moment if eligible
export function buildClutchMoment(
	player: Player,
	context: ClutchGameContext,
): ClutchMoment | null {
	if (!shouldTrigger(context)) {
		return null;
	}

	// Derive situation from game state
	const situation = deriveSituation(context);

	// Get position-specific choice pool and pick 3 with risk spread
	const pool = getChoicePool(context.positionBucket, context.position);
	const templates = pickThreeWithRiskSpread(pool, situation);

	// Safety: if no choices available, skip the clutch moment
	if (templates.length === 0) {
		return null;
	}

	const choices: ClutchChoice[] = templates.map(t => ({
		id: t.id,
		label: t.label,
		description: t.description,
		risk: t.risk,
		keyStat: t.keyStat,
	}));

	const scene = generateScene(context, situation);
	return { scene, situationType: situation, choices };
}

//============================================
// PUBLIC API: Resolve a clutch moment choice
export function resolveClutchMoment(
	player: Player,
	context: ClutchGameContext,
	choiceId: string,
	situationOverride?: ClutchSituation,
): ClutchResult {
	// Use the override if provided (preserves the situation from buildClutchMoment)
	const situation = situationOverride ?? deriveSituation(context);

	// Find the matching choice template from the full pool
	const pool = getChoicePool(context.positionBucket, context.position);
	const template = pool.find(t => t.id === choiceId);
	if (!template) {
		return {
			success: false,
			points: 0,
			narrative: 'The play breaks down. Nothing happens.',
			spotlightText: 'The drive stalls.',
			momentumTag: 'costly',
			situationType: situation,
			legacyTag: '',
		};
	}

	// Calculate success probability
	const statValue = player.core[template.keyStat];
	const baseRate = BASE_RATES[template.risk];
	const statBonus = (statValue - 50) * 0.01;
	const successChance = clamp(baseRate + statBonus, 0.10, 0.95);

	// Get situation-specific scoring
	const scoring = SCORING_MAPS[situation];

	// Roll for outcome
	const roll = Math.random();

	if (roll < successChance) {
		// Success zone
		if (roll < successChance - 0.15 && template.bigSuccessNarrative.length > 0) {
			// Big success
			const narrative = pickRandom(template.bigSuccessNarrative);
			const spotlight = pickRandom(SPOTLIGHT_BIG_SUCCESS);
			const legacyTag = generateLegacyTag(
				situation, template.risk, true, true, context.isPlayoff,
			);
			const reputationLine = getReputationText(player, 'heroic');
			const fullSpotlight = reputationLine
				? `${spotlight} ${reputationLine}`
				: spotlight;
			// Track clutch stats on the player
			trackClutchOutcome(player, true);
			return {
				success: true,
				points: scoring.bigSuccess,
				narrative,
				spotlightText: fullSpotlight,
				momentumTag: 'heroic',
				situationType: situation,
				legacyTag,
			};
		}
		// Partial success
		const narrative = pickRandom(template.successNarrative);
		const spotlight = pickRandom(SPOTLIGHT_PARTIAL_SUCCESS);
		trackClutchOutcome(player, true);
		return {
			success: true,
			points: scoring.partialSuccess,
			narrative,
			spotlightText: spotlight,
			momentumTag: 'steady',
			situationType: situation,
			legacyTag: '',
		};
	}

	// Failure zone
	if (template.risk === 'heroic'
		&& roll > successChance + 0.20
		&& template.disasterNarrative.length > 0
	) {
		// Disaster
		const narrative = pickRandom(template.disasterNarrative);
		const spotlight = pickRandom(SPOTLIGHT_DISASTER);
		const legacyTag = generateLegacyTag(
			situation, template.risk, false, false, context.isPlayoff,
		);
		trackClutchOutcome(player, false);
		return {
			success: false,
			points: scoring.disaster,
			narrative,
			spotlightText: spotlight,
			momentumTag: 'costly',
			situationType: situation,
			legacyTag,
		};
	}

	// Normal failure
	const narrative = pickRandom(template.failureNarrative);
	const spotlight = pickRandom(SPOTLIGHT_FAILURE);
	trackClutchOutcome(player, false);
	return {
		success: false,
		points: scoring.failure,
		narrative,
		spotlightText: spotlight,
		momentumTag: 'costly',
		situationType: situation,
		legacyTag: '',
	};
}

//============================================
// Track clutch outcomes on the player via storyFlags
function trackClutchOutcome(player: Player, success: boolean): void {
	// Increment total clutch moments (use a flag per milestone)
	if (!player.storyFlags['clutch_total']) {
		player.storyFlags['clutch_total'] = true;
	} else if (!player.storyFlags['clutch_total_3']) {
		player.storyFlags['clutch_total_3'] = true;
	} else if (!player.storyFlags['clutch_total_5']) {
		player.storyFlags['clutch_total_5'] = true;
	} else if (!player.storyFlags['clutch_total_10']) {
		player.storyFlags['clutch_total_10'] = true;
	}

	if (success) {
		if (!player.storyFlags['clutch_wins']) {
			player.storyFlags['clutch_wins'] = true;
		} else if (!player.storyFlags['clutch_wins_3']) {
			player.storyFlags['clutch_wins_3'] = true;
		} else if (!player.storyFlags['clutch_wins_5']) {
			player.storyFlags['clutch_wins_5'] = true;
		}
	}
}
