// momentum.ts - performance ratings, letter grades, and weekly momentum.
//
// Split from `src/week_sim.ts` during M4. Pure scoring helpers shared by the
// game simulator and the UI summary panels.

import { PerformanceRating } from '../player.js';

//============================================
// Update momentum based on game performance.
// Momentum is a -10..+10 scalar that decays toward 0 each week.
export function updateMomentum(
	currentMomentum: number, rating: PerformanceRating,
): number {
	let newMomentum = currentMomentum;

	// Apply momentum changes based on performance rating
	switch (rating) {
		case 'elite':
			newMomentum += 3;
			break;
		case 'great':
			newMomentum += 2;
			break;
		case 'good':
			newMomentum += 1;
			break;
		case 'below_average':
			newMomentum -= 2;
			break;
		case 'poor':
			newMomentum -= 3;
			break;
		// 'average' has no change
	}

	// Decay momentum toward 0 each week
	newMomentum *= 0.7;

	// Clamp to range -10 to +10
	return Math.max(-10, Math.min(10, newMomentum));
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

//============================================
// Convert performance score into a report-card grade
export function calculateLetterGrade(score: number): string {
	if (score >= 85) {
		return 'A';
	}
	if (score >= 70) {
		return 'B';
	}
	if (score >= 55) {
		return 'C';
	}
	if (score >= 40) {
		return 'D';
	}
	return 'F';
}
