// nfl/index.ts - NFL phase plugin
//
// Exports the nflPlugin GamePlugin instance that registers all NFL phase handlers
// (ages 22-39), activities, events, tabs, career panel, and lifecycle hooks
// with the PluginHost.
//
// Note: activities and events are pre-loaded via preloadNflActivities() and
// preloadNflEvents() during async bootstrap (src/main.ts before registerAllPlugins),
// so register() can use them synchronously.

import type { GamePlugin, PluginHost } from '../plugin_host.js';
import { registerPhaseHandlers } from './phase_handler.js';
import { loadNflActivities } from './activities_loader.js';
import { loadNflEvents } from './events_loader.js';
import { registerNflTabs } from './tabs.js';
import { nflCareerPanel } from './panels/career_panel.js';
import { registerNflLifecycleHooks } from './lifecycle/hooks.js';

//============================================
export const nflPlugin: GamePlugin = {
	name: 'nfl',
	version: '0.1.0',

	register(host: PluginHost): void {
		registerPhaseHandlers(host);
		host.activities.registerMany(loadNflActivities());
		host.events.registerMany(loadNflEvents());
		registerNflTabs(host);
		host.ui.registerPanel(nflCareerPanel);
		registerNflLifecycleHooks(host);
	},
};
