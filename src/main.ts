// main.ts - game startup, character creation, and phase orchestration
//
// ARCHITECTURE RULES:
// This file is an orchestrator. It wires phase modules together but should
// not contain weekly game loop logic or business rules.
//
// What belongs here:
//   - Game initialization and save/load
//   - Character creation and childhood/youth (pre-football phases)
//   - Phase transition logic (childhood -> youth -> HS -> college -> NFL -> legacy)
//   - Position suggestion and selection
//   - Tab switching coordination
//   - Story display helpers (addStoryText, clearStory, etc.)
//   - Retirement and legacy summary
//
// What belongs in phase modules:
//   - Weekly game loops: hs_phase.ts, college_phase.ts, nfl_phase.ts
//   - Shared weekly rhythm: game_loop.ts (focus -> activity -> event -> game)
//   - Game simulation: week_sim.ts (stat generation, performance scoring)
//   - Business logic: college.ts (draft stock, NIL), nfl.ts (retirement, HoF)
//   - UI rendering: ui.ts (stat formatting, tab content, modals)
//   - Event system: events.ts (filtering, selection, flag management)
//
// New game phases get their own module file, not a new section here.
// Global state should be minimized; prefer passing state through function args.
// This file should shrink over time, not grow.

import {
	Player, CoreStats, CareerPhase, Position,
	createPlayer, randomInRange, clampStat, getPositionBucket,
} from './player.js';
import type { DepthChartStatus } from './player.js';
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
import {
	Team, ScheduleEntry, generateHighSchoolTeam, generateOpponentName,
	Conference, generateConference, simulateConferenceWeek, formatStandings,
} from './team.js';
import {
	WeeklyFocus, GameResult,
	applyWeeklyFocus, simulateGame,
} from './week_sim.js';
import {
	GameEvent, loadEvents, filterEvents,
	selectEvent, applyEventChoice,
} from './events.js';
import * as ui from './ui.js';
import type { ChoiceOption } from './ui.js';
import {
	generateTeamPalette, generateNFLPalette,
	applyPalette,
} from './theme.js';
import {
	startCollege, getCollegeSeasonChoices, simulateCollegeSeason,
	calculateDraftStock, generateNILDeal, applyCollegeChoice,
	checkDeclarationEligibility, CollegeChoice,
} from './college.js';
import {
	loadNCAASchools, assignPlayerCollege, formatSchoolName,
	generateCollegeSchedule, NCAASchool,
} from './ncaa.js';
import {
	simulateNFLSeason, getNFLMidseasonEvent, applyNFLEventChoice,
	checkRetirement, loadNFLTeams,
} from './nfl.js';
import {
	updateTabBar, switchTab, hideTabBar, showTabBar, setOnTabSwitch,
	isSidebarVisible, updateSidebarVisibility, initSidebarListener,
} from './tabs.js';
import type { TabId } from './tabs.js';
import {
	initGameLoop, GameContext, refreshActivitiesTabForCurrentPhase, getWeekState,
} from './game_loop.js';
import {
	Activity,
	getActivitiesForPhase, isActivityUnlocked, applyActivity, getEffectPreview,
} from './activities.js';
import { initHighSchoolPhase, startHighSchoolSeason as startHSSeason, resumeHighSchoolSeason, getHSTeam, getHSConference } from './hs_phase.js';
import { beginCollege as beginCollegePhase, resumeCollegeSeason, getCollegeTeam, getCollegeConference } from './college_phase.js';
import { startNFLCareer as startNFLCareerPhase, getNFLTeam, getNFLConference, resumeNFLSeason } from './nfl_phase.js';

// New year-handler registry system
import { registerAllHandlers } from './core/register_handlers.js';
import { advanceToNextYear, startYear } from './core/year_runner.js';
import type { CareerContext } from './core/year_handler.js';
import { getSeasonRecord, getActiveSeason, getActiveWeekState } from './weekly/weekly_engine.js';

//============================================
// GLOBALS AND STATE
// Module-level variables for game state that persists across function calls.
// Minimize additions here; prefer passing state through function arguments.
//============================================

// Name lists loaded from CSV files
let firstNameList: string[] = [];
let lastNameList: string[] = [];

// Default fallback names (used if CSV loading fails)
const DEFAULT_FIRST_NAMES = [
	'Marcus', 'Jaylen', 'DeShawn', 'Tyler', 'Caleb', 'Jamal', 'Austin',
	'Brandon', 'Malik', 'Trevon', 'Darius', 'Xavier', 'Jordan', 'Cameron',
	'Isaiah', 'Devin', 'Andre', 'Lamar', 'Patrick', 'Justin', 'Kyler',
	'Jalen', 'Micah', 'Trevor', 'Bryce', 'Derek', 'Travis', 'Zach',
	'Chris', 'Antonio', 'Mike', 'Aaron', 'DJ', 'CJ', 'TJ',
	'Sarah', 'Maya', 'Jasmine', 'Taylor', 'Morgan', 'Alex', 'Sam',
];

const DEFAULT_LAST_NAMES = [
	'Williams', 'Johnson', 'Smith', 'Brown', 'Jackson', 'Davis', 'Wilson',
	'Thomas', 'Robinson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
	'Martinez', 'Anderson', 'Taylor', 'Moore', 'Jones', 'Lee', 'Walker',
	'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green',
	'Adams', 'Baker', 'Hill', 'Rivera', 'Campbell', 'Mitchell', 'Roberts',
];

