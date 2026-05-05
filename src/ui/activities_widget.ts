// activities_widget.ts - Activities tab content rendering
//
// Exports renderActivitiesTab to display available activities and action budget.

import type { Activity, WeekState } from '../activities.js';
import type { GoalInfo } from '../week_sim.js';
import type { SeasonGoal } from '../player.js';

//============================================
// Render the activities tab with available activities and action cap
export function renderActivitiesTab(
	activities: Activity[],
	weekState: WeekState,
	isUnlocked: (activity: Activity) => boolean,
	effectPreview: (activity: Activity) => string,
	onSelect: (activity: Activity) => void,
	goalInfo?: {
		goals: GoalInfo[];
		currentGoal: SeasonGoal;
		onGoalChange: (goal: SeasonGoal) => void;
	},
): void {
	const content = document.getElementById('activities-content');
	if (!content) {
		return;
	}

	content.innerHTML = '';

	// If no activities available (childhood/youth), show placeholder
	if (activities.length === 0) {
		const placeholder = document.createElement('p');
		placeholder.className = 'tab-placeholder';
		placeholder.textContent = 'Activities unlock during football season.';
		content.appendChild(placeholder);
		return;
	}

	// Goal selector at top of Activities tab
	if (goalInfo) {
		const goalSection = document.createElement('div');
		goalSection.className = 'goal-selector';

		const goalLabel = document.createElement('label');
		goalLabel.className = 'goal-selector-label';
		goalLabel.textContent = 'Season Goal:';
		goalLabel.setAttribute('for', 'goal-dropdown');
		goalSection.appendChild(goalLabel);

		const goalSelect = document.createElement('select');
		goalSelect.id = 'goal-dropdown';
		goalSelect.className = 'goal-dropdown';
		for (const goal of goalInfo.goals) {
			const option = document.createElement('option');
			option.value = goal.key;
			option.textContent = `${goal.name} - ${goal.effectHint}`;
			if (goal.key === goalInfo.currentGoal) {
				option.selected = true;
			}
			goalSelect.appendChild(option);
		}
		goalSelect.addEventListener('change', () => {
			goalInfo.onGoalChange(goalSelect.value as SeasonGoal);
		});
		goalSection.appendChild(goalSelect);

		// Show description of current goal
		const currentGoalInfo = goalInfo.goals.find(g => g.key === goalInfo.currentGoal);
		if (currentGoalInfo) {
			const goalDesc = document.createElement('div');
			goalDesc.className = 'goal-description';
			goalDesc.textContent = currentGoalInfo.description;
			goalSection.appendChild(goalDesc);
		}

		content.appendChild(goalSection);
	}

	// Action budget display
	const budget = document.createElement('div');
	budget.className = 'activities-budget';
	const remaining = weekState.actionBudget - weekState.actionsUsed;
	budget.textContent = `${remaining} action${remaining !== 1 ? 's' : ''} remaining this week`;
	content.appendChild(budget);

	// Show read-only message if not in activity_prompt phase
	if (weekState.phase !== 'activity_prompt') {
		const readOnly = document.createElement('div');
		readOnly.className = 'activities-readonly';
		if (weekState.actionsUsed >= weekState.actionBudget) {
			readOnly.textContent = 'Done for this week.';
		} else {
			readOnly.textContent = 'Activities available during your free time each week.';
		}
		content.appendChild(readOnly);
	}

	// Render each activity as a card
	for (const activity of activities) {
		const card = document.createElement('div');
		card.className = 'activity-card';

		// Activity name
		const name = document.createElement('div');
		name.className = 'activity-name';
		name.textContent = activity.name;
		card.appendChild(name);

		// Description
		const desc = document.createElement('div');
		desc.className = 'activity-desc';
		desc.textContent = activity.description;
		card.appendChild(desc);

		// Effect preview
		const effects = document.createElement('div');
		effects.className = 'activity-effects';
		effects.textContent = effectPreview(activity);
		card.appendChild(effects);

		// Check if unlocked
		const unlocked = isUnlocked(activity);

		if (!unlocked) {
			// Locked: show hint, gray out
			card.classList.add('activity-locked');
			const hint = document.createElement('div');
			hint.className = 'activity-hint';
			hint.textContent = activity.unlockHint || 'Locked';
			card.appendChild(hint);
		} else if (weekState.phase === 'activity_prompt' && remaining > 0) {
			// Available: show button
			const btn = document.createElement('button');
			btn.className = 'choice-button activity-button';
			btn.textContent = 'Do This';
			btn.addEventListener('click', () => onSelect(activity));
			card.appendChild(btn);
		}

		content.appendChild(card);
	}
}
