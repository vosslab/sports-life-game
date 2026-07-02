// events_loader.ts - Load HS events from JSON
//
// Events are imported at bundle time by esbuild (resolveJsonModule),
// so the data is available synchronously without any preload step.

import type { GameEvent } from "../../events.js";
import eventsData from "./events/high_school.json";

// Cast through unknown: inferred JSON literal types are too narrow for GameEvent[].
const hsEvents = eventsData as unknown as GameEvent[];

// Synchronous getter; data is resolved at import time
export function loadHsEvents(): GameEvent[] {
  return hsEvents;
}
