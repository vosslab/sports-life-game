// math_utils.ts - Shared mathematical utilities for statistical models
//
// Exports utility functions for probability distributions and
// random number generation used across play-by-play simulator models.

import { rand } from '../../core/rng.js';

//============================================
// Generate a random number from a normal distribution using Box-Muller transform.
export function randomNormal(mean: number, stddev: number): number {
	const u1 = rand();
	const u2 = rand();
	const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	return mean + z * stddev;
}
