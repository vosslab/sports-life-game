// career_panel.ts - High school career panel

import type { PanelRegistration } from '../../plugin_host.js';
import type { GameContext } from '../../../core/game_context.js';
import type { Player } from '../../../player.js';
import { renderCareerStatsTable } from '../../../career_stats_view.js';

//============================================
export const hsCareerPanel: PanelRegistration = {
	panelId: 'high_school_career',
	label: 'Career',
	availableInPhase: (phase) => phase === 'high_school',
	render: (ctx: GameContext) => {
		const container = document.getElementById('career-content');
		if (!container) {
			throw new Error('career-content slot missing');
		}
		const player = ctx.getPlayer();
		renderHSCareer(container, player);
	},
};

//============================================
// High school career rendering
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
		// topOffer is provably defined due to length check above
		if (topOffer !== undefined) {
			addCareerRow(container, 'Top Offer', topOffer);
		}
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

	// Per-season stat history (HS-only rows + current season if HS)
	renderCareerStatsTable(container, player, 'high_school');
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