//============================================
async function loadNameLists(): Promise<void> {
	const firstNameUrl = 'src/data/first_names.csv';
	const lastNameUrl = 'src/data/last_names.csv';

	// Load first names
	try {
		const firstResponse = await fetch(firstNameUrl);
		if (firstResponse.ok) {
			const text = await firstResponse.text();
			firstNameList = text
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0);
			if (firstNameList.length === 0) {
				firstNameList = DEFAULT_FIRST_NAMES;
			}
		} else {
			firstNameList = DEFAULT_FIRST_NAMES;
		}
	} catch (error) {
		firstNameList = DEFAULT_FIRST_NAMES;
	}

	// Load last names
	try {
		const lastResponse = await fetch(lastNameUrl);
		if (lastResponse.ok) {
			const text = await lastResponse.text();
			lastNameList = text
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0);
			if (lastNameList.length === 0) {
				lastNameList = DEFAULT_LAST_NAMES;
			}
		} else {
			lastNameList = DEFAULT_LAST_NAMES;
		}
	} catch (error) {
		lastNameList = DEFAULT_LAST_NAMES;
	}
}

// Current game state
let currentPlayer: Player | null = null;
let currentTeam: Team | null = null;
let allEvents: GameEvent[] = [];

// BUG FIX 1: Persistent high school team across 4 years
let persistentHSTeam: Team | null = null;

// NFL team for weekly loop
let nflTeam: Team | null = null;
let nflConference: Conference | null = null;

// NCAA schools and college conference
let ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] } = { fbs: [], fcs: [] };
let playerNCAASchool: NCAASchool | null = null;
let currentConference: Conference | null = null;
let hsConference: Conference | null = null;

// BUG FIX 4: Track used childhood events to avoid repeats
const usedChildhoodEvents = new Set<number>();

// CareerContext adapter for year-handler system
let careerCtx: CareerContext | null = null;

function buildCareerContext(): void {
	careerCtx = {
		events: allEvents,
		ncaaSchools,
		clearStory: () => clearStory(),
		addHeadline: (text: string) => addStoryHeadline(text),
		addText: (text: string) => addStoryText(text),
		addResult: (text: string) => ui.addResult(text),
		showChoices: (options) => ui.showChoices(options),
		showChoicePopup: (title, options, description) => ui.showChoicePopup(title, options, description),
		showEventModal: (title, desc, choices) => ui.showEventModal(title, desc, choices),
		hideEventModal: () => ui.hideEventModal(),
		save: () => { if (currentPlayer) saveGame(currentPlayer); },
		updateStats: (player) => { ui.updateAllStats(player); refreshDashboard(); },
		updateHeader: (player) => { ui.updateHeader(player); refreshDashboard(); },
	};
}

// Track the last focus label chosen this week (for This Week panel display)
let lastFocusLabel = '';

// Track the last recent stat change text (for sidebar development section)
let lastRecentChange = '';

//============================================
// DASHBOARD UPDATE HELPER
// Centralized function to refresh sidebar, week card, and mini stat strip.
// Called alongside updateAllStats/updateHeader at key state change points.
//============================================

function refreshDashboard(): void {
	if (!currentPlayer) {
		return;
	}

	// Get opponent info from active season
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

	// Determine pressure context
	if (currentPlayer.phase === 'nfl' && currentPlayer.age >= 35) {
		pressure = 'Contract year';
	} else if (currentPlayer.phase === 'college' && currentPlayer.collegeYear >= 3) {
		pressure = 'Draft watch';
	}

	// Update all dashboard components
	ui.updateWeekCard(currentPlayer, opponentName, pressure);
	ui.updateMiniStatStrip(currentPlayer);
	// Prefer the weekly engine's week state (tracks actual phase progression)
	// over game_loop's separate week state
	const weekState = getActiveWeekState() || getWeekState();
	ui.updateSidebar(currentPlayer, weekState, opponentName, lastFocusLabel);
	ui.showRecentChange(lastRecentChange);
}

// BUG FIX 3: Track if state championship won this season
let wonStateThisSeason = false;

// Total weeks in a high school regular season
const HS_SEASON_WEEKS = 10;
const NFL_SEASON_WEEKS = 17;

// Track weekly and season stats for awards
interface SeasonStats {
	totalYards: number;
	totalTouchdowns: number;
	totalTackles: number;
	totalInterceptions: number;
	gamesPlayed: number;
	playerOfTheWeekCount: number;
}

let currentSeasonStats: SeasonStats = {
	totalYards: 0,
	totalTouchdowns: 0,
	totalTackles: 0,
	totalInterceptions: 0,
	gamesPlayed: 0,
	playerOfTheWeekCount: 0,
};

//============================================
// TAB SWITCHING AND UI COORDINATION
// Handles tab content refresh and UI wiring. Rendering lives in ui.ts.
//============================================

