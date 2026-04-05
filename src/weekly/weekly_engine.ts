// weekly_engine.ts - shared weekly loop with guaranteed advancement
//
// CONTRACT: every call to runSeasonWeek() must end in exactly one of:
//   - { kind: "next_week", nextWeek: N }
//   - { kind: "season_ended" }
//
// No third state. No conditional path that silently returns without advancing.
// Handlers call startSeason() then the engine drives the weekly loop.
//
// SOURCE OF TRUTH: LeagueSeason owns all season state (schedule, records,
// standings, week counter). This engine reads from it and writes results to it.

import { Player, CareerPhase, randomInRange, createEmptySeasonStats, modifyStat } from '../player.js';
import { CareerContext, SeasonConfig, WeekAdvanceResult } from '../core/year_handler.js';
import { SeasonGoal } from '../player.js';
import { applySeasonGoal, getGoalsForPhase, GoalInfo, getPreferredActivitiesForGoal, simulateGame, evaluateDepthChartUpdate } from '../week_sim.js';
import { Team } from '../team.js';
import {
	Activity, WeekState, createWeekState, getActivitiesForPhase,
	isActivityUnlocked, applyActivity, getEffectPreview, formatActivityResult,
} from '../activities.js';
import {
	GameEvent, filterEvents, selectEvent, applyEventChoice,
} from '../events.js';
import { accumulateGameStats } from '../player.js';
import { switchTab, hideTabBar, showTabBar } from '../tabs.js';
import * as ui from '../ui.js';
import { checkMilestones } from '../milestones.js';
import {
	ClutchGameContext, buildClutchMoment, resolveClutchMoment,
} from '../clutch_moment.js';

// Season layer imports
import { LeagueSeason } from '../season/season_model.js';
import {
	simulateNonPlayerGames, recordPlayerGameResult,
	getPlayerOpponentStrength, getPlayerOpponentName,
} from '../season/season_simulator.js';
import { PlayoffBracket, createHSPlayoffBracket, createCollegePlayoffBracket, createNFLPlayoffBracket } from '../season/playoff_bracket.js';
import { PlayoffSeed } from '../season/season_types.js';

//============================================
// Engine state: minimal, just tracks weekly phase and callbacks
interface EngineState {
	season: LeagueSeason;
	config: SeasonConfig;
	weekState: WeekState;
	onSeasonEnd: () => void;
}

// Current active engine state (null when no season running)
let activeEngine: EngineState | null = null;

//============================================
// Start a new season. Engine takes over the weekly loop.
// Accepts a LeagueSeason as the single source of truth.
export function startSeason(
	player: Player,
	ctx: CareerContext,
	config: SeasonConfig,
	season: LeagueSeason,
	onSeasonEnd: () => void,
): void {
	// Reset player season tracking
	player.currentWeek = 0;
	player.seasonStats = createEmptySeasonStats();
	player.currentSeason += 1;

	activeEngine = {
		season,
		config,
		weekState: createWeekState(),
		onSeasonEnd,
	};

	// Hide the main action bar - weekly engine uses popups for all decisions
	ui.hideMainActionBar();

	// Show goal selection at season start
	showGoalSelection(player, ctx, 'What is your goal this season?', () => {
		advanceToNextWeek(player, ctx);
	});
}

//============================================
// Core advancement function. This is the only way weeks advance.
// GUARANTEE: this function always either starts a new week or ends the season.
function advanceToNextWeek(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	// Advance the season week (strict: refuses if games are unfinished)
	const hasMoreWeeks = activeEngine.season.advanceWeek();

	// Mirror week to player for save compatibility
	player.currentWeek = activeEngine.season.getCurrentWeek();

	// Check if season is over
	if (!hasMoreWeeks) {
		endSeason(player, ctx);
		return;
	}

	// Reset weekly state
	activeEngine.weekState = createWeekState();
	activeEngine.weekState.phase = 'focus';

	// Update header and show week intro
	ctx.updateHeader(player);
	ctx.clearStory();
	ctx.addHeadline(`Week ${player.currentWeek}`);

	// Show the opponent for this week from the season schedule
	const opponentName = getPlayerOpponentName(activeEngine.season);
	if (opponentName !== 'TBD') {
		ctx.addText(`This week: vs ${opponentName}`);
	}

	// Every 5 games, re-prompt the player about their season goal
	if (player.currentWeek > 0 && player.currentWeek % 5 === 0) {
		showGoalSelection(player, ctx, 'Check-in: adjust your season goal?', () => {
			applyGoalAndAdvance(player, ctx);
		});
	} else {
		// Apply season goal effects (no weekly popup)
		applyGoalAndAdvance(player, ctx);
	}
}

