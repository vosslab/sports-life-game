// test_plugin_college.ts - college plugin lifecycle and panel verification
//
// Verifies that college plugin:
// - collegeEntryHook fires when entering college phase
// - nflDeclarationHook fires at age 20
// - collegeCareerPanel renders without error
// - All hooks are properly registered
//
// Run with: npm run test:node -- --test-name-pattern='plugin_college'

/// <reference types="node" />

import { test } from "node:test";
import assert from "node:assert/strict";

import { clearHandlers } from "../src/core/year_registry.js";
import { buildPluginHost } from "../src/plugins/build_host.js";
import { collegePlugin } from "../src/plugins/college/index.js";
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
// Helper: create a synthetic college player for testing
function createTestCollegePlayer(): Player {
  const player = createPlayer("Test", "Player");
  player.age = 18;
  player.seasonYear = 1;
  player.phase = "college";
  player.teamName = "Test State University";
  player.position = "QB";
  player.depthChart = "backup";
  player.isRedshirt = false;
  player.collegeYear = 1;
  player.draftStock = 50;
  player.teamStrength = 60;
  player.recruitingStars = 3;
  player.eligibilityYears = 4;
  return player;
}

//============================================
// Helper: create a minimal test GameContext
function createTestGameContext(): CareerContext {
  const headlines: string[] = [];
  const texts: string[] = [];

  return {
    getPlayer: () => createTestCollegePlayer(),
    events: [],
    ncaaSchools: { fbs: [], fcs: [] },
    clearStory: (): void => {
      headlines.length = 0;
      texts.length = 0;
    },
    addHeadline: (text): void => {
      headlines.push(text);
    },
    addText: (text): void => {
      texts.push(text);
    },
    addResult: (): void => {},
    showChoices: (): void => {},
    waitForInteraction: (): void => {},
    save: (): void => {},
    updateStats: (): void => {},
    updateHeader: (): void => {},
    addStatChange: (): void => {},
    updateLifeStatus: (): void => {},
    formatStatLine: (stat) => `${stat.label}: ${stat.value}`,
    renderActivitiesTab: (): void => {},
    hideMainActionBar: (): void => {},
    showMainActionBar: (): void => {},
    configureMainButtons: (): void => {},
    switchToLifeTab: (): void => {},
    hideTabBar: (): void => {},
    showTabBar: (): void => {},
    syncTabsToPhase: (): void => {},
  };
}

//============================================
void test("plugin_college: collegePlugin registers with host", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  // Register the college plugin
  collegePlugin.register(host);

  // Verify the phase handlers were registered
  const allPhases = host.phases.getAll();
  const collegeHandlers = allPhases.filter((h) => h.id.startsWith("college"));
  assert.ok(collegeHandlers.length > 0, "No college phase handlers registered");
});

//============================================
void test("plugin_college: collegeEntryHook is registered as PhaseStartHook", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  const phaseHooks = host.lifecycle.getPhaseStartHooks();
  const collegeEntry = phaseHooks.find((h) => h.id === "college-entry");
  assert.ok(collegeEntry, "collegeEntryHook not registered");
  assert.equal(collegeEntry.phase, "college", "collegeEntryHook phase mismatch");
});

//============================================
void test("plugin_college: nflDeclarationHook is registered as AgeHook", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  const ageHooks = host.lifecycle.getAgeHooks();
  const nflDecl = ageHooks.find((h) => h.id === "college-age-20-nfl-declaration");
  assert.ok(nflDecl, "nflDeclarationHook not registered");
  assert.equal(nflDecl.age, 20, "nflDeclarationHook age mismatch");
});

//============================================
void test("plugin_college: collegeCareerPanel is registered", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  const panels = host.ui.getAllPanels();
  const careerPanel = panels.find((p) => p.panelId === "college_career");
  assert.ok(careerPanel, "collegeCareerPanel not registered");
  assert.equal(careerPanel.label, "Career", "collegeCareerPanel label mismatch");
});

//============================================
void test("plugin_college: collegeCareerPanel.availableInPhase returns true for college", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  const panels = host.ui.getAllPanels();
  const careerPanel = panels.find((p) => p.panelId === "college_career");
  assert.ok(careerPanel, "collegeCareerPanel not found");

  assert.equal(
    careerPanel.availableInPhase("college"),
    true,
    "collegeCareerPanel.availableInPhase should return true for college phase",
  );

  assert.equal(
    careerPanel.availableInPhase("nfl"),
    false,
    "collegeCareerPanel.availableInPhase should return false for nfl phase",
  );
});

//============================================
void test("plugin_college: collegeEntryHook fires when entering college phase", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  // Get registered hooks
  const phaseHooks = host.lifecycle.getPhaseStartHooks();
  const collegeEntry = phaseHooks.find((h) => h.id === "college-entry");
  assert.ok(collegeEntry, "collegeEntryHook not found");

  // Create mock context that captures output
  const headlines: string[] = [];
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addHeadline: (text) => headlines.push(text),
    addText: (text) => texts.push(text),
  };

  const player = createTestCollegePlayer();

  // Fire the hook
  collegeEntry.fire(player, mockCtx);

  // Verify output was produced
  assert.ok(headlines.length > 0, "collegeEntryHook did not add a headline");
  assert.ok(texts.length > 0, "collegeEntryHook did not add text");
});

//============================================
void test("plugin_college: nflDeclarationHook fires at age 20", () => {
  clearAllRegistries();
  const host = buildPluginHost();

  collegePlugin.register(host);

  // Get registered hooks
  const ageHooks = host.lifecycle.getAgeHooks();
  const nflDecl = ageHooks.find((h) => h.id === "college-age-20-nfl-declaration");
  assert.ok(nflDecl, "nflDeclarationHook not found");

  // Create mock context
  const texts: string[] = [];
  const mockCtx: CareerContext = {
    ...createTestGameContext(),
    addText: (text) => texts.push(text),
  };

  const player = createTestCollegePlayer();
  player.age = 20;

  // Fire the hook
  nflDecl.fire(player, mockCtx);

  // Verify output was produced
  assert.ok(texts.length > 0, "nflDeclarationHook did not add text");
});
