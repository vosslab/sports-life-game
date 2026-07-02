// test_choice_schemas.ts - Schema validation for weekly choice JSON files
//
// Verifies that each choice JSON file conforms to the WeeklyChoice type:
// - Top-level is an array
// - Each element has required fields: id, category, text, description, risk, conditions, outcomes
// - outcomes has success and failure with: probability, effects, narrative
// - All probabilities are in [0, 1]
// - success.probability + failure.probability = 1.0 (within 0.01 tolerance)
// - Choice IDs are unique within each file
//
// Run with: npm run test:node -- --test-name-pattern='choice_schemas'

/// <reference types="node" />

import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

interface ChoiceOutcome {
  probability: number;
  effects: Record<string, number>;
  narrative: string;
}

interface WeeklyChoice {
  id: string;
  category: string;
  text: string;
  description: string;
  risk: string;
  conditions: Record<string, unknown>;
  outcomes: {
    success: ChoiceOutcome;
    failure: ChoiceOutcome;
  };
}

//============================================
// Helper to get repo root
function repoRoot(): string {
  const here: string = url.fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), "..");
}

//============================================
// Load and parse JSON file
function loadChoiceFile(phase: string): WeeklyChoice[] {
  const filePath = path.join(repoRoot(), "src", "data", "choices", `${phase}.json`);
  const content = fs.readFileSync(filePath, "utf8");
  // JSON.parse returns any; cast through unknown then to the expected shape.
  // Validation in validateChoice() ensures every element matches WeeklyChoice.
  const data = JSON.parse(content) as unknown as WeeklyChoice[];
  return data;
}

//============================================
// Validate a single outcome (success or failure)
function validateOutcome(
  outcome: Record<string, unknown>,
  choiceId: string,
  phase: string,
  kind: "success" | "failure",
): void {
  if (typeof outcome.probability !== "number") {
    throw new Error(
      `Choice ${choiceId} in ${phase} ${kind} outcome missing or invalid probability`,
    );
  }
  if (outcome.probability < 0 || outcome.probability > 1) {
    throw new Error(
      `Choice ${choiceId} in ${phase} ${kind} outcome probability ${outcome.probability} not in [0, 1]`,
    );
  }
  if (typeof outcome.effects !== "object" || outcome.effects === null) {
    throw new Error(`Choice ${choiceId} in ${phase} ${kind} outcome missing or invalid effects`);
  }
  if (typeof outcome.narrative !== "string") {
    throw new Error(`Choice ${choiceId} in ${phase} ${kind} outcome missing or invalid narrative`);
  }

  // Validate effects are all numbers
  const effects = outcome.effects as Record<string, unknown>;
  for (const [key, val] of Object.entries(effects)) {
    if (typeof val !== "number") {
      throw new Error(
        `Choice ${choiceId} in ${phase} ${kind} outcome effect ${key} is not a number`,
      );
    }
  }
}

//============================================
// Validate a single choice
function validateChoice(choice: unknown, phase: string): void {
  if (typeof choice !== "object" || choice === null) {
    throw new Error(`Choice is not an object in ${phase}`);
  }

  const c = choice as Record<string, unknown>;

  // Required fields
  if (typeof c.id !== "string") {
    throw new Error(`Choice missing or invalid id in ${phase}: ${JSON.stringify(choice)}`);
  }
  if (typeof c.category !== "string") {
    throw new Error(`Choice ${c.id} in ${phase} missing or invalid category`);
  }
  if (typeof c.text !== "string") {
    throw new Error(`Choice ${c.id} in ${phase} missing or invalid text`);
  }
  if (typeof c.description !== "string") {
    throw new Error(`Choice ${c.id} in ${phase} missing or invalid description`);
  }
  if (typeof c.risk !== "string") {
    throw new Error(`Choice ${c.id} in ${phase} missing or invalid risk`);
  }
  if (typeof c.conditions !== "object" || c.conditions === null) {
    throw new Error(`Choice ${c.id} in ${phase} missing or invalid conditions`);
  }

  // outcomes
  if (typeof c.outcomes !== "object" || c.outcomes === null) {
    throw new Error(`Choice ${c.id} in ${phase} missing outcomes`);
  }
  const outcomes = c.outcomes as Record<string, unknown>;

  // success and failure
  if (typeof outcomes.success !== "object" || outcomes.success === null) {
    throw new Error(`Choice ${c.id} in ${phase} missing success outcome`);
  }
  if (typeof outcomes.failure !== "object" || outcomes.failure === null) {
    throw new Error(`Choice ${c.id} in ${phase} missing failure outcome`);
  }

  const success = outcomes.success as Record<string, unknown>;
  const failure = outcomes.failure as Record<string, unknown>;

  validateOutcome(success, c.id, phase, "success");
  validateOutcome(failure, c.id, phase, "failure");

  // Check probability sum
  const probSum = (success.probability as number) + (failure.probability as number);
  const tolerance = 0.01;
  if (Math.abs(probSum - 1.0) > tolerance) {
    throw new Error(
      `Choice ${c.id} in ${phase} probabilities do not sum to 1.0: ` +
        `${String(success.probability)} + ${String(failure.probability)} = ${probSum}`,
    );
  }
}

//============================================
// One node:test per phase so failures localize cleanly in the reporter output.
const PHASES = ["preseason", "opening", "midseason", "stretch", "postseason"] as const;

for (const phase of PHASES) {
  void test(`choice_schemas: ${phase} JSON is well-formed`, () => {
    const choices = loadChoiceFile(phase);

    if (!Array.isArray(choices)) {
      throw new Error(`${phase} choices is not an array`);
    }

    const seenIds = new Set<string>();
    for (const choice of choices) {
      validateChoice(choice, phase);
      const choiceId = choice.id;
      if (seenIds.has(choiceId)) {
        throw new Error(`Duplicate choice id ${choiceId} in ${phase}`);
      }
      seenIds.add(choiceId);
    }
  });
}
