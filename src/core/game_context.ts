// game_context.ts - GameContext type alias for future unification
//
// For now, GameContext is an alias of CareerContext.
// In a follow-up plan, both may be unified or diverged
// based on plugin lifecycle needs.
//
// CareerContext (aliased as GameContext) surface is frozen after M1. Additions require architect approval. WP-M2-C precedent: getPlayer() accessor approved 2026-05.
// TODO: unify CareerContext and GameContext in follow-up plan

import type { CareerContext } from './year_handler.js';

export type GameContext = CareerContext;
