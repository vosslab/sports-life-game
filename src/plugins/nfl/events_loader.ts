// nfl/events_loader.ts - Load NFL events from events/nfl.json
//
// Events are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { GameEvent } from '../../events.js';
import eventsData from './events/nfl.json';

// Cast through unknown: inferred JSON literal types are too narrow for GameEvent[].
const nflEvents = eventsData as unknown as GameEvent[];

//============================================
export function loadNflEvents(): GameEvent[] {
	return [...nflEvents];
}
