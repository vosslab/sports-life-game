// ui.ts - centralized UI rendering module for the game
//
// Popup and modal functions live in popup.ts and are re-exported
// here for backward compatibility with files using `import * as ui`.

import { Player, CareerPhase } from './player.js';
import { ScheduleEntry } from './team.js';
import { Activity, WeekState } from './activities.js';
import type { StatLine } from './week_sim.js';
import { generatePortraitSVG } from './avatar.js';
import type { Archetype } from './avatar.js';
import { getTeamEmoji, formatTeamWithEmoji } from './team_emoji.js';
import { isSidebarVisible } from './tabs.js';
import { getElement, findElement } from './dom_utils.js';
import { waitForInteraction as _waitForInteraction } from './popup.js';

//============================================
// Re-export popup functions so `import * as ui` still works
export {
	waitForInteraction, hideInteractionPopup,
	showEventModal, hideEventModal,
	configureMainButtons, disableMainButtons, enableMainButtons,
	hideMainActionBar, showMainActionBar, initMainActionBar,
} from './popup.js';

//============================================
// Type definitions for choice options
export interface ChoiceOption {
	text: string;
	primary?: boolean;
	action: () => void;
}

//============================================
// STAT BAR MANAGEMENT
//============================================

// Update a single stat bar width, color, and numeric value
export function updateStatBar(statName: string, value: number): void {
	// Safe element lookup - elements only exist when stats tab is visible
	const barEl = findElement(`bar-${statName}`);
	const valEl = findElement(`val-${statName}`);
	if (!barEl || !valEl) {
		return;
	}

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

	// Render player portrait using stored avatar config (not random)
	const portraitEl = document.getElementById('player-portrait');
	if (portraitEl && player.avatarConfig) {
		portraitEl.innerHTML = generatePortraitSVG(player.avatarConfig);
	}

	// Full name
	nameEl.textContent = `${player.firstName} ${player.lastName}`;

	// Position and team on same line (with emoji)
	const posText = player.position || 'TBD';
	const teamText = player.teamName ? formatTeamWithEmoji(player.teamName) : 'Free Agent';
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
	// Append into current collapsible section if one exists
	const sections = storyLog.querySelectorAll('.story-section');
	const lastSection = sections.length > 0 ? sections[sections.length - 1] : null;
	if (lastSection && !lastSection.classList.contains('collapsed')) {
		lastSection.appendChild(p);
	} else {
		storyLog.appendChild(p);
	}
	autoScroll();
}

