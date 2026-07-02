// age_5_first_football.ts - Age 5 first football experience milestone
//
// Fires once at age 5 to introduce the idea of football.
// Sets narrative tone for early childhood football interest.

import type { AgeHook } from "../../plugin_host.js";
import type { Player } from "../../../player.js";
import type { GameContext } from "../../../core/game_context.js";

//============================================
export const firstFootballHook: AgeHook = {
  id: "childhood-age-5-first-football",
  age: 5,
  once: true,
  fire(_player: Player, ctx: GameContext): void {
    ctx.addText(
      "You turned 5. One afternoon, your parent showed you a highlight clip on TV. " +
        "A player made an incredible catch. You were mesmerized. " +
        '"That looks fun," you said. Your parent smiled. ' +
        "Maybe someday you'd play football too.",
    );
  },
};
