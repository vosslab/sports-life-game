// peewee_years.ts - ages 8-10: peewee football
//
// Made-up town name and mascot (generated at age 8, persists through travel).
// Coach assigns position based on size + athleticism.
// Short season: 6 games. Simplified weekly loop.
// No depth chart yet (everyone plays).
// 1 life event per year alongside football setup.

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift, coachAssignPosition } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { filterEvents, selectEvent, applyEventChoice, GameEvent } from '../events.js';

//============================================
export const peeweeHandler: YearHandler = {
	id: 'peewee',
	ageStart: 8,
	ageEnd: 10,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Generate town identity at age 8 (check for both empty string and undefined)
		if (player.age === 8 && !player.townName) {
			generateTownIdentity(player);
			coachAssignPosition(player);
			player.depthChart = 'starter'; // everyone plays in peewee
			player.teamName = `${player.townName} ${player.townMascot}`;
		}

		ctx.updateHeader(player);

		const gradeLabel = player.age === 8 ? '3rd grade' : player.age === 9 ? '4th grade' : '5th grade';
		ctx.addHeadline(`Age ${player.age} - Peewee Football (${gradeLabel})`);
		ctx.addText(`${player.firstName} plays for the ${player.teamName}.`);
		if (player.position) {
			ctx.addText(`Coach has you playing ${player.position}.`);
		}

		// Show a youth event before the season button
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
			seasonLength: 6,
			hasFootball: true,
			hasDepthChart: false,
			hasPlayoffs: false,
			eventChance: 25,
			opponentStrengthBase: 30,
			opponentStrengthRange: 20,
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
			const flavor = applyEventChoice(player, choice);
			ctx.addResult(flavor);
			ctx.updateStats(player);
			ctx.save();
			showContinue(player, ctx);
		},
	}));

	ctx.showChoices(choiceButtons);
}

//============================================
// Show the continue button
function showContinue(player: Player, ctx: CareerContext): void {
	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}

//============================================
// Generate a town name and mascot from curated lists
function generateTownIdentity(player: Player): void {
	const towns = [
		'Riverside', 'Oakdale', 'Fairview', 'Springfield', 'Greenville',
		'Lakewood', 'Maplewood', 'Hillcrest', 'Cedarville', 'Brookfield',
		'Pinewood', 'Sunnydale', 'Clearwater', 'Stonebridge', 'Meadowbrook',
		'Hawthorne', 'Ridgemont', 'Ashford', 'Willowdale', 'Crestwood',
	];
	const mascots = [
		'Eagles', 'Bulldogs', 'Warriors', 'Wildcats', 'Panthers',
		'Tigers', 'Bears', 'Falcons', 'Hawks', 'Lions',
		'Mustangs', 'Cobras', 'Wolves', 'Rams', 'Sharks',
		'Cougars', 'Stallions', 'Jaguars', 'Vipers', 'Thunderbolts',
	];

	const townIdx = Math.floor(Math.random() * towns.length);
	const mascotIdx = Math.floor(Math.random() * mascots.length);
	player.townName = towns[townIdx];
	player.townMascot = mascots[mascotIdx];
}
