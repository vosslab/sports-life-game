// nfl/lifecycle/hooks.ts - NFL lifecycle hook registration
//
// Registers age hooks, phase start hooks, and career end hooks for the NFL phase.

import type { PluginHost } from '../../plugin_host.js';
import { draftDayHook } from './draft_day.js';
import { nflEntryHook } from './nfl_entry.js';
import { retirementHook } from './retirement.js';

//============================================
export function registerNflLifecycleHooks(host: PluginHost): void {
	// Age 22 draft day (fires once, before phase transition)
	host.lifecycle.registerAgeHook(draftDayHook);

	// NFL phase entry (fires when phase becomes 'nfl')
	host.lifecycle.registerPhaseStartHook(nflEntryHook);

	// Career end: retirement (fires at career end)
	host.lifecycle.registerCareerEndHook(retirementHook);
}
