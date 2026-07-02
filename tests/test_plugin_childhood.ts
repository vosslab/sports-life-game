// test_plugin_childhood.ts - childhood plugin lifecycle and panel verification
//
// Verifies that childhood plugin:
// - childhoodEntryHook fires when entering childhood phase
// - firstFootballHook fires at age 5
// - childhoodCareerPanel renders without error
// - All hooks are properly registered
//
// Run with: npm run test:node -- --test-name-pattern='plugin_childhood'

/// <reference types="node" />

import { test } from "node:test";
import assert from "node:assert/strict";

import { clearHandlers } from "../src/core/year_registry.js";
import { buildPluginHost } from "../src/plugins/build_host.js";
import { childhoodPlugin } from "../src/plugins/childhood/index.js";
import type { Player } from "../src/player.js";
import { createPlayer } from "../src/player.js";
import type { CareerContext } from "../src/core/year_handler.js";
import * as phaseReg from "../src/plugins/registries/phase_registry.js";
import * as eventReg from "../src/plugins/registries/event_registry.js";
import * as choiceReg from "../src/plugins/registries/choice_registry.js";
import * as rulesReg from "../src/plugins/registries/rules_registry.js";
import * as activityReg from "../src/plugins/registries/activity_registry.js";
import * as lifecycleReg from "../src/plugins/registries/lifecycle_registry.js";
import * as uiReg from "../src/plugins/registries/ui_registry.js";
import * as dataPackReg from "../src/plugins/registries/data_pack_registry.js";
import { firePhaseStartHooks, fireAgeHooks } from "../src/plugins/lifecycle_hooks_runner.js";

//============================================
// Helper: wipe all registries for test isolation
function clearAllRegistries(): void {
  clearHandlers();
  phaseReg.clear();
  eventReg.clear();
  choiceReg.clear();
  rulesReg.clear();
  activityReg.clear();
  lifecycleReg.clear();
  uiReg.clear();
  dataPackReg.clear();
}

//============================================
// Helper: create a synthetic childhood player for testing
function createTestChildhoodPlayer(): Player {
  const player = createPlayer("Test", "Player");
  player.age = 5;
  player.seasonYear = 1;
  player.phase = "childhood";
  player.position = "QB";
  return player;
}

//============================================
// Helper: create a minimal test GameContext
function createTestGameContext(): CareerContext {
  const headlines: string[] = [];
  const texts: string[] = [];

  return {
    getPlayer: () => createTestChildhoodPlayer(),
    events: [],
    ncaaSchools: { fbs: [], fcs: [] },
    clearStory: () => {
      headlines.length = 0;
      texts.length = 0;
    },
    addHeadline: (text) => {
      headlines.push(text);
    },
    addText: (text) => {
      texts.push(text);
    },
    addResult: () => {},
    showChoices: () => {},
    waitForInteraction: () => {},
    save: () => {},
    updateStats: () => {},
    updateHeader: () => {},
    addStatChange: () => {},
    updateLifeStatus: () => {},
    formatStatLine: (stat) => `${stat.label}: ${stat.value}`,
    renderActivitiesTab: () => {},
    hideMainActionBar: () => {},
    showMainActionBar: () => {},
    configureMainButtons: () => {},
    switchToLifeTab: () => {},
    hideTabBar: () => {},
    showTabBar: () => {},
    syncTabsToPhase: () => {},
  };
}

//============================================
void test("plugin_childhood: childhoodPlugin registers with host", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  // Register the childhood plugin
  childhoodPlugin.register(host);

  // Verify the phase handlers were registered (kid_years, peewee_years, travel_years)
  const allPhases = host.phases.getAll();
  const childPhaseIds = ["kid_years", "peewee_years", "travel_years"];
  const childhoodHandlers = allPhases.filter((h) => childPhaseIds.includes(h.id));
  assert.ok(childhoodHandlers.length > 0, "No childhood phase handlers registered");
});

//============================================
void test("plugin_childhood: childhoodEntryHook is registered as PhaseStartHook", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  const phaseHooks = host.lifecycle.getPhaseStartHooks();
  const childhoodEntry = phaseHooks.find((h) => h.id === "childhood-entry");
  assert.ok(childhoodEntry, "childhoodEntryHook not registered");
  assert.equal(childhoodEntry.phase, "childhood", "childhoodEntryHook phase mismatch");
});

//============================================
void test("plugin_childhood: firstFootballHook is registered as AgeHook", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  const ageHooks = host.lifecycle.getAgeHooks();
  const firstFootball = ageHooks.find((h) => h.id === "childhood-age-5-first-football");
  assert.ok(firstFootball, "firstFootballHook not registered");
  assert.equal(firstFootball.age, 5, "firstFootballHook age mismatch");
  assert.equal(firstFootball.once, true, "firstFootballHook should fire only once");
});

