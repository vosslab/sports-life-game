// week_phases.ts - Weekly phase progression functions
// These handle the sequence of decision-making phases each week:
// goal selection, choices, crisis responses, activities, events.

import { Player } from '../player.js';
import { CareerContext } from '../core/year_handler.js';
import { SeasonGoal } from '../player.js';
import { applySeasonGoal, getGoalsForPhase, getPreferredActivitiesForGoal } from '../week_sim.js';
import { ArcPhase, getArcPhase } from '../season_arc.js';
import { getWeeklyChoices, resolveChoice, WeeklyChoice, ChoiceResult } from '../weekly_choices.js';
import {
	scheduleCrises, startCrisis, getCrisisResponses, resolveCrisisResponse,
	advanceCrisis,
} from '../crisis.js';
import {
	Activity, createWeekState, getActivitiesForPhase,
	isActivityUnlocked, applyActivity, getEffectPreview, formatActivityResult,
} from '../activities.js';
import { GameEvent, filterEvents, selectEvent, applyEventChoice } from '../events.js';
import { randomInRange } from '../player.js';
import { activeEngine } from './engine_state.js';
import * as gameHandler from './game_handler.js';

//============================================
// Show goal selection modal (used at season start and every 5 games)
export function showGoalSelection(
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
// Phase 1: Apply season goal effects and show adaptive choices or crisis response
export function applyGoalAndAdvance(player: Player, ctx: CareerContext): void {
	// Apply the season goal's stat effects (kept - background layer)
	const goalStory = applySeasonGoal(player);
	ctx.addText(goalStory);
	ctx.updateStats(player);
	ctx.save();

	if (!activeEngine) {
		return;
	}

	// Check for active crisis first
	if (player.activeCrisis && !player.activeCrisis.resolved) {
		showCrisisResponse(player, ctx);
		return;
	}

	// Check if crisis should trigger (midseason phase, not yet triggered)
	const arcPhase = getArcPhase(player.currentWeek, activeEngine.config.seasonLength);
	if (arcPhase === 'midseason' && !player.crisisTriggeredThisSeason) {
		// Schedule crises at start of midseason
		if (player.scheduledCrises.length === 0) {
			const record = activeEngine.season.getPlayerRecord();
			player.scheduledCrises = scheduleCrises(player, record.losses);
		}
		// Trigger next scheduled crisis
		if (player.scheduledCrises.length > 0) {
			const crisisId = player.scheduledCrises.shift()!;
			const crisis = startCrisis(crisisId);
			if (crisis) {
				player.activeCrisis = crisis;
				player.crisisTriggeredThisSeason = true;
				ctx.addHeadline(crisis.name);
				ctx.addText(crisis.description);
				showCrisisResponse(player, ctx);
				return;
			}
		}
	}

	// Normal week: show adaptive choices
	showWeeklyChoices(player, ctx, arcPhase);
}

//============================================
// Show adaptive weekly choices based on arc phase and context
export function showWeeklyChoices(player: Player, ctx: CareerContext, arcPhase: ArcPhase): void {
	if (!activeEngine) {
		return;
	}

	const record = activeEngine.season.getPlayerRecord();
	const choices = getWeeklyChoices(
		player, arcPhase, record.wins, record.losses,
		player.activeCrisis !== null,
	);

	if (choices.length === 0) {
		// No choices available, proceed directly
		activeEngine.weekState.phase = 'activity_done';
		proceedToEventCheck(player, ctx);
		return;
	}

	const choiceOptions = choices.map(choice => ({
		text: choice.text,
		description: `${choice.description} (${choice.risk})`,
		action: () => {
			const result = resolveChoice(player, choice);
			ctx.addText(result.narrative);
			ctx.updateStats(player);
			ctx.save();

			if (activeEngine) {
				activeEngine.weekState.phase = 'activity_done';
			}
			proceedToEventCheck(player, ctx);
		},
	}));

	ctx.waitForInteraction('What do you do this week?', choiceOptions, undefined, 'activity');
}

//============================================
// Show crisis response options during an active crisis
export function showCrisisResponse(player: Player, ctx: CareerContext): void {
	if (!player.activeCrisis) {
		return;
	}

	const responses = getCrisisResponses(player.activeCrisis.crisisId);
	if (responses.length === 0) {
		player.activeCrisis.resolved = true;
		if (activeEngine) {
			activeEngine.weekState.phase = 'activity_done';
		}
		proceedToEventCheck(player, ctx);
		return;
	}

	const responseOptions = responses.map(response => ({
		text: response.text,
		description: response.risk,
		action: () => {
			const narrative = resolveCrisisResponse(player, player.activeCrisis!, response.id);
			ctx.addText(narrative);
			ctx.updateStats(player);
			ctx.save();

			// Advance crisis timer
			if (player.activeCrisis) {
				const crisisOver = advanceCrisis(player.activeCrisis);
				if (crisisOver) {
					ctx.addText("The crisis has passed. Back to football.");
					player.activeCrisis = null;
				}
			}

			if (activeEngine) {
				activeEngine.weekState.phase = 'activity_done';
			}
			proceedToEventCheck(player, ctx);
		},
	}));

	ctx.waitForInteraction('Crisis: ' + player.activeCrisis.name, responseOptions, undefined, 'narrative');
}

//============================================
// Show activities in the Activities tab
export function showActivities(player: Player, ctx: CareerContext): void {
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

	ctx.renderActivitiesTab({
		activities,
		weekState: activeEngine ? activeEngine.weekState : createWeekState(),
		isUnlocked: (activity: Activity) => isActivityUnlocked(activity, player),
		effectPreview: (activity: Activity) => getEffectPreview(activity),
		onSelect: (activity: Activity) => handleActivitySelected(player, ctx, activity),
		goalInfo: goalInfoParam,
	});
}

//============================================
// Handle activity selection
export function handleActivitySelected(
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
		ctx.addStatChange(appliedText);
	}

	// Return to Life tab and proceed
	ctx.switchToLifeTab();
	proceedToEventCheck(player, ctx);
}

//============================================
// Apply a lightweight background activity that matches the season goal.
export function applyBackgroundActivityFromGoal(
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
		ctx.addStatChange(appliedText);
	}
	ctx.updateStats(player);
	ctx.save();
}

//============================================
// Phase 3: Random event check
export function proceedToEventCheck(player: Player, ctx: CareerContext): void {
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

		// Filter out events already seen this season
		const unseen = eligible.filter(e => !player.seenEventIds[e.id]);
		const event = selectEvent(unseen.length > 0 ? unseen : eligible);
		if (event) {
			player.seenEventIds[event.id] = true;
			showEventCard(player, ctx, event);
			return;
		}
	}

	// No event: go straight to game
	gameHandler.proceedToGame(player, ctx);
}

//============================================
// Show event modal, then proceed to game
export function showEventCard(
	player: Player, ctx: CareerContext, event: GameEvent,
): void {
	ctx.hideTabBar();

	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			const flavor = applyEventChoice(player, choice);
			ctx.showTabBar();

			ctx.addHeadline(event.title);
			ctx.addText(flavor);
			ctx.updateStats(player);
			ctx.save();
			gameHandler.proceedToGame(player, ctx);
		},
	}));

	ctx.waitForInteraction(event.title, choiceActions, event.description, 'narrative');
}
