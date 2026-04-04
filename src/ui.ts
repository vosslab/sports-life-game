// ui.ts - centralized UI rendering module for the game

import { Player, CareerPhase } from './player.js';
import { ScheduleEntry } from './team.js';

//============================================
// Type definitions for choice options
export interface ChoiceOption {
	text: string;
	primary?: boolean;
	action: () => void;
}

//============================================
// Helper function: get DOM element or throw error
function getElement(id: string): HTMLElement {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`DOM element not found: ${id}`);
	}
	return el;
}

//============================================
// STAT BAR MANAGEMENT
//============================================

// Update a single stat bar width, color, and numeric value
export function updateStatBar(statName: string, value: number): void {
	const barEl = getElement(`bar-${statName}`);
	const valEl = getElement(`val-${statName}`);

	// Clamp value to 0-100
	const clamped = Math.max(0, Math.min(100, value));

	// Update bar width
	barEl.style.width = `${clamped}%`;

	// Remove old color classes and apply new one based on value
	barEl.classList.remove('stat-high', 'stat-mid', 'stat-low');
	if (clamped >= 70) {
		barEl.classList.add('stat-high');
	} else if (clamped >= 40) {
		barEl.classList.add('stat-mid');
	} else {
		barEl.classList.add('stat-low');
	}

	// Update numeric value
	valEl.textContent = Math.round(clamped).toString();
}

// Update all 7 visible stat bars from player state
export function updateAllStats(player: Player): void {
	updateStatBar('athleticism', player.core.athleticism);
	updateStatBar('technique', player.core.technique);
	updateStatBar('footballIq', player.core.footballIq);
	updateStatBar('discipline', player.core.discipline);
	updateStatBar('health', player.core.health);
	updateStatBar('confidence', player.core.confidence);
	updateStatBar('popularity', player.career.popularity);
}

//============================================
// HEADER MANAGEMENT
//============================================

// Update player header with name, position, team, age, and phase
export function updateHeader(player: Player): void {
	const nameEl = getElement('player-name');
	const posEl = getElement('player-position');
	const teamEl = getElement('player-team');
	const ageEl = getElement('player-age');
	const weekEl = getElement('player-week');

	// Full name
	nameEl.textContent = `${player.firstName} ${player.lastName}`;

	// Position and team on same line
	const posText = player.position || 'TBD';
	const teamText = player.teamName || 'Free Agent';
	posEl.textContent = posText;
	teamEl.textContent = teamText;

	// Age and phase label
	ageEl.textContent = `Age ${player.age}`;

	// Phase label with week if applicable
	const phaseLabel = getPhaseLabel(player.phase);
	if (player.currentWeek > 0) {
		weekEl.textContent = `${phaseLabel} - Week ${player.currentWeek}`;
	} else {
		weekEl.textContent = phaseLabel;
	}
}

// Helper: convert career phase to readable label
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
// STORY LOG MANAGEMENT
//============================================

// Clear story log
export function clearStory(): void {
	const storyLog = getElement('story-log');
	storyLog.innerHTML = '';
}