// Add stat change text (italic, small)
export function addStatChange(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-stat-change';
	p.textContent = text;
	// Append into current collapsible section if one exists
	const sections = storyLog.querySelectorAll('.story-section');
	const lastSection = sections.length > 0 ? sections[sections.length - 1] : null;
	if (lastSection && !lastSection.classList.contains('collapsed')) {
		lastSection.appendChild(p);
	} else {
		storyLog.appendChild(p);
	}
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
// STATUS BAR MANAGEMENT
//============================================

// Update footer status bar with team record and recruiting info
export function updateStatusBar(record: string, recruiting: string): void {
	const recordEl = findElement('team-record');
	const recruitEl = findElement('recruiting-status');

	if (recordEl) {
		recordEl.textContent = record;
	}
	if (recruitEl) {
		recruitEl.textContent = recruiting;
	}
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

	_waitForInteraction('Weekly Focus', focusOptions);
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

// NOTE: showStandings, hideStandings, toggleStandings, showSchedule,
// hideSchedule, toggleSchedule are deprecated. The team tab now renders
// standings and schedule inline in updateTeamTab instead of using
// standalone panels. These functions are removed to reduce dead code.

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
	const teamEmoji = getTeamEmoji(teamName);
	const strong = document.createElement('strong');
	strong.textContent = `${teamEmoji} ${teamName}`;
	header.appendChild(strong);
	const recordSpan = document.createElement('span');
	recordSpan.textContent = ` (${record})`;
	header.appendChild(recordSpan);
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

//============================================
// CURRENT-WEEK CARD
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
			14: 'Freshman Year', 15: 'Sophomore Year',
			16: 'Junior Year', 17: 'Senior Year',
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

// Hide the week card (e.g., during character creation)
export function hideWeekCard(): void {
	const card = document.getElementById('current-week-card');
	if (card) {
		card.classList.add('hidden');
	}
}

//============================================
// MINI STAT STRIP (phone only)
//============================================

// Update the compact 3-bar stat strip shown on phone Life tab
export function updateMiniStatStrip(player: Player): void {
	const strip = document.getElementById('life-stats-strip');
	if (!strip) {
		return;
	}

	// Hide on iPad (sidebar covers stats) and during early childhood (no meaningful stats)
	if (isSidebarVisible() || player.phase === 'childhood') {
		strip.classList.add('hidden');
		return;
	}

	strip.classList.remove('hidden');

	// Update the 3 mini bars
	updateMiniBar('health', player.core.health);
	updateMiniBar('technique', player.core.technique);
	updateMiniBar('footballIq', player.core.footballIq);
}

// Update a single mini stat bar
function updateMiniBar(statName: string, value: number): void {
	const bar = document.getElementById(`mini-bar-${statName}`);
	if (!bar) {
		return;
	}
	const clamped = Math.max(0, Math.min(100, value));
	bar.style.width = `${clamped}%`;

	// Color based on value
	bar.classList.remove('stat-high', 'stat-mid', 'stat-low');
	if (clamped >= 70) {
		bar.classList.add('stat-high');
	} else if (clamped >= 40) {
		bar.classList.add('stat-mid');
	} else {
		bar.classList.add('stat-low');
	}
}

//============================================
// SIDEBAR: PLAYER + DEVELOPMENT
//============================================

// Render sidebar stat bars (creates them once, updates on subsequent calls)
function renderSidebarStatBars(player: Player): void {
	const container = document.getElementById('sidebar-stats');
	if (!container) {
		return;
	}

	// Stat definitions for sidebar
	const stats: { key: string; label: string; value: number }[] = [
		{ key: 'athleticism', label: 'ATH', value: player.core.athleticism },
		{ key: 'technique', label: 'TEC', value: player.core.technique },
		{ key: 'footballIq', label: 'IQ', value: player.core.footballIq },
		{ key: 'discipline', label: 'DSC', value: player.core.discipline },
		{ key: 'health', label: 'HP', value: player.core.health },
		{ key: 'confidence', label: 'CON', value: player.core.confidence },
		{ key: 'popularity', label: 'POP', value: player.career.popularity },
	];

	// Create bars if not yet created
	if (container.children.length === 0) {
		for (const stat of stats) {
			const row = document.createElement('div');
			row.className = 'stat-row';

			const label = document.createElement('span');
			label.className = 'stat-label';
			label.textContent = stat.label;
			row.appendChild(label);

			const bar = document.createElement('div');
			bar.className = 'stat-bar';
			const fill = document.createElement('div');
			fill.className = 'stat-fill';
			fill.id = `sb-bar-${stat.key}`;
			bar.appendChild(fill);
			row.appendChild(bar);

			const val = document.createElement('span');
			val.className = 'stat-value';
			val.id = `sb-val-${stat.key}`;
			val.textContent = '0';
			row.appendChild(val);

			container.appendChild(row);
		}
	}

	// Update values
	for (const stat of stats) {
		const barEl = document.getElementById(`sb-bar-${stat.key}`);
		const valEl = document.getElementById(`sb-val-${stat.key}`);
		if (barEl && valEl) {
			const clamped = Math.max(0, Math.min(100, stat.value));
			barEl.style.width = `${clamped}%`;
			barEl.classList.remove('stat-high', 'stat-mid', 'stat-low');
			if (clamped >= 70) {
				barEl.classList.add('stat-high');
			} else if (clamped >= 40) {
				barEl.classList.add('stat-mid');
			} else {
				barEl.classList.add('stat-low');
			}
			valEl.textContent = Math.round(clamped).toString();
		}
	}
}

// Update sidebar player identity section
function updateSidebarPlayerIdentity(player: Player): void {
	const nameEl = document.getElementById('sidebar-player-name');
	const detailEl = document.getElementById('sidebar-player-detail');
	const portraitEl = document.getElementById('sidebar-portrait');

	if (nameEl) {
		nameEl.textContent = `${player.firstName} ${player.lastName}`;
	}

	if (detailEl) {
		const parts: string[] = [];
		if (player.position) {
			parts.push(player.position);
		}
		if (player.teamName) {
			parts.push(formatTeamWithEmoji(player.teamName));
		}
		if (player.depthChart && (player.phase === 'high_school' || player.phase === 'college' || player.phase === 'nfl')) {
			const depthLabel = player.depthChart.charAt(0).toUpperCase() + player.depthChart.slice(1);
			parts.push(depthLabel);
		}
		detailEl.textContent = parts.join(' | ');
	}

	// Portrait using stored avatar config (not random)
	if (portraitEl && player.avatarConfig) {
		portraitEl.innerHTML = generatePortraitSVG(player.avatarConfig);
	}
}

// Show recent stat change text in sidebar
export function showRecentChange(text: string): void {
	const el = document.getElementById('sidebar-recent-change');
	if (!el) {
		return;
	}
	if (text) {
		el.textContent = text;
		el.classList.remove('hidden');
	} else {
		el.classList.add('hidden');
	}
}

//============================================
// SIDEBAR: SEASON + CAREER (phase-specific)
//============================================

// Update sidebar season+career section based on current phase
export function updateSeasonCareer(player: Player): void {
	const container = document.getElementById('sidebar-season-career');
	if (!container) {
		return;
	}

	// Hide for phases with no career content
	if (player.phase === 'childhood' || player.phase === 'youth') {
		container.classList.add('hidden');
		return;
	}

	container.classList.remove('hidden');
	container.innerHTML = '';

	// Section label
	const label = document.createElement('div');
	label.className = 'sidebar-section-label';
	label.textContent = 'Season & Career';
	container.appendChild(label);

	// Season record
	const history = player.careerHistory;
	if (history.length > 0) {
		const current = history[history.length - 1];
		const record = `${current.wins}-${current.losses}`;
		addSidebarRow(container, 'Record', record);
	}

	// Phase-specific rows
	if (player.phase === 'high_school') {
		addSidebarRow(container, 'Stars', getStarDisplay(player.recruitingStars));
		if (player.collegeOffers.length > 0) {
			addSidebarRow(container, 'Offers', player.collegeOffers.length.toString());
			addSidebarRow(container, 'Top Offer', player.collegeOffers[0]);
		}
	} else if (player.phase === 'college') {
		const yearLabels = ['', 'Freshman', 'Sophomore', 'Junior', 'Senior'];
		addSidebarRow(container, 'Year', yearLabels[player.collegeYear] || `Year ${player.collegeYear}`);
		if (player.career.money > 0) {
			addSidebarRow(container, 'NIL', formatMoney(player.career.money));
		}
		if (player.collegeYear >= 3) {
			addSidebarRow(container, 'Draft Stock', player.draftStock.toString());
		}
	} else if (player.phase === 'nfl') {
		addSidebarRow(container, 'NFL Year', player.nflYear.toString());
		addSidebarRow(container, 'Earnings', formatMoney(player.career.money));
		addSidebarRow(container, 'Draft Stock', player.draftStock.toString());
		// Retirement pressure for older players
		if (player.age >= 32) {
			const athleticism = player.core.athleticism;
			let pressureText = 'Low';
			if (player.age >= 37 || athleticism < 30) {
				pressureText = 'High';
			} else if (player.age >= 35 || athleticism < 40) {
				pressureText = 'Medium';
			}
			addSidebarRow(container, 'Retirement', pressureText);
		}
	} else if (player.phase === 'legacy') {
		// Total career stats
		let totalWins = 0;
		let totalLosses = 0;
		for (const season of player.careerHistory) {
			totalWins += season.wins;
			totalLosses += season.losses;
		}
		addSidebarRow(container, 'Career Record', `${totalWins}-${totalLosses}`);
		addSidebarRow(container, 'Earnings', formatMoney(player.career.money));
		addSidebarRow(container, 'Seasons', player.careerHistory.length.toString());
	}
}

// Helper: add a row to a sidebar section
function addSidebarRow(container: HTMLElement, label: string, value: string): void {
	const row = document.createElement('div');
	row.className = 'stats-summary-row';
	const labelSpan = document.createElement('span');
	labelSpan.className = 'stats-summary-label';
	labelSpan.textContent = label;
	const valueSpan = document.createElement('span');
	valueSpan.className = 'stats-summary-value';
	valueSpan.textContent = value;
	row.appendChild(labelSpan);
	row.appendChild(valueSpan);
	container.appendChild(row);
}

//============================================
// SIDEBAR: THIS WEEK PANEL
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
	const activityDone = weekState.phase === 'activity_done' || weekState.phase === 'event' || weekState.phase === 'game' || weekState.phase === 'results';
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

//============================================
// SIDEBAR: MASTER UPDATE
//============================================

// Update all sidebar sections (called on every state change)
export function updateSidebar(
	player: Player,
	weekState: WeekState | null,
	opponent: string,
	focusLabel: string,
): void {
	if (!isSidebarVisible()) {
		return;
	}

	updateSidebarPlayerIdentity(player);
	renderSidebarStatBars(player);
	updateSeasonCareer(player);
	updateThisWeekPanel(weekState, opponent, focusLabel);
}

//============================================
// MILESTONE EVENT CARDS
//============================================

// Show a milestone card in the story timeline
export function showMilestoneCard(
	title: string,
	description: string,
	impact: string,
): void {
	const storyLog = getElement('story-log');

	const card = document.createElement('div');
	card.className = 'milestone-card';

	const titleEl = document.createElement('div');
	titleEl.className = 'milestone-title';
	titleEl.textContent = title;
	card.appendChild(titleEl);

	const descEl = document.createElement('div');
	descEl.className = 'milestone-desc';
	descEl.textContent = description;
	card.appendChild(descEl);

	if (impact) {
		const impactEl = document.createElement('div');
		impactEl.className = 'milestone-impact';
		impactEl.textContent = impact;
		card.appendChild(impactEl);
	}

	storyLog.appendChild(card);
	autoScroll();
}