//============================================
// Show goal selection modal (used at season start and every 5 games)
function showGoalSelection(
	player: Player, ctx: CareerContext, title: string, onDone: () => void,
): void {
	const goals = getGoalsForPhase(player.phase);

	// Build choice buttons from available goals
	const choices = goals.map(goal => ({
		text: `${goal.name} (${goal.effectHint})`,
		description: goal.description,
		primary: goal.key === player.seasonGoal,
		action: () => {
			player.seasonGoal = goal.key;
			ctx.addText(`Season goal set: ${goal.name}.`);
			ctx.save();
			onDone();
		},
	}));

	// Add "keep current" option when re-prompting (not first selection)
	if (player.currentWeek > 0) {
		const currentGoal = goals.find(g => g.key === player.seasonGoal);
		const currentName = currentGoal ? currentGoal.name : player.seasonGoal;
		choices.unshift({
			text: `Keep: ${currentName}`,
			description: 'Stay the course with your current goal.',
			primary: true,
			action: () => {
				ctx.addText(`Staying focused: ${currentName}.`);
				ctx.save();
				onDone();
			},
		});
	}

	ctx.waitForInteraction(title, choices, undefined, 'goal');
}

//============================================
// Phase 1: Apply season goal effects (no popup, goal persists from season start)
function applyGoalAndAdvance(player: Player, ctx: CareerContext): void {
	// Apply the season goal's stat effects
	const goalStory = applySeasonGoal(player);
	ctx.addText(goalStory);
	ctx.updateStats(player);
	ctx.save();

	if (!activeEngine) {
		return;
	}

	// Auto-resolve the side activity from the season goal
	activeEngine.weekState.phase = 'activity_done';
	applyBackgroundActivityFromGoal(player, ctx);
	proceedToEventCheck(player, ctx);
}

//============================================
// Show activities in the Activities tab
function showActivities(player: Player, ctx: CareerContext): void {
	const activities = getActivitiesForPhase(player.phase, player);

	// Build goal info for the sidebar dropdown
	const goals = getGoalsForPhase(player.phase);
	const goalInfoParam = goals.length > 0 ? {
		goals,
		currentGoal: player.seasonGoal,
		onGoalChange: (newGoal: SeasonGoal) => {
			player.seasonGoal = newGoal;
			ctx.save();
			// Re-render to update the goal description
			showActivities(player, ctx);
		},
	} : undefined;

	ui.renderActivitiesTab(
		activities,
		activeEngine ? activeEngine.weekState : createWeekState(),
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		(activity: Activity) => handleActivitySelected(player, ctx, activity),
		goalInfoParam,
	);
}

//============================================
// Handle activity selection
function handleActivitySelected(
	player: Player, ctx: CareerContext, activity: Activity,
): void {
	const result = applyActivity(activity, player);

	if (activeEngine) {
		activeEngine.weekState.actionsUsed += 1;
		activeEngine.weekState.phase = 'activity_done';
	}

	ctx.updateStats(player);
	ctx.save();
	ctx.addText(result.flavorText);
	const appliedText = formatActivityResult(result);
	if (appliedText.length > 0) {
		ui.addStatChange(appliedText);
	}

	// Return to Life tab and proceed
	switchTab('life');
	proceedToEventCheck(player, ctx);
}

//============================================
// Apply a lightweight background activity that matches the season goal.
function applyBackgroundActivityFromGoal(
	player: Player, ctx: CareerContext,
): void {
	const unlockedActivities = getActivitiesForPhase(player.phase, player)
		.filter(a => isActivityUnlocked(a, player));
	if (unlockedActivities.length === 0) {
		return;
	}

	// Get preferred activities for the current season goal
	const preferredIds = getPreferredActivitiesForGoal(player.seasonGoal);

	let chosenActivity = unlockedActivities[0];
	for (const activityId of preferredIds) {
		const match = unlockedActivities.find(activity => activity.id === activityId);
		if (match) {
			chosenActivity = match;
			break;
		}
	}

	const result = applyActivity(chosenActivity, player);
	if (activeEngine) {
		activeEngine.weekState.actionsUsed += 1;
	}

	ctx.addText(`Side activity: ${chosenActivity.name}.`);
	ctx.addText(result.flavorText);
	const appliedText = formatActivityResult(result);
	if (appliedText.length > 0) {
		ui.addStatChange(appliedText);
	}
	ctx.updateStats(player);
	ctx.save();
}

