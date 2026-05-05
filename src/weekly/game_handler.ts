// game_handler.ts - Game simulation and post-game flow
// These functions handle regular season game simulation, clutch moments,
// and post-game progression.

import { Player, randomInRange, modifyStat, accumulateGameStats } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { simulateWeeklyGame as simulateGame } from '../simulator/adapter.js';
import { Team } from '../team.js';
import {
	ClutchGameContext, buildClutchMoment, resolveClutchMoment,
} from '../clutch_moment.js';
import {
	simulateNonPlayerGames, recordPlayerGameResult,
	getPlayerOpponentStrength, getPlayerOpponentName,
} from '../season/season_simulator.js';
import { evaluateDepthChartUpdate } from '../week_sim.js';
import { checkMilestones } from '../milestones.js';
import { applySeasonGoal } from '../week_sim.js';
import { rand } from '../core/rng.js';
import { activeEngine } from './engine_state.js';
import * as seasonLifecycle from './season_lifecycle.js';

//============================================
// Phase 4: Game simulation
export function proceedToGame(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}
	activeEngine.weekState.phase = 'game';

	// Get the player's game from the season schedule
	const playerGame = activeEngine.season.getPlayerGame();
	if (!playerGame) {
		// No game scheduled this week, advance directly
		seasonLifecycle.advanceToNextWeek(player, ctx);
		return;
	}

	// Get opponent strength from the season
	const opponentStrength = getPlayerOpponentStrength(activeEngine.season);
	const opponentName = getPlayerOpponentName(activeEngine.season);

	// Build a minimal Team object for the simulation function
	const playerRecord = activeEngine.season.getPlayerRecord();
	const team: Team = {
		teamName: player.teamName,
		strength: player.teamStrength,
		wins: playerRecord.wins,
		losses: playerRecord.losses,
		schedule: [],
		coachPersonality: 'supportive',
	};

	// Simulate the game
	const gameResult = simulateGame(player, team, opponentStrength);

	// Check for clutch moment before recording the result
	// Key game: undefeated or late in the season (last 3 weeks)
	const preGameRecord = activeEngine.season.getPlayerRecord();
	const isUndefeated = preGameRecord.losses === 0 && preGameRecord.wins >= 3;
	const isLateSeason = activeEngine.season.getCurrentWeek()
		>= activeEngine.config.seasonLength - 2;
	const isKeyGame = isUndefeated || isLateSeason;

	const clutchContext: ClutchGameContext = {
		teamName: player.teamName,
		opponentName,
		teamScore: gameResult.teamScore,
		opponentScore: gameResult.opponentScore,
		isPlayoff: false,
		isKeyGame,
		isStarter: player.depthChart === 'starter',
		position: player.position,
		positionBucket: player.positionBucket,
	};

	const clutchMoment = buildClutchMoment(player, clutchContext);

	if (clutchMoment) {
		// Show the clutch moment popup before the game result
		const clutchOptions = clutchMoment.choices.map(choice => ({
			text: choice.label,
			description: choice.description,
			action: () => {
				// Resolve the clutch moment and adjust score
				const resolution = resolveClutchMoment(player, clutchContext, choice.id, clutchMoment.situationType);
				gameResult.teamScore = Math.max(0, gameResult.teamScore + resolution.points);
				// Recalculate win/loss after adjustment (handle ties via overtime coin flip)
				if (gameResult.teamScore > gameResult.opponentScore) {
					gameResult.result = 'win';
				} else if (gameResult.teamScore < gameResult.opponentScore) {
					gameResult.result = 'loss';
				} else {
					// Scores tied after clutch: simulate OT coin flip
					gameResult.result = rand() < 0.5 ? 'win' : 'loss';
					if (gameResult.result === 'win') {
						gameResult.teamScore += 3;
					} else {
						gameResult.opponentScore += 3;
					}
				}
				// Regenerate story text with updated scores
				const winLoss = gameResult.result === 'win' ? 'win' : 'loss';
				gameResult.storyText = `${player.teamName} ${gameResult.teamScore} - ${opponentName} ${gameResult.opponentScore} (${winLoss}).`;
				// Show the clutch narrative
				ctx.addHeadline('4th Quarter - Clutch Moment');
				ctx.addText(resolution.narrative);
				ctx.addText(resolution.spotlightText);
				// Log signature moments to bigDecisions
				if (resolution.legacyTag) {
					player.bigDecisions.push(resolution.legacyTag);
				}
				// Continue with normal post-game flow
				showRegularSeasonPostGame(player, ctx, gameResult, opponentName);
			},
		}));
		ctx.waitForInteraction('4th Quarter - Clutch Moment', clutchOptions, clutchMoment.scene, 'clutch');
		return;
	}

	// No clutch moment: show post-game immediately
	showRegularSeasonPostGame(player, ctx, gameResult, opponentName);
}

