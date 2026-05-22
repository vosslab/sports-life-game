// scout_report_panel.ts - Scout Report panel for college/NFL phases
//
// Renders draft projection and scout notes. Mounts into the game's
// panel container identified by the main UI layout.

import type { PanelRegistration } from '../../plugin_host.js';
import type { GameContext } from '../../../core/game_context.js';
import type { Player } from '../../../player.js';
import { generateScoutReport } from '../scout_report_logic.js';

//============================================
export const scoutReportPanel: PanelRegistration = {
	panelId: 'scout_report',
	label: 'Scout Report',
	availableInPhase: (phase) => phase === 'college' || phase === 'nfl',
	render: (ctx: GameContext) => {
		const container = document.getElementById('career-content');
		if (!container) {
			throw new Error('career-content slot missing');
		}
		const player = ctx.getPlayer();
		// Create or reuse a contained section so we don't collide with other career content
		let section = document.getElementById('scout-report-section');
		if (!section) {
			section = document.createElement('div');
			section.id = 'scout-report-section';
			container.appendChild(section);
		}
		renderScoutReport(section, player);
	},
};

//============================================
// Render scout report into the given container
function renderScoutReport(container: HTMLElement, player: Player): void {
	container.innerHTML = '';

	// Passing this sentinel produces a steady-trend report, which the renderer hides via the `if (report.trend !== 'steady')` check below.
	const NO_PREVIOUS_DRAFT_STOCK = null;
	const previousDraftStock = NO_PREVIOUS_DRAFT_STOCK;
	const report = generateScoutReport(player, previousDraftStock);

	// Create title row
	const titleRow = document.createElement('div');
	titleRow.className = 'stats-summary-row';
	const titleLabel = document.createElement('span');
	titleLabel.className = 'stats-summary-label';
	titleLabel.textContent = 'Projection';
	const titleValue = document.createElement('span');
	titleValue.className = 'stats-summary-value';
	titleValue.textContent = report.projectionLabel;
	titleRow.appendChild(titleLabel);
	titleRow.appendChild(titleValue);
	container.appendChild(titleRow);

	// Draft Stock row
	const stockRow = document.createElement('div');
	stockRow.className = 'stats-summary-row';
	const stockLabel = document.createElement('span');
	stockLabel.className = 'stats-summary-label';
	stockLabel.textContent = 'Draft Stock';
	const stockValue = document.createElement('span');
	stockValue.className = 'stats-summary-value';
	stockValue.textContent = `${report.draftStock}/100`;
	stockRow.appendChild(stockLabel);
	stockRow.appendChild(stockValue);
	container.appendChild(stockRow);

	// Trend indicator
	if (report.trend !== 'steady') {
		const trendRow = document.createElement('div');
		trendRow.className = 'stats-summary-row';
		const trendLabel = document.createElement('span');
		trendLabel.className = 'stats-summary-label';
		trendLabel.textContent = 'Trend';
		const trendValue = document.createElement('span');
		trendValue.className = 'stats-summary-value';
		trendValue.textContent = report.trend === 'rising' ? 'RISING' : 'FALLING';
		trendValue.style.color = report.trend === 'rising' ? '#4a9d6f' : '#a23e2e';
		trendRow.appendChild(trendLabel);
		trendRow.appendChild(trendValue);
		container.appendChild(trendRow);
	}

	// Summary
	const summaryRow = document.createElement('div');
	summaryRow.className = 'stats-summary-row';
	summaryRow.style.marginTop = '1em';
	const summaryText = document.createElement('div');
	summaryText.textContent = report.summary;
	summaryText.style.fontSize = '0.95em';
	summaryText.style.lineHeight = '1.4';
	summaryRow.appendChild(summaryText);
	container.appendChild(summaryRow);

	// Notes sections
	if (report.notes.length > 0) {
		const notesRow = document.createElement('div');
		notesRow.style.marginTop = '1.5em';

		// Strengths
		const strengths = report.notes.filter((n) => n.category === 'strength');
		if (strengths.length > 0) {
			const strengthsHeader = document.createElement('div');
			strengthsHeader.style.fontWeight = 'bold';
			strengthsHeader.style.marginTop = '0.5em';
			strengthsHeader.textContent = 'Strengths:';
			notesRow.appendChild(strengthsHeader);
			for (const note of strengths) {
				const noteLine = document.createElement('div');
				noteLine.style.paddingLeft = '1em';
				noteLine.style.marginTop = '0.25em';
				noteLine.style.color = '#4a9d6f';
				noteLine.textContent = '+ ' + note.text;
				notesRow.appendChild(noteLine);
			}
		}

		// Weaknesses
		const weaknesses = report.notes.filter((n) => n.category === 'weakness');
		if (weaknesses.length > 0) {
			const weaknessesHeader = document.createElement('div');
			weaknessesHeader.style.fontWeight = 'bold';
			weaknessesHeader.style.marginTop = '0.75em';
			weaknessesHeader.textContent = 'Weaknesses:';
			notesRow.appendChild(weaknessesHeader);
			for (const note of weaknesses) {
				const noteLine = document.createElement('div');
				noteLine.style.paddingLeft = '1em';
				noteLine.style.marginTop = '0.25em';
				noteLine.style.color = '#a23e2e';
				noteLine.textContent = '- ' + note.text;
				notesRow.appendChild(noteLine);
			}
		}

		// Concerns
		const concerns = report.notes.filter((n) => n.category === 'concern');
		if (concerns.length > 0) {
			const concernsHeader = document.createElement('div');
			concernsHeader.style.fontWeight = 'bold';
			concernsHeader.style.marginTop = '0.75em';
			concernsHeader.textContent = 'Concerns:';
			notesRow.appendChild(concernsHeader);
			for (const note of concerns) {
				const noteLine = document.createElement('div');
				noteLine.style.paddingLeft = '1em';
				noteLine.style.marginTop = '0.25em';
				noteLine.style.color = '#c9a227';
				noteLine.textContent = '! ' + note.text;
				notesRow.appendChild(noteLine);
			}
		}

		// Buzz
		const buzz = report.notes.filter((n) => n.category === 'buzz');
		if (buzz.length > 0) {
			const buzzHeader = document.createElement('div');
			buzzHeader.style.fontWeight = 'bold';
			buzzHeader.style.marginTop = '0.75em';
			buzzHeader.textContent = 'Buzz:';
			notesRow.appendChild(buzzHeader);
			for (const note of buzz) {
				const noteLine = document.createElement('div');
				noteLine.style.paddingLeft = '1em';
				noteLine.style.marginTop = '0.25em';
				noteLine.style.color = '#6666cc';
				noteLine.textContent = '* ' + note.text;
				notesRow.appendChild(noteLine);
			}
		}

		container.appendChild(notesRow);
	}
}
