// college/index.ts - College phase plugin
//
// Exports the collegePlugin GamePlugin instance that registers
// college phase handlers (entry, core, senior), activities, events, tabs,
// and career panel with the PluginHost.
//
// Activities and events are bundled at build time (esbuild resolveJsonModule),
// so register() reads them synchronously with no preload step.

import type { GamePlugin, PluginHost } from "../plugin_host.js";
import { registerPhaseHandlers } from "./phase_handler.js";
import { loadCollegeActivities } from "./activities_loader.js";
import { loadCollegeEvents } from "./events_loader.js";
import { registerCollegeTabs } from "./tabs.js";
import { collegeCareerPanel } from "./panels/career_panel.js";
import { registerCollegeLifecycleHooks } from "./lifecycle/hooks.js";

//============================================
export const collegePlugin: GamePlugin = {
  name: "college",
  version: "0.1.0",

  register(host: PluginHost): void {
    registerPhaseHandlers(host);
    host.activities.registerMany(loadCollegeActivities());
    host.events.registerMany(loadCollegeEvents());
    registerCollegeTabs(host);
    host.ui.registerPanel(collegeCareerPanel);
    registerCollegeLifecycleHooks(host);
  },
};
