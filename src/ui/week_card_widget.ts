// week_card_widget.ts - Current week card and sidebar week panel
//
// Exports updateWeekCard, hideWeekCard, and updateThisWeekPanel to display
// current week information and weekly progress checklist.

import type { Player, CareerPhase } from '../player.js';
import type { WeekState } from '../activities.js';
import { formatTeamWithEmoji } from '../team_emoji.js';

//============================================
// Phase CSS class names for accent colors
const PHASE_CSS_CLASSES: Record<CareerPhase, string> = {
	childhood: 'phase-childhood',
	youth: 'phase-youth',
	high_school: 'phase-high-school',
	college: 'phase-college',
	nfl: 'phase-nfl',
	legacy: 'phase-legacy',
};

//============================================
// Year labels for college and high school
function getYearLabel(player: Player): string {
	if (player.phase === 'childhood') {
		return `Age ${player.age}`;
	}
	if (player.phase === 'youth') {
		return `Age ${player.age}, Youth Football`;
	}
	if (player.phase === 'high_school') {
		const hsYearLabels: Record<number, string> = {
			14: 'Freshman Year',
			15: 'Sophomore Year',
			16: 'Junior Year',
			17: 'Senior Year',
		};
		return `Age ${player.age}, ${hsYearLabels[player.age] || 'High School'}`;
	}
	if (player.phase === 'college') {
		const colYearLabels = ['', 'Freshman', 'Sophomore', 'Junior', 'Senior'];
		const label = colYearLabels[player.collegeYear] || `Year ${player.collegeYear}`;
		return `Age ${player.age}, ${label} Year`;
	}
	if (player.phase === 'nfl') {
		return `Age ${player.age}, NFL Year ${player.nflYear}`;
	}
	return `Age ${player.age}`;
}

//============================================
// Convert career phase to readable label
function getPhaseLabel(phase: CareerPhase): string {
	const labels: Record<CareerPhase, string> = {
		childhood: 'Childhood',
		youth: 'Youth',
		high_school: 'High School',
		college: 'College',
		nfl: 'NFL',
		legacy: 'Legacy',
	};
	return labels[phase] || 'Unknown';
}

//============================================
// Update the current-week card with player context
export function updateWeekCard(
	player: Player,
	opponent: string,
	pressure: string,
): void {
	const card = document.getElementById('current-week-card');
	if (!card) {
		return;
	}

	// Show the card
	card.classList.remove('hidden');

	// Set phase CSS class for accent color
	for (const cls of Object.values(PHASE_CSS_CLASSES)) {
		card.classList.remove(cls);
	}
	card.classList.add(PHASE_CSS_CLASSES[player.phase]);

	// Phase badge
	const badge = document.getElementById('week-card-phase-badge');
	if (badge) {
		badge.textContent = getPhaseLabel(player.phase);
	}

	// Age + year label
	const ageLabel = document.getElementById('week-card-age-label');
	if (ageLabel) {
		ageLabel.textContent = getYearLabel(player);
	}

	// Week label
	const weekLabel = document.getElementById('week-card-week-label');
	if (weekLabel) {
		if (player.currentWeek > 0) {
			weekLabel.textContent = `Week ${player.currentWeek}`;
		} else {
			weekLabel.textContent = '';
		}
	}

	// Pressure indicator
	const pressureEl = document.getElementById('week-card-pressure');
	if (pressureEl) {
		if (pressure) {
			pressureEl.textContent = pressure;
			pressureEl.classList.remove('hidden');
		} else {
			pressureEl.classList.add('hidden');
		}
	}

	// Opponent
	const opponentEl = document.getElementById('week-card-opponent');
	if (opponentEl) {
		if (opponent) {
			opponentEl.textContent = `vs ${formatTeamWithEmoji(opponent)}`;
			opponentEl.classList.remove('hidden');
		} else {
			opponentEl.classList.add('hidden');
		}
	}
}

//============================================
// Hide the week card (e.g., during character creation)
export function hideWeekCard(): void {
	const card = document.getElementById('current-week-card');
	if (card) {
		card.classList.add('hidden');
	}
}

//============================================
// Update the This Week checklist in the sidebar
export function updateThisWeekPanel(
	weekState: WeekState | null,
	opponent: string,
	focusLabel: string,
): void {
	const section = document.getElementById('sidebar-this-week');
	const checklist = document.getElementById('week-checklist');
	if (!section || !checklist) {
		return;
	}

	// Hide if no week state (offseason, childhood, etc.)
	if (!weekState) {
		section.classList.add('hidden');
		return;
	}

	section.classList.remove('hidden');
	checklist.innerHTML = '';

	// Focus item
	const focusDone = weekState.phase !== 'focus';
	addChecklistItem(checklist, focusDone, focusDone ? `Focus: ${focusLabel}` : 'Choose focus');

	// Activity item
	const remaining = weekState.actionBudget - weekState.actionsUsed;
	const activityDone =
		weekState.phase === 'activity_done' ||
		weekState.phase === 'event' ||
		weekState.phase === 'game' ||
		weekState.phase === 'results';
	if (activityDone || remaining <= 0) {
		addChecklistItem(checklist, true, 'Activity done');
	} else if (weekState.phase === 'activity_prompt') {
		addChecklistItem(checklist, false, `${remaining} action remaining`);
	} else {
		addChecklistItem(checklist, false, 'Activity: upcoming');
	}

	// Event item
	const eventDone = weekState.phase === 'game' || weekState.phase === 'results';
	addChecklistItem(checklist, eventDone, eventDone ? 'Event resolved' : 'Event: pending');

	// Game day item
	const gameDone = weekState.phase === 'results';
	if (opponent) {
		const opponentWithEmoji = formatTeamWithEmoji(opponent);
		addChecklistItem(checklist, gameDone, gameDone ? `Game: vs ${opponentWithEmoji}` : `Game Day: vs ${opponentWithEmoji}`);
	} else {
		addChecklistItem(checklist, false, 'Game Day');
	}
}

//============================================
// Helper: add a checklist item
function addChecklistItem(container: HTMLElement, done: boolean, text: string): void {
	const item = document.createElement('div');
	item.className = 'week-checklist-item';

	const icon = document.createElement('div');
	icon.className = 'week-checklist-icon';
	if (done) {
		icon.classList.add('done');
		icon.textContent = 'x';
	} else {
		icon.classList.add('pending');
	}
	item.appendChild(icon);

	const label = document.createElement('div');
	label.className = 'week-checklist-label';
	if (done) {
		label.classList.add('done');
	}
	label.textContent = text;
	item.appendChild(label);

	container.appendChild(item);
}
