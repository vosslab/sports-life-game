// test_player_helpers.ts - characterization tests for pure helpers in src/player.ts
// and related modules. These tests run under node:test with no DOM.
//
// Run with: npm run test:node -- --test-name-pattern='player_helpers'
//
// Scope: only deterministic, side-effect-free helpers. Anything that calls
// Math.random or touches DOM is skipped here and revisited in M3/M4.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	clampStat,
	getPositionBucket,
	getAcademicStanding,
	getRelationshipLevel,
} from '../src/player.js';

//============================================
// clampStat saturates at 0 and 100, passes through middle values.
test('player_helpers: clampStat saturates at 0 and 100', () => {
	assert.equal(clampStat(-50), 0);
	assert.equal(clampStat(0), 0);
	assert.equal(clampStat(42), 42);
	assert.equal(clampStat(100), 100);
	assert.equal(clampStat(150), 100);
});

//============================================
// getPositionBucket maps every position to its expected bucket and falls back
// to defender for unknown values.
test('player_helpers: getPositionBucket maps positions to buckets', () => {
	assert.equal(getPositionBucket('QB'), 'passer');
	assert.equal(getPositionBucket('RB'), 'runner_receiver');
	assert.equal(getPositionBucket('WR'), 'runner_receiver');
	assert.equal(getPositionBucket('TE'), 'runner_receiver');
	assert.equal(getPositionBucket('OL'), 'lineman');
	assert.equal(getPositionBucket('DL'), 'lineman');
	assert.equal(getPositionBucket('LB'), 'defender');
	assert.equal(getPositionBucket('CB'), 'defender');
	assert.equal(getPositionBucket('S'), 'defender');
	assert.equal(getPositionBucket('K'), 'kicker');
	assert.equal(getPositionBucket('P'), 'kicker');
});

//============================================
// getAcademicStanding bucket boundaries.
test('player_helpers: getAcademicStanding boundary buckets', () => {
	assert.equal(getAcademicStanding(4.0), 'Honor Roll');
	assert.equal(getAcademicStanding(3.5), 'Honor Roll');
	assert.equal(getAcademicStanding(3.49), 'Good Standing');
	assert.equal(getAcademicStanding(3.0), 'Good Standing');
	assert.equal(getAcademicStanding(2.5), 'Eligible');
	assert.equal(getAcademicStanding(2.0), 'Eligible');
	assert.equal(getAcademicStanding(1.5), 'Academic Probation');
	assert.equal(getAcademicStanding(1.49), 'Ineligible');
	assert.equal(getAcademicStanding(0.0), 'Ineligible');
});

//============================================
// getRelationshipLevel bucket boundaries.
test('player_helpers: getRelationshipLevel boundary buckets', () => {
	assert.equal(getRelationshipLevel(100), 'Close');
	assert.equal(getRelationshipLevel(80), 'Close');
	assert.equal(getRelationshipLevel(79), 'Friendly');
	assert.equal(getRelationshipLevel(60), 'Friendly');
	assert.equal(getRelationshipLevel(40), 'Neutral');
	assert.equal(getRelationshipLevel(20), 'Strained');
	assert.equal(getRelationshipLevel(0), 'Hostile');
});
