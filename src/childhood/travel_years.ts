// travel_years.ts - ages 11-13: travel team football
//
// Same town/mascot as peewee. Play against other schools.
// 8-game season. Depth chart introduced (starter/backup).
// Position can shift based on growth.
// 1 life event per year alongside football setup.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { filterEvents, selectEvent, applyEventChoice, GameEvent } from '../events.js';

//============================================
export const travelHandler: YearHandler = {
	id: 'travel',
	ageStart: 11,
	ageEnd: 13,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Same team as peewee
		player.teamName = `${player.townName} ${player.townMascot}`;
		ctx.updateHeader(player);

		// Clear previous year's content so the log stays manageable
		ctx.clearStory();

		const gradeLabel = player.age === 11 ? '6th grade' : player.age === 12 ? '7th grade' : '8th grade';
		ctx.addHeadline(`Age ${player.age} - Travel Team (${gradeLabel})`);
		ctx.addText(`${player.firstName} plays travel ball for the ${player.teamName}.`);
		if (player.position) {
			ctx.addText(`Playing ${player.position} as a ${player.depthChart}.`);
		}

		// Show a youth event before the continue button
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		const eligible = filterEvents(
			ctx.events, 'youth', 0, player.position,
			player.storyFlags, statsRecord,
		);

		const event = selectEvent(eligible);
		if (event) {
			presentEventThenContinue(player, ctx, event);
		} else {
			showContinue(player, ctx);
		}
	},

	getSeasonConfig(): SeasonConfig {
		return {
			seasonLength: 8,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: false,
			eventChance: 30,
			opponentStrengthBase: 35,
			opponentStrengthRange: 25,
		};
	},
};

//============================================
// Present one event, then show Continue
function presentEventThenContinue(
	player: Player, ctx: CareerContext, event: GameEvent,
): void {
	ctx.addHeadline(event.title);
	ctx.addText(event.description);

	const choiceButtons = event.choices.map(choice => ({
		text: choice.text,
		primary: false,
		action: () => {
			ctx.addText(`> ${choice.text}`);
			const flavor = applyEventChoice(player, choice);
			ctx.addResult(flavor);
			ctx.updateStats(player);
			ctx.save();
			showContinue(player, ctx);
		},
	}));

	ctx.waitForInteraction(event.title, choiceButtons);
}

//============================================
// Show the continue button
function showContinue(player: Player, ctx: CareerContext): void {
	ctx.waitForInteraction('Travel Years', [{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
