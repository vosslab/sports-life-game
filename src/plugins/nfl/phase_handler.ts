// nfl/phase_handler.ts - NFL phase handler registration
//
// Registers all five NFL year-band handlers (ages 22-39) with the PluginHost.
// Called by nflPlugin.register().

import type { PluginHost } from '../plugin_host.js';
import { nflRookieHandler } from '../../nfl_handlers/nfl_rookie.js';
import { nflEarlyHandler } from '../../nfl_handlers/nfl_early.js';
import { nflPeakHandler } from '../../nfl_handlers/nfl_peak.js';
import { nflVeteranHandler } from '../../nfl_handlers/nfl_veteran.js';
import { nflLateHandler } from '../../nfl_handlers/nfl_late.js';

//============================================
export function registerPhaseHandlers(host: PluginHost): void {
	// Age 22: NFL rookie
	host.phases.register(nflRookieHandler);

	// Ages 23-26: NFL early years
	host.phases.register(nflEarlyHandler);

	// Ages 27-31: NFL peak years
	host.phases.register(nflPeakHandler);

	// Ages 32-36: NFL veteran years
	host.phases.register(nflVeteranHandler);

	// Ages 37-39: NFL twilight
	host.phases.register(nflLateHandler);
}
