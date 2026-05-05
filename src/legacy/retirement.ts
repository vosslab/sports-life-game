// legacy/retirement.ts - Career completion and Hall of Fame logic
//
// Handles the legacy phase: displays career summary, Hall of Fame
// eligibility, key moments, and restart flow.

import type { Player } from '../player.js';
import { waitForInteraction } from '../ui/index.js';

//============================================
// Context interface

export interface RetirementContext {
	player: Player;
	addStoryHeadline: (text: string) => void;
	addStoryText: (text: string) => void;
	clearStory: () => void;
	hardClearStory: () => void;
	save: () => void;
	syncTabsToPhase: (phase: Player['phase']) => void;
	switchToLife: () => void;
	deleteSave: () => void;
	onRestart: () => void;
}

//============================================
// Show retirement flow

export function showRetirement(ctx: RetirementContext): void {
	ctx.clearStory();
	ctx.addStoryHeadline('Career Complete');
	waitForInteraction('Career Complete', [
		{
			text: 'View Legacy',
			primary: true,
			action: () => {
				const player = ctx.player;
				player.phase = 'legacy';
				ctx.save();
				ctx.syncTabsToPhase(player.phase);
				ctx.switchToLife();
				ctx.clearStory();
				ctx.addStoryHeadline('The End of an Era');
				ctx.addStoryText(
					`After ${player.nflYear} NFL seasons, ` +
					'you hang up the cleats.'
				);
				ctx.addStoryText(
					`Career earnings: $${player.career.money.toLocaleString()}`
				);
				const avgStats = Math.round(
					(player.core.technique + player.core.footballIq +
					player.core.athleticism + player.core.confidence) / 4
				);
				if (player.nflYear >= 10 && avgStats >= 65) {
					ctx.addStoryHeadline('Hall of Fame');
					ctx.addStoryText(
						'Years from now, you stand at the podium ' +
						'in Canton.'
					);
				} else if (player.nflYear >= 7 && avgStats >= 55) {
					ctx.addStoryText(
						'You may not make the Hall of Fame, but ' +
						'you had a great career.'
					);
				} else {
					ctx.addStoryText(
						'You made it to the NFL. Not many people ' +
						'can say that.'
					);
				}
				ctx.addStoryHeadline('Your Legacy');
				if (player.bigDecisions.length > 0) {
					ctx.addStoryText('Key moments:');
					for (const d of player.bigDecisions) {
						ctx.addStoryText(`- ${d}`);
					}
				}
				ctx.addStoryText('Thank you for playing Gridiron Life.');
				waitForInteraction('Career Over', [
					{
						text: 'Start a New Career',
						primary: true,
						action: () => {
							ctx.deleteSave();
							ctx.hardClearStory();
							ctx.onRestart();
						},
					},
				]);
			},
		},
	]);
}
