// ui.ts - centralized UI rendering module for the game

import { Player, CareerPhase } from './player.js';
import { ScheduleEntry } from './team.js';
import { Activity, WeekState } from './activities.js';
import type { StatLine } from './week_sim.js';

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

// Update the compact status shown on the Life tab
export function updateLifeStatus(record: string, nextOpponent: string): void {
	const recordEl = getElement('life-record');
	const nextEl = getElement('life-next-opponent');

	recordEl.textContent = record;
	nextEl.textContent = nextOpponent;
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
		button.addEventListener('click', () => option.action());
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
			text: 'Train (+2-4 TEC)',
			action: () => onChoice('train'),
		},
		{
			text: 'Film Study (+2-3 IQ)',
			action: () => onChoice('film_study'),
		},
		{
			text: 'Recovery (+3-5 HP)',
			action: () => onChoice('recovery'),
		},
		{
			text: 'Social (+2-4 POP)',
			action: () => onChoice('social'),
		},
		{
			text: 'Teamwork (+2-3 leadership)',
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

//============================================
// STATS TAB CONTENT
//============================================

// Update the stats tab with current player data (called on tab switch)
export function updateStatsTab(player: Player): void {
	// Stat bars update themselves via updateAllStats (called elsewhere)
	// Here we update the summary section below the stat bars
	const summary = document.getElementById('stats-summary');
	if (!summary) {
		return;
	}

	// Build summary rows based on current state
	const rows: { label: string; value: string }[] = [];

	// Position (if assigned)
	if (player.position) {
		rows.push({ label: 'Position', value: player.position });
	}

	// Season record (if in a season)
	const history = player.careerHistory;
	if (history.length > 0) {
		const current = history[history.length - 1];
		const record = `${current.wins}-${current.losses}`;
		rows.push({ label: 'Record', value: record });
	}

	// Money
	if (player.career.money > 0) {
		const moneyStr = formatMoney(player.career.money);
		rows.push({ label: 'Earnings', value: moneyStr });
	}

	// Depth chart
	if (player.phase === 'high_school' || player.phase === 'college' || player.phase === 'nfl') {
		const depthLabel = player.depthChart.charAt(0).toUpperCase() + player.depthChart.slice(1);
		rows.push({ label: 'Depth Chart', value: depthLabel });
	}

	// Seasons played
	if (player.currentSeason > 0) {
		rows.push({ label: 'Seasons', value: player.currentSeason.toString() });
	}

	// Render rows
	summary.innerHTML = '';
	for (const row of rows) {
		const div = document.createElement('div');
		div.className = 'stats-summary-row';
		const labelSpan = document.createElement('span');
		labelSpan.className = 'stats-summary-label';
		labelSpan.textContent = row.label;
		const valueSpan = document.createElement('span');
		valueSpan.className = 'stats-summary-value';
		valueSpan.textContent = row.value;
		div.appendChild(labelSpan);
		div.appendChild(valueSpan);
		summary.appendChild(div);
	}
}

//============================================
// TEAM TAB CONTENT
//============================================

// Update the team tab with team info, standings, and schedule
export function updateTeamTab(
	teamName: string,
	record: string,
	formattedStandings: string,
	schedule: ScheduleEntry[],
	currentWeek: number,
	coachName: string,
): void {
	const content = document.getElementById('team-content');
	if (!content) {
		return;
	}

	content.innerHTML = '';

	// Team name header
	const header = document.createElement('div');
	header.className = 'team-tab-header';
	header.innerHTML = `<strong>${teamName}</strong> (${record})`;
	content.appendChild(header);

	// Coach info
	if (coachName) {
		const coach = document.createElement('div');
		coach.className = 'team-tab-coach';
		coach.textContent = `Coach: ${coachName}`;
		content.appendChild(coach);
	}

	// Conference standings section
	if (formattedStandings) {
		const standingsLabel = document.createElement('div');
		standingsLabel.className = 'team-tab-section-label';
		standingsLabel.textContent = 'Conference Standings';
		content.appendChild(standingsLabel);

		const standingsPre = document.createElement('pre');
		standingsPre.id = 'standings-content';
		// Process standings to highlight player team
		const lines = formattedStandings.split('\n');
		for (const line of lines) {
			if (line.indexOf('>>>') === 0) {
				const span = document.createElement('span');
				span.className = 'player-team-row';
				span.textContent = line;
				standingsPre.appendChild(span);
				standingsPre.appendChild(document.createElement('br'));
			} else if (line.trim().length > 0) {
				standingsPre.appendChild(document.createTextNode(line));
				standingsPre.appendChild(document.createElement('br'));
			}
		}
		content.appendChild(standingsPre);
	}

	// Schedule section
	if (schedule.length > 0) {
		const scheduleLabel = document.createElement('div');
		scheduleLabel.className = 'team-tab-section-label';
		scheduleLabel.textContent = 'Season Schedule';
		content.appendChild(scheduleLabel);

		const schedulePre = document.createElement('pre');
		schedulePre.id = 'schedule-content';

		for (const entry of schedule) {
			const weekStr = entry.week.toString().padStart(2, ' ');
			const prefix = entry.week === currentWeek ? '>>>' : '  ';

			let resultStr: string;
			if (entry.played) {
				const result = entry.teamScore > entry.opponentScore ? 'W' : 'L';
				resultStr = `${result} ${entry.teamScore}-${entry.opponentScore}`;
			} else {
				resultStr = '--';
			}

			const opponentStr = entry.opponentName.padEnd(25);
			const line = `${prefix} Wk ${weekStr}  vs ${opponentStr} ${resultStr}\n`;
			schedulePre.appendChild(document.createTextNode(line));
		}

		content.appendChild(schedulePre);
	}
}

//============================================
// CAREER TAB CONTENT
//============================================

//============================================
// ACTIVITIES TAB CONTENT
//============================================

// Render the activities tab with available activities and action cap
export function renderActivitiesTab(
	activities: Activity[],
	weekState: WeekState,
	isUnlocked: (activity: Activity) => boolean,
	effectPreview: (activity: Activity) => string,
	onSelect: (activity: Activity) => void,
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

	// Action budget display at top
	const budget = document.createElement('div');
	budget.className = 'activities-budget';
	const remaining = weekState.actionBudget - weekState.actionsUsed;
	budget.textContent = `Actions: ${weekState.actionsUsed}/${weekState.actionBudget} used this week`;
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

//============================================
// CAREER TAB CONTENT
//============================================

// Update the career tab with phase-appropriate career info
export function updateCareerTab(player: Player): void {
	const content = document.getElementById('career-content');
	if (!content) {
		return;
	}

	content.innerHTML = '';

	// Phase-specific content
	if (player.phase === 'high_school') {
		renderHSCareer(content, player);
	} else if (player.phase === 'college') {
		renderCollegeCareer(content, player);
	} else if (player.phase === 'nfl') {
		renderNFLCareer(content, player);
	} else if (player.phase === 'legacy') {
		renderLegacyCareer(content, player);
	} else {
		// Childhood/youth: no career info yet
		const placeholder = document.createElement('p');
		placeholder.className = 'tab-placeholder';
		placeholder.textContent = 'Career info appears during high school.';
		content.appendChild(placeholder);
	}
}

//============================================
// Career tab sub-renderers per phase

function renderHSCareer(container: HTMLElement, player: Player): void {
	addCareerRow(container, 'Recruiting Stars', getStarDisplay(player.recruitingStars));
	if (player.age < 16) {
		addCareerNote(container, 'Recruiting updates start in your junior year.');
	}

	// Show offers if any
	if (player.collegeOffers.length > 0) {
		addCareerRow(container, 'Offers', player.collegeOffers.length.toString());
		// Show top offer
		const topOffer = player.collegeOffers[0];
		addCareerRow(container, 'Top Offer', topOffer);
	} else {
		addCareerRow(container, 'Offers', 'None yet');
	}

	// Big decisions
	if (player.bigDecisions.length > 0) {
		addCareerSection(container, 'Key Decisions');
		for (const decision of player.bigDecisions) {
			addCareerNote(container, decision);
		}
	}
}

//============================================
function renderCollegeCareer(container: HTMLElement, player: Player): void {
	// College year label
	const yearLabels = ['', 'Freshman', 'Sophomore', 'Junior', 'Senior'];
	const yearLabel = yearLabels[player.collegeYear] || `Year ${player.collegeYear}`;
	addCareerRow(container, 'Year', yearLabel);

	// Draft stock
	addCareerRow(container, 'Draft Stock', player.draftStock.toString());

	// NIL / money earned
	if (player.career.money > 0) {
		addCareerRow(container, 'NIL Earnings', formatMoney(player.career.money));
	}

	// Recruiting stars from HS
	addCareerRow(container, 'HS Recruiting', getStarDisplay(player.recruitingStars));

	// Big decisions
	if (player.bigDecisions.length > 0) {
		addCareerSection(container, 'Key Decisions');
		for (const decision of player.bigDecisions) {
			addCareerNote(container, decision);
		}
	}
}

//============================================
function renderNFLCareer(container: HTMLElement, player: Player): void {
	// NFL seasons played
	addCareerRow(container, 'NFL Seasons', player.nflYear.toString());

	// Career earnings
	addCareerRow(container, 'Career Earnings', formatMoney(player.career.money));

	// Current team
	addCareerRow(container, 'Team', player.teamName);

	// Draft stock from college
	addCareerRow(container, 'Draft Stock', player.draftStock.toString());

	// Career history: awards
	const allAwards: string[] = [];
	for (const season of player.careerHistory) {
		for (const award of season.awards) {
			allAwards.push(`${award} (${season.phase} Yr ${season.year})`);
		}
	}
	if (allAwards.length > 0) {
		addCareerSection(container, 'Awards');
		for (const award of allAwards) {
			addCareerNote(container, award);
		}
	}

	// Big decisions
	if (player.bigDecisions.length > 0) {
		addCareerSection(container, 'Key Decisions');
		for (const decision of player.bigDecisions) {
			addCareerNote(container, decision);
		}
	}
}

//============================================
function renderLegacyCareer(container: HTMLElement, player: Player): void {
	// Final career summary
	const totalSeasons = player.careerHistory.length;
	addCareerRow(container, 'Seasons Played', totalSeasons.toString());
	addCareerRow(container, 'Career Earnings', formatMoney(player.career.money));
	addCareerRow(container, 'Final Position', player.position || 'N/A');

	// Total wins/losses across all seasons
	let totalWins = 0;
	let totalLosses = 0;
	for (const season of player.careerHistory) {
		totalWins += season.wins;
		totalLosses += season.losses;
	}
	addCareerRow(container, 'Career Record', `${totalWins}-${totalLosses}`);

	// All awards
	const allAwards: string[] = [];
	for (const season of player.careerHistory) {
		for (const award of season.awards) {
			allAwards.push(award);
		}
	}
	if (allAwards.length > 0) {
		addCareerSection(container, 'Awards');
		for (const award of allAwards) {
			addCareerNote(container, award);
		}
	}

	// Big decisions
	if (player.bigDecisions.length > 0) {
		addCareerSection(container, 'Career Defining Moments');
		for (const decision of player.bigDecisions) {
			addCareerNote(container, decision);
		}
	}
}

//============================================
// Career tab helper functions

function addCareerRow(container: HTMLElement, label: string, value: string): void {
	const div = document.createElement('div');
	div.className = 'stats-summary-row';
	const labelSpan = document.createElement('span');
	labelSpan.className = 'stats-summary-label';
	labelSpan.textContent = label;
	const valueSpan = document.createElement('span');
	valueSpan.className = 'stats-summary-value';
	valueSpan.textContent = value;
	div.appendChild(labelSpan);
	div.appendChild(valueSpan);
	container.appendChild(div);
}

//============================================
function addCareerSection(container: HTMLElement, title: string): void {
	const heading = document.createElement('div');
	heading.className = 'team-tab-section-label';
	heading.textContent = title;
	container.appendChild(heading);
}

//============================================
function addCareerNote(container: HTMLElement, text: string): void {
	const note = document.createElement('div');
	note.className = 'career-note';
	note.textContent = text;
	container.appendChild(note);
}

//============================================
function getStarDisplay(stars: number): string {
	// ASCII star display
	let display = '';
	for (let i = 0; i < stars; i++) {
		display += '*';
	}
	// Pad to 5 for consistency
	while (display.length < 5) {
		display += '-';
	}
	return `${stars}-star (${display})`;
}

//============================================
function formatMoney(amount: number): string {
	if (amount >= 1000000) {
		const millions = (amount / 1000000).toFixed(1);
		return `$${millions}M`;
	}
	if (amount >= 1000) {
		const thousands = (amount / 1000).toFixed(0);
		return `$${thousands}K`;
	}
	return `$${amount}`;
}

//============================================
// Map camelCase stat keys to human-readable display labels
const STAT_LABELS: Record<string, string> = {
	// Passer stats
	passYards: 'Pass Yards',
	passTds: 'TDs',
	passInts: 'INTs',
	completions: 'Completions',
	attempts: 'Attempts',
	completionPct: 'Comp %',
	// Runner stats
	rushYards: 'Rush Yards',
	carries: 'Carries',
	rushTds: 'Rush TDs',
	fumbles: 'Fumbles',
	// Receiver stats
	receptions: 'Receptions',
	recYards: 'Rec Yards',
	recTds: 'Rec TDs',
	targets: 'Targets',
	// Tight end stats
	blockGrade: 'Block Grade',
	// Lineman stats
	grade: 'Grade',
	keyPlays: 'Key Plays',
	pressureRate: 'Pressure Rate',
	// Defender stats
	tackles: 'Tackles',
	sacks: 'Sacks',
	ints: 'INTs',
	// Kicker stats
	fgMade: 'FG Made',
	fgAttempts: 'FG Att',
	fgPercent: 'FG %',
	puntAvg: 'Punt Avg',
	xpMade: 'XP Made',
	xpAttempts: 'XP Att',
};

//============================================
// Format a stat key into a display label
export function formatStatKey(key: string): string {
	return STAT_LABELS[key] || key;
}

//============================================
// Format an entire stat line into a human-readable display string
export function formatStatLine(statLine: StatLine): string {
	const parts: string[] = [];
	for (const [key, val] of Object.entries(statLine)) {
		const label = formatStatKey(key);
		parts.push(`${label}: ${val}`);
	}
	return parts.join(' | ');
}
