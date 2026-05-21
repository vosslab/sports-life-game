// register_plugins.ts - plugin registration entry point
//
// Called at app boot (in src/main.ts:initGame). As of M3, handler registration
// is exclusively via plugins; there is no separate core handler registration.
// All plugins (childhood, high_school, college, nfl) register their phase
// handlers through this single entry point.

import type { PluginHost } from './plugin_host.js';
import { childhoodPlugin } from './childhood/index.js';
import { highSchoolPlugin } from './high_school/index.js';
import { collegePlugin } from './college/index.js';
import { nflPlugin } from './nfl/index.js';
import { scoutReportPlugin } from './scout_report/index.js';

//============================================
export function registerAllPlugins(host: PluginHost): void {
	// M3: childhood plugin (phase handlers for kid_years, peewee, travel)
	childhoodPlugin.register(host);

	// M2: high_school plugin (phase handlers for frosh/soph and varsity)
	highSchoolPlugin.register(host);

	// M3: college plugin (phase handlers for freshman, sophomore, junior, senior)
	collegePlugin.register(host);

	// M3: nfl plugin (phase handlers for ages 22-39)
	nflPlugin.register(host);

	// M6: scout_report plugin (optional panel-only proof)
	scoutReportPlugin.register(host);
}