// Refresh tab content when user switches to a tab
function handleTabSwitch(tabId: TabId): void {
	if (!currentPlayer) {
		return;
	}

	// Update stat bars and dashboard whenever any tab is opened
	ui.updateAllStats(currentPlayer);
	refreshDashboard();

	// Get season data from the new season layer (single source of truth)
	const activeSeason = getActiveSeason();
	const newSeasonRecord = getSeasonRecord();
	let lifeRecord = 'No team record yet.';
	let lifeNextOpponent = 'No upcoming opponent.';
	if (activeSeason && newSeasonRecord) {
		lifeRecord = `Record: ${newSeasonRecord.wins}-${newSeasonRecord.losses}`;
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
	}
	ui.updateLifeStatus(lifeRecord, lifeNextOpponent);

	if (tabId === 'stats') {
		ui.updateStatsTab(currentPlayer);
	} else if (tabId === 'team') {
		// Build team tab content from season layer (single source of truth)
		const teamName = currentPlayer.teamName || 'No Team';

		// Get record from season or career history
		let record = '0-0';
		if (activeSeason) {
			const seasonRecord = activeSeason.getPlayerRecord();
			record = `${seasonRecord.wins}-${seasonRecord.losses}`;
		} else if (currentPlayer.careerHistory.length > 0) {
			const latest = currentPlayer.careerHistory[currentPlayer.careerHistory.length - 1];
			record = `${latest.wins}-${latest.losses}`;
		}

		// Get standings from the season layer
		// For NFL, show only the player's conference (AFC or NFC)
		let standingsText = '';
		if (activeSeason) {
			const playerTeam = activeSeason.getPlayerTeam();
			const confId = playerTeam ? playerTeam.conferenceId : undefined;
			// Filter by conference in NFL (shows 16 teams instead of 32)
			const useConference = currentPlayer.phase === 'nfl' && confId;
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

		// Get schedule from the season layer
		let schedule: import('./team.js').ScheduleEntry[] = [];
		let week = currentPlayer.currentWeek;
		if (activeSeason) {
			// Convert season schedule to legacy ScheduleEntry format for UI compatibility
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
	} else if (tabId === 'activities') {
		refreshActivitiesTabForCurrentPhase();
	} else if (tabId === 'career') {
		ui.updateCareerTab(currentPlayer);
	}
}

//============================================
// GAME INITIALIZATION AND SAVE/LOAD
// Startup sequence, new game creation, and save file management.
//============================================

async function initGame(): Promise<void> {
	// Load name lists from CSV files
	await loadNameLists();

	// Load NCAA school data for college phase
	ncaaSchools = await loadNCAASchools();

	// Load NFL team data from CSV
	await loadNFLTeams();

	// Register tab content refresh callback
	setOnTabSwitch(handleTabSwitch);

	// Initialize sidebar resize listener
	initSidebarListener();

	// Initialize persistent main action bar (Next Week / Age Up buttons)
	ui.initMainActionBar();

	// Initialize the shared game loop engine with context from main.ts
	const gameContext: GameContext = {
		getPlayer: () => currentPlayer!,
		getAllEvents: () => allEvents,
		save: () => { if (currentPlayer) saveGame(currentPlayer); },
		clearStory: () => clearStory(),
		addHeadline: (text: string) => addStoryHeadline(text),
		addText: (text: string) => addStoryText(text),
		addResult: (text: string) => ui.addResult(text),
	};
	initGameLoop(gameContext);

	// Register all year-band handlers for the new architecture
	registerAllHandlers();

	// Load all event data so childhood and youth phases have access
	allEvents = await loadEvents();

	// Build CareerContext adapter for year handlers (must happen after loadEvents
	// because ctx.events captures the allEvents array reference)
	buildCareerContext();

	// Initialize phase modules with context and transition callbacks
	await initHighSchoolPhase(gameContext, () => {
		showCollegeChoiceScreen(gameContext);
	});

	const storyLog = document.getElementById('story-log');
	if (!storyLog) {
		return;
	}

	// Hide tab bar until game starts (shown after character creation or resume)
	hideTabBar();

	// Check for existing save
	if (hasSave()) {
		currentPlayer = loadGame();
		if (currentPlayer) {
			// Resume existing game: show tab bar for current phase
			updateTabBar(currentPlayer.phase);
			showTabBar();
			switchTab('life');
			addStoryHeadline('Welcome Back');
			addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
				+ `Age ${currentPlayer.age}`);
			ui.updateAllStats(currentPlayer);
			ui.updateHeader(currentPlayer);
			ui.showChoicePopup('Welcome Back', [
				{ text: 'Continue Game', primary: true, action: resumeGame },
				{ text: 'Start New Game', primary: false, action: confirmNewGame },
			]);
			return;
		}
	}

	// No save: show welcome screen
	addStoryHeadline('Welcome to Gridiron Life');
	addStoryText('Your football career begins now. From backyard games to the big '
		+ 'leagues, every choice shapes your story.');
	ui.showChoicePopup('Gridiron Life', [
		{ text: 'Start New Game', primary: true, action: startCharacterCreation },
	]);
}

//============================================
interface CollegeChoiceOption {
	school: NCAASchool;
	label: string;
	depthChart: DepthChartStatus;
	description: string;
}

//============================================
// PHASE TRANSITIONS
// Handoff logic between career phases. Each transition sets up the next
// phase and delegates to the appropriate phase module.
//============================================

function showCollegeChoiceScreen(gameContext: GameContext): void {
	if (!currentPlayer) {
		return;
	}

	const allSchools = [...ncaaSchools.fbs, ...ncaaSchools.fcs];
	if (allSchools.length === 0) {
		beginCollegePhase(gameContext, ncaaSchools, () => {
			startNFLCareerPhase(gameContext, retirePlayer);
		});
		return;
	}

	const powerConferences = new Set([
		'Atlantic Coast Conference',
		'Big Ten Conference',
		'Big 12 Conference',
		'Southeastern Conference',
		'Pac-12 Conference',
	]);

	const powerSchools = allSchools.filter((school) => (
		school.subdivision === 'FBS' && powerConferences.has(school.conference)
	));
	const fbsSchools = allSchools.filter((school) => school.subdivision === 'FBS');
	const fcsSchools = allSchools.filter((school) => school.subdivision === 'FCS');

	const usedNames = new Set<string>();
	const pickUniqueSchool = (pool: NCAASchool[], fallback: NCAASchool[]): NCAASchool => {
		const uniquePool = pool.filter((school) => !usedNames.has(formatSchoolName(school)));
		const source = uniquePool.length > 0 ? uniquePool : fallback.filter(
			(school) => !usedNames.has(formatSchoolName(school))
		);
		const chosen = source.length > 0
			? source[randomInRange(0, source.length - 1)]
			: fallback[randomInRange(0, fallback.length - 1)];
		usedNames.add(formatSchoolName(chosen));
		return chosen;
	};

	const ambitiousSchool = pickUniqueSchool(
		currentPlayer.recruitingStars >= 4 ? powerSchools : fbsSchools,
		allSchools
	);
	const balancedSchool = pickUniqueSchool(
		currentPlayer.recruitingStars >= 3 ? fbsSchools : allSchools,
		allSchools
	);
	const earlyPlaySchool = pickUniqueSchool(
		fcsSchools.length > 0 ? fcsSchools : allSchools,
		allSchools
	);

	const options: CollegeChoiceOption[] = [
		{
			school: ambitiousSchool,
			label: `${formatSchoolName(ambitiousSchool)} - Big Program`,
			depthChart: 'backup',
			description: 'More prestige, tougher depth chart, likely backup to start.',
		},
		{
			school: balancedSchool,
			label: `${formatSchoolName(balancedSchool)} - Balanced Fit`,
			depthChart: 'backup',
			description: 'Solid program with a fair shot to climb the rotation.',
		},
		{
			school: earlyPlaySchool,
			label: `${formatSchoolName(earlyPlaySchool)} - Smaller School`,
			depthChart: 'starter',
			description: 'Lower profile, but much better chance to start right away.',
		},
	];

	clearStory();
	addStoryHeadline('Choose Your College');
	addStoryText('You have options now. Bigger schools bring more prestige, but they may not hand you a starting role.');
	addStoryText('Smaller programs can get you on the field faster. Pick the path you want.');

	ui.showChoicePopup('College Decision', options.map((option) => ({
		text: option.label,
		primary: option.depthChart === 'starter',
		action: () => {
			clearStory();
			addStoryHeadline('College Decision');
			addStoryText(`You chose ${formatSchoolName(option.school)}.`);
			addStoryText(option.description);
			beginCollegePhase(
				gameContext,
				ncaaSchools,
				() => {
					startNFLCareerPhase(gameContext, retirePlayer);
				},
				option.school,
				option.depthChart,
			);
		},
	})));
}

//============================================
function confirmNewGame(): void {
	clearStory();
	addStoryHeadline('Start Over?');
	addStoryText('This will erase your current career. Are you sure?');
	ui.showChoicePopup('Start Over', [
		{ text: 'Yes, Start Fresh', primary: true, action: () => {
			deleteSave();
			currentPlayer = null;
			hardClearStory();
			startCharacterCreation();
		}},
		{ text: 'Go Back', primary: false, action: async () => {
			clearStory();
			await initGame();
		}},
	]);
}

//============================================
function startCharacterCreation(): void {
	clearStory();
	addStoryHeadline('A New Life Begins');
	addStoryText('What is your name?');

	// Show name input in choices panel
	const panel = document.getElementById('choices-panel');
	if (!panel) {
		return;
	}
	panel.innerHTML = '';

	// First name input
	const firstInput = document.createElement('input');
	firstInput.type = 'text';
	firstInput.placeholder = 'First Name';
	firstInput.className = 'name-input';
	firstInput.id = 'input-first-name';
	firstInput.autocomplete = 'off';
	panel.appendChild(firstInput);

	// Last name input
	const lastInput = document.createElement('input');
	lastInput.type = 'text';
	lastInput.placeholder = 'Last Name';
	lastInput.className = 'name-input';
	lastInput.id = 'input-last-name';
	lastInput.autocomplete = 'off';
	panel.appendChild(lastInput);

	// Random name button
	const randomBtn = document.createElement('button');
	randomBtn.className = 'choice-button';
	randomBtn.textContent = 'Random Name';
	randomBtn.addEventListener('click', () => {
		const first = firstNameList[randomInRange(0, firstNameList.length - 1)];
		const last = lastNameList[randomInRange(0, lastNameList.length - 1)];
		firstInput.value = first;
		lastInput.value = last;
	});
	panel.appendChild(randomBtn);

	// Start button
	const startBtn = document.createElement('button');
	startBtn.className = 'choice-button primary';
	startBtn.textContent = 'Begin Your Journey';
	startBtn.addEventListener('click', () => {
		const firstName = firstInput.value.trim() || 'Rookie';
		const lastName = lastInput.value.trim() || 'Johnson';
		startNewGame(firstName, lastName);
	});
	panel.appendChild(startBtn);
}

//============================================
function startNewGame(firstName: string, lastName: string): void {
	// Create the player
	currentPlayer = createPlayer(firstName, lastName);

	// BUG FIX 1 & 4: Reset persistent game state for new game
	persistentHSTeam = null;
	usedChildhoodEvents.clear();
	wonStateThisSeason = false;

	// Show tab bar for childhood phase
	updateTabBar(currentPlayer.phase);
	showTabBar();
	switchTab('life');

	// Update UI with birth stats
	ui.updateAllStats(currentPlayer);
	ui.updateHeader(currentPlayer);

	// Save immediately
	saveGame(currentPlayer);

	// Show birth story
	clearStory();
	addStoryHeadline('A Star is Born');

	// Generate birth story based on stats
	const athleticism = currentPlayer.core.athleticism;
	let birthFlavor: string;
	if (athleticism >= 65) {
		birthFlavor = 'You came into this world with a strong cry and even stronger legs. '
			+ 'The nurses said you kicked harder than any baby they had seen.';
	} else if (athleticism >= 40) {
		birthFlavor = 'You arrived healthy and curious, already grabbing at everything '
			+ 'in reach. Your parents knew you would keep them busy.';
	} else {
		birthFlavor = 'You were a quiet baby, observant and calm. '
			+ 'What you lacked in size, you made up for in determination.';
	}
	addStoryText(birthFlavor);

	// Show size description
	const sizeDesc = getSizeDescription(currentPlayer.hidden.size);
	addStoryText(sizeDesc);

	ui.showChoicePopup('Your Birth', [
		{ text: 'Continue...', primary: true, action: () => {
			if (currentPlayer && careerCtx) {
				// Enter the year-handler system starting at age 1
				advanceToNextYear(currentPlayer, careerCtx);
			}
		}},
	]);
}

//============================================
function getSizeDescription(size: number): string {
	switch (size) {
		case 1: return 'The doctor notes you are on the smaller side. Quick and light.';
		case 2: return 'You are a lean baby, built for speed more than power.';
		case 3: return 'Average build. A good frame that could go any direction.';
		case 4: return 'Big for your age. The nurses had to find a bigger blanket.';
		case 5: return 'The biggest baby in the nursery. Your parents are already imagining the offensive line.';
		default: return '';
	}
}

//============================================
// CHILDHOOD AND YOUTH (PRE-FOOTBALL PHASES)
// Ages 0-13. Character growth events and the decision to play football.
// These are pre-football phases with no weekly game loop.
//============================================

function advanceChildhood(): void {
	if (!currentPlayer) {
		return;
	}

	// Route childhood progression through the year-handler system
	// which handles age incrementing and phase transitions
	if (careerCtx) {
		advanceToNextYear(currentPlayer, careerCtx);
	}
}

//============================================
function applyChildhoodGrowth(player: Player): void {
	// Small natural stat growth each year during childhood
	player.core.athleticism = clampStat(player.core.athleticism + randomInRange(1, 3));
	player.core.health = clampStat(player.core.health + randomInRange(0, 2));
	player.core.confidence = clampStat(player.core.confidence + randomInRange(-1, 2));
	player.core.discipline = clampStat(player.core.discipline + randomInRange(0, 2));
}

//============================================
function declineYouthFootball(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.storyFlags.skip_youth_football = true;
	saveGame(currentPlayer);

	addStoryText('You decide you are not ready for organized football yet. '
		+ 'For now, you would rather grow up at your own pace.');

	ui.showChoicePopup('Growing Up', [
		{ text: 'Continue...', primary: true, action: advanceChildhood },
	]);
}

//============================================
interface ChildhoodEvent {
	text: string;
	choices?: {
		text: string;
		primary?: boolean;
		effects: Record<string, number>;
		flavor?: string;
	}[];
}

//============================================
function getChildhoodEvent(player: Player): ChildhoodEvent {
	// Pool of childhood events based on age
	const events: ChildhoodEvent[] = [];

	if (player.age <= 1) {
		// Early baby events
		events.push(
			{ text: 'You took your first steps today. Already running by the end of the week.' },
			{ text: 'You said your first word today. It was "ball".' },
		);
	} else if (player.age <= 3) {
		// Toddler events
		events.push(
			{ text: 'You discovered the backyard. The grass feels amazing under your feet.' },
			{ text: 'You spent the whole afternoon chasing the family dog around the yard.' },
			{ text: 'You tried to tackle the family dog. The dog won.' },
		);
	} else if (player.age <= 6) {
		// Young child events (playground, sports discovery)
		events.push(
			{
				text: 'The neighborhood kids are playing outside. What do you do?',
				choices: [
					{
						text: 'Join the game',
						primary: true,
						effects: { athleticism: 2, confidence: 1 },
						flavor: 'You run around until the streetlights come on. Best day ever.',
					},
					{
						text: 'Watch from the porch',
						effects: { footballIq: 1 },
						flavor: 'You study how the bigger kids play. You notice things others miss.',
					},
				],
			},
			{ text: 'Dad threw you a football for the first time. You caught it on the third try.' },
			{
				text: 'Your parents signed you up for soccer. But you keep picking up the ball.',
				choices: [
					{
						text: 'Keep playing soccer',
						effects: { athleticism: 2, discipline: 1 },
						flavor: 'You learn to run fast and change direction quickly.',
					},
					{
						text: 'Beg for football instead',
						effects: { confidence: 2, discipline: -1 },
						flavor: 'Your parents laugh, but they remember.',
					},
				],
			},
			{ text: 'First day of school. You already made two friends at recess.' },
			{
				text: 'You scored a touchdown in flag football at recess. The crowd (three kids) went wild.',
				choices: [
					{
						text: 'Do a celebration dance',
						effects: { confidence: 2 },
						flavor: 'Everyone laughs, but you do not care. You are a star.',
					},
					{
						text: 'Help the other team up',
						effects: { discipline: 2 },
						flavor: 'Good sportsmanship. The teacher notices.',
					},
				],
			},
		);
	} else if (player.age <= 9) {
		// Older child events (football interest, school)
		events.push(
			{
				text: 'You are watching the big game on TV. The quarterback throws a perfect spiral.',
				choices: [
					{
						text: 'Go practice throwing in the backyard',
						primary: true,
						effects: { technique: 2, athleticism: 1 },
						flavor: 'You throw until your arm is sore. Getting better every day.',
					},
					{
						text: 'Keep watching and studying the plays',
						effects: { footballIq: 2 },
						flavor: 'You start to see patterns the announcers do not mention.',
					},
				],
			},
			{
				text: 'A bigger kid at school pushes you around at recess.',
				choices: [
					{
						text: 'Stand your ground',
						effects: { confidence: 3, discipline: -1 },
						flavor: 'You do not back down. He leaves you alone after that.',
					},
					{
						text: 'Walk away and tell a teacher',
						effects: { discipline: 2 },
						flavor: 'Not the flashy move, but the smart one.',
					},
				],
			},
			{
				text: 'Flag football at recess! Everyone wants to be quarterback.',
				choices: [
					{
						text: 'Call quarterback',
						effects: { confidence: 2, technique: 1 },
						flavor: 'You lead your team to victory. It feels natural.',
					},
					{
						text: 'Play wherever the team needs you',
						effects: { discipline: 2, athleticism: 1 },
						flavor: 'You fill in everywhere. Coaches love players like that.',
					},
				],
			},
			{ text: 'You watched your first football game on TV and would not stop talking about it.' },
			{ text: 'You asked for a football for your birthday. You slept with it.' },
			{ text: 'You won the school fitness test. The gym teacher noticed.' },
			{
				text: 'You started playing catch with dad every evening after dinner.',
				choices: [
					{
						text: 'Throw long bombs',
						effects: { athleticism: 2, technique: 1 },
						flavor: 'Your arm gets stronger every day.',
					},
					{
						text: 'Practice footwork and reads',
						effects: { footballIq: 2 },
						flavor: 'Dad teaches you to see the field.',
					},
				],
			},
		);
	} else if (player.age <= 13) {
		// Preteen events for players who are not in youth football
		events.push(
			{
				text: 'Your friends invite you to an after-school pickup game at the park.',
				choices: [
					{
						text: 'Join in and compete',
						primary: true,
						effects: { athleticism: 2, confidence: 1 },
						flavor: 'No coaches, no pads, just instinct and bragging rights.',
					},
					{
						text: 'Hang back and watch how everyone moves',
						effects: { footballIq: 2 },
						flavor: 'You learn a lot just by seeing who creates space and who panics.',
					},
				],
			},
			{
				text: 'A PE teacher suggests you might be a natural athlete if you stick with sports.',
				choices: [
					{
						text: 'Start training harder on your own',
						effects: { athleticism: 2, discipline: 1 },
						flavor: 'You start taking your body seriously, even without a team yet.',
					},
					{
						text: 'Smile and keep things casual',
						effects: { confidence: 1 },
						flavor: 'No pressure. You are still figuring out what kind of player you want to be.',
					},
				],
			},
			{
				text: 'You spend the summer tossing a football around with friends at the park.',
				choices: [
					{
						text: 'Practice routes and catches',
						effects: { technique: 2, athleticism: 1 },
						flavor: 'Your hands get steadier and your cuts get sharper.',
					},
					{
						text: 'Mess around and invent trick plays',
						effects: { footballIq: 1, confidence: 2 },
						flavor: 'Half of it is nonsense, but some of it actually works.',
					},
				],
			},
			{
				text: 'Middle school gets more serious. Teachers and coaches start noticing who is disciplined.',
				choices: [
					{
						text: 'Get organized and stay on top of things',
						effects: { discipline: 2, confidence: 1 },
						flavor: 'You start building habits that matter later.',
					},
					{
						text: 'Rely on talent and improvise',
						effects: { confidence: 2, discipline: -1 },
						flavor: 'Sometimes it works. Sometimes it definitely does not.',
					},
				],
			},
		);
	}

	// Filter out already-used events
	const availableIndices: number[] = [];
	for (let i = 0; i < events.length; i++) {
		if (!usedChildhoodEvents.has(i)) {
			availableIndices.push(i);
		}
	}

	// If all events used, reset the set for this age bracket
	if (availableIndices.length === 0) {
		usedChildhoodEvents.clear();
		for (let i = 0; i < events.length; i++) {
			availableIndices.push(i);
		}
	}

	// Pick a random available event
	const selectedAvailableIndex = randomInRange(0, availableIndices.length - 1);
	const index = availableIndices[selectedAvailableIndex];
	usedChildhoodEvents.add(index);

	return events[index];
}

//============================================
function startYouthFootball(): void {
	if (!currentPlayer) {
		return;
	}

	// Mark that player chose to play youth football
	currentPlayer.storyFlags.started_youth_football = true;
	// Route to peewee handler (age 8) via year-handler system
	if (careerCtx) {
		advanceToNextYear(currentPlayer, careerCtx);
	}
}

//============================================
function advanceYouthSeason(): void {
	if (!currentPlayer) {
		return;
	}

	// Route youth season progression through the year-handler system
	// which handles age incrementing and phase transitions
	if (careerCtx) {
		advanceToNextYear(currentPlayer, careerCtx);
	}
}

//============================================
function getYouthEvent(player: Player): ChildhoodEvent {
	const events: ChildhoodEvent[] = [
		{
			text: 'The coach puts you in at a new position during practice.',
			choices: [
				{
					text: 'Embrace it and give your best',
					primary: true,
					effects: { technique: 2, confidence: 1, discipline: 1 },
					flavor: 'You surprise everyone, including yourself.',
				},
				{
					text: 'Ask to go back to your old spot',
					effects: { confidence: -1, discipline: 1 },
					flavor: 'Coach nods, but you wonder what could have been.',
				},
			],
		},
		{
			text: 'You had a rough game. Dropped a pass at a bad time.',
			choices: [
				{
					text: 'Stay late and practice',
					primary: true,
					effects: { technique: 3, discipline: 2, confidence: 1 },
					flavor: 'Extra work after a bad day. That is how legends are built.',
				},
				{
					text: 'Shake it off and move on',
					effects: { confidence: 2 },
					flavor: 'Bad games happen. You refuse to let one define you.',
				},
			],
		},
		{
			text: 'Your team made the championship game! You played great all season.',
			choices: [
				{
					text: 'Stay focused and prepare',
					primary: true,
					effects: { discipline: 3, footballIq: 2 },
					flavor: 'You study film all week. You have never been this ready.',
				},
				{
					text: 'Celebrate and enjoy the moment',
					effects: { confidence: 3 },
					flavor: 'Win or lose, this is what it is all about.',
				},
			],
		},
		{
			text: 'A kid from another team keeps trash-talking you before every game.',
			choices: [
				{
					text: 'Ignore him and let your play speak',
					effects: { discipline: 3, confidence: 1 },
					flavor: 'You score on the first play. That shut him up.',
				},
				{
					text: 'Talk back and get fired up',
					effects: { confidence: 3, discipline: -2 },
					flavor: 'The rivalry is on. The whole league is watching.',
				},
			],
		},
	];

	const index = randomInRange(0, events.length - 1);
	return events[index];
}

//============================================
// HIGH SCHOOL ENTRY AND POSITION SELECTION
// Transition into football. Position suggestion, selection, and handoff
// to hs_phase.ts for the weekly game loop.
//============================================

function startHighSchool(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'high_school';
	currentPlayer.currentSeason = 0;
	currentPlayer.currentWeek = 0;
	saveGame(currentPlayer);

	// Update tab bar for high school (adds Team and Career tabs)
	updateTabBar(currentPlayer.phase);
	switchTab('life');

	clearStory();
	addStoryHeadline('Welcome to High School Football');
	addStoryText('Freshman year. Everything is bigger, faster, and louder.');
	addStoryText('The coach watches you during tryouts. He is about to decide your future.');

	// Position discovery based on stats
	const suggested = suggestPosition(currentPlayer);
	addStoryText(`Based on your build and skills, Coach thinks you would be a good fit at ${suggested}.`);

	ui.showChoicePopup('Choose Position', [
		{
			text: `Play ${suggested}`,
			primary: true,
			action: () => setPositionAndContinue(suggested),
		},
		{
			text: 'Ask to try a different position',
			primary: false,
			action: showPositionChoices,
		},
	]);
}

//============================================
function suggestPosition(player: Player): Position {
	// Suggest based on stats and size
	const { core, hidden } = player;
	const size = hidden.size;

	// Large players -> line
	if (size >= 4 && core.technique > core.footballIq) {
		return 'OL';
	}
	if (size >= 4 && core.athleticism > 50) {
		return 'DL';
	}

	// High football IQ + medium size -> QB
	if (core.footballIq >= core.athleticism && size >= 2 && size <= 4) {
		return 'QB';
	}

	// Very athletic + smaller -> WR or CB
	if (core.athleticism >= 60 && size <= 3) {
		if (core.confidence >= 50) {
			return 'WR';
		}
		return 'CB';
	}

	// Athletic + medium -> RB or LB
	if (core.athleticism >= 50) {
		if (size >= 3) {
			return 'LB';
		}
		return 'RB';
	}

	// High discipline + technique -> K
	if (core.discipline >= 40 && core.technique >= core.athleticism) {
		return 'K';
	}

	// Fallback: safety (versatile position)
	return 'S';
}

//============================================
function showPositionChoices(): void {
	clearStory();
	addStoryHeadline('Choose Your Position');
	addStoryText('Coach raised an eyebrow, but said you can try out anywhere. '
		+ 'Where do you want to play?');

	const positions: { pos: Position; label: string }[] = [
		{ pos: 'QB', label: 'Quarterback' },
		{ pos: 'RB', label: 'Running Back' },
		{ pos: 'WR', label: 'Wide Receiver' },
		{ pos: 'TE', label: 'Tight End' },
		{ pos: 'OL', label: 'Offensive Line' },
		{ pos: 'DL', label: 'Defensive Line' },
		{ pos: 'LB', label: 'Linebacker' },
		{ pos: 'CB', label: 'Cornerback' },
		{ pos: 'S', label: 'Safety' },
		{ pos: 'K', label: 'Kicker' },
	];

	ui.showChoicePopup('Select Position', positions.map(p => ({
		text: p.label,
		primary: false,
		action: () => setPositionAndContinue(p.pos),
	})));
}

//============================================
function setPositionAndContinue(position: Position): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.position = position;
	currentPlayer.positionBucket = getPositionBucket(position);
	// Freshmen start as backup (underdog feel)
	currentPlayer.depthChart = 'backup';

	// Record as a big decision
	currentPlayer.bigDecisions.push(`Chose to play ${position} in high school`);

	saveGame(currentPlayer);
	ui.updateHeader(currentPlayer);

	clearStory();
	addStoryHeadline(`You are a ${position}`);
	addStoryText(`You line up at ${position} for the first time in practice. `
		+ 'The seniors barely look at you. You are at the bottom of the depth chart.');
	addStoryText('But everyone starts somewhere.');

	ui.showChoicePopup('High School', [
		{ text: 'Start the season', primary: true, action: () => {
			if (currentPlayer && careerCtx) {
				// Use new year-handler system for HS
				currentPlayer.phase = 'high_school';
				startYear(currentPlayer, careerCtx);
			}
		}},
	]);
}

