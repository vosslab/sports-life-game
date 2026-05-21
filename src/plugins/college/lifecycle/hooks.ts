// hooks.ts - College lifecycle hooks registration
//
// Registers all college-specific lifecycle hooks (age hooks, phase start hooks)
// with the PluginHost.

import type { PluginHost } from '../../plugin_host.js';
import { nflDeclarationHook } from './nfl_declaration.js';
import { collegeEntryHook } from './college_entry.js';

//============================================
export function registerCollegeLifecycleHooks(host: PluginHost): void {
	host.lifecycle.registerAgeHook(nflDeclarationHook);
	host.lifecycle.registerPhaseStartHook(collegeEntryHook);
}
