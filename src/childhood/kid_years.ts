// kid_years.ts - ages 1-7: BitLife-style events, no football
//
// Each year: 1-2 random life events with choices.
// Stats affected: athleticism (playing outside), discipline (school), confidence (social).
// Fast-forward feel: ~30-60 seconds per year.

import { Player } from '../player.js';
import { YearHandler, CareerContext } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { filterEvents, selectEvent, applyEventChoice, GameEvent } from '../events.js';

//============================================
// Age-appropriate headlines for flavor
const AGE_HEADLINES: Record<number, string> = {
	1: 'Baby steps',
	2: 'Toddler life',
	3: 'Preschool days',
	4: 'Starting school',
	5: 'Kindergarten',
	6: 'First grade',
	7: 'Second grade',
};

//============================================
export const kidYearsHandler: YearHandler = {
	id: 'kid_years',
	ageStart: 1,
	ageEnd: 7,

	startYear(player: Player, ctx: CareerContext): void {
		// Apply natural growth for this age
		applyAgeDrift(player);
		ctx.updateHeader(player);

		// Clear previous year's content so the log stays manageable
		ctx.clearStory();

		const headline = AGE_HEADLINES[player.age] || `Age ${player.age}`;
		ctx.addHeadline(`Age ${player.age} - ${headline}`);
		const yearWord = player.age === 1 ? 'year' : 'years';
		ctx.addText(`${player.firstName} is ${player.age} ${yearWord} old.`);

		// How many events to show this year (older = more)
		const eventCount = player.age <= 3 ? 1 : 2;

		// Filter childhood events from the event pool
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		const eligible = filterEvents(
			ctx.events, 'childhood', 0, player.position,
			player.storyFlags, statsRecord,
		);

		// Pick events for this year (avoid repeats within the same year)
		const yearEvents: GameEvent[] = [];
		const usedIds = new Set<string>();
		for (let i = 0; i < eventCount; i++) {
			const remaining = eligible.filter(e => !usedIds.has(e.id));
			const picked = selectEvent(remaining);
			if (picked) {
				yearEvents.push(picked);
				usedIds.add(picked.id);
			}
		}

		// Present events sequentially, then show "Continue"
		if (yearEvents.length > 0) {
			presentEvent(player, ctx, yearEvents, 0);
		} else {
			// No events available, just show continue
			ctx.addText('Another year goes by.');
			showContinue(player, ctx);
		}
	},
};

//============================================
// Present one event, then chain to the next or show Continue
function presentEvent(
	player: Player, ctx: CareerContext,
	events: GameEvent[], index: number,
): void {
	const event = events[index];

	ctx.addHeadline(event.title);
	ctx.addText(event.description);

	// Build choice buttons
	const choiceButtons = event.choices.map(choice => ({
		text: choice.text,
		primary: false,
		action: () => {
			// Show what the player chose, then apply effects
			ctx.addText(`> ${choice.text}`);
			const flavor = applyEventChoice(player, choice);
			ctx.addResult(flavor);
			ctx.updateStats(player);
			ctx.save();

			// Chain to next event or show Continue
			if (index + 1 < events.length) {
				presentEvent(player, ctx, events, index + 1);
			} else {
				showContinue(player, ctx);
			}
		},
	}));

	ctx.waitForInteraction(event.title, choiceButtons);
}

//============================================
// Show the "Continue to Next Year" button
function showContinue(player: Player, ctx: CareerContext): void {
	ctx.waitForInteraction('Next Year', [{
		text: 'Continue',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}
