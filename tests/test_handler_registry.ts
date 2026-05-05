// test_handler_registry.ts - characterization tests for the M3 handler path.
//
// Covers: every age band has exactly one registered handler, handlers carry
// phase-specific season configs (HS/college/NFL feel different), and ages
// outside the registered range are reported correctly. These guard the M3
// invariant: "shared engine, distinct phase adapters" -- not a flat generic
// week. Run with: npx tsx tests/test_handler_registry.ts

import assert from 'node:assert/strict';

import { registerAllHandlers } from '../src/core/register_handlers.js';
import {
	clearHandlers,
	getAllHandlers,
	getHandler,
	hasHandler,
} from '../src/core/year_registry.js';

//============================================
// Re-register from a clean slate so this test is independent of import order.
function withFreshRegistry<T>(fn: () => T): T {
	clearHandlers();
	registerAllHandlers();
	const result = fn();
	clearHandlers();
	return result;
}

//============================================
// Every age 1..39 maps to exactly one handler; ages outside that range do not.
function testCoverage(): void {
	withFreshRegistry(() => {
		for (let age = 1; age <= 39; age++) {
			assert.equal(hasHandler(age), true, `age ${age} has no handler`);
		}
		assert.equal(hasHandler(0), false, 'age 0 should not have a handler');
		assert.equal(hasHandler(40), false, 'age 40 should not have a handler');
	});
}

//============================================
// All 13 expected handler ids are present.
function testRegisteredIds(): void {
	withFreshRegistry(() => {
		const ids = new Set(getAllHandlers().map((h) => h.id));
		const expected = [
			'kid_years', 'peewee', 'travel',
			'hs_frosh_soph', 'hs_varsity',
			'college_entry', 'college_core', 'college_senior',
			'nfl_rookie', 'nfl_early', 'nfl_peak', 'nfl_veteran', 'nfl_late',
		];
		assert.equal(ids.size, expected.length, `expected ${expected.length} handlers, got ${ids.size}`);
		for (const id of expected) {
			assert.ok(ids.has(id), `handler ${id} missing from registry`);
		}
	});
}

//============================================
// Phase-specific season configs feel distinctly different. This is the
// "shared engine, distinct phase adapters" invariant: HS, college, and NFL
// must NOT collapse into the same week shape.
function testSeasonConfigDifferentiation(): void {
	withFreshRegistry(() => {
		const hsVarsity = getHandler(16);
		const collegeCore = getHandler(20);
		const nflPeak = getHandler(28);
		const childhood = getHandler(5);

		assert.ok(hsVarsity.getSeasonConfig, 'hs_varsity must expose a season config');
		assert.ok(collegeCore.getSeasonConfig, 'college_core must expose a season config');
		assert.ok(nflPeak.getSeasonConfig, 'nfl_peak must expose a season config');

		const hs = hsVarsity.getSeasonConfig!({} as never);
		const col = collegeCore.getSeasonConfig!({} as never);
		const nfl = nflPeak.getSeasonConfig!({} as never);

		// Season length differentiation: HS 10, college 11, NFL 17 weeks.
		assert.equal(hs.seasonLength, 10, 'HS varsity should be 10 weeks');
		assert.equal(col.seasonLength, 11, 'college core should be 11 weeks');
		assert.equal(nfl.seasonLength, 17, 'NFL peak should be 17 weeks');

		// Opponent strength scales with level (HS < college < NFL).
		assert.ok(hs.opponentStrengthBase < col.opponentStrengthBase,
			'HS opponents should be weaker than college');
		assert.ok(col.opponentStrengthBase < nfl.opponentStrengthBase,
			'college opponents should be weaker than NFL');

		// Childhood handlers do not run football season machinery.
		const childConfig = childhood.getSeasonConfig
			? childhood.getSeasonConfig({} as never)
			: null;
		if (childConfig !== null) {
			assert.equal(childConfig.hasFootball, false,
				'childhood handler should not have football');
		}
	});
}

//============================================
// Age-band coverage matches the documented bands (no gaps, no overlap).
function testAgeBands(): void {
	withFreshRegistry(() => {
		const handlers = [...getAllHandlers()].sort((a, b) => a.ageStart - b.ageStart);
		for (let i = 1; i < handlers.length; i++) {
			const prev = handlers[i - 1];
			const cur = handlers[i];
			assert.equal(cur.ageStart, prev.ageEnd + 1,
				`gap between ${prev.id} (ends ${prev.ageEnd}) and ${cur.id} (starts ${cur.ageStart})`);
		}
	});
}

//============================================
function main(): void {
	testCoverage();
	testRegisteredIds();
	testSeasonConfigDifferentiation();
	testAgeBands();
	console.log('handler_registry: 4/4 ok');
}

main();
