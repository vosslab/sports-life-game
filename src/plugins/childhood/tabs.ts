// tabs.ts - Childhood tabs registration
//
// Registers childhood phase tabs (life, stats, activities).
// Note: childhood tabs are HIDDEN in the UI; tab bar is not shown during childhood.
// We still register these for consistency and for future UI flexibility.

import type { PluginHost, TabRegistration } from "../plugin_host.js";
import type { GameContext } from "../../core/game_context.js";

//============================================
export function registerChildhoodTabs(host: PluginHost): void {
  const tabs: TabRegistration[] = [
    {
      tabId: "childhood_life",
      label: "Life",
      availableInPhase: (phase) => phase === "childhood",
      render: (_ctx: GameContext) => {
        // Childhood tabs are hidden; render is a no-op
        // Implemented by UI layer if ever made visible
      },
    },
    {
      tabId: "childhood_stats",
      label: "Stats",
      availableInPhase: (phase) => phase === "childhood",
      render: (_ctx: GameContext) => {
        // Childhood tabs are hidden; render is a no-op
      },
    },
    {
      tabId: "childhood_activities",
      label: "Activities",
      availableInPhase: (phase) => phase === "childhood",
      render: (_ctx: GameContext) => {
        // Childhood tabs are hidden; render is a no-op
      },
    },
  ];

  for (const tab of tabs) {
    host.ui.registerTab(tab);
  }
}
