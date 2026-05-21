// activities.ts - activity definitions, effects, and action cap logic

import type { PluginHost } from "./plugins/plugin_host.js";
import { Player, CareerPhase, CoreStats, modifyStat } from "./player.js";

//============================================
// Activity definition
export interface Activity {
  id: string;
  name: string;
  description: string;
  // Which phases this activity is available in
  phases: CareerPhase[];
  // Stat effects: positive means gain, negative means cost
  effects: Record<string, number>;
  // Optional unlock condition (e.g., college year 2+)
  unlockCondition?: (player: Player) => boolean;
  // Unlock hint shown when activity is locked
  unlockHint?: string;
  // Flavor text shown after completing the activity
  flavorText: string;
}

export interface ActivityResult {
  flavorText: string;
  appliedEffects: Record<string, number>;
  moneyDelta: number;
}

//============================================
// Weekly state for the game loop (transient, not on Player)
export type WeekPhase =
  | "focus"
  | "activity_prompt"
  | "activity_done"
  | "event"
  | "game"
  | "results";

export interface WeekState {
  phase: WeekPhase;
  actionsUsed: number;
  actionBudget: number;
}

//============================================
// Create a fresh week state (called at start of each week)
export function createWeekState(): WeekState {
  return {
    phase: "focus",
    actionsUsed: 0,
    actionBudget: 1,
  };
}

//============================================
// Check if player can do an activity this week
export function canDoActivity(state: WeekState): boolean {
  // Activities only allowed during the activity_prompt phase
  if (state.phase !== "activity_prompt") {
    return false;
  }
  // Check action cap
  return state.actionsUsed < state.actionBudget;
}

//============================================
// Module-level plugin host (set during app initialization)
let pluginHost: PluginHost | null = null;

export function setPluginHost(host: PluginHost): void {
  pluginHost = host;
}

//============================================
// COLLEGE ACTIVITIES moved to plugin (src/plugins/college/)

//============================================
// NFL ACTIVITIES moved to plugin (src/plugins/nfl/)

//============================================
// Get available activities for the current phase and player state
export function getActivitiesForPhase(
  phase: CareerPhase,
  player: Player,
): Activity[] {
  let activities: Activity[] = [];

  if (
    phase === "childhood"
    || phase === "high_school"
    || phase === "college"
    || phase === "nfl"
  ) {
    if (!pluginHost) {
      throw new Error(
        "PluginHost not initialized: getActivitiesForPhase called before setPluginHost()",
      );
    }
    activities = Array.from(pluginHost.activities.getAll()).filter((a) =>
      a.phases.includes(phase),
    );
  }

  return activities;
}

//============================================
// Check if a specific activity is unlocked for this player
export function isActivityUnlocked(
  activity: Activity,
  player: Player,
): boolean {
  if (!activity.unlockCondition) {
    // No condition means always unlocked
    return true;
  }
  return activity.unlockCondition(player);
}

//============================================
// Valid core stat keys for type-safe effect application
const CORE_STAT_KEYS: Set<string> = new Set([
  "athleticism",
  "technique",
  "footballIq",
  "discipline",
  "health",
  "confidence",
]);

// Apply an activity's effects to the player and return the concrete changes
export function applyActivity(
  activity: Activity,
  player: Player,
): ActivityResult {
  const appliedEffects: Record<string, number> = {};

  // Apply each stat effect using the shared modifyStat function
  for (const [stat, delta] of Object.entries(activity.effects)) {
    if (CORE_STAT_KEYS.has(stat)) {
      modifyStat(player, stat as keyof CoreStats, delta);
      appliedEffects[stat] = delta;
    }
  }

  // Money rewards for specific activities
  let moneyDelta = 0;
  if (activity.id === "col_nil_meeting") {
    const nilAmount = 500 + Math.floor(Math.random() * 2000);
    player.career.money += nilAmount;
    moneyDelta = nilAmount;
  }
  if (activity.id === "nfl_endorsement") {
    const endorseAmount = 10000 + Math.floor(Math.random() * 50000);
    player.career.money += endorseAmount;
    moneyDelta = endorseAmount;
  }

  return {
    flavorText: activity.flavorText,
    appliedEffects,
    moneyDelta,
  };
}

//============================================
// Build effect preview string for display (e.g., "+2 TEC, -1 HP")
export function getEffectPreview(activity: Activity): string {
  const parts: string[] = [];
  const labels: Record<string, string> = {
    athleticism: "ATH",
    technique: "TEC",
    footballIq: "IQ",
    discipline: "DIS",
    health: "HP",
    confidence: "CON",
  };

  for (const [stat, delta] of Object.entries(activity.effects)) {
    const label = labels[stat];
    if (!label) {
      // Unknown stat key -- skip rather than silently display raw key
      continue;
    }
    const sign = delta > 0 ? "+" : "";
    parts.push(`${sign}${delta} ${label}`);
  }

  // Show money reward for activities that pay
  if (activity.id === "col_nil_meeting") {
    parts.push("+$ NIL");
  }
  if (activity.id === "nfl_endorsement") {
    parts.push("+$$$ endorsement");
  }

  return parts.join(", ");
}

//============================================
// Build a readable applied-effects string for the story log
export function formatActivityResult(result: ActivityResult): string {
  const parts: string[] = [];
  const labels: Record<string, string> = {
    athleticism: "ATH",
    technique: "TEC",
    footballIq: "IQ",
    discipline: "DIS",
    health: "HP",
    confidence: "CON",
  };

  for (const [stat, delta] of Object.entries(result.appliedEffects)) {
    const label = labels[stat];
    if (!label) {
      continue;
    }
    const sign = delta > 0 ? "+" : "";
    parts.push(`${sign}${delta} ${label}`);
  }

  if (result.moneyDelta > 0) {
    parts.push(`+$${result.moneyDelta.toLocaleString()}`);
  }

  return parts.join(", ");
}
