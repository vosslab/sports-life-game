// career_widget.ts - Career information tab content
//
// Exports updateCareerTab and updateSeasonCareer to display career progress,
// awards, and phase-specific information.

import type { PluginHost } from '../plugins/plugin_host.js';
import type { Player } from '../player.js';
import type { CareerContext } from '../core/year_handler.js';
import { renderCareerStatsTable } from '../career_stats_view.js';
import { formatMoney } from './ui_utils.js';

//============================================
// Module-level plugin host (set during app initialization)
let pluginHost: PluginHost | null = null;

export function setCareerPluginHost(host: PluginHost): void {
	pluginHost = host;
}

// Module-level context (set during app gameplay)
let currentContext: CareerContext | null = null;

export function setCurrentCareerContext(ctx: CareerContext): void {
	currentContext = ctx;
}

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
		if (!pluginHost) {
			throw new Error('PluginHost not initialized: updateCareerTab called for high_school before setCareerPluginHost()');
		}
		if (!currentContext) {
			throw new Error('Career context not initialized: updateCareerTab called before setCurrentCareerContext()');
		}
		const hsCareerPanel = pluginHost.ui.getAllPanels().find((p) => p.panelId === 'high_school_career');
		if (!hsCareerPanel) {
			throw new Error('high_school_career panel not registered');
		}
		hsCareerPanel.render(currentContext);
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
// Update sidebar season+career section based on current phase
export function updateSeasonCareer(
	player: Player,
	seasonRecord?: string,
): void {
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

	// Season record - prefer live season record over careerHistory.
	// careerHistory is only populated at season end, so mid-season
	// it would show stale or empty data.
	if (seasonRecord) {
		addSidebarRow(container, 'Record', seasonRecord);
	} else if (player.careerHistory.length > 0) {
		const current = player.careerHistory[player.careerHistory.length - 1];
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


//============================================
// College career rendering
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

	// Per-season stat history (HS + college)
	renderCareerStatsTable(container, player);
}

//============================================
// NFL career rendering
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

	// Full career stat history (all phases)
	renderCareerStatsTable(container, player);
}

//============================================
// Legacy career rendering
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

	// Full career stat history across all phases
	renderCareerStatsTable(container, player);
}

//============================================
// Helper functions

//============================================
// Helper: create a label-value row (used by both addCareerRow and addSidebarRow)
function createLabelValueRow(container: HTMLElement, label: string, value: string): void {
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

function addCareerRow(container: HTMLElement, label: string, value: string): void {
	createLabelValueRow(container, label, value);
}

function addCareerSection(container: HTMLElement, title: string): void {
	const heading = document.createElement('div');
	heading.className = 'team-tab-section-label';
	heading.textContent = title;
	container.appendChild(heading);
}

function addCareerNote(container: HTMLElement, text: string): void {
	const note = document.createElement('div');
	note.className = 'career-note';
	note.textContent = text;
	container.appendChild(note);
}

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

function addSidebarRow(container: HTMLElement, label: string, value: string): void {
	createLabelValueRow(container, label, value);
}
