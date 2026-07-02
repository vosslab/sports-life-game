// event_registry.ts - game event registration
//
// Thin registry for GameEvent instances.
// Supports register (single), registerMany (batch), lookup (by id), getAll, clear.
// Throws on duplicate id registration.

import type { GameEvent } from "../../events.js";
import type { EventRegistry } from "../plugin_host.js";

//============================================
// Module-level state: all registered events
const events = new Map<string, GameEvent>();

//============================================
// EventRegistry implementation: map-backed registry

class EventRegistryImpl implements EventRegistry {
  register(event: GameEvent): void {
    if (events.has(event.id)) {
      throw new Error(`Duplicate event id: "${event.id}" already registered in EventRegistry`);
    }
    events.set(event.id, event);
  }

  registerMany(evts: readonly GameEvent[]): void {
    for (const event of evts) {
      this.register(event);
    }
  }

  lookup(id: string): GameEvent | undefined {
    return events.get(id);
  }

  getAll(): readonly GameEvent[] {
    return Array.from(events.values());
  }

  clear(): void {
    events.clear();
  }
}

//============================================
// Module-level singleton instance
const instance = new EventRegistryImpl();

//============================================
// Public exports
export function register(event: GameEvent): void {
  instance.register(event);
}

export function registerMany(evts: readonly GameEvent[]): void {
  instance.registerMany(evts);
}

export function lookup(id: string): GameEvent | undefined {
  return instance.lookup(id);
}

export function getAll(): readonly GameEvent[] {
  return instance.getAll();
}

export function clear(): void {
  instance.clear();
}
