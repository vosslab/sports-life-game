// playoff_handler.ts - Playoff handling functions
// These functions handle the playoff bracket progression.

import { activeEngine } from './engine_state.js';
import { finalizeSeason } from './season_lifecycle.js';
import { PlayoffBracket } from '../season/playoff_bracket.js';
import { Player, accumulateGameStats } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { simulateWeeklyGame as simulateGame } from '../simulator/adapter.js';
import {
	ClutchGameContext, buildClutchMoment, resolveClutchMoment,
} from '../clutch_moment.js';
import { rand } from '../core/rng.js';

//============================================
// Run playoff bracket: show matchup, simulate game, advance
export function startPlayoffs(
	player: Player, ctx: CareerContext, bracket: PlayoffBracket,
): void {
	if (!activeEngine) {
		return;
	}

	const round = bracket.getCurrentRound();
	if (!round) {
		// Playoffs complete
		const champion = bracket.getChampion();
		const playerTeamId = activeEngine.season.playerTeamId;
		let isChampion = false;
		if (champion === playerTeamId) {
			ctx.addHeadline('CHAMPIONS!');
			ctx.addText(`${player.teamName} wins the championship!`);
			isChampion = true;
		} else {
			ctx.addText('Your playoff run is over.');
		}
		finalizeSeason(player, ctx, isChampion);
		return;
	}

	ctx.addHeadline(round.roundName);

	const playerGame = bracket.getPlayerMatchup();
	if (!playerGame) {
		// Player was eliminated or has a bye -- simulate other games and advance
		simulateNonPlayerPlayoffGames(bracket);
		bracket.advanceRound();
		startPlayoffs(player, ctx, bracket);
		return;
	}

	// Show the matchup
	const opponentId = playerGame.getOpponentId(bracket.playerTeamId);
	const opponent = opponentId ? activeEngine.season.getTeam(opponentId) : undefined;
	const opponentName = opponent ? opponent.getDisplayName() : 'Unknown';
	ctx.addText(`Playoff matchup: ${player.teamName} vs ${opponentName}`);

	ctx.waitForInteraction('Playoff Game', [{
		text: 'Play Game',
		primary: true,
		action: () => {
			if (!activeEngine) {
				return;
			}
			// Simulate the player's playoff game
			const opponentStrength = opponent ? opponent.strength : 50;
			const team = {
				teamName: player.teamName,
				strength: player.teamStrength,
				wins: 0,
				losses: 0,
				schedule: [],
				coachPersonality: 'supportive' as const,
			};

			const gameResult = simulateGame(player, team, opponentStrength, true);

			// Check for clutch moment in playoff game
			const clutchContext: ClutchGameContext = {
				teamName: player.teamName,
				opponentName,
				teamScore: gameResult.teamScore,
				opponentScore: gameResult.opponentScore,
				isPlayoff: true,
				isKeyGame: false,
				isStarter: player.depthChart === 'starter',
				position: player.position,
				positionBucket: player.positionBucket,
			};

			const clutchMoment = buildClutchMoment(player, clutchContext);
			if (clutchMoment) {
				// Show clutch popup, then continue to post-game
				const clutchOptions = clutchMoment.choices.map(choice => ({
					text: choice.label,
					description: choice.description,
					action: () => {
						const resolution = resolveClutchMoment(player, clutchContext, choice.id, clutchMoment.situationType);
						gameResult.teamScore = Math.max(0, gameResult.teamScore + resolution.points);
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
						gameResult.storyText = `${player.teamName} ${gameResult.teamScore} - ${opponentName} ${gameResult.opponentScore} (${gameResult.result}).`;
						ctx.addHeadline('4th Quarter - Clutch Moment');
						ctx.addText(resolution.narrative);
						ctx.addText(resolution.spotlightText);
						if (resolution.legacyTag) {
							player.bigDecisions.push(resolution.legacyTag);
						}
						showPlayoffPostGame(player, ctx, gameResult, opponentName, playerGame, bracket);
					},
				}));
				ctx.waitForInteraction(
					'4th Quarter - Clutch Moment', clutchOptions, clutchMoment.scene, 'clutch',
				);
				return;
			}

			// No clutch moment: show post-game immediately
			showPlayoffPostGame(player, ctx, gameResult, opponentName, playerGame, bracket);
		},
	}]);
}

//============================================
// Post-game display and advancement for playoff games
export function showPlayoffPostGame(
	player: Player,
	ctx: CareerContext,
	gameResult: ReturnType<typeof simulateGame>,
	opponentName: string,
	playerGame: { id: string; homeTeamId: string },
	bracket: PlayoffBracket,
): void {
	if (!activeEngine) {
		return;
	}

	// Record result
	if (playerGame.homeTeamId === bracket.playerTeamId) {
		bracket.recordResult(playerGame.id, gameResult.teamScore, gameResult.opponentScore);
	} else {
		bracket.recordResult(playerGame.id, gameResult.opponentScore, gameResult.teamScore);
	}

	// Accumulate stats
	accumulateGameStats(player, gameResult.playerStatLine);

	// Show result
	ctx.addHeadline(
		`${player.teamName} ${gameResult.teamScore} - ${opponentName} ${gameResult.opponentScore}`
	);
	ctx.addText(gameResult.storyText);

	// Simulate other playoff games this round
	simulateNonPlayerPlayoffGames(bracket);

	// Check if eliminated
	if (bracket.isEliminated(bracket.playerTeamId)) {
		ctx.addText('Season over. Eliminated from the playoffs.');
		finalizeSeason(player, ctx);
		return;
	}

	// Advance to next round
	bracket.advanceRound();

	ctx.waitForInteraction('Next Round', [{
		text: 'Next Round',
		primary: true,
		action: () => {
			startPlayoffs(player, ctx, bracket);
		},
	}]);
}

//============================================
// Simulate non-player playoff games in the current round
export function simulateNonPlayerPlayoffGames(bracket: PlayoffBracket): void {
	const round = bracket.getCurrentRound();
	if (!round) {
		return;
	}
	for (const game of round.games) {
		if (game.status === 'final') {
			continue;
		}
		if (game.involvesTeam(bracket.playerTeamId)) {
			continue;
		}
		// Look up actual team strengths from the season
		const homeTeam = activeEngine?.season.getTeam(game.homeTeamId);
		const awayTeam = activeEngine?.season.getTeam(game.awayTeamId);
		const homeStrength = homeTeam ? homeTeam.strength : 50;
		const awayStrength = awayTeam ? awayTeam.strength : 50;
		bracket.simulatePlayoffGame(game, homeStrength, awayStrength);
	}
}