//============================================
// Placeholder for resuming a saved game
function resumeGame(): void {
	if (!currentPlayer) {
		return;
	}

	// Restore team colors from save
	if (currentPlayer.teamPalette) {
		applyPalette(currentPlayer.teamPalette);
	}
	ui.updateAllStats(currentPlayer);
	ui.updateHeader(currentPlayer);

	// Route to the correct phase using year-handler system
	if (currentPlayer.phase === 'legacy') {
		clearStory();
		addStoryHeadline('Career Complete');
		ui.showChoicePopup('Career Complete', [
			{ text: 'View Legacy', primary: true, action: retirePlayer },
		]);
	} else if (currentPlayer.phase === 'childhood' && currentPlayer.age < 1) {
		// Brand new character, start childhood events
		advanceChildhood();
	} else if (careerCtx) {
		// Use the year-handler system for all phases
		clearStory();
		addStoryHeadline('Welcome Back');
		addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
			+ `Age ${currentPlayer.age}`);
		ui.showChoicePopup('Welcome Back', [
			{ text: 'Continue', primary: true, action: () => {
				if (currentPlayer && careerCtx) {
					startYear(currentPlayer, careerCtx);
				}
			}},
		]);
	}
}

//============================================
// STORY DISPLAY HELPERS
// Functions for writing to the story log panel. These are thin wrappers
// around DOM manipulation. Complex rendering logic belongs in ui.ts.
//============================================

