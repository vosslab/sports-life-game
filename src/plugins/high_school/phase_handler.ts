// high_school/phase_handler.ts - High School phase handler registration
//
// Registers the two high school phase handlers (frosh/soph and varsity)
// with the PluginHost. Called by highSchoolPlugin.register().

import type { PluginHost } from "../plugin_host.js";
import { hsFroshSophHandler } from "../../high_school/hs_frosh_soph.js";
import { hsVarsityHandler } from "../../high_school/hs_varsity.js";

//============================================
export function registerPhaseHandlers(host: PluginHost): void {
  host.phases.register(hsFroshSophHandler);
  host.phases.register(hsVarsityHandler);
}
