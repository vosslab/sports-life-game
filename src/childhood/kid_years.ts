// kid_years.ts - ages 1-7: BitLife-style events, no football
//
// Each year: 4-6 random life events with choices.
// Stats affected: athleticism (playing outside), discipline (school), confidence (social).
// Fast-forward feel: ~30-60 seconds per year.

import { Player } from '../player.js';
import { YearHandler, CareerContext } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';

//============================================
export const kidYearsHandler: YearHandler = {
	id: 'kid_years',
	ageStart: 1,
	ageEnd: 7,

	startYear(player: Player, ctx: CareerContext): void {
		// Apply natural growth for this age
		applyAgeDrift(player);
		ctx.updateHeader(player);

		ctx.addHeadline(`Age ${player.age}`);
		ctx.addText(`${player.firstName} is ${player.age} years old.`);

		// TODO: implement 4-6 random life events with choices
		// For now, show a simple "continue" button
		ctx.showChoices([{
			text: 'Continue',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
	},
};
