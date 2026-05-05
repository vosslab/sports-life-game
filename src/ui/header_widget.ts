// header_widget.ts - Player identity and current status header
//
// Exports updateHeader and updateLifeStatus to display player name, position,
// team, age, and current phase/week info.

import type { Player, CareerPhase } from '../player.js';
import { generatePortraitSVG } from '../avatar.js';
import { formatTeamWithEmoji } from '../team_emoji.js';
import { getElement, findElement } from '../dom_utils.js';

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
export function updateLifeStatus(
	record: string,
	nextOpponent: string,
	extraStatus?: string,
): void {
	const recordEl = getElement('life-record');
	const nextEl = getElement('life-next-opponent');
	const extraEl = findElement('life-extra-status');

	recordEl.textContent = record;
	nextEl.textContent = nextOpponent;
	if (extraEl) {
		extraEl.textContent = extraStatus || '';
	}
}

//============================================
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
