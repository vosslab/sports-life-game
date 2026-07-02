// events_loader.ts - Load childhood events from JSON
//
// Events are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { GameEvent } from "../../events.js";
import eventsData from "./events/childhood.json";

// Cast through unknown: inferred JSON literal types are too narrow for GameEvent[].
const childhoodEvents = eventsData as unknown as GameEvent[];

// Synchronous getter; data is resolved at import time
export function loadChildhoodEvents(): GameEvent[] {
  return childhoodEvents;
}