// BitLife-style: never clear the timeline, just add a divider
// Old entries stay visible and scrollable
function clearStory(): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog) {
		storyLog.innerHTML = '';
	}
}

//============================================
// Actually clear the story (only for new game / game start)
function hardClearStory(): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog) {
		storyLog.innerHTML = '';
	}
}

//============================================
function addStoryHeadline(text: string): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog) {
		const p = document.createElement('p');
		p.className = 'story-headline';
		p.textContent = text;
		storyLog.appendChild(p);
		// BUG FIX 2: Scroll story-panel container
		const panel = document.getElementById('story-panel');
		if (panel) {
			requestAnimationFrame(() => {
				panel.scrollTop = panel.scrollHeight;
			});
		}
	}
}

//============================================
function addStoryText(text: string): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog) {
		const p = document.createElement('p');
		p.textContent = text;
		storyLog.appendChild(p);
		// BUG FIX 2: Scroll story-panel container
		const panel = document.getElementById('story-panel');
		if (panel) {
			requestAnimationFrame(() => {
				panel.scrollTop = panel.scrollHeight;
			});
		}
	}
}

//============================================
// GAME LOOPS MOVED TO MODULES:
// HS loop -> src/hs_phase.ts
// College loop -> src/college_phase.ts
// NFL loop -> src/nfl_phase.ts
// Shared weekly flow -> src/game_loop.ts
//============================================