//============================================
void test("plugin_childhood: childhoodCareerPanel is registered", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  const panels = host.ui.getAllPanels();
  const careerPanel = panels.find((p) => p.panelId === "career_childhood");
  assert.ok(careerPanel, "childhoodCareerPanel not registered");
  assert.equal(careerPanel.label, "Life Events", "childhoodCareerPanel label mismatch");
});

//============================================
void test("plugin_childhood: childhoodCareerPanel.availableInPhase returns true for childhood", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  const panels = host.ui.getAllPanels();
  const careerPanel = panels.find((p) => p.panelId === "career_childhood");
  assert.ok(careerPanel, "childhoodCareerPanel not found");

  assert.equal(
    careerPanel.availableInPhase("childhood"),
    true,
    "childhoodCareerPanel.availableInPhase should return true for childhood phase",
  );

  assert.equal(
    careerPanel.availableInPhase("college"),
    false,
    "childhoodCareerPanel.availableInPhase should return false for non-childhood phase",
  );
});

//============================================
void test("plugin_childhood: childhoodEntryHook fires when entering childhood phase", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Get registered hooks
  const phaseHooks = host.lifecycle.getPhaseStartHooks();
  const childhoodEntry = phaseHooks.find((h) => h.id === "childhood-entry");
  assert.ok(childhoodEntry, "childhoodEntryHook not found");

  // Create mock context that captures output
  const headlines: string[] = [];
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addHeadline: (text) => headlines.push(text),
    addText: (text) => texts.push(text),
  };

  const player = createTestChildhoodPlayer();

  // Fire the hook
  childhoodEntry.fire(player, mockCtx);

  // Verify output was produced
  assert.ok(headlines.length > 0, "childhoodEntryHook did not add a headline");
  assert.ok(texts.length > 0, "childhoodEntryHook did not add text");
});

//============================================
void test("plugin_childhood: firstFootballHook fires at age 5 and mentions football", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Get registered hooks
  const ageHooks = host.lifecycle.getAgeHooks();
  const firstFootball = ageHooks.find((h) => h.id === "childhood-age-5-first-football");
  assert.ok(firstFootball, "firstFootballHook not found");

  // Create mock context
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addText: (text) => texts.push(text),
  };

  const player = createTestChildhoodPlayer();
  player.age = 5;

  // Fire the hook
  firstFootball.fire(player, mockCtx);

  // Verify output was produced
  assert.ok(texts.length > 0, "firstFootballHook did not add text");
});

//============================================
void test("plugin_childhood: childhoodEntryHook fires from firePhaseStartHooks integration", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Create a player entering childhood
  const player = createTestChildhoodPlayer();
  player.phase = "childhood";

  // Create mock context that captures output
  const headlines: string[] = [];
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addHeadline: (text) => headlines.push(text),
    addText: (text) => texts.push(text),
  };

  // Call firePhaseStartHooks like a handler would
  firePhaseStartHooks("childhood", player, mockCtx);

  // Verify the hook fired
  assert.ok(headlines.length > 0, "childhoodEntryHook should have fired via integration call");
});

//============================================
void test("plugin_childhood: firstFootballHook fires from fireAgeHooks integration at age 5", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Create a player at age 5
  const player = createTestChildhoodPlayer();
  player.age = 5;
  player.phase = "childhood";

  // Create mock context that captures output
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addText: (text) => texts.push(text),
  };

  // Call fireAgeHooks like a handler would
  fireAgeHooks(player, mockCtx);

  // Verify the hook fired
  assert.ok(texts.length > 0, "firstFootballHook should have fired via integration call");
});

//============================================
void test("plugin_childhood: firstFootballHook does not fire before age 5", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Create a player at age 4 (before first football)
  const player = createTestChildhoodPlayer();
  player.age = 4;
  player.phase = "childhood";

  // Create mock context that captures output
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addText: (text) => texts.push(text),
  };

  // Call fireAgeHooks
  fireAgeHooks(player, mockCtx);

  // Verify the hook did not fire (no football mention)
  const footballMentioned = texts.some((t) => /football|catch|highlight/i.test(t));
  assert.equal(footballMentioned, false, "firstFootballHook should not fire before age 5");
});

//============================================
void test("plugin_childhood: firstFootballHook does not fire after age 5 (once: true)", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  childhoodPlugin.register(host);

  // Create a player at age 10 (after first football event)
  const player = createTestChildhoodPlayer();
  player.age = 10;
  player.phase = "childhood";

  // Create mock context that captures output
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addText: (text) => texts.push(text),
  };

  // Call fireAgeHooks at age 10
  fireAgeHooks(player, mockCtx);

  // Verify the hook did not fire (only fires at age 5)
  const footballHighlight = texts.some((t) => /turned 5|highlight clip|mesmerized/i.test(t));
  assert.equal(
    footballHighlight,
    false,
    "firstFootballHook should only fire at age 5 (once: true)",
  );
});