//============================================
// Post-game display and advancement for regular season games
export function showRegularSeasonPostGame(
	player: Player,
	ctx: CareerContext,
	gameResult: ReturnType<typeof simulateGame>,
	opponentName: string,
): void {
	if (!activeEngine) {
		return;
	}

	// Record the result into the season (atomic: updates both teams)
	recordPlayerGameResult(activeEngine.season, gameResult);

	// Simulate all other games for this week
	simulateNonPlayerGames(activeEngine.season);

	// Accumulate stats
	accumulateGameStats(player, gameResult.playerStatLine);

	// Game outcome affects player stats
	if (gameResult.result === 'win') {
		modifyStat(player, 'confidence', randomInRange(1, 3));
	} else {
		// Losses hurt confidence, especially blowouts
		const margin = gameResult.opponentScore - gameResult.teamScore;
		if (margin >= 14) {
			modifyStat(player, 'confidence', -randomInRange(3, 6));
		} else {
			modifyStat(player, 'confidence', -randomInRange(1, 3));
		}
	}

	// Game-day wear: starters take a hit from playing
	if (player.depthChart === 'starter') {
		modifyStat(player, 'health', -randomInRange(0, 1));
	}

	// Evaluate depth chart
	const depthUpdate = evaluateDepthChartUpdate(player, gameResult.playerGrade);
	if (depthUpdate.changed) {
		player.depthChart = depthUpdate.newStatus;
	}

	// Show game story
	ctx.addHeadline(
		`${player.teamName} ${gameResult.teamScore} - `
		+ `${opponentName} ${gameResult.opponentScore}`
	);
	ctx.addText(gameResult.storyText);
	if (depthUpdate.changed) {
		ctx.addResult(depthUpdate.message);
	}

	// Show stat line
	const statLineText = ctx.formatStatLine(gameResult.playerStatLine);
	if (statLineText) {
		ctx.addText(`Stats: ${statLineText}`);
	}

	ctx.updateStats(player);
	ctx.updateHeader(player);

	// Update the record display immediately so it reflects the game just played
	const updatedRecord = activeEngine.season.getPlayerRecord();
	ctx.updateLifeStatus(
		`Record: ${updatedRecord.wins}-${updatedRecord.losses}`,
		player.currentWeek < activeEngine.config.seasonLength
			? `Week ${player.currentWeek + 1}`
			: 'End of Season',
	);

	ctx.save();

	// Check for milestones after game results
	const recordForMilestones = activeEngine.season.getPlayerRecord();
	const milestones = checkMilestones(player, recordForMilestones.wins, recordForMilestones.losses);
	for (const milestone of milestones) {
		ctx.addHeadline(milestone.headline);
		ctx.addText(milestone.text);
	}

	// Dev-mode invariant: verify sync after game recording
	const record = activeEngine.season.getPlayerRecord();
	const gamesPlayed = record.wins + record.losses + record.ties;
	const weekNum = activeEngine.season.getCurrentWeek();
	console.assert(
		gamesPlayed <= weekNum,
		`Sync check: games played (${gamesPlayed}) should not exceed week (${weekNum})`
	);

	// Show "Next Week" button via the main action bar
	const isLastWeek = activeEngine.season.getCurrentWeek()
		>= activeEngine.config.seasonLength;
	ctx.configureMainButtons({
		nextLabel: isLastWeek ? 'End of Season' : 'Next Week',
		nextAction: () => seasonLifecycle.advanceToNextWeek(player, ctx),
		ageUpVisible: !isLastWeek,
		ageUpAction: () => simulateRestOfSeason(player, ctx),
	});
	ctx.showMainActionBar();
}

//============================================
// Simulate remaining weeks silently (Age Up / fast-forward)
export function simulateRestOfSeason(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	ctx.hideMainActionBar();
	let weeksSimulated = 0;

	// Loop through remaining weeks
	while (true) {
		const hasMoreWeeks = activeEngine.season.advanceWeek();
		player.currentWeek = activeEngine.season.getCurrentWeek();

		if (!hasMoreWeeks) {
			break;
		}

		weeksSimulated += 1;

		// Apply season goal effects
		applySeasonGoal(player);

		// Get opponent for this week
		const playerGame = activeEngine.season.getPlayerGame();
		if (!playerGame) {
			continue;
		}
		const opponentStrength = getPlayerOpponentStrength(activeEngine.season);
		const playerRecord = activeEngine.season.getPlayerRecord();
		const team: Team = {
			teamName: player.teamName,
			strength: player.teamStrength,
			wins: playerRecord.wins,
			losses: playerRecord.losses,
			schedule: [],
			coachPersonality: 'supportive',
		};

		// Simulate game
		const gameResult = simulateGame(player, team, opponentStrength);
		recordPlayerGameResult(activeEngine.season, gameResult);
		simulateNonPlayerGames(activeEngine.season);
		accumulateGameStats(player, gameResult.playerStatLine);

		// Depth chart update
		const depthUpdate = evaluateDepthChartUpdate(player, gameResult.playerGrade);
		if (depthUpdate.changed) {
			player.depthChart = depthUpdate.newStatus;
		}

		// Confidence adjustment
		if (gameResult.result === 'win') {
			modifyStat(player, 'confidence', randomInRange(1, 3));
		} else {
			modifyStat(player, 'confidence', -randomInRange(1, 3));
		}
	}

	// Show summary
	ctx.clearStory();
	const record = activeEngine.season.getPlayerRecord();
	ctx.addHeadline('Season Simulated');
	ctx.addText(`Fast-forwarded ${weeksSimulated} weeks.`);
	ctx.addText(`Final record: ${record.wins}-${record.losses}`);
	ctx.updateStats(player);
	ctx.updateHeader(player);
	ctx.save();

	// Proceed to end of season (playoffs, etc.)
	seasonLifecycle.endSeason(player, ctx);
}
