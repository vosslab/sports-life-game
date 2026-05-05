// stats_widget.ts - Stat bar and stats tab content rendering
//
// Exports updateStatBar, updateAllStats, updateMiniStatStrip, and updateStatsTab
// for rendering the core stats UI across different views.

import type { Player } from '../player.js';
import { getAcademicStanding } from '../player.js';
import { findElement, getElement } from '../dom_utils.js';
import { isSidebarVisible } from '../tabs.js';

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

//============================================
// Update all visible stat bars from player state
export function updateAllStats(player: Player): void {
	updateStatBar('athleticism', player.core.athleticism);
	updateStatBar('technique', player.core.technique);
	updateStatBar('footballIq', player.core.footballIq);
	updateStatBar('discipline', player.core.discipline);
	updateStatBar('health', player.core.health);
	updateStatBar('confidence', player.core.confidence);
	updateStatBar('popularity', player.career.popularity);

	// GPA: map 0.0-4.0 to 0-100 for the bar, show actual value + standing
	const gpaRow = document.getElementById('gpa-row');
	const showGpa = player.phase === 'high_school' || player.phase === 'college';
	if (gpaRow) {
		gpaRow.style.display = showGpa ? '' : 'none';
	}
	if (showGpa) {
		const gpaPercent = (player.gpa / 4.0) * 100;
		updateStatBar('gpa', gpaPercent);
		// Override the numeric display with actual GPA + standing
		const gpaValEl = findElement('val-gpa');
		if (gpaValEl) {
			const standing = getAcademicStanding(player.gpa);
			gpaValEl.textContent = `${player.gpa.toFixed(1)} ${standing}`;
		}
	}
}

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
// Helper: format money amount
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
