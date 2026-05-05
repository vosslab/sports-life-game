// rng.ts - canonical seeded RNG for the simulation tree.
//
// All randomness in the simulation tree (src/core, src/weekly, src/simulator,
// src/clutch, src/season, src/high_school, src/college, src/nfl_handlers)
// must flow through this module. Direct Math.random() in those paths is
// forbidden and enforced by tests/check_no_math_random.ts.
//
// The implementation is mulberry32: a fast, well-distributed 32-bit PRNG
// that takes a single 32-bit unsigned seed and produces deterministic output.

//============================================
// Seedable RNG factory. Returns a function that yields a float in [0, 1).
export type Rng = () => number;

//============================================
// Construct a deterministic RNG from a 32-bit seed.
// The same seed always produces the same sequence.
export function createRng(seed: number): Rng {
	// Force seed into an unsigned 32-bit slot so callers can pass any int.
	let state: number = seed >>> 0;
	return function next(): number {
		// mulberry32 step
		state = (state + 0x6d2b79f5) >>> 0;
		let t: number = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

//============================================
// Default shared RNG. Tests and the production game both seed this once at
// startup; simulation modules import `defaultRng` rather than constructing
// their own instance, so the deterministic seed propagates everywhere.
let sharedSeed: number = 0x9e3779b9;
let sharedRng: Rng = createRng(sharedSeed);

//============================================
// Reset the shared RNG to a new seed. Call once at game startup or at the
// start of a deterministic test run. Returns the seed actually applied so
// callers can log it for reproducibility.
export function seedDefaultRng(seed: number): number {
	sharedSeed = seed >>> 0;
	sharedRng = createRng(sharedSeed);
	return sharedSeed;
}

//============================================
// Read the seed currently driving the shared RNG. Useful for save files and
// crash reports that want to reproduce a session.
export function getDefaultSeed(): number {
	return sharedSeed;
}

//============================================
// Draw the next float in [0, 1) from the shared RNG. This is the simulation
// tree's replacement for Math.random().
export function rand(): number {
	return sharedRng();
}

//============================================
// Integer in [min, max] inclusive, using the shared RNG.
export function randInt(min: number, max: number): number {
	const lo: number = Math.min(min, max);
	const hi: number = Math.max(min, max);
	const span: number = hi - lo + 1;
	const draw: number = Math.floor(rand() * span);
	return lo + draw;
}

//============================================
// Float in [min, max), using the shared RNG.
export function randRange(min: number, max: number): number {
	const lo: number = Math.min(min, max);
	const hi: number = Math.max(min, max);
	return lo + rand() * (hi - lo);
}

//============================================
// Pick a uniformly random element from a non-empty array. Throws on empty.
export function randChoice<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new Error('randChoice called with empty array');
	}
	const idx: number = Math.floor(rand() * items.length);
	return items[idx];
}
