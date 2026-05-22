// test_dev_jump.ts - characterization tests for dev-jump player factory.
//
// Covers: all five phases (childhood, high_school, college, nfl, legacy) produce
// valid Player objects with phase-appropriate fields, correct age, correct phase,
// and stats that pass invariant checks. Run with:
// npm run test:node -- --test-name-pattern='dev_jump'

/// <reference types="node" />

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyDevJump, parseDevJumpParams, DEFAULT_NFL_TEAM_ID } from '../src/dev/dev_jump.js';
import { buildPluginHost } from '../src/plugins/build_host.js';

//============================================
// Helper: verify a Player has the essential shape
function assertPlayerShape(player: unknown): void {
	assert.ok(player !== null && typeof player === 'object', 'player must be an object');
	const p = player as Record<string, unknown>;
	assert.ok(typeof p.firstName === 'string', 'firstName must be a string');
	assert.ok(typeof p.lastName === 'string', 'lastName must be a string');
	assert.ok(typeof p.age === 'number', 'age must be a number');
	assert.ok(typeof p.phase === 'string', 'phase must be a string');
	assert.ok(p.core !== null && typeof p.core === 'object', 'core stats must exist');
	assert.ok(p.career !== null && typeof p.career === 'object', 'career stats must exist');
	assert.ok(p.hidden !== null && typeof p.hidden === 'object', 'hidden stats must exist');
	assert.ok(p.seasonStats !== null && typeof p.seasonStats === 'object', 'seasonStats must exist');
	assert.ok(typeof p.seasonYear === 'number', 'seasonYear must be a number');
}

//============================================
// Childhood phase test
void test('dev_jump: childhood phase creates valid player at age 5', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'childhood', age: 5 });

	assertPlayerShape(player);
	assert.equal(player.phase, 'childhood', 'phase should be childhood');
	assert.equal(player.age, 5, 'age should be 5');
	assert.equal(player.position, null, 'childhood player should have no position');
	assert.equal(player.positionBucket, null, 'childhood player should have no position bucket');
	assert.equal(player.teamName, '', 'childhood player should have no team');
	assert.equal(player.townName, '', 'childhood player should have no town');
	assert.ok(
		player.core.athleticism >= 0 && player.core.athleticism <= 100,
		'athleticism stat clamped'
	);
	assert.ok(player.core.health >= 0 && player.core.health <= 100, 'health stat clamped');
});

//============================================
// High school phase test
void test('dev_jump: high_school phase creates QB with school identity at age 16', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'high_school', age: 16 });

	assertPlayerShape(player);
	assert.equal(player.phase, 'high_school', 'phase should be high_school');
	assert.equal(player.age, 16, 'age should be 16');
	assert.equal(player.position, 'QB', 'position should be QB');
	assert.equal(player.positionBucket, 'passer', 'position bucket should be passer');
	assert.equal(player.hsName, 'Central High', 'high school name should be set');
	assert.equal(player.hsMascot, 'Wildcats', 'high school mascot should be set');
	assert.equal(player.teamName, 'Central High', 'team name should be school name');
});

//============================================
// College phase test
void test('dev_jump: college phase creates QB with year and GPA at age 20', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'college', age: 20 });

	assertPlayerShape(player);
	assert.equal(player.phase, 'college', 'phase should be college');
	assert.equal(player.age, 20, 'age should be 20');
	assert.equal(player.position, 'QB', 'position should be QB');
	assert.equal(player.positionBucket, 'passer', 'position bucket should be passer');
	assert.equal(player.collegeYear, 2, 'college year should be 2 (age 20 - 18)');
	assert.equal(player.teamName, 'State University', 'team name should be college');
	assert.equal(player.gpa, 3.0, 'GPA should be 3.0');
	assert.equal(player.eligibilityYears, 4, 'eligibility years should be 4');
});

//============================================
// NFL phase test without team parameter
void test('dev_jump: nfl phase creates starter QB at age 24 without explicit team', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'nfl', age: 24 });

	assertPlayerShape(player);
	assert.equal(player.phase, 'nfl', 'phase should be nfl');
	assert.equal(player.age, 24, 'age should be 24');
	assert.equal(player.position, 'QB', 'position should be QB');
	assert.equal(player.positionBucket, 'passer', 'position bucket should be passer');
	assert.equal(player.nflYear, 2, 'NFL year should be 2 (age 24 - 22)');
	assert.equal(player.depthChart, 'starter', 'NFL player should start as starter');
	assert.equal(
		player.nflTeamId,
		DEFAULT_NFL_TEAM_ID,
		'default NFL team should match DEFAULT_NFL_TEAM_ID'
	);
	assert.ok(player.careerHistory.length > 0, 'should have career history');
});

