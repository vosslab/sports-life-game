// drivers_permit.ts - Age 15 driver's permit milestone
//
// Fires once at age 15 to notify the player about driver's permit eligibility.
// No stat changes; purely narrative.

import type { AgeHook } from "../../plugin_host.js";
import type { Player } from "../../../player.js";
import type { GameContext } from "../../../core/game_context.js";

//============================================
export const driversPermitHook: AgeHook = {
  id: "hs-drivers-permit",
  age: 15,
  once: true,
  fire(_player: Player, ctx: GameContext): void {
    ctx.addText(
      "You turned 15. In your state, you're eligible for your driver's permit now. " +
        "Having a license will open up more options for your free time.",
    );
  },
};
