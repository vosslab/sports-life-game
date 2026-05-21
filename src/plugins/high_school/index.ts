// high_school/index.ts - High School phase plugin
//
// Exports the highSchoolPlugin GamePlugin instance that registers
// high school phase handlers (frosh/soph and varsity), activities,
// events, tabs, and career panel with the PluginHost.
//
// Note: activities and events are pre-loaded via preloadHsActivities() and
// preloadHsEvents() during async bootstrap (src/main.ts before registerAllPlugins),
// so register() can use them synchronously.

import type { GamePlugin, PluginHost } from '../plugin_host.js';
import { registerPhaseHandlers } from './phase_handler.js';
import { loadHsActivities } from './activities_loader.js';
import { loadHsEvents } from './events_loader.js';
import { registerHsTabs } from './tabs.js';
import { hsCareerPanel } from './panels/career_panel.js';
import { registerHsLifecycleHooks } from './lifecycle/hooks.js';
import { loadExamplePack } from './packs/example_pack_loader.js';

//============================================
export const highSchoolPlugin: GamePlugin = {
	name: 'high_school',
	version: '0.1.0',

	register(host: PluginHost): void {
		registerPhaseHandlers(host);
		host.activities.registerMany(loadHsActivities());
		host.events.registerMany(loadHsEvents());
		registerHsTabs(host);
		host.ui.registerPanel(hsCareerPanel);
		registerHsLifecycleHooks(host);
		// Register the example pack; its sub-items are routed by DataPackRegistry
		host.dataPacks.register(loadExamplePack());
	},
};
