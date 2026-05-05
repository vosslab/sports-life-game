// index.ts - public API for the clutch engine.
//
// Decomposed from `src/clutch_moment.ts` during M4. Re-exports the public
// types and the two functions weekly_engine.ts depends on
// (`buildClutchMoment`, `resolveClutchMoment`).

import { Player } from '../player.js';
import {
	ChoiceTemplate, ClutchChoice, ClutchGameContext, ClutchMoment, ClutchResult,
	ClutchSituation,
} from './types.js';
import { deriveSituation, generateScene, shouldTrigger } from './situation.js';
import { getChoicePool, pickThreeWithRiskSpread, resolveChoice } from './resolve.js';

//============================================
// Re-exported public types
export type {
	ClutchGameContext,
	ClutchRisk,
	ClutchChoice,
	MomentumTag,
	ClutchSituation,
	ClutchResult,
	ClutchMoment,
} from './types.js';

//============================================
// Build a clutch moment if eligible. Returns null when the context is not
// eligible (non-key non-playoff game, non-starter, blowout margin).
export function buildClutchMoment(
	_player: Player,
	context: ClutchGameContext,
): ClutchMoment | null {
	if (!shouldTrigger(context)) {
		return null;
	}

	// Derive situation from game state
	const situation = deriveSituation(context);

	// Get position-specific choice pool and pick 3 with risk spread
	const pool = getChoicePool(context.positionBucket, context.position);
	const templates: ChoiceTemplate[] = pickThreeWithRiskSpread(pool, situation);

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
// Resolve a clutch moment choice into a `ClutchResult`. The optional
// `situationOverride` argument lets the caller carry the situation from
// buildClutchMoment so resolution does not re-roll random situation flavor.
export function resolveClutchMoment(
	player: Player,
	context: ClutchGameContext,
	choiceId: string,
	situationOverride?: ClutchSituation,
): ClutchResult {
	return resolveChoice(player, context, choiceId, situationOverride);
}
