// test_helpers.ts - shared test utilities
//
// Provides factory functions for creating test objects.

import type { Player } from "../src/player.js";
import type { CareerContext } from "../src/core/year_handler.js";

//============================================
// Create a minimal test player
export function createTestPlayer(): Player {
  return {
    firstName: "Test",
    lastName: "Player",
    age: 22,
    seasonYear: 1,
    position: "QB",
    teamName: "Test Team",
    teamPalette: {
      primary: "#000000",
      secondary: "#FFFFFF",
      accent: "#0099FF",
      text: "#FFFFFF",
      textSecondary: "#CCCCCC",
    },
    phase: "nfl",
    nflYear: 1,
    collegeYear: 0,
    depthChart: "starter",
    isRedshirt: false,
    eligibilityYears: 4,
    recruitingStars: 5,
    hsName: "Test HS",
    hsMascot: "Tigers",
    townName: "TestTown",
    townMascot: "Hawks",
    core: {
      athleticism: 70,
      technique: 75,
      footballIq: 80,
      discipline: 65,
      health: 85,
      confidence: 70,
    },
    hidden: {
      size: 3,
      leadership: 70,
      durability: 75,
    },
    career: {
      popularity: 50,
      money: 1000000,
    },
    seasonRecord: {
      wins: 0,
      losses: 0,
    },
    seasonStats: {
      gamesPlayed: 0,
      totalYards: 0,
      totalTouchdowns: 0,
      passYards: 0,
      passTds: 0,
      passInts: 0,
      completions: 0,
      attempts: 0,
      rushYards: 0,
      carries: 0,
      rushTds: 0,
      fumbles: 0,
      receptions: 0,
      recYards: 0,
      recTds: 0,
      targets: 0,
      tackles: 0,
      sacks: 0,
      ints: 0,
      fgMade: 0,
      fgAttempts: 0,
      xpMade: 0,
      xpAttempts: 0,
      playerOfTheWeekCount: 0,
    },
    bigDecisions: [],
    seenEventIds: {},
    seenEventFamilies: {},
    eventTagCounts: {},
    storyFlags: {},
  } as unknown as Player;
}

//============================================
// Create a minimal test context
export function createTestContext(): CareerContext {
  return {
    getPlayer: () => createTestPlayer(),
    events: [],
    ncaaSchools: { fbs: [], fcs: [] },
    addHeadline: (_text: string) => {},
    addText: (_text: string) => {},
    addResult: (_text: string) => {},
    clearStory: () => {},
    save: () => {},
    updateHeader: () => {},
    updateStats: () => {},
    syncTabsToPhase: () => {},
    waitForInteraction: () => {},
    switchToLife: () => {},
    addModalHeader: () => {},
    addModalText: () => {},
    addModalChoice: () => {},
    showModal: () => {},
  } as unknown as CareerContext;
}