//============================================
// NFL phase test with team parameter
void test('dev_jump: nfl phase with explicit team parameter at age 26', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'nfl', age: 26, team: 'KC' });

	assertPlayerShape(player);
	assert.equal(player.phase, 'nfl', 'phase should be nfl');
	assert.equal(player.age, 26, 'age should be 26');
	assert.equal(player.nflTeamId, 'KC', 'team should be KC');
	assert.equal(player.teamName, 'KC', 'team name should match team ID');
	assert.equal(player.nflYear, 4, 'NFL year should be 4 (age 26 - 22)');
	// Should have career history
	assert.ok(player.careerHistory.length > 0, 'should have career history');
});

//============================================
// Legacy phase test
void test('dev_jump: legacy phase creates retired player at age 35', () => {
	const host = buildPluginHost();
	const player = applyDevJump(host, { phase: 'legacy', age: 35 });

	assertPlayerShape(player);
	assert.equal(player.phase, 'legacy', 'phase should be legacy');
	assert.equal(player.age, 35, 'age should be 35');
	assert.equal(player.nflYear, 13, 'NFL year should be 13 (age 35 - 22)');
	assert.ok(player.careerHistory.length > 0, 'should have career history');
	// Legacy players have decayed athleticism
	assert.ok(player.core.athleticism < 100, 'athleticism decayed with age');
	assert.ok(player.core.health <= 100, 'health clamped');
});

//============================================
// Season year determinism test
void test('dev_jump: season year is deterministic based on age', () => {
	const host = buildPluginHost();
	const player1 = applyDevJump(host, { phase: 'nfl', age: 25 });
	const player2 = applyDevJump(host, { phase: 'college', age: 25 });

	const BASE_YEAR = 2010;
	const expectedYear = BASE_YEAR + 25;
	assert.equal(player1.seasonYear, expectedYear, 'NFL player season year derived from age');
	assert.equal(player2.seasonYear, expectedYear, 'College player season year derived from age');
});

//============================================
// Avatar config is set
void test('dev_jump: avatar config is set for all phases', () => {
	const host = buildPluginHost();
	const phases: Array<'childhood' | 'high_school' | 'college' | 'nfl' | 'legacy'> = [
		'childhood',
		'high_school',
		'college',
		'nfl',
		'legacy',
	];

	for (const phase of phases) {
		const player = applyDevJump(host, { phase, age: 20 });
		assert.ok(player.avatarConfig !== null, `${phase} should have avatarConfig`);
		assert.ok(player.avatarConfig.skinTone !== undefined, `${phase} avatar should have skinTone`);
		assert.ok(player.avatarConfig.hairColor !== undefined, `${phase} avatar should have hairColor`);
	}
});

//============================================
// Parsedev jump params test
void test('dev_jump: parseDevJumpParams parses valid URL params', () => {
	const result = parseDevJumpParams('?dev=nfl&age=24&team=KC');
	assert.ok(result !== null, 'should parse valid params');
	assert.equal(result.phase, 'nfl', 'should extract phase');
	assert.equal(result.age, 24, 'should extract age');
	assert.equal(result.team, 'KC', 'should extract team');
});

//============================================
// Parse dev jump params with invalid phase
void test('dev_jump: parseDevJumpParams rejects invalid phase', () => {
	const result = parseDevJumpParams('?dev=invalid&age=24');
	assert.equal(result, null, 'should reject invalid phase');
});

//============================================
// Parse dev jump params with missing dev param
void test('dev_jump: parseDevJumpParams rejects missing dev param', () => {
	const result = parseDevJumpParams('?age=24');
	assert.equal(result, null, 'should reject missing dev param');
});

//============================================
// Parse dev jump params with invalid age
void test('dev_jump: parseDevJumpParams rejects negative age', () => {
	const result = parseDevJumpParams('?dev=nfl&age=-5');
	assert.equal(result, null, 'should reject negative age');
});
