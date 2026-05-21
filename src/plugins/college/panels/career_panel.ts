// career_panel.ts - College career panel
//
// Renders college phase career stats: team, year, draft stock, NIL eligibility,
// big decisions, and per-season stat history.

import type { PanelRegistration } from '../../plugin_host.js';
import type { GameContext } from '../../../core/game_context.js';
import type { Player } from '../../../player.js';
import { renderCareerStatsTable } from '../../../career_stats_view.js';

//============================================
export const collegeCareerPanel: PanelRegistration = {
	panelId: 'college_career',
	label: 'Career',
	availableInPhase: (phase) => phase === 'college',
	render: (ctx: GameContext) => {
		const container = document.getElementById('career-content');
		if (!container) {
			throw new Error('career-content slot missing');
		}
		const player = ctx.getPlayer();
		renderCollegeCareer(container, player);
	},
};

//============================================
// College career rendering
function renderCollegeCareer(container: HTMLElement, player: Player): void {
	addCareerRow(container, 'College', player.teamName);
	addCareerRow(container, 'Year', `${player.collegeYear}`);
	addCareerRow(container, 'Draft Stock', getDraftStockDisplay(player.draftStock));

	// NIL deals available year 2+
	if (player.collegeYear >= 2) {
		addCareerRow(container, 'NIL Eligibility', 'Eligible');
	}

	// Big decisions
	if (player.bigDecisions.length > 0) {
		addCareerSection(container, 'Key Decisions');
		for (const decision of player.bigDecisions) {
			addCareerNote(container, decision);
		}
	}

	// Per-season stat history
	renderCareerStatsTable(container, player, 'college');
}

//============================================
// Helper functions

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

function getDraftStockDisplay(stock: number): string {
	if (stock <= 0) {
		return 'Not ranked';
	}
	if (stock <= 32) {
		return 'First round prospect';
	}
	if (stock <= 127) {
		return 'Day 2 prospect';
	}
	return 'Day 3 prospect';
}
