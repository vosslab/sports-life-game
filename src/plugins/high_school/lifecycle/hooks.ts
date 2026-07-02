// hooks.ts - High School lifecycle hooks registration
//
// Registers all HS-specific lifecycle hooks (age hooks, phase start hooks)
// with the PluginHost.

import type { PluginHost } from "../../plugin_host.js";
import { driversPermitHook } from "./drivers_permit.js";
import { hsEntryHook } from "./hs_entry.js";

//============================================
export function registerHsLifecycleHooks(host: PluginHost): void {
  host.lifecycle.registerAgeHook(driversPermitHook);
  host.lifecycle.registerPhaseStartHook(hsEntryHook);
}
