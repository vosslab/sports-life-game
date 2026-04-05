// hs_frosh_soph.ts - ages 14-15: frosh/soph high school football
//
// Made-up high school name and mascot (generated at age 14, persists through varsity).
// Full weekly loop via weekly engine: focus -> activities -> events -> game.
// 10-game season. Depth chart matters.

import { Player, randomInRange } from '../player.js';
import { YearHandler, CareerContext, SeasonConfig } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { startSeason } from '../weekly/weekly_engine.js';
import { buildHighSchoolSeason } from './hs_season_builder.js';

//============================================
// Season config for frosh/soph
const SEASON_CONFIG: SeasonConfig = {
	seasonLength: 10,
	hasFootball: true,
	hasDepthChart: true,
	hasPlayoffs: true,
	eventChance: 35,
	opponentStrengthBase: 40,
	opponentStrengthRange: 30,
};

//============================================
export const hsFroshSophHandler: YearHandler = {
	id: 'hs_frosh_soph',
	ageStart: 14,
	ageEnd: 15,

	startYear(player: Player, ctx: CareerContext): void {
		applyAgeDrift(player);

		// Generate HS identity at age 14
		if (player.age === 14 && player.hsName === '') {
			generateHSIdentity(player);
			player.depthChart = 'bench';
		}

		// Set team name from persistent identity
		player.teamName = `${player.hsName} ${player.hsMascot}`;

		// Build the season using the new season layer
		// Player team drawn from the same pool as opponents (35-90)
		const playerStrength = randomInRange(35, 90);
		player.teamStrength = playerStrength;
		const season = buildHighSchoolSeason(player.hsName, player.hsMascot, playerStrength);

		ctx.updateHeader(player);

		const yearLabel = player.age === 14 ? 'Freshman' : 'Sophomore';
		ctx.addHeadline(`Age ${player.age} - ${yearLabel} Year`);
		ctx.addText(`${player.firstName} is on the frosh/soph team at ${player.hsName}.`);
		ctx.addText(`Playing ${player.position || 'TBD'} as a ${player.depthChart}.`);

		// Start the season via the weekly engine
		ctx.showChoices([{
			text: 'Start Season',
			primary: true,
			action: () => {
				startSeason(
					player, ctx, SEASON_CONFIG, season,
					() => handleSeasonEnd(player, ctx),
				);
			},
		}]);
	},

	getSeasonConfig(): SeasonConfig {
		return SEASON_CONFIG;
	},
};

//============================================
// Called when the weekly engine finishes the season
function handleSeasonEnd(player: Player, ctx: CareerContext): void {
	const yearLabel = player.age === 14 ? 'Freshman' : 'Sophomore';
	ctx.addText(`${yearLabel} season is over.`);

	// Position change option at offseason
	ctx.showChoices([{
		text: 'Continue to Next Year',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}

//============================================
// Generate a high school name and mascot from curated lists
function generateHSIdentity(player: Player): void {
	const names = [
		'Lincoln', 'Washington', 'Jefferson', 'Roosevelt', 'Kennedy',
		'Central', 'Northside', 'Westview', 'Eastlake', 'Southfield',
		'Heritage', 'Summit', 'Valley', 'Mountain View', 'Ridgewood',
		'Oak Park', 'Lakeview', 'Bayshore', 'Fieldstone', 'Crestview',
	];
	const mascots = [
		'Spartans', 'Knights', 'Trojans', 'Patriots', 'Rebels',
		'Pioneers', 'Rangers', 'Chargers', 'Vikings', 'Titans',
		'Crusaders', 'Braves', 'Rockets', 'Comets', 'Thunder',
		'Hurricanes', 'Storm', 'Blazers', 'Grizzlies', 'Miners',
	];

	const nameIdx = Math.floor(Math.random() * names.length);
	const mascotIdx = Math.floor(Math.random() * mascots.length);
	player.hsName = names[nameIdx];
	player.hsMascot = mascots[mascotIdx];
}
