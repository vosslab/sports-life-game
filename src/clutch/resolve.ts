// resolve.ts - clutch outcome resolution and player tracking.
//
// Split from `src/clutch_moment.ts` during M4. Owns the runtime-only
// portion of the clutch engine: choice pool selection by position, risk
// spread, success/failure rolls against the seeded RNG, narrative
// selection, legacy-tag and reputation text generation, and tracking of
// per-player clutch milestone flags.

import { Player, Position, PositionBucket } from '../player.js';
import { rand } from '../core/rng.js';
import {
	BASE_RATES, ChoiceTemplate, ClutchGameContext, ClutchResult, ClutchRisk,
	ClutchSituation, MomentumTag, SCORING_MAPS,
} from './types.js';
import { clamp, deriveSituation, pickRandom, shuffle } from './situation.js';
import { QB_CHOICES } from './choices_qb.js';
import { RB_CHOICES } from './choices_rb.js';
import { WR_CHOICES } from './choices_wr.js';
import { LINEMAN_CHOICES } from './choices_ol.js';
import { DEFENDER_CHOICES } from './choices_def.js';
import { KICKER_CHOICES } from './choices_kicker.js';

//============================================
// Map position buckets to their full choice pools
export function getChoicePool(
	positionBucket: PositionBucket | null,
	position: Position | null,
): ChoiceTemplate[] {
	if (!positionBucket) {
		return DEFENDER_CHOICES;
	}
	switch (positionBucket) {
		case 'passer':
			return QB_CHOICES;
		case 'runner_receiver':
			if (position === 'RB') {
				return RB_CHOICES;
			}
			return WR_CHOICES;
		case 'lineman':
			return LINEMAN_CHOICES;
		case 'defender':
			return DEFENDER_CHOICES;
		case 'kicker':
			return KICKER_CHOICES;
		default:
			return DEFENDER_CHOICES;
	}
}

//============================================
// Pick 3 choices with risk spread from the pool. Filters by situation
// first, then picks one per risk tier if possible, backfilling from any
// remaining eligible/all entries when a tier is empty.
export function pickThreeWithRiskSpread(
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

	// If we still don't have 3, pull from full pool ignoring situation filter
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
export function generateLegacyTag(
	situation: ClutchSituation,
	risk: ClutchRisk,
	success: boolean,
	isBigSuccess: boolean,
	isPlayoff: boolean,
): string {
	// Final play moments are always memorable on big success or disaster
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

	// Balanced big successes only logged in playoffs (safe is routine)
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
export function getReputationText(player: Player, momentumTag: MomentumTag): string {
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
// Track clutch outcomes on the player via storyFlags
function trackClutchOutcome(player: Player, success: boolean): void {
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

//============================================
// Resolve a single clutch choice into points + narrative.
export function resolveChoice(
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
	const roll = rand();

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