// Add headline to story log
export function addHeadline(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-headline';
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

// Add regular text to story log
export function addText(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

// Add result text with blue left border
export function addResult(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-result';
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

// Add stat change text (italic, small)
export function addStatChange(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-stat-change';
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

// Auto-scroll story log to bottom
function autoScroll(): void {
	const storyPanel = getElement('story-panel');
	storyPanel.scrollTop = storyPanel.scrollHeight;
}

//============================================
// CHOICE BUTTONS MANAGEMENT
//============================================

// Show choice buttons
export function showChoices(options: ChoiceOption[]): void {
	const panel = getElement('choices-panel');
	panel.innerHTML = '';

	for (const option of options) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		if (option.primary) {
			button.classList.add('primary');
		}
		button.textContent = option.text;
		button.addEventListener('click', option.action);
		panel.appendChild(button);
	}
}

// Clear all choice buttons
export function clearChoices(): void {
	const panel = getElement('choices-panel');
	panel.innerHTML = '';
}

//============================================
// EVENT MODAL MANAGEMENT
//============================================

// Show event modal with title, description, and choices
export function showEventModal(
	title: string,
	description: string,
	choices: { text: string; action: () => void }[]
): void {
	const modal = getElement('event-modal');
	const titleEl = getElement('event-title');
	const descEl = getElement('event-description');
	const choicesEl = getElement('event-choices');

	// Set content
	titleEl.textContent = title;
	descEl.textContent = description;

	// Clear and populate choices
	choicesEl.innerHTML = '';
	for (const choice of choices) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		button.textContent = choice.text;
		button.addEventListener('click', choice.action);
		choicesEl.appendChild(button);
	}

	// Show modal
	modal.classList.remove('hidden');
}

// Hide event modal
export function hideEventModal(): void {
	const modal = getElement('event-modal');
	modal.classList.add('hidden');
}

//============================================
// STATUS BAR MANAGEMENT
//============================================

// Update footer status bar with team record and recruiting info
export function updateStatusBar(record: string, recruiting: string): void {
	const recordEl = getElement('team-record');
	const recruitEl = getElement('recruiting-status');

	recordEl.textContent = record;
	recruitEl.textContent = recruiting;
}

//============================================
// WEEKLY FOCUS SCREEN
//============================================

// Display weekly focus options as choice buttons
export function showWeeklyFocusChoices(
	onChoice: (focus: string) => void
): void {
	const focusOptions: ChoiceOption[] = [
		{
			text: 'Train',
			action: () => onChoice('train'),
		},
		{
			text: 'Film Study',
			action: () => onChoice('film_study'),
		},
		{
			text: 'Recovery',
			action: () => onChoice('recovery'),
		},
		{
			text: 'Social',
			action: () => onChoice('social'),
		},
		{
			text: 'Teamwork',
			action: () => onChoice('teamwork'),
		},
	];

	showChoices(focusOptions);
}

//============================================
// GAME RESULT DISPLAY
//============================================

// Display game day result with player line, team result, and story
export function showGameResult(
	playerLine: string,
	teamResult: string,
	storyText: string
): void {
	addHeadline('Game Day');
	addText(storyText);
	addResult(playerLine);
	addResult(teamResult);
}

//============================================
// STANDINGS DISPLAY
//============================================

// Show standings panel with formatted standings
export function showStandings(formattedStandings: string): void {
	const panel = getElement('standings-panel');
	const content = getElement('standings-content');

	// Process formatted text to highlight player's team (lines starting with >>>)
	const lines = formattedStandings.split('\n');
	content.innerHTML = '';

	for (const line of lines) {
		if (line.indexOf('>>>') === 0) {
			const span = document.createElement('span');
			span.className = 'player-team-row';
			span.textContent = line;
			content.appendChild(span);
			const br = document.createElement('br');
			content.appendChild(br);
		} else if (line.trim().length > 0) {
			content.appendChild(document.createTextNode(line));
			const br = document.createElement('br');
			content.appendChild(br);
		}
	}

	// Show panel
	panel.classList.remove('hidden');
}

// Hide standings panel
export function hideStandings(): void {
	const panel = getElement('standings-panel');
	panel.classList.add('hidden');
}

// Toggle standings panel visibility
export function toggleStandings(formattedStandings: string): void {
	const panel = getElement('standings-panel');

	if (panel.classList.contains('hidden')) {
		showStandings(formattedStandings);
	} else {
		hideStandings();
	}
}

//============================================
// SCHEDULE DISPLAY
//============================================

// Show schedule panel with formatted schedule
export function showSchedule(
	schedule: ScheduleEntry[],
	currentWeek: number,
	teamName: string
): void {
	const panel = getElement('schedule-panel');
	const content = getElement('schedule-content');

	// Build schedule output
	let output = `Season Schedule - ${teamName}:\n`;

	for (const entry of schedule) {
		const weekStr = entry.week.toString().padStart(2, ' ');
		const prefix = entry.week === currentWeek ? '>>> ' : '  ';

		let resultStr: string;
		if (entry.played) {
			// Determine W or L
			const result = entry.teamScore > entry.opponentScore ? 'W' : 'L';
			resultStr = `${result} ${entry.teamScore}-${entry.opponentScore}`;
		} else {
			resultStr = '--';
		}

		const opponentStr = entry.opponentName.padEnd(25);
		output += `${prefix}Wk ${weekStr}  vs ${opponentStr} ${resultStr}\n`;
	}

	// Render to <pre> element
	content.textContent = output;

	// Show panel
	panel.classList.remove('hidden');
}

// Hide schedule panel
export function hideSchedule(): void {
	const panel = getElement('schedule-panel');
	panel.classList.add('hidden');
}

// Toggle schedule panel visibility
export function toggleSchedule(
	schedule: ScheduleEntry[],
	currentWeek: number,
	teamName: string
): void {
	const panel = getElement('schedule-panel');

	if (panel.classList.contains('hidden')) {
		showSchedule(schedule, currentWeek, teamName);
	} else {
		hideSchedule();
	}
}
