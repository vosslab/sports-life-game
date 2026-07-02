// phase_registry.ts - phase handler registration
//
// Wraps the existing src/core/year_registry.ts.
// Delegates to registerHandler, getHandler, getAllHandlers, clearHandlers
// from the core year registry. Non-overlap validation inherited from core.

import type { YearHandler } from "../../core/year_handler.js";
import {
  registerHandler as coreRegisterHandler,
  getAllHandlers,
  clearHandlers,
} from "../../core/year_registry.js";
import type { PhaseRegistry } from "../plugin_host.js";

//============================================
// PhaseRegistry implementation: thin delegator to core year_registry

class PhaseRegistryImpl implements PhaseRegistry {
  register(handler: YearHandler): void {
    // Delegate to core year_registry with its non-overlap validation
    coreRegisterHandler(handler);
  }

  lookup(id: string): YearHandler | undefined {
    // Linear search through all handlers
    for (const handler of getAllHandlers()) {
      if (handler.id === id) {
        return handler;
      }
    }
    return undefined;
  }

  getAll(): readonly YearHandler[] {
    return getAllHandlers();
  }

  clear(): void {
    clearHandlers();
  }
}

//============================================
// Module-level singleton instance
const instance = new PhaseRegistryImpl();

//============================================
// Public exports
export function register(handler: YearHandler): void {
  instance.register(handler);
}

export function lookup(id: string): YearHandler | undefined {
  return instance.lookup(id);
}

export function getAll(): readonly YearHandler[] {
  return instance.getAll();
}

export function clear(): void {
  instance.clear();
}
