// main.ts - Game bootstrap and top-level orchestration
//
// Minimal entry point: initialize game state, wire dependencies, and
// delegate phase progression to the year-handler system. All gameplay
// logic, narrative rendering, and UI is delegated to specialized modules.

import type { Player } from './player.js';
import type { GameEvent } from './events.js';
import type { CareerContext } from './core/year_handler.js';
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
import { loadEvents } from './events.js';
import { loadNCAASchools, type NCAASchool } from './ncaa.js';
import { loadNFLTeams } from './nfl.js';
import {
	switchTab, hideTabBar, showTabBar, initSidebarListener,
} from './tabs.js';
import { initTabManager, syncTabsToPhase } from './tab_manager.js';
import {
	initGameLoop, type GameContext, refreshActivitiesTabForCurrentPhase, getWeekState,
} from './game_loop.js';
import { registerAllHandlers } from './core/register_handlers.js';
import { advanceToNextYear, startYear } from './core/year_runner.js';
import { getSeasonRecord, getActiveSeason, getActiveWeekState } from './weekly/weekly_engine.js';
import * as ui from './ui/index.js';
import { applyPalette } from './theme.js';
import type { Activity } from './activities.js';
import {
	addStoryHeadline, addStoryText, clearStory, hardClearStory,
} from './render/story_log.js';
import { loadNameLists } from './childhood/name_loader.js';
import { startNewGameFlow } from './childhood/character_creation.js';
import { showRetirement } from './legacy/retirement.js';

//============================================
// Module state

let currentPlayer: Player | null = null;
let allEvents: GameEvent[] = [];
let ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] } = { fbs: [], fcs: [] };
let careerCtx: CareerContext | null = null;
let lastFocusLabel = '';
let lastRecentChange = '';

//============================================
// Dashboard refresh

function refreshDashboard(): void {
	if (!currentPlayer) return;

	syncTabsToPhase(currentPlayer.phase);

	let opponentName = '';
	let pressure = '';
	const activeSeason = getActiveSeason();
	if (activeSeason) {
		const playerGame = activeSeason.getPlayerGame();
		if (playerGame) {
			const oppId = playerGame.getOpponentId(activeSeason.playerTeamId);
			const opp = oppId ? activeSeason.getTeam(oppId) : undefined;
			opponentName = opp ? opp.getDisplayName() : '';
		}
	}

	if (currentPlayer.phase === 'nfl' && currentPlayer.age >= 35) {
		pressure = 'Contract year';
	} else if (currentPlayer.phase === 'college' && currentPlayer.collegeYear >= 3) {
		pressure = 'Draft watch';
	}

	ui.updateWeekCard(currentPlayer, opponentName, pressure);
	ui.updateMiniStatStrip(currentPlayer);
	const weekState = getActiveWeekState() || getWeekState();
	const seasonRec = getSeasonRecord();
	const sidebarRecord = seasonRec ? `${seasonRec.wins}-${seasonRec.losses}` : undefined;
	ui.updateSidebar(currentPlayer, weekState, opponentName, lastFocusLabel, sidebarRecord);
	ui.showRecentChange(lastRecentChange);
}

//============================================
// Career context wiring

function buildCareerContext(): void {
	careerCtx = {
		events: allEvents,
		ncaaSchools,
		clearStory: () => {},
		addHeadline: (text) => addStoryHeadline(text),
		addText: (text) => addStoryText(text),
		addResult: (text) => ui.addResult(text),
		showChoices: (options) => ui.showChoices(options),
		waitForInteraction: (title, options) => ui.waitForInteraction(title, options),
		save: () => { if (currentPlayer) saveGame(currentPlayer); },
		updateStats: (player) => { ui.updateAllStats(player); refreshDashboard(); },
		updateHeader: (player) => { ui.updateHeader(player); refreshDashboard(); },
		addStatChange: (text) => ui.addStatChange(text),
		updateLifeStatus: (record, nextOpponent, extraStatus) =>
			ui.updateLifeStatus(record, nextOpponent, extraStatus),
		formatStatLine: (statLine) => ui.formatStatLine(statLine),
		renderActivitiesTab: (payload) => ui.renderActivitiesTab(
			payload.activities as Activity[],
			payload.weekState,
			payload.isUnlocked,
			payload.effectPreview,
			payload.onSelect,
			payload.goalInfo,
		),
		hideMainActionBar: () => ui.hideMainActionBar(),
		showMainActionBar: () => ui.showMainActionBar(),
		configureMainButtons: (config) => ui.configureMainButtons(config),
		switchToLifeTab: () => switchTab('life'),
		hideTabBar: () => hideTabBar(),
		showTabBar: () => showTabBar(),
		syncTabsToPhase: (phase) => syncTabsToPhase(phase),
	};
}

