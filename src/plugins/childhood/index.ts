// childhood/index.ts - Childhood phase plugin
//
// Exports the childhoodPlugin GamePlugin instance that registers
// childhood phase handlers (kid_years, peewee, travel), activities,
// events, tabs, and career panel with the PluginHost.
//
// Note: activities and events are pre-loaded via preloadChildhoodActivities() and
// preloadChildhoodEvents() during async bootstrap (src/main.ts before registerAllPlugins),
// so register() can use them synchronously.

import type { GamePlugin, PluginHost } from '../plugin_host.js';
import { registerPhaseHandlers } from './phase_handler.js';
import { loadChildhoodActivities } from './activities_loader.js';
import { loadChildhoodEvents } from './events_loader.js';
import { registerChildhoodTabs } from './tabs.js';
import { childhoodCareerPanel } from './panels/career_panel.js';
import { registerChildhoodLifecycleHooks } from './lifecycle/hooks.js';

//============================================
export const childhoodPlugin: GamePlugin = {
	name: 'childhood',
	version: '0.1.0',

	register(host: PluginHost): void {
		registerPhaseHandlers(host);
		host.activities.registerMany(loadChildhoodActivities());
		host.events.registerMany(loadChildhoodEvents());
		registerChildhoodTabs(host);
		host.ui.registerPanel(childhoodCareerPanel);
		registerChildhoodLifecycleHooks(host);
	},
};
