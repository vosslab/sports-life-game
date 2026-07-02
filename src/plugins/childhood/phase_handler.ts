// phase_handler.ts - Childhood phase handler registration
//
// Registers all childhood phase handlers (kid_years, peewee, travel)
// with the PluginHost. Called by childhoodPlugin.register().

import type { PluginHost } from "../plugin_host.js";
import { kidYearsHandler } from "../../childhood/kid_years.js";
import { peeweeHandler } from "../../childhood/peewee_years.js";
import { travelHandler } from "../../childhood/travel_years.js";

//============================================
export function registerPhaseHandlers(host: PluginHost): void {
  host.phases.register(kidYearsHandler);
  host.phases.register(peeweeHandler);
  host.phases.register(travelHandler);
}
