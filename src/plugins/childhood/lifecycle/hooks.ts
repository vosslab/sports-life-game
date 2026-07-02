// hooks.ts - Childhood lifecycle hooks registration
//
// Registers all childhood-specific lifecycle hooks (age hooks, phase start hooks)
// with the PluginHost.

import type { PluginHost } from "../../plugin_host.js";
import { firstFootballHook } from "./age_5_first_football.js";
import { childhoodEntryHook } from "./childhood_entry.js";

//============================================
export function registerChildhoodLifecycleHooks(host: PluginHost): void {
  host.lifecycle.registerAgeHook(firstFootballHook);
  host.lifecycle.registerPhaseStartHook(childhoodEntryHook);
}
