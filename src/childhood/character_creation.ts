// character_creation.ts - Character name input and initial birth story
//
// Handles character creation UI: name input form, random generation,
// and birth story display before entering childhood phase.

import type { Player } from "../player.js";
import { createPlayer } from "../player.js";
import { saveGame } from "../save.js";
import * as ui from "../ui/index.js";
import type { ChoiceOption } from "../ui/index.js";

export interface CharacterCreationContext {
  firstNames: string[];
  lastNames: string[];
  addStoryHeadline: (text: string) => void;
  addStoryText: (text: string) => void;
  clearStory: () => void;
  onPlayerCreated: (player: Player) => void;
}

//============================================

function getSizeDescription(sizeIndex: number): string {
  const descriptions = [
    "",
    "on the smaller side",
    "lean",
    "average",
    "big for your age",
    "largest",
  ];
  return descriptions[sizeIndex] || "";
}

export function startNewGameFlow(ctx: CharacterCreationContext): void {
  ctx.clearStory();
  ctx.addStoryHeadline("A New Life Begins");
  ctx.addStoryText("What is your name?");

  const panel = document.getElementById("choices-panel");
  if (!panel) return;
  panel.innerHTML = "";

  const firstInput = document.createElement("input");
  firstInput.type = "text";
  firstInput.placeholder = "First Name";
  firstInput.className = "name-input";
  firstInput.autocomplete = "off";
  panel.appendChild(firstInput);

  const lastInput = document.createElement("input");
  lastInput.type = "text";
  lastInput.placeholder = "Last Name";
  lastInput.className = "name-input";
  lastInput.autocomplete = "off";
  panel.appendChild(lastInput);

  const rand = (): number => Math.floor(Math.random() * 1000000);
  const fIdx1 = rand() % ctx.firstNames.length;
  const lIdx1 = rand() % ctx.lastNames.length;
  firstInput.value = ctx.firstNames[fIdx1]!; // index guaranteed in bounds by modulo
  lastInput.value = ctx.lastNames[lIdx1]!; // index guaranteed in bounds by modulo

  const randomBtn = document.createElement("button");
  randomBtn.className = "choice-button";
  randomBtn.textContent = "Random Name";
  randomBtn.addEventListener("click", () => {
    const fIdx = rand() % ctx.firstNames.length;
    const lIdx = rand() % ctx.lastNames.length;
    firstInput.value = ctx.firstNames[fIdx]!; // index guaranteed in bounds by modulo
    lastInput.value = ctx.lastNames[lIdx]!; // index guaranteed in bounds by modulo
  });
  panel.appendChild(randomBtn);

  const startBtn = document.createElement("button");
  startBtn.className = "choice-button primary";
  startBtn.textContent = "Begin Your Journey";
  startBtn.addEventListener("click", () => {
    const firstName = firstInput.value.trim() || "Rookie";
    const lastName = lastInput.value.trim() || "Johnson";
    panel.innerHTML = "";
    const newPlayer = createPlayer(firstName, lastName);
    ui.updateAllStats(newPlayer);
    ui.updateHeader(newPlayer);
    saveGame(newPlayer);
    ctx.clearStory();
    ctx.addStoryHeadline("A Star is Born");

    const athleticism = newPlayer.core.athleticism;
    if (athleticism >= 65) {
      ctx.addStoryText("You came into this world with a strong cry and even " + "stronger legs.");
    } else if (athleticism >= 40) {
      ctx.addStoryText(
        "You arrived healthy and curious, already grabbing at " + "everything in reach.",
      );
    } else {
      ctx.addStoryText("You were a quiet baby, observant and calm.");
    }

    const sizeDesc = getSizeDescription(newPlayer.hidden.size);
    if (sizeDesc) {
      ctx.addStoryText(`The doctor notes you are ${sizeDesc}.`);
    }

    const options: ChoiceOption[] = [
      {
        text: "Continue...",
        primary: true,
        action: () => ctx.onPlayerCreated(newPlayer),
      },
    ];
    ui.waitForInteraction("Your Birth", options);
  });
  panel.appendChild(startBtn);
}
