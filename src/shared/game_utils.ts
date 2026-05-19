// game_utils.ts - Shared game and simulation utilities
//
// Exports utility functions used across game simulation modules:
// - rollOvertimePoints: randomize OT touchdown point value
// - calculatePerformanceRating: convert numeric score to performance tier

import { randInt } from '../core/rng.js';
import type { PerformanceRating } from '../player.js';

//============================================
// Randomize overtime touchdown point value (3, 6, or 7)
export function rollOvertimePoints(): number {
	const roll = randInt(1, 100);
	if (roll <= 55) {
		return 3;
	}
	if (roll <= 95) {
		return 7;
	}
	return 6;
}

//============================================
// Calculate performance rating from a 0-100 score
export function calculatePerformanceRating(score: number): PerformanceRating {
	if (score >= 86) {
		return 'elite';
	}
	if (score >= 71) {
		return 'great';
	}
	if (score >= 56) {
		return 'good';
	}
	if (score >= 41) {
		return 'average';
	}
	if (score >= 21) {
		return 'below_average';
	}
	return 'poor';
}