//============================================
// RETIREMENT AND LEGACY
// End-of-career summary and Hall of Fame checks.
//============================================

function retirePlayer(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'legacy';
	saveGame(currentPlayer);

	// Update tab bar for legacy phase (Life, Stats, Career)
	updateTabBar(currentPlayer.phase);
	switchTab('life');

	clearStory();
	addStoryHeadline('The End of an Era');

	const totalSeasons = currentPlayer.careerHistory.length;
	const totalMoney = currentPlayer.career.money;

	addStoryText(
		`After ${currentPlayer.nflYear} NFL seasons, you hang up the cleats.`
	);

	// Career summary
	addStoryText(
		`Career earnings: $${totalMoney.toLocaleString()}`
	);
	addStoryText(
		`Total seasons played: ${totalSeasons}`
	);

	// Hall of Fame check
	const avgStats = Math.round(
		(currentPlayer.core.technique
		+ currentPlayer.core.footballIq
		+ currentPlayer.core.athleticism
		+ currentPlayer.core.confidence) / 4
	);

	if (currentPlayer.nflYear >= 10 && avgStats >= 65) {
		addStoryHeadline('Hall of Fame');
		addStoryText(
			'Years from now, you stand at the podium in Canton. '
			+ 'Your name will be remembered forever.'
		);
	} else if (currentPlayer.nflYear >= 7 && avgStats >= 55) {
		addStoryText(
			'You may not make the Hall of Fame, but you had a career '
			+ 'most people only dream about.'
		);
	} else {
		addStoryText(
			'It was not the longest career, but you made it to the NFL. '
			+ 'Not many people can say that.'
		);
	}

	// Final story recap
	addStoryHeadline('Your Legacy');
	const decisions = currentPlayer.bigDecisions;
	if (decisions.length > 0) {
		addStoryText('Key moments that defined your career:');
		for (const decision of decisions) {
			addStoryText(`- ${decision}`);
		}
	}

	addStoryText(
		'Thank you for playing Gridiron Life.'
	);

	ui.showChoicePopup('Career Over', [
		{
			text: 'Start a New Career',
			primary: true,
			action: () => {
				deleteSave();
				currentPlayer = null;
				hardClearStory();
				startCharacterCreation();
			},
		},
	]);
}

//============================================
// ENTRY POINT
//============================================

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	initGame().catch((error) => {
		console.error('Game initialization failed:', error);
		// Show a fallback button so the user is not stuck on a blank screen
		const panel = document.getElementById('choices-panel');
		if (panel) {
			panel.innerHTML = '<p style="color:red;">Error loading game. Check console.</p>';
		}
	});
});
