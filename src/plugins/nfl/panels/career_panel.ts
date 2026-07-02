// nfl/panels/career_panel.ts - NFL career panel UI widget
//
// Stub: currently renders age only. Full career stats, draft year,
// seasons played, and achievements are not yet implemented here.

import type { GameContext } from "../../../core/game_context.js";

//============================================
function renderNflCareerPanel(ctx: GameContext): void {
  const player = ctx.getPlayer();
  if (!player) {
    return;
  }

  // NFL career panel shows draft year, seasons played, stats, achievements
  const careerDiv = document.getElementById("career-panel");
  if (!careerDiv) {
    return;
  }

  let html = "";
  html += "<h3>Pro Career</h3>";
  html += `<p>Age: ${player.age}</p>`;
  html += `<p>Status: Active</p>`;

  careerDiv.innerHTML = html;
}

//============================================
export const nflCareerPanel = {
  panelId: "nfl_career",
  label: "Career",
  availableInPhase: (phase: string) => phase === "nfl",
  render: renderNflCareerPanel,
};
