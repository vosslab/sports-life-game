// childhood_entry.ts - Childhood phase entry milestone
//
// Fires once when entering the childhood phase (at game start).
// Sets the narrative tone for the entire childhood experience.

import type { PhaseStartHook } from "../../plugin_host.js";
import type { Player } from "../../../player.js";
import type { GameContext } from "../../../core/game_context.js";

//============================================
export const childhoodEntryHook: PhaseStartHook = {
  id: "childhood-entry",
  phase: "childhood",
  fire(player: Player, ctx: GameContext): void {
    ctx.addHeadline(`The Beginning: Age ${player.age}`);
    ctx.addText(
      "Life starts simple. You're just a kid, discovering the world one day at a time. " +
        "Play, grow, learn, and enjoy these years. " +
        "One day, football will call. But for now, just be a kid.",
    );
  },
};
