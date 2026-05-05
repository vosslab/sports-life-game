// tab_manager.ts - centralized tab lifecycle management
//
// This file is the single owner of tab bar state and tab content refresh.
// All tab updates flow through here. Do not call updateTabBar directly
// from handlers or phase code - use syncTabsToPhase instead.
//
// tabs.ts owns the low-level DOM (button rendering, panel show/hide).
// ui.ts owns the rendering of tab content (stat bars, team info, career info).
// This file owns the coordination: when to update, what data to pass.
//
// Record display is unified here via getCurrentRecord() so the Life tab,
// Team tab, and sidebar all read from the same source.

import type { Player, CareerPhase } from './player.js';
import type { TabId } from './tabs.js';
import type { WeekState } from './activities.js';
import type { ScheduleEntry } from './team.js';
import type { LeagueSeason } from './season/season_model.js';
import {
	updateTabBar, switchTab, setOnTabSwitch,
} from './tabs.js';
import * as ui from './ui/index.js';
import { renderSocialTab } from './social/feed_render.js';

//============================================
// Dependency injection interface
// Avoids circular imports by letting main.ts provide accessors at init time
export interface TabManagerDeps {
	getPlayer: () => Player | null;
	getActiveSeason: () => LeagueSeason | null;
	getSeasonRecord: () => { wins: number; losses: number } | null;
	getWeekState: () => WeekState | null;
	refreshActivities: () => void;
	refreshDashboard: () => void;
}

// Module-level reference set once at init
let deps: TabManagerDeps | null = null;

//============================================
// Initialize the tab manager and register the tab switch callback.
// Call once during game startup.
export function initTabManager(d: TabManagerDeps): void {
	deps = d;
	setOnTabSwitch(refreshTabContent);
}

//============================================
// Sync the tab bar to the current phase.
// Called on every phase transition (year_runner.ts) and as a safety net
// in refreshDashboard. Idempotent - safe to call multiple times.
export function syncTabsToPhase(phase: CareerPhase): void {
	updateTabBar(phase);
}

//============================================
// Single source of truth for the current team record.
// Checks the live season first (real-time from game results),
// falls back to careerHistory (populated at season end).
export function getCurrentRecord(player: Player): string {
	if (!deps) {
		return '0-0';
	}
	// Prefer live season record (updates after each game)
	const seasonRecord = deps.getSeasonRecord();
	if (seasonRecord) {
		return `${seasonRecord.wins}-${seasonRecord.losses}`;
	}
	// Fall back to career history (only populated at season end)
	if (player.careerHistory.length > 0) {
		const latest = player.careerHistory[player.careerHistory.length - 1];
		return `${latest.wins}-${latest.losses}`;
	}
	return '0-0';
}

