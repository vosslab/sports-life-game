// choice_registry.ts - weekly choice registration
//
// Thin registry for WeeklyChoice instances.
// Supports register (single), registerMany (batch), lookup, getAll, clear.
//
// Stores choices in a Map keyed by id for O(1) lookup and duplicate detection.

import type { WeeklyChoice } from "../../weekly/choices.js";
import type { ChoiceRegistry } from "../plugin_host.js";

//============================================
// Module-level state: all registered choices (map keyed by id)
const choicesMap = new Map<string, WeeklyChoice>();

//============================================
// ChoiceRegistry implementation: map-backed registry keyed by id

class ChoiceRegistryImpl implements ChoiceRegistry {
  register(choice: WeeklyChoice): void {
    if (choicesMap.has(choice.id)) {
      throw new Error(`Duplicate choice id registered: "${choice.id}"`);
    }
    choicesMap.set(choice.id, choice);
  }

  registerMany(choices: readonly WeeklyChoice[]): void {
    for (const choice of choices) {
      this.register(choice);
    }
  }

  lookup(id: string): WeeklyChoice | undefined {
    return choicesMap.get(id);
  }

  getAll(): readonly WeeklyChoice[] {
    return Array.from(choicesMap.values());
  }

  clear(): void {
    choicesMap.clear();
  }
}

//============================================
// Module-level singleton instance
const instance = new ChoiceRegistryImpl();

//============================================
// Public exports
export function register(choice: WeeklyChoice): void {
  instance.register(choice);
}

export function registerMany(choices: readonly WeeklyChoice[]): void {
  instance.registerMany(choices);
}

export function lookup(id: string): WeeklyChoice | undefined {
  return instance.lookup(id);
}

export function getAll(): readonly WeeklyChoice[] {
  return instance.getAll();
}

export function clear(): void {
  instance.clear();
}
