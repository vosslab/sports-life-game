// test_career_stats_view.ts - characterization tests for pickStatColumns in
// src/career_stats_view.ts. Position picks the right stat columns.
//
// Run with: npm run test:node -- --test-name-pattern='career_stats_view'

/// <reference types="node" />

import { test } from "node:test";
import assert from "node:assert/strict";

import { pickStatColumns } from "../src/career_stats_view.js";

//============================================
// Each position picks its signature stat column.
void test("career_stats_view: position picks signature columns", () => {
  assert.ok(pickStatColumns("QB").some((c) => c.key === "passYards"));
  assert.ok(pickStatColumns("RB").some((c) => c.key === "rushYards"));
  assert.ok(pickStatColumns("WR").some((c) => c.key === "receptions"));
  assert.ok(pickStatColumns("LB").some((c) => c.key === "tackles"));
  assert.ok(pickStatColumns("K").some((c) => c.key === "fgMade"));
});

//============================================
// Null position falls back to generic columns.
void test("career_stats_view: null position falls back to generic columns", () => {
  assert.ok(pickStatColumns(null).length > 0);
});