//============================================
// Phase 3: Random event check
function proceedToEventCheck(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}
	activeEngine.weekState.phase = 'event';

	const eventChance = activeEngine.config.eventChance;
	const eventRoll = randomInRange(1, 100);

	if (eventRoll <= eventChance && ctx.events.length > 0) {
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		// Filter events for current phase
		let eligible = filterEvents(
			ctx.events, player.phase,
			player.currentWeek, player.position,
			player.storyFlags, statsRecord, player.collegeYear,
		);

		// Fall back to HS events for NFL/college
		if (eligible.length === 0 && (player.phase === 'nfl' || player.phase === 'college')) {
			eligible = filterEvents(
				ctx.events, 'high_school',
				player.currentWeek, player.position,
				player.storyFlags, statsRecord, player.collegeYear,
			);
		}

		const event = selectEvent(eligible);
		if (event) {
			showEventCard(player, ctx, event);
			return;
		}
	}

	// No event: go straight to game
	proceedToGame(player, ctx);
}

//============================================
// Show event modal, then proceed to game
function showEventCard(
	player: Player, ctx: CareerContext, event: GameEvent,
): void {
	hideTabBar();

	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			const flavor = applyEventChoice(player, choice);
			showTabBar();

			ctx.addHeadline(event.title);
			ctx.addText(flavor);
			ctx.updateStats(player);
			ctx.save();
			proceedToGame(player, ctx);
		},
	}));

	ctx.waitForInteraction(event.title, choiceActions, event.description, 'narrative');
}

//============================================
// Phase 4: Game simulation
function proceedToGame(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}
	activeEngine.weekState.phase = 'game';

	// Get the player's game from the season schedule
	const playerGame = activeEngine.season.getPlayerGame();
	if (!playerGame) {
		// No game scheduled this week, advance directly
		advanceToNextWeek(player, ctx);
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
					gameResult.result = Math.random() < 0.5 ? 'win' : 'loss';
					if (gameResult.result === 'win') {
						gameResult.teamScore += 3;
					} else {
						gameResult.opponentScore += 3;
					}
				}
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
		ctx.waitForInteraction('4th Quarter - Clutch Moment', clutchOptions, clutchMoment.scene, 'narrative');
		return;
	}

	// No clutch moment: show post-game immediately
	showRegularSeasonPostGame(player, ctx, gameResult, opponentName);
}

