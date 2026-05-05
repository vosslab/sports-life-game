// sidebar_widget.ts - Sidebar stat bars, identity, and milestone cards
//
// Exports updateSidebar and showMilestoneCard for sidebar rendering and
// milestone event card display in the story timeline.

import type { Player } from '../player.js';
import type { WeekState } from '../activities.js';
import { generatePortraitSVG } from '../avatar.js';
import { formatTeamWithEmoji } from '../team_emoji.js';
import { isSidebarVisible } from '../tabs.js';
import { STAT_INFO, type StatKey } from '../stat_info.js';
import { getElement } from '../dom_utils.js';
import { updateSeasonCareer } from './career_widget.js';
import { updateThisWeekPanel } from './week_card_widget.js';

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
			// Attach hover/tap tooltip describing the stat
			const info = STAT_INFO[stat.key as StatKey];
			if (info) {
				label.setAttribute('data-tip', info.tip);
				label.setAttribute('aria-label', info.name + ': ' + info.tip);
				label.setAttribute('tabindex', '0');
			}
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

//============================================
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
		if (
			player.depthChart &&
			(player.phase === 'high_school' || player.phase === 'college' || player.phase === 'nfl')
		) {
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

//============================================
// Update all sidebar sections (called on every state change)
export function updateSidebar(
	player: Player,
	weekState: WeekState | null,
	opponent: string,
	focusLabel: string,
	seasonRecord?: string,
): void {
	if (!isSidebarVisible()) {
		return;
	}

	updateSidebarPlayerIdentity(player);
	renderSidebarStatBars(player);
	updateSeasonCareer(player, seasonRecord);
	updateThisWeekPanel(weekState, opponent, focusLabel);
}

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

	// Auto-scroll
	const storyPanel = getElement('story-panel');
	storyPanel.scrollTop = storyPanel.scrollHeight;
}