//============================================
// Refresh the content of the currently active tab.
// Registered as the onTabSwitch callback via initTabManager.
function refreshTabContent(tabId: TabId): void {
	if (!deps) {
		return;
	}
	const player = deps.getPlayer();
	if (!player) {
		return;
	}

	// Update stat bars and dashboard on every tab switch
	ui.updateAllStats(player);
	deps.refreshDashboard();

	// Build life status bar (record, opponent, extras)
	const activeSeason = deps.getActiveSeason();
	const record = getCurrentRecord(player);
	let lifeRecord = 'No team record yet.';
	let lifeNextOpponent = 'No upcoming opponent.';
	let lifeExtra = '';

	if (activeSeason && record !== '0-0') {
		lifeRecord = `Record: ${record}`;
		// Show current week opponent
		const playerGame = activeSeason.getPlayerGame();
		if (playerGame) {
			const oppId = playerGame.getOpponentId(activeSeason.playerTeamId);
			const opp = oppId ? activeSeason.getTeam(oppId) : undefined;
			const oppName = opp ? opp.getDisplayName() : 'TBD';
			lifeNextOpponent = `Week ${activeSeason.getCurrentWeek()} vs ${oppName}`;
		} else {
			lifeNextOpponent = `Week ${activeSeason.getCurrentWeek()}`;
		}
		// Conference record from standings
		const playerTeam = activeSeason.getPlayerTeam();
		if (playerTeam && playerTeam.conferenceId) {
			const standings = activeSeason.getStandings(playerTeam.conferenceId);
			const playerRow = standings.find(
				r => r.teamId === activeSeason.playerTeamId
			);
			if (playerRow && (playerRow.conferenceWins > 0 || playerRow.conferenceLosses > 0)) {
				lifeExtra = `Conference: ${playerRow.conferenceWins}-${playerRow.conferenceLosses}`;
			}
		}
		// Draft stock for college juniors/seniors
		if (player.phase === 'college' && player.collegeYear >= 3) {
			lifeExtra += lifeExtra
				? ` | Draft Stock: ${player.draftStock}`
				: `Draft Stock: ${player.draftStock}`;
		}
		// Recruiting stars for high school
		if (player.phase === 'high_school' && player.recruitingStars > 0) {
			lifeExtra += lifeExtra
				? ` | Recruiting: ${player.recruitingStars} stars`
				: `Recruiting: ${player.recruitingStars} stars`;
		}
	}
	ui.updateLifeStatus(lifeRecord, lifeNextOpponent, lifeExtra);

	// Refresh phase-specific tab content
	if (tabId === 'stats') {
		ui.updateStatsTab(player);
	} else if (tabId === 'team') {
		refreshTeamTab(player, activeSeason);
	} else if (tabId === 'activities') {
		deps.refreshActivities();
	} else if (tabId === 'career') {
		ui.updateCareerTab(player);
	} else if (tabId === 'social') {
		const socialContent = document.getElementById('social-content');
		if (socialContent) {
			renderSocialTab(player, socialContent, () => {
				// After a manual post: refresh stat bars (popularity may have moved)
				// and re-render the feed in place.
				ui.updateAllStats(player);
				if (deps) {
					deps.refreshDashboard();
				}
				renderSocialTab(player, socialContent, () => {});
			});
		}
	}
}

//============================================
// Build and display the Team tab content from season data
function refreshTeamTab(player: Player, activeSeason: LeagueSeason | null): void {
	const teamName = player.teamName || 'No Team';
	const record = getCurrentRecord(player);

	// Build standings text from the season layer
	let standingsText = '';
	if (activeSeason) {
		const playerTeam = activeSeason.getPlayerTeam();
		const confId = playerTeam ? playerTeam.conferenceId : undefined;
		// Filter by conference in NFL (shows 16 teams instead of 32)
		const useConference = player.phase === 'nfl' && confId;
		const standings = useConference
			? activeSeason.getStandings(confId)
			: activeSeason.getStandings();
		// Header shows conference name if filtered
		const confLabel = useConference ? `${confId} Standings` : 'Standings';
		standingsText += `${confLabel}:\n`;
		for (let i = 0; i < standings.length; i++) {
			const row = standings[i];
			const rank = (i + 1).toString().padStart(2, ' ');
			const recordStr = `${row.wins}-${row.losses}`;
			const isPlayer = row.teamId === activeSeason.playerTeamId;
			const prefix = isPlayer ? '>>> ' : '  ';
			standingsText += `${prefix}${rank}. ${row.name.padEnd(25)} ${recordStr}\n`;
		}
	}

	// Build schedule from the season layer
	let schedule: ScheduleEntry[] = [];
	let week = player.currentWeek;
	if (activeSeason) {
		const seasonSchedule = activeSeason.getScheduleDisplay(activeSeason.playerTeamId);
		schedule = seasonSchedule.map(row => ({
			opponentName: row.opponentName,
			opponentStrength: 0,
			week: row.week,
			played: row.played,
			teamScore: row.teamScore || 0,
			opponentScore: row.opponentScore || 0,
		}));
		week = activeSeason.getCurrentWeek();
	}

	// Coach info from season team
	let coachInfo = '';
	if (activeSeason) {
		const playerTeam = activeSeason.getPlayerTeam();
		if (playerTeam) {
			coachInfo = `Coach (${playerTeam.coachPersonality})`;
		}
	}

	ui.updateTeamTab(teamName, record, standingsText, schedule, week, coachInfo);
}
