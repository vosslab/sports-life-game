// test_rng.ts - unit tests for src/core/rng.ts.
//
// Run with: npx tsx tests/test_rng.ts
// No DOM, no network. Deterministic.

import assert from 'node:assert/strict';

import {
	createRng,
	seedDefaultRng,
	getDefaultSeed,
	rand,
	randInt,
	randRange,
	randChoice,
} from '../src/core/rng.js';

//============================================
// Same seed produces the same sequence.
function testDeterministic(): void {
	const a = createRng(42);
	const b = createRng(42);
	for (let i = 0; i < 100; i++) {
		assert.equal(a(), b(), `divergence at draw ${i}`);
	}
}

//============================================
// Different seeds produce different sequences.
function testSeedSeparation(): void {
	const a = createRng(1);
	const b = createRng(2);
	let differed = false;
	for (let i = 0; i < 10; i++) {
		if (a() !== b()) {
			differed = true;
			break;
		}
	}
	assert.equal(differed, true, 'distinct seeds produced identical streams');
}

//============================================
// Output stays within [0, 1).
function testRange(): void {
	const r = createRng(7);
	for (let i = 0; i < 1000; i++) {
		const v = r();
		assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
	}
}

//============================================
// seedDefaultRng resets the shared sequence.
function testSharedReseed(): void {
	seedDefaultRng(123);
	const first = [rand(), rand(), rand()];
	seedDefaultRng(123);
	const second = [rand(), rand(), rand()];
	assert.deepEqual(first, second, 'reseed did not reproduce stream');
	assert.equal(getDefaultSeed(), 123 >>> 0);
}

//============================================
// randInt is inclusive on both ends and stays in range.
function testRandInt(): void {
	seedDefaultRng(99);
	let sawMin = false;
	let sawMax = false;
	for (let i = 0; i < 5000; i++) {
		const v = randInt(1, 4);
		assert.ok(v >= 1 && v <= 4, `randInt out of range: ${v}`);
		assert.equal(Math.floor(v), v, 'randInt produced non-integer');
		if (v === 1) sawMin = true;
		if (v === 4) sawMax = true;
	}
	assert.ok(sawMin && sawMax, 'randInt did not cover endpoints');
}

//============================================
// randRange honors lo/hi swap and stays half-open.
function testRandRange(): void {
	seedDefaultRng(5);
	for (let i = 0; i < 1000; i++) {
		const v = randRange(10, 5);
		assert.ok(v >= 5 && v < 10, `randRange out of range: ${v}`);
	}
}

//============================================
// randChoice covers all elements over enough draws and rejects empty input.
function testRandChoice(): void {
	seedDefaultRng(11);
	const seen = new Set<string>();
	const items = ['a', 'b', 'c'];
	for (let i = 0; i < 200; i++) {
		seen.add(randChoice(items));
	}
	assert.equal(seen.size, 3, 'randChoice missed an element');
	assert.throws(() => randChoice([]), /empty/);
}

//============================================
function main(): void {
	testDeterministic();
	testSeedSeparation();
	testRange();
	testSharedReseed();
	testRandInt();
	testRandRange();
	testRandChoice();
	console.log('rng: 7/7 ok');
}

main();
