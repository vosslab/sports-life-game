// depth_chart.ts - week-to-week depth chart promotions and demotions.
//
// Split from `src/week_sim.ts` during M4. Uses the player's letter grade
// from the most recent game plus a few stat thresholds to decide whether to
// move them up or down the depth chart.

import { DepthChartStatus, Player, randomInRange } from '../player.js';

//============================================
export interface DepthChartUpdate {
	changed: boolean;
	newStatus: DepthChartStatus;
	message: string;
}

//============================================
// Adjust depth chart week-to-week based on grade and current role
export function evaluateDepthChartUpdate(
	player: Player,
	playerGrade: string,
): DepthChartUpdate {
	if (player.depthChart === 'starter') {
		let demotionChance = 0;
		if (playerGrade === 'D') {
			demotionChance = 18;
		} else if (playerGrade === 'F') {
			demotionChance = 42;
		}

		if (demotionChance > 0 && randomInRange(1, 100) <= demotionChance) {
			player.depthChart = 'backup';
			return {
				changed: true,
				newStatus: 'backup',
				message: 'Coach was not happy with that showing. You got bumped down to backup for now.',
			};
		}
	}

	if (player.depthChart === 'backup') {
		let promotionChance = 0;
		if (playerGrade === 'A') {
			promotionChance = 35;
		} else if (playerGrade === 'B') {
			promotionChance = 18;
		} else if (playerGrade === 'C') {
			promotionChance = 4;
		}

		if (player.core.technique >= 60) {
			promotionChance += 8;
		}
		if (player.core.footballIq >= 60) {
			promotionChance += 6;
		}
		if (player.core.confidence >= 60) {
			promotionChance += 4;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = 'starter';
			return {
				changed: true,
				newStatus: 'starter',
				message: 'Coach saw enough. You are moving up to the starting lineup next week.',
			};
		}
	}

	// Bench -> backup promotion path
	if (player.depthChart === 'bench') {
		let promotionChance = 0;
		if (playerGrade === 'A') {
			promotionChance = 24;
		} else if (playerGrade === 'B') {
			promotionChance = 12;
		} else if (playerGrade === 'C') {
			promotionChance = 4;
		}

		// Stat bonuses help bench players earn a look
		if (player.core.technique >= 55) {
			promotionChance += 8;
		}
		if (player.core.footballIq >= 55) {
			promotionChance += 6;
		}
		if (player.core.discipline >= 50) {
			promotionChance += 4;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = 'backup';
			return {
				changed: true,
				newStatus: 'backup',
				message: 'Coaches saw your effort in practice. You earned the backup role.',
			};
		}
	}

	return {
		changed: false,
		newStatus: player.depthChart,
		message: '',
	};
}
