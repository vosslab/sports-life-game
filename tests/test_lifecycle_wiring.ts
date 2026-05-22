// test_lifecycle_wiring.ts - verify lifecycle hooks fire in correct handlers
//
// Tests that:
// - NFL handlers fire phase and age hooks
// - Childhood handlers fire phase and age hooks
// - Career end hooks fire on retirement
//
// Run with: npm run test:node -- --test-name-pattern='lifecycle_wiring'

/// <reference types="node" />

import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Player } from '../src/player.js';
import type { CareerContext } from '../src/core/year_handler.js';
import { createTestPlayer, createTestContext } from './test_helpers.js';
import {
	firePhaseStartHooks,
	fireAgeHooks,
	fireCareerEndHooks,
} from '../src/plugins/lifecycle_hooks_runner.js';
import * as lifecycleReg from '../src/plugins/registries/lifecycle_registry.js';
import type { AgeHook, PhaseStartHook, CareerEndHook } from '../src/plugins/plugin_host.js';

//============================================
// Test: NFL phase start hook fires when phase transitions to NFL
void test('lifecycle_wiring: nfl phase start hook fires', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const nflPhaseHook: PhaseStartHook = {
		id: 'test-nfl-phase',
		phase: 'nfl',
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerPhaseStartHook(nflPhaseHook);

	const player = createTestPlayer();
	player.phase = 'nfl';
	const ctx = createTestContext();

	firePhaseStartHooks('nfl', player, ctx);

	assert.equal(hookFired.length, 1, 'nfl phase hook should fire exactly once');
});

//============================================
// Test: Childhood phase start hook fires when phase transitions to childhood
void test('lifecycle_wiring: childhood phase start hook fires', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const childPhaseHook: PhaseStartHook = {
		id: 'test-childhood-phase',
		phase: 'childhood',
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerPhaseStartHook(childPhaseHook);

	const player = createTestPlayer();
	player.phase = 'childhood';
	player.age = 1;
	const ctx = createTestContext();

	firePhaseStartHooks('childhood', player, ctx);

	assert.equal(hookFired.length, 1, 'childhood phase hook should fire exactly once');
});

//============================================
// Test: Age hook fires when age matches
void test('lifecycle_wiring: age hook fires for exact age match', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const ageHook: AgeHook = {
		id: 'test-age-22',
		age: 22,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerAgeHook(ageHook);

	const player = createTestPlayer();
	player.age = 22;
	const ctx = createTestContext();

	fireAgeHooks(player, ctx);

	assert.equal(hookFired.length, 1, 'age 22 hook should fire when player age is 22');
});

//============================================
// Test: Age hook fires when age is in range
void test('lifecycle_wiring: age hook fires for age range match', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const ageRangeHook: AgeHook = {
		id: 'test-age-range',
		ageRange: [8, 10],
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerAgeHook(ageRangeHook);

	const player = createTestPlayer();
	player.age = 9;
	const ctx = createTestContext();

	fireAgeHooks(player, ctx);

	assert.equal(hookFired.length, 1, 'age range hook should fire when player age is within range');
});

//============================================
// Test: Career end hook fires on retirement
void test('lifecycle_wiring: career end hook fires on retirement', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const retirementHook: CareerEndHook = {
		id: 'test-retirement',
		trigger: 'retirement',
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerCareerEndHook(retirementHook);

	const player = createTestPlayer();
	const ctx = createTestContext();

	fireCareerEndHooks('retirement', player, ctx);

	assert.equal(hookFired.length, 1, 'retirement hook should fire on retirement trigger');
});

//============================================
// Test: Age hook does not fire if age does not match
void test('lifecycle_wiring: age hook does not fire for non-matching age', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const ageHook: AgeHook = {
		id: 'test-age-30',
		age: 30,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerAgeHook(ageHook);

	const player = createTestPlayer();
	player.age = 22;
	const ctx = createTestContext();

	fireAgeHooks(player, ctx);

	assert.equal(hookFired.length, 0, 'age 30 hook should not fire when player age is 22');
});

//============================================
// Test: Career end hook does not fire for different trigger
void test('lifecycle_wiring: career end hook does not fire for different trigger', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const hofHook: CareerEndHook = {
		id: 'test-hof',
		trigger: 'hof_eligibility',
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerCareerEndHook(hofHook);

	const player = createTestPlayer();
	const ctx = createTestContext();

	fireCareerEndHooks('retirement', player, ctx);

	assert.equal(hookFired.length, 0, 'hof_eligibility hook should not fire on retirement trigger');
});

