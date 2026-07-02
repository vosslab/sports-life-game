// college/phase_handler.ts - College phase handler registration
//
// Registers the college phase handlers (ages 18-21) with the PluginHost.
// Called by collegePlugin.register().

import type { PluginHost } from "../plugin_host.js";
import { collegeEntryHandler } from "../../college/college_entry.js";
import { collegeCoreHandler } from "../../college/college_core.js";
import { collegeSeniorHandler } from "../../college/college_senior.js";

//============================================
export function registerPhaseHandlers(host: PluginHost): void {
  host.phases.register(collegeEntryHandler);
  host.phases.register(collegeCoreHandler);
  host.phases.register(collegeSeniorHandler);
}
