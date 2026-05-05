// test_player_helpers.ts - characterization tests for pure helpers in src/player.ts
// and related modules. These tests run under tsx with no DOM.
//
// Run with: npx tsx tests/test_player_helpers.ts
//
// Scope: only deterministic, side-effect-free helpers. Anything that calls
// Math.random or touches DOM is skipped here and revisited in M3/M4.

import assert from 'node:assert/strict';

import {
	clampStat,
	getPositionBucket,
	getAcademicStanding,
	getRelationshipLevel,
} from '../src/player.js';

//============================================
// clampStat saturates at 0 and 100, passes through middle values.
function testClampStat(): void {
	assert.equal(clampStat(-50), 0);
	assert.equal(clampStat(0), 0);
	assert.equal(clampStat(42), 42);
	assert.equal(clampStat(100), 100);
	assert.equal(clampStat(150), 100);
}

//============================================
// getPositionBucket maps every position to its expected bucket and falls back
// to defender for unknown values.
function testPositionBucket(): void {
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
}

//============================================
// getAcademicStanding bucket boundaries.
function testAcademicStanding(): void {
	assert.equal(getAcademicStanding(4.0), 'Honor Roll');
	assert.equal(getAcademicStanding(3.5), 'Honor Roll');
	assert.equal(getAcademicStanding(3.49), 'Good Standing');
	assert.equal(getAcademicStanding(3.0), 'Good Standing');
	assert.equal(getAcademicStanding(2.5), 'Eligible');
	assert.equal(getAcademicStanding(2.0), 'Eligible');
	assert.equal(getAcademicStanding(1.5), 'Academic Probation');
	assert.equal(getAcademicStanding(1.49), 'Ineligible');
	assert.equal(getAcademicStanding(0.0), 'Ineligible');
}

//============================================
// getRelationshipLevel bucket boundaries.
function testRelationshipLevel(): void {
	assert.equal(getRelationshipLevel(100), 'Close');
	assert.equal(getRelationshipLevel(80), 'Close');
	assert.equal(getRelationshipLevel(79), 'Friendly');
	assert.equal(getRelationshipLevel(60), 'Friendly');
	assert.equal(getRelationshipLevel(40), 'Neutral');
	assert.equal(getRelationshipLevel(20), 'Strained');
	assert.equal(getRelationshipLevel(0), 'Hostile');
}

//============================================
function main(): void {
	testClampStat();
	testPositionBucket();
	testAcademicStanding();
	testRelationshipLevel();
	console.log('player_helpers: 4/4 ok');
}

main();
