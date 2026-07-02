// tabs.ts - High school tabs registration

import type { PluginHost, TabRegistration } from "../plugin_host.js";
import type { GameContext } from "../../core/game_context.js";

//============================================
export function registerHsTabs(host: PluginHost): void {
  const tabs: TabRegistration[] = [
    {
      tabId: "hs_life",
      label: "Life",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_life");
      },
    },
    {
      tabId: "hs_stats",
      label: "Stats",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_stats");
      },
    },
    {
      tabId: "hs_activities",
      label: "Activities",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_activities");
      },
    },
    {
      tabId: "hs_team",
      label: "Team",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_team");
      },
    },
    {
      tabId: "hs_career",
      label: "Career",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_career");
      },
    },
    {
      tabId: "hs_social",
      label: "Social",
      availableInPhase: (phase) => phase === "high_school",
      render: (_ctx: GameContext): void => {
        throw new Error("tab render not yet implemented for hs_social");
      },
    },
  ];

  for (const tab of tabs) {
    host.ui.registerTab(tab);
  }
}
