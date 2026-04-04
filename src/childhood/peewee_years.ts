// peewee_years.ts - ages 8-10: peewee football
//
// Made-up town name and mascot (generated at age 8, persists through travel).
// Coach assigns position based on size + athleticism.
// Short season: 6 games. Simplified weekly loop.
// No depth chart yet (everyone plays).

import { Player } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift, coachAssignPosition } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';

//============================================
export const peeweeHandler: YearHandler = {
	id: 'peewee',
	ageStart: 8,
	ageEnd: 10,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Generate town identity at age 8
		if (player.age === 8 && player.townName === '') {
			generateTownIdentity(player);
			coachAssignPosition(player);
			player.depthChart = 'starter'; // everyone plays in peewee
			player.teamName = `${player.townName} ${player.townMascot}`;
		}

		ctx.updateHeader(player);
		ctx.addHeadline(`Age ${player.age} - Peewee Football`);
		ctx.addText(`${player.firstName} plays for the ${player.teamName}.`);
		if (player.position) {
			ctx.addText(`Coach has you playing ${player.position}.`);
		}

		// TODO: implement 6-game simplified season
		ctx.showChoices([{
			text: 'Continue',
			primary: true,
			action: () => advanceToNextYear(player, ctx),
		}]);
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
