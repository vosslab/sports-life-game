// rules_registry.ts - rules set registration
//
// Thin registry for RuleSetReference instances.
// Supports register, lookup (by id), getAll, clear.
// Throws on duplicate id registration.

import type { RuleSetReference, RulesRegistry } from "../plugin_host.js";

//============================================
// Module-level state: all registered rule sets
const ruleSets = new Map<string, RuleSetReference>();

//============================================
// RulesRegistry implementation: map-backed registry

class RulesRegistryImpl implements RulesRegistry {
  register(ruleSetRef: RuleSetReference): void {
    if (ruleSets.has(ruleSetRef.id)) {
      throw new Error(
        `Duplicate rule set id: "${ruleSetRef.id}" already registered in RulesRegistry`,
      );
    }
    ruleSets.set(ruleSetRef.id, ruleSetRef);
  }

  lookup(id: string): RuleSetReference | undefined {
    return ruleSets.get(id);
  }

  getAll(): readonly RuleSetReference[] {
    return Array.from(ruleSets.values());
  }

  clear(): void {
    ruleSets.clear();
  }
}

//============================================
// Module-level singleton instance
const instance = new RulesRegistryImpl();

//============================================
// Public exports
export function register(ruleSetRef: RuleSetReference): void {
  instance.register(ruleSetRef);
}

export function lookup(id: string): RuleSetReference | undefined {
  return instance.lookup(id);
}

export function getAll(): readonly RuleSetReference[] {
  return instance.getAll();
}

export function clear(): void {
  instance.clear();
}
