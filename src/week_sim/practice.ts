// practice.ts - non-game weekly practice rep simulation.
//
// Split from `src/week_sim.ts` during M4. Used for backups and bench
// players to compete for snaps during weeks they don't play.

import { Player, clampStat, randomInRange } from '../player.js';
import { calculatePlayerPerformanceScore } from './game.js';
import { calculateLetterGrade } from './momentum.js';
import { DepthChartUpdate } from './depth_chart.js';

//============================================
export interface PracticeResult {
	grade: string;
	storyText: string;
	depthUpdate: DepthChartUpdate;
}

//============================================
// Practice reps for backups and bench players to compete for a starting job
export function runPracticeSession(player: Player): PracticeResult {
	let practiceScore = calculatePlayerPerformanceScore(player);
	practiceScore = clampStat(practiceScore + randomInRange(-6, 10));
	const grade = calculateLetterGrade(practiceScore);

	let storyText = '';
	if (grade === 'A') {
		storyText = 'You dominated practice this week. Coaches could not ignore the tape.';
	} else if (grade === 'B') {
		storyText = 'You had a strong week of practice and looked sharp in team drills.';
	} else if (grade === 'C') {
		storyText = 'Practice was solid, but not enough to force a big conversation yet.';
	} else if (grade === 'D') {
		storyText = 'Practice was rough. Too many mistakes showed up on film.';
	} else {
		storyText = 'It was a bad week on the practice field. Coaches noticed every rep.';
	}

	let depthUpdate: DepthChartUpdate = {
		changed: false,
		newStatus: player.depthChart,
		message: '',
	};

	if (player.depthChart === 'backup' || player.depthChart === 'bench') {
		let promotionChance = 0;
		if (grade === 'A') {
			promotionChance = player.depthChart === 'bench' ? 16 : 28;
		} else if (grade === 'B') {
			promotionChance = player.depthChart === 'bench' ? 6 : 12;
		}

		if (player.core.technique >= 65) {
			promotionChance += 6;
		}
		if (player.core.footballIq >= 65) {
			promotionChance += 5;
		}
		if (player.core.discipline >= 60) {
			promotionChance += 3;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = player.depthChart === 'bench' ? 'backup' : 'starter';
			depthUpdate = {
				changed: true,
				newStatus: player.depthChart,
				message: player.depthChart === 'starter'
					? 'Your practice tape earned you the starting job for this week.'
					: 'Coaches bumped you up the depth chart. You are now the primary backup.',
			};
		}
	}

	return { grade, storyText, depthUpdate };
}
