// team_widget.ts - Team information tab content
//
// Exports updateTeamTab to render team name, record, standings, and schedule.

import type { ScheduleEntry } from '../team.js';
import { getTeamEmoji } from '../team_emoji.js';

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