//============================================
// Test: Hook with condition only fires if condition is true
void test('lifecycle_wiring: hook with true condition fires', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const conditionalHook: AgeHook = {
		id: 'test-conditional-true',
		age: 22,
		condition: (player: Player) => player.core.athleticism > 50,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerAgeHook(conditionalHook);

	const player = createTestPlayer();
	player.age = 22;
	player.core.athleticism = 60;
	const ctx = createTestContext();

	fireAgeHooks(player, ctx);

	assert.equal(hookFired.length, 1, 'hook with satisfied condition should fire');
});

//============================================
// Test: Hook with condition does not fire if condition is false
void test('lifecycle_wiring: hook with false condition does not fire', () => {
	lifecycleReg.clear();

	const hookFired: boolean[] = [];
	const conditionalHook: AgeHook = {
		id: 'test-conditional-false',
		age: 22,
		condition: (player: Player) => player.core.athleticism > 80,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFired.push(true);
		},
	};

	lifecycleReg.registerAgeHook(conditionalHook);

	const player = createTestPlayer();
	player.age = 22;
	player.core.athleticism = 60;
	const ctx = createTestContext();

	fireAgeHooks(player, ctx);

	assert.equal(hookFired.length, 0, 'hook with unsatisfied condition should not fire');
});

//============================================
// Test: Phase start hook fires only once even if called multiple times (idempotent)
void test('lifecycle_wiring: phase start hook is idempotent (fires only once)', () => {
	lifecycleReg.clear();

	const hookFireCount: number[] = [];
	const hsPhaseHook: PhaseStartHook = {
		id: 'test-hs-phase-idempotent',
		phase: 'high_school',
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFireCount.push(1);
		},
	};

	lifecycleReg.registerPhaseStartHook(hsPhaseHook);

	const player = createTestPlayer();
	player.phase = 'high_school';
	player.age = 14;
	const ctx = createTestContext();

	// Call firePhaseStartHooks three times (simulating multiple years in the phase)
	firePhaseStartHooks('high_school', player, ctx);
	firePhaseStartHooks('high_school', player, ctx);
	firePhaseStartHooks('high_school', player, ctx);

	assert.equal(
		hookFireCount.length,
		1,
		'phase start hook should fire exactly once even if called multiple times'
	);
});

//============================================
// Test: Age hook with once: true fires only once even if called multiple times (idempotent)
void test('lifecycle_wiring: age hook with once: true is idempotent (fires only once)', () => {
	lifecycleReg.clear();

	const hookFireCount: number[] = [];
	const onceAgeHook: AgeHook = {
		id: 'test-age-hook-once-true',
		age: 22,
		once: true,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFireCount.push(1);
		},
	};

	lifecycleReg.registerAgeHook(onceAgeHook);

	const player = createTestPlayer();
	player.age = 22;
	const ctx = createTestContext();

	// Call fireAgeHooks three times at same age (simulating multiple years on resume, etc.)
	fireAgeHooks(player, ctx);
	fireAgeHooks(player, ctx);
	fireAgeHooks(player, ctx);

	assert.equal(
		hookFireCount.length,
		1,
		'age hook with once: true should fire exactly once even if called multiple times'
	);
});

//============================================
// Test: Age hook with once: false fires every time
void test('lifecycle_wiring: age hook with once: false fires every time', () => {
	lifecycleReg.clear();

	const hookFireCount: number[] = [];
	const alwaysAgeHook: AgeHook = {
		id: 'test-age-hook-once-false',
		age: 22,
		once: false,
		fire: (_player: Player, _ctx: CareerContext) => {
			hookFireCount.push(1);
		},
	};

	lifecycleReg.registerAgeHook(alwaysAgeHook);

	const player = createTestPlayer();
	player.age = 22;
	const ctx = createTestContext();

	// Call fireAgeHooks three times at same age
	fireAgeHooks(player, ctx);
	fireAgeHooks(player, ctx);
	fireAgeHooks(player, ctx);

	assert.equal(hookFireCount.length, 3, 'age hook with once: false should fire every time');
});