//============================================
// Post-game display and advancement for regular season games
function showRegularSeasonPostGame(
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

	// Game-day wear: small health cost for starters only
	if (player.depthChart === 'starter') {
		modifyStat(player, 'health', -randomInRange(0, 2));
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
	const statLineText = ui.formatStatLine(gameResult.playerStatLine);
	if (statLineText) {
		ctx.addText(`Stats: ${statLineText}`);
	}

	ctx.updateStats(player);
	ctx.updateHeader(player);
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
	ui.configureMainButtons({
		nextLabel: isLastWeek ? 'End of Season' : 'Next Week',
		nextAction: () => advanceToNextWeek(player, ctx),
		ageUpVisible: !isLastWeek,
		ageUpAction: () => simulateRestOfSeason(player, ctx),
	});
	ui.showMainActionBar();
}

//============================================
// Simulate remaining weeks silently (Age Up / fast-forward)
function simulateRestOfSeason(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	ui.hideMainActionBar();
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
	endSeason(player, ctx);
}

//============================================
// End the season
function endSeason(player: Player, ctx: CareerContext): void {
	if (!activeEngine) {
		return;
	}

	// Read final record from the season (single source of truth)
	const record = activeEngine.season.getPlayerRecord();

	ctx.clearStory();
	ctx.addHeadline('Regular Season Complete');
	ctx.addText(`Final record: ${record.wins}-${record.losses}`);

	// Check if playoffs should happen
	if (activeEngine.config.hasPlayoffs) {
		const standings = activeEngine.season.getStandings();
		const playerTeamId = activeEngine.season.playerTeamId;

		// Find player's rank in standings
		const playerRank = standings.findIndex(row => row.teamId === playerTeamId);

		// Determine playoff bracket type and size based on phase
		let playoffSize = 4;
		let bracket: PlayoffBracket | undefined;

		if (playerRank >= 0 && playerRank < playoffSize) {
			// Build playoff seeds based on phase
			const seeds: PlayoffSeed[] = standings.slice(0, playoffSize).map((row, i) => ({
				teamId: row.teamId,
				seed: i + 1,
				wins: row.wins,
				losses: row.losses,
			}));

			// Create appropriate bracket for the player's phase
			if (player.phase === 'high_school') {
				bracket = createHSPlayoffBracket(seeds, playerTeamId);
			} else if (player.phase === 'college') {
				bracket = createCollegePlayoffBracket(seeds, playerTeamId);
			} else if (player.phase === 'nfl') {
				// NFL uses 7 seeds per conference, but simplified to top 4 for this system
				bracket = createNFLPlayoffBracket(seeds, playerTeamId);
			}

			if (bracket) {
				ctx.addText('Your team made the playoffs!');
				startPlayoffs(player, ctx, bracket);
				return;
			}
		}

		// Didn't make playoffs
		ctx.addText('Your team did not qualify for the playoffs.');
	}

	// No playoffs or didn't qualify: finalize season
	finalizeSeason(player, ctx);
}

//============================================
// Run playoff bracket: show matchup, simulate game, advance
function startPlayoffs(
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
							gameResult.result = Math.random() < 0.5 ? 'win' : 'loss';
							if (gameResult.result === 'win') {
								gameResult.teamScore += 3;
							} else {
								gameResult.opponentScore += 3;
							}
						}
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
					'4th Quarter - Clutch Moment', clutchOptions, clutchMoment.scene, 'narrative',
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
function showPlayoffPostGame(
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
		action: () => startPlayoffs(player, ctx, bracket),
	}]);
}

//============================================
// Simulate non-player playoff games in the current round
function simulateNonPlayerPlayoffGames(bracket: PlayoffBracket): void {
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

//============================================
// Finalize the season: save to career history and call handler callback
function finalizeSeason(player: Player, ctx: CareerContext, isChampion: boolean = false): void {
	if (!activeEngine) {
		return;
	}

	const record = activeEngine.season.getPlayerRecord();

	// Build awards array
	const awards: string[] = [];
	if (isChampion) {
		awards.push('Champion');
	}

	// Save season to career history
	player.careerHistory.push({
		phase: player.phase,
		year: player.currentSeason,
		age: player.age,
		team: player.teamName,
		position: player.position,
		wins: record.wins,
		losses: record.losses,
		ties: record.ties,
		depthChart: player.depthChart,
		highlights: [],
		awards,
		statTotals: { ...player.seasonStats },
	});

	ctx.save();

	// Call the handler's season-end callback
	const callback = activeEngine.onSeasonEnd;
	activeEngine = null;
	callback();
}

//============================================
// Refresh activities tab (called by tab switch handler)
export function refreshActivitiesForCurrentSeason(player: Player): void {
	if (!activeEngine) {
		return;
	}
	const activities = getActivitiesForPhase(player.phase, player);
	ui.renderActivitiesTab(
		activities,
		activeEngine.weekState,
		(activity: Activity) => isActivityUnlocked(activity, player),
		(activity: Activity) => getEffectPreview(activity),
		// Activity selection during tab browse is a no-op if no active season
		() => {},
	);
}

//============================================
// Check if a season is currently active
export function isSeasonActive(): boolean {
	return activeEngine !== null;
}

//============================================
// Get current season record (for UI display)
export function getSeasonRecord(): { wins: number; losses: number } | null {
	if (!activeEngine) {
		return null;
	}
	const record = activeEngine.season.getPlayerRecord();
	return { wins: record.wins, losses: record.losses };
}

//============================================
// Get the active week state (for sidebar checklist updates)
export function getActiveWeekState(): WeekState | null {
	if (!activeEngine) {
		return null;
	}
	return activeEngine.weekState;
}

//============================================
// Get the active LeagueSeason (for tab switch standings display)
export function getActiveSeason(): LeagueSeason | null {
	if (!activeEngine) {
		return null;
	}
	return activeEngine.season;
}
