// test_handler_registry.ts - characterization tests for the M3 handler path.
//
// Covers: every age band has exactly one registered handler, handlers carry
// phase-specific season configs (HS/college/NFL feel different), and ages
// outside the registered range are reported correctly. These guard the M3
// invariant: "shared engine, distinct phase adapters" -- not a flat generic
// week. Run with: npx tsx tests/test_handler_registry.ts

import assert from 'node:assert/strict';

import { registerAllPlugins } from '../src/plugins/register_plugins.js';
import { buildPluginHost } from '../src/plugins/build_host.js';
import {
	clearHandlers,
	getAllHandlers,
	getHandler,
	hasHandler,
} from '../src/core/year_registry.js';

//============================================
// Re-register from a clean slate so this test is independent of import order.
async function withFreshRegistry<T>(fn: () => T): Promise<T> {
	clearHandlers();
	const host = buildPluginHost();
	host.events.clear();
	host.choices.clear();
	host.rules.clear();
	host.ui.clear();
	host.lifecycle.clear();
	host.activities.clear();
	host.dataPacks.clear();
	registerAllPlugins(host);
	const result = fn();
	clearHandlers();
	host.events.clear();
	host.choices.clear();
	host.rules.clear();
	host.ui.clear();
	host.lifecycle.clear();
	host.activities.clear();
	host.dataPacks.clear();
	return result;
}

//============================================
// Every age 1..39 maps to exactly one handler; ages outside that range do not.
async function testCoverage(): Promise<void> {
	await withFreshRegistry(() => {
		for (let age = 1; age <= 39; age++) {
			assert.equal(hasHandler(age), true, `age ${age} has no handler`);
		}
		assert.equal(hasHandler(0), false, 'age 0 should not have a handler');
		assert.equal(hasHandler(40), false, 'age 40 should not have a handler');
	});
}

//============================================
// Phase-specific season configs feel distinctly different. This is the
// "shared engine, distinct phase adapters" invariant: HS, college, and NFL
// must NOT collapse into the same week shape.
async function testSeasonConfigDifferentiation(): Promise<void> {
	await withFreshRegistry(() => {
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

		// Opponent strength scales with level (HS < college < NFL).
		assert.ok(
			hs.opponentStrengthBase < col.opponentStrengthBase,
			'HS opponents should be weaker than college'
		);
		assert.ok(
			col.opponentStrengthBase < nfl.opponentStrengthBase,
			'college opponents should be weaker than NFL'
		);

		// Childhood handlers do not run football season machinery.
		const childConfig = childhood.getSeasonConfig ? childhood.getSeasonConfig({} as never) : null;
		if (childConfig !== null) {
			assert.equal(childConfig.hasFootball, false, 'childhood handler should not have football');
		}
	});
}

//============================================
// Age-band coverage matches the documented bands (no gaps, no overlap).
async function testAgeBands(): Promise<void> {
	await withFreshRegistry(() => {
		const handlers = [...getAllHandlers()].sort((a, b) => a.ageStart - b.ageStart);
		for (let i = 1; i < handlers.length; i++) {
			const prev = handlers[i - 1];
			const cur = handlers[i];
			assert.equal(
				cur.ageStart,
				prev.ageEnd + 1,
				`gap between ${prev.id} (ends ${prev.ageEnd}) and ${cur.id} (starts ${cur.ageStart})`
			);
		}
	});
}

//============================================
async function main(): Promise<void> {
	await testCoverage();
	await testSeasonConfigDifferentiation();
	await testAgeBands();
	console.log('handler_registry: 3/3 ok');
}

main();