//============================================
// Entry: new game vs resume

function beginCareer(player: Player): void {
	currentPlayer = player;
	syncTabsToPhase(player.phase);
	showTabBar();
	switchTab('life');
	if (careerCtx) advanceToNextYear(player, careerCtx);
}

function offerNewGame(firstNames: string[], lastNames: string[]): void {
	startNewGameFlow({
		firstNames,
		lastNames,
		addStoryHeadline,
		addStoryText,
		clearStory,
		onPlayerCreated: beginCareer,
	});
}

function resumeGame(): void {
	if (!currentPlayer) return;
	const player = currentPlayer;
	if (player.teamPalette) applyPalette(player.teamPalette);
	ui.updateAllStats(player);
	ui.updateHeader(player);

	if (player.phase === 'legacy') {
		showRetirement({
			player,
			addStoryHeadline,
			addStoryText,
			clearStory,
			hardClearStory,
			save: () => { if (currentPlayer) saveGame(currentPlayer); },
			syncTabsToPhase,
			switchToLife: () => switchTab('life'),
			deleteSave,
			onRestart: () => { initGame(); },
		});
		return;
	}

	if (player.phase === 'childhood' && player.age < 1) {
		if (careerCtx) advanceToNextYear(player, careerCtx);
		return;
	}

	if (careerCtx) {
		clearStory();
		addStoryHeadline('Welcome Back');
		addStoryText(`${player.firstName} ${player.lastName}, Age ${player.age}`);
		ui.waitForInteraction('Welcome Back', [
			{
				text: 'Continue',
				primary: true,
				action: () => {
					if (currentPlayer && careerCtx) startYear(currentPlayer, careerCtx);
				},
			},
		]);
	}
}

//============================================
// Bootstrap

async function initGame(): Promise<void> {
	const { firstNames, lastNames } = await loadNameLists();
	ncaaSchools = await loadNCAASchools();
	await loadNFLTeams();

	initTabManager({
		getPlayer: () => currentPlayer,
		getActiveSeason,
		getSeasonRecord,
		getWeekState: () => getActiveWeekState() || getWeekState(),
		refreshActivities: refreshActivitiesTabForCurrentPhase,
		refreshDashboard,
	});

	initSidebarListener();
	ui.initMainActionBar();

	const gameContext: GameContext = {
		getPlayer: () => currentPlayer!,
		getAllEvents: () => allEvents,
		save: () => { if (currentPlayer) saveGame(currentPlayer); },
		clearStory: () => {},
		addHeadline: (text) => addStoryHeadline(text),
		addText: (text) => addStoryText(text),
		addResult: (text) => ui.addResult(text),
	};
	initGameLoop(gameContext);

	registerAllHandlers();
	allEvents = await loadEvents();
	buildCareerContext();

	hideTabBar();

	if (hasSave()) {
		currentPlayer = loadGame();
		if (currentPlayer) {
			syncTabsToPhase(currentPlayer.phase);
			showTabBar();
			switchTab('life');
			addStoryHeadline('Welcome Back');
			addStoryText(
				`${currentPlayer.firstName} ${currentPlayer.lastName}, ` +
				`Age ${currentPlayer.age}`,
			);
			ui.updateAllStats(currentPlayer);
			ui.updateHeader(currentPlayer);
			ui.waitForInteraction('Welcome Back', [
				{ text: 'Continue Game', primary: true, action: resumeGame },
				{
					text: 'Start New Game',
					primary: false,
					action: () => {
						clearStory();
						addStoryHeadline('Start Over?');
						addStoryText('This will erase your current career. Are you sure?');
						ui.waitForInteraction('Confirm', [
							{
								text: 'Yes, Start Fresh',
								primary: true,
								action: () => {
									deleteSave();
									currentPlayer = null;
									hardClearStory();
									offerNewGame(firstNames, lastNames);
								},
							},
							{ text: 'Go Back', primary: false, action: initGame },
						]);
					},
				},
			]);
			return;
		}
	}

	addStoryHeadline('Welcome to Gridiron Life');
	addStoryText(
		'Your football career begins now. From backyard games to the big leagues, ' +
		'every choice shapes your story.',
	);
	ui.waitForInteraction('Gridiron Life', [
		{
			text: 'Start New Game',
			primary: true,
			action: () => offerNewGame(firstNames, lastNames),
		},
	]);
}

//============================================
// Entry point

document.addEventListener('DOMContentLoaded', () => {
	initGame().catch((error) => {
		console.error('Game initialization failed:', error);
		const panel = document.getElementById('choices-panel');
		if (panel) {
			panel.innerHTML = '<p style="color:red;">Error loading game. Check console.</p>';
		}
	});
});
