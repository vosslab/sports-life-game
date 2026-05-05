// types.ts - shared type and constant definitions for the clutch engine.
//
// Split from `src/clutch_moment.ts` during M4. Owns the public surface
// (ClutchGameContext, ClutchMoment, ClutchResult, etc.) and the internal
// scoring/risk tables shared across the per-position choice pools.

import { Player, Position, PositionBucket } from '../player.js';

//============================================
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
	// Legacy tag: non-empty string means this was a signature moment.
	legacyTag: string;
}

export interface ClutchMoment {
	scene: string;
	situationType: ClutchSituation;
	choices: ClutchChoice[];
}

//============================================
// Choice template with multiple narrative variants per outcome
export interface ChoiceTemplate {
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
// Base success rates by risk tier
export const BASE_RATES: Record<ClutchRisk, number> = {
	safe: 0.75,
	balanced: 0.50,
	heroic: 0.30,
};

//============================================
// Scoring map by situation: same numeric effect, different narrative framing
export interface ScoringMap {
	bigSuccess: number;
	partialSuccess: number;
	failure: number;
	disaster: number;
}

export const SCORING_MAPS: Record<ClutchSituation, ScoringMap> = {
	comeback_drive: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	hold_lead:      { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
	tie_game:       { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	red_zone:       { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	backed_up:      { bigSuccess: 3, partialSuccess: 0, failure: -3, disaster: -7 },
	must_have_stop: { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
	ice_game:       { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -3 },
	final_play:     { bigSuccess: 7, partialSuccess: 3, failure: 0, disaster: -7 },
};
