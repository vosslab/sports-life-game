// scout_report/index.ts - Scout Report optional plugin
//
// Panel-only proof of concept plugin. Registers a read-only
// scout report panel showing draft projections and scout notes
// for the player during college and NFL phases.

import type { GamePlugin, PluginHost } from "../plugin_host.js";
import { scoutReportPanel } from "./panels/scout_report_panel.js";

//============================================
export const scoutReportPlugin: GamePlugin = {
  name: "scout_report",
  version: "0.1.0",

  register(host: PluginHost): void {
    host.ui.registerPanel(scoutReportPanel);
  },
};
