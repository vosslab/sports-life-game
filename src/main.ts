// main.ts - game startup and loop orchestration

import {
	Player, CoreStats, CareerPhase, Position,
	createPlayer, randomInRange, clampStat, getPositionBucket,
} from './player.js';
import { saveGame, loadGame, hasSave, deleteSave } from './save.js';
import { Team, ScheduleEntry, generateHighSchoolTeam, generateOpponentName } from './team.js';
import {
	WeeklyFocus, GameResult,
	applyWeeklyFocus, simulateGame,
} from './week_sim.js';
import {
	GameEvent, loadEvents, filterEvents,
	selectEvent, applyEventChoice,
} from './events.js';
import * as ui from './ui.js';
import {
	generateTeamPalette, generateNFLPalette,
	applyPalette, resetToDefault,
} from './theme.js';
import {
	startCollege, getCollegeSeasonChoices, simulateCollegeSeason,
	calculateDraftStock, generateNILDeal, applyCollegeChoice,
	checkDeclarationEligibility, CollegeChoice,
} from './college.js';

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

// BUG FIX 4: Track used childhood events to avoid repeats
const usedChildhoodEvents = new Set<number>();

// BUG FIX 3: Track if state championship won this season
let wonStateThisSeason = false;

// Total weeks in a high school regular season
const HS_SEASON_WEEKS = 10;

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
async function initGame(): Promise<void> {
	// Load name lists from CSV files
	await loadNameLists();

	const storyLog = document.getElementById('story-log');
	if (!storyLog) {
		return;
	}

	// Check for existing save
	if (hasSave()) {
		currentPlayer = loadGame();
		if (currentPlayer) {
			// Resume existing game
			addStoryHeadline('Welcome Back');
			addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
				+ `Age ${currentPlayer.age}`);
			updateAllStatBars(currentPlayer);
			updateHeader(currentPlayer);
			showChoices([
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
	showChoices([
		{ text: 'Start New Game', primary: true, action: startCharacterCreation },
	]);
}

//============================================
function confirmNewGame(): void {
	clearStory();
	addStoryHeadline('Start Over?');
	addStoryText('This will erase your current career. Are you sure?');
	showChoices([
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

	// Update UI with birth stats
	updateAllStatBars(currentPlayer);
	updateHeader(currentPlayer);

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

	showChoices([
		{ text: 'Continue...', primary: true, action: advanceChildhood },
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
function advanceChildhood(): void {
	if (!currentPlayer) {
		return;
	}

	// Advance age
	currentPlayer.age += 1;

	// Apply natural childhood growth
	applyChildhoodGrowth(currentPlayer);

	// Save after each advance
	saveGame(currentPlayer);

	// Update UI
	updateAllStatBars(currentPlayer);
	updateHeader(currentPlayer);
	clearStory();

	// Check if ready for youth football
	if (currentPlayer.age >= 10) {
		addStoryHeadline(`Age ${currentPlayer.age}: Time to Play`);
		addStoryText('Your friends are signing up for youth football. '
			+ 'You have been watching games on TV for years. '
			+ 'This could be the start of something big.');
		showChoices([
			{ text: 'Sign up for football!', primary: true, action: startYouthFootball },
			{ text: 'Not yet...', primary: false, action: advanceChildhood },
		]);
		return;
	}

	// Generate childhood event
	const event = getChildhoodEvent(currentPlayer);
	addStoryHeadline(`Age ${currentPlayer.age}`);
	addStoryText(event.text);

	if (event.choices) {
		showChoices(event.choices.map(choice => ({
			text: choice.text,
			primary: choice.primary || false,
			action: () => {
				// Apply stat changes
				for (const [stat, delta] of Object.entries(choice.effects)) {
					const key = stat as keyof CoreStats;
					if (key in currentPlayer!.core) {
						currentPlayer!.core[key] = clampStat(currentPlayer!.core[key] + delta);
					}
				}
				// Show flavor text
				if (choice.flavor) {
					addStoryText(choice.flavor);
				}
				updateAllStatBars(currentPlayer!);
				saveGame(currentPlayer!);
				// Show continue button
				showChoices([
					{ text: 'Continue...', primary: true, action: advanceChildhood },
				]);
			},
		})));
	} else {
		showChoices([
			{ text: 'Continue...', primary: true, action: advanceChildhood },
		]);
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

	currentPlayer.phase = 'youth';
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Youth Football');
	addStoryText('You signed up for the youth league. Time to find out what you are made of.');
	addStoryText('The coaches will figure out where you belong on the field.');

	showChoices([
		{ text: 'Hit the field!', primary: true, action: advanceYouthSeason },
	]);
}

//============================================
function advanceYouthSeason(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.age += 1;
	currentPlayer.currentSeason += 1;

	// Apply youth growth (faster than childhood)
	currentPlayer.core.athleticism = clampStat(currentPlayer.core.athleticism + randomInRange(2, 5));
	currentPlayer.core.technique = clampStat(currentPlayer.core.technique + randomInRange(2, 4));
	currentPlayer.core.footballIq = clampStat(currentPlayer.core.footballIq + randomInRange(1, 3));
	currentPlayer.core.discipline = clampStat(currentPlayer.core.discipline + randomInRange(1, 3));
	currentPlayer.core.health = clampStat(currentPlayer.core.health + randomInRange(0, 2));
	currentPlayer.core.confidence = clampStat(currentPlayer.core.confidence + randomInRange(1, 4));

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);
	updateHeader(currentPlayer);
	clearStory();

	// Check if ready for high school
	if (currentPlayer.age >= 14) {
		addStoryHeadline(`Age ${currentPlayer.age}: High School`);
		addStoryText('You made it through youth football. Now the real competition begins.');
		addStoryText('High school tryouts are next week. This is where careers start.');

		showChoices([
			{ text: 'Time for high school football!', primary: true, action: startHighSchool },
		]);
		return;
	}

	// Youth season summary
	const youthEvent = getYouthEvent(currentPlayer);
	addStoryHeadline(`Age ${currentPlayer.age}: Youth Season ${currentPlayer.currentSeason}`);
	addStoryText(youthEvent.text);

	if (youthEvent.choices) {
		showChoices(youthEvent.choices.map(choice => ({
			text: choice.text,
			primary: choice.primary || false,
			action: () => {
				for (const [stat, delta] of Object.entries(choice.effects)) {
					const key = stat as keyof CoreStats;
					if (key in currentPlayer!.core) {
						currentPlayer!.core[key] = clampStat(currentPlayer!.core[key] + delta);
					}
				}
				if (choice.flavor) {
					addStoryText(choice.flavor);
				}
				updateAllStatBars(currentPlayer!);
				saveGame(currentPlayer!);
				showChoices([
					{ text: 'Next Season...', primary: true, action: advanceYouthSeason },
				]);
			},
		})));
	} else {
		showChoices([
			{ text: 'Next Season...', primary: true, action: advanceYouthSeason },
		]);
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
function startHighSchool(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'high_school';
	currentPlayer.currentSeason = 0;
	currentPlayer.currentWeek = 0;
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Welcome to High School Football');
	addStoryText('Freshman year. Everything is bigger, faster, and louder.');
	addStoryText('The coach watches you during tryouts. He is about to decide your future.');

	// Position discovery based on stats
	const suggested = suggestPosition(currentPlayer);
	addStoryText(`Based on your build and skills, Coach thinks you would be a good fit at ${suggested}.`);

	showChoices([
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

	showChoices(positions.map(p => ({
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
	updateHeader(currentPlayer);

	clearStory();
	addStoryHeadline(`You are a ${position}`);
	addStoryText(`You line up at ${position} for the first time in practice. `
		+ 'The seniors barely look at you. You are at the bottom of the depth chart.');
	addStoryText('But everyone starts somewhere.');

	showChoices([
		{ text: 'Start the season', primary: true, action: startHighSchoolSeason },
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
	updateAllStatBars(currentPlayer);
	updateHeader(currentPlayer);

	// Route to the correct phase
	switch (currentPlayer.phase) {
		case 'childhood':
			advanceChildhood();
			break;
		case 'youth':
			advanceYouthSeason();
			break;
		case 'high_school':
			clearStory();
			addStoryHeadline('Welcome Back');
			addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
				+ `${currentPlayer.position || 'Undecided'}, Age ${currentPlayer.age}`);
			showChoices([
				{ text: 'Continue Season', primary: true, action: startHighSchoolSeason },
			]);
			break;
		case 'college':
			clearStory();
			addStoryHeadline('Welcome Back');
			addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
				+ `Age ${currentPlayer.age} - College`);
			showChoices([
				{ text: 'Continue College', primary: true, action: beginCollege },
			]);
			break;
		case 'nfl':
			clearStory();
			addStoryHeadline('Welcome Back');
			addStoryText(`${currentPlayer.firstName} ${currentPlayer.lastName}, `
				+ `Age ${currentPlayer.age} - ${currentPlayer.teamName || 'NFL'}`);
			showChoices([
				{ text: 'Continue NFL Career', primary: true, action: playNFLSeason },
			]);
			break;
		case 'legacy':
			clearStory();
			addStoryHeadline('Career Complete');
			showChoices([
				{ text: 'View Legacy', primary: true, action: retirePlayer },
			]);
			break;
		default:
			clearStory();
			addStoryHeadline('Welcome Back');
			showChoices([]);
			break;
	}
}

//============================================
// UI Helper functions
//============================================

interface ChoiceOption {
	text: string;
	primary?: boolean;
	action: () => void;
}

//============================================
function showChoices(options: ChoiceOption[]): void {
	const panel = document.getElementById('choices-panel');
	if (!panel) {
		return;
	}
	panel.innerHTML = '';

	for (const option of options) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		if (option.primary) {
			button.classList.add('primary');
		}
		button.textContent = option.text;
		button.addEventListener('click', option.action);
		panel.appendChild(button);
	}

	// BUG FIX 2: Auto-scroll story panel after rendering choices
	const storyPanel = document.getElementById('story-panel');
	if (storyPanel) {
		requestAnimationFrame(() => {
			storyPanel.scrollTop = storyPanel.scrollHeight;
		});
	}
}

//============================================
function updateStatBar(statName: string, value: number): void {
	const clamped = clampStat(value);

	const bar = document.getElementById(`bar-${statName}`);
	if (bar) {
		bar.style.width = `${clamped}%`;
		bar.className = 'stat-fill';
		if (clamped >= 70) {
			bar.classList.add('stat-high');
		} else if (clamped >= 40) {
			bar.classList.add('stat-mid');
		} else {
			bar.classList.add('stat-low');
		}
	}

	const val = document.getElementById(`val-${statName}`);
	if (val) {
		val.textContent = String(clamped);
	}
}

//============================================
function updateAllStatBars(player: Player): void {
	updateStatBar('athleticism', player.core.athleticism);
	updateStatBar('technique', player.core.technique);
	updateStatBar('footballIq', player.core.footballIq);
	updateStatBar('discipline', player.core.discipline);
	updateStatBar('health', player.core.health);
	updateStatBar('confidence', player.core.confidence);
	updateStatBar('popularity', player.career.popularity);
}

//============================================
function updateHeader(player: Player): void {
	const nameEl = document.getElementById('player-name');
	if (nameEl) {
		nameEl.textContent = `${player.firstName} ${player.lastName}`;
	}

	const posEl = document.getElementById('player-position');
	if (posEl) {
		posEl.textContent = player.position ? player.position : '';
	}

	const teamEl = document.getElementById('player-team');
	if (teamEl) {
		teamEl.textContent = player.teamName || '';
	}

	const ageEl = document.getElementById('player-age');
	if (ageEl) {
		ageEl.textContent = `Age: ${player.age}`;
	}

	const weekEl = document.getElementById('player-week');
	if (weekEl) {
		const phaseLabels: Record<CareerPhase, string> = {
			childhood: 'Childhood',
			youth: 'Youth Football',
			high_school: 'High School',
			college: 'College',
			nfl: 'NFL',
			legacy: 'Legend',
		};
		weekEl.textContent = phaseLabels[player.phase];
	}
}

//============================================
// BitLife-style: never clear the timeline, just add a divider
// Old entries stay visible and scrollable
function clearStory(): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog && storyLog.children.length > 0) {
		// Add a visual divider instead of clearing
		const divider = document.createElement('hr');
		divider.className = 'story-divider';
		storyLog.appendChild(divider);
		// BUG FIX 2: Auto-scroll to the newest content
		const panel = document.getElementById('story-panel');
		if (panel) {
			requestAnimationFrame(() => {
				panel.scrollTop = panel.scrollHeight;
			});
		}
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
// HIGH SCHOOL WEEKLY LOOP
//============================================

async function startHighSchoolSeason(): Promise<void> {
	if (!currentPlayer) {
		return;
	}

	// BUG FIX 1: Reuse same high school team across 4 years
	if (persistentHSTeam === null) {
		// First season: generate a new team and store it
		const schoolName = generateSchoolName();
		persistentHSTeam = generateHighSchoolTeam(schoolName);
		currentTeam = persistentHSTeam;
		currentPlayer.teamName = schoolName;
		// Apply team colors
		const hsPalette = generateTeamPalette();
		applyPalette(hsPalette);
		currentPlayer.teamPalette = hsPalette;
	} else {
		// Subsequent seasons: reuse the team but reset wins/losses
		currentTeam = persistentHSTeam;
		// Reset record for new season
		currentTeam.wins = 0;
		currentTeam.losses = 0;
		// Regenerate schedule with new opponents
		const newSchedule: ScheduleEntry[] = [];
		const scheduleLength = currentTeam.schedule.length;
		for (let week = 1; week <= scheduleLength; week++) {
			const opponentStrength = randomInRange(35, 95);
			const opponent: ScheduleEntry = {
				opponentName: generateOpponentName(),
				opponentStrength,
				week,
				played: false,
				teamScore: 0,
				opponentScore: 0,
			};
			newSchedule.push(opponent);
		}
		currentTeam.schedule = newSchedule;
		// Slightly improve team strength
		currentTeam.strength = clampStat(
			currentTeam.strength + randomInRange(1, 4)
		);
	}

	currentPlayer.currentSeason += 1;
	currentPlayer.currentWeek = 0;

	// Load events on first season
	if (allEvents.length === 0) {
		allEvents = await loadEvents();
	}

	// Reset season stats for awards tracking
	currentSeasonStats = {
		totalYards: 0,
		totalTouchdowns: 0,
		totalTackles: 0,
		totalInterceptions: 0,
		gamesPlayed: 0,
		playerOfTheWeekCount: 0,
	};

	// Reset championship flag for new season
	wonStateThisSeason = false;

	saveGame(currentPlayer);
	updateHeader(currentPlayer);
	updateAllStatBars(currentPlayer);

	clearStory();
	addStoryHeadline(
		`Season ${currentPlayer.currentSeason}: ${currentPlayer.teamName}`
	);
	addStoryText(
		`The ${currentPlayer.teamName} are ready for a new season. `
		+ `Coach ${getCoachTitle(currentTeam)} has the roster set.`
	);

	const status = currentPlayer.depthChart === 'starter'
		? 'You are the starting ' + currentPlayer.position + '.'
		: 'You are listed as ' + currentPlayer.depthChart
			+ ' at ' + currentPlayer.position + '.';
	addStoryText(status);

	// Update status bar
	updateStatusBar(
		`Record: ${currentTeam.wins}-${currentTeam.losses}`,
		currentPlayer.recruitingStars > 0
			? `Recruiting: ${currentPlayer.recruitingStars} stars`
			: ''
	);

	showChoices([
		{ text: 'Begin Preseason', primary: true, action: startPreseason },
	]);
}

//============================================
function getCoachTitle(team: Team): string {
	switch (team.coachPersonality) {
		case 'supportive': return 'Williams (known for developing young talent)';
		case 'demanding': return 'Jackson (expects perfection every week)';
		case 'volatile': return 'Martinez (a wildcard who keeps everyone guessing)';
	}
}

//============================================
function startPreseason(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	// Week -1: Tryouts
	currentPlayer.currentWeek = -1;
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Preseason: Tryouts');
	addStoryText('Preseason week. The coaching staff is evaluating the roster.');

	if (currentPlayer.depthChart === 'backup') {
		addStoryText(
			'You are a backup looking to earn your shot as a starter. '
			+ 'Everyone is watching. What is your strategy?'
		);
		showChoices([
			{
				text: 'Outwork everyone at practice',
				primary: false,
				action: () => handleTryoutChoice(
					'outwork',
					{ technique: 3, discipline: 2 }
				),
			},
			{
				text: 'Show off your athleticism',
				primary: false,
				action: () => handleTryoutChoice(
					'athleticism',
					{ athleticism: 2, confidence: 2 }
				),
			},
			{
				text: 'Study the playbook',
				primary: false,
				action: () => handleTryoutChoice(
					'playbook',
					{ footballIq: 3 }
				),
			},
		]);
	} else {
		addStoryText(
			'You are the starter. Now it is about staying sharp and '
			+ 'staying healthy.'
		);
		showChoices([
			{
				text: 'Move to Week 0',
				primary: true,
				action: preseassonFirstScrimmage,
			},
		]);
	}
}

//============================================
function handleTryoutChoice(strategy: string, effects: Record<string, number>): void {
	if (!currentPlayer) {
		return;
	}

	// Apply stat changes
	for (const [stat, delta] of Object.entries(effects)) {
		const key = stat as keyof CoreStats;
		if (key in currentPlayer.core) {
			currentPlayer.core[key] = clampStat(currentPlayer.core[key] + delta);
		}
	}
	updateAllStatBars(currentPlayer);
	saveGame(currentPlayer);

	// Flavor text for each choice
	let flavor = '';
	switch (strategy) {
		case 'outwork':
			flavor = 'You stay late, run extra drills, and push yourself harder '
				+ 'than anyone else. The coaches are taking notice.';
			break;
		case 'athleticism':
			flavor = 'You line up and show what you can do athletically. '
				+ 'The coaching staff exchanged impressed looks.';
			break;
		case 'playbook':
			flavor = 'You study film and memorize the scheme. During practice, '
				+ 'you are always in the right spot, making smart reads.';
			break;
	}
	addStoryText(flavor);

	// Roll to see if they earn starter role (30% base chance)
	const earnChance = Math.max(
		30,
		Math.min(
			80,
			30
			+ (currentPlayer.core.technique - 50) / 2
			+ (currentPlayer.core.confidence - 50) / 2
		)
	);

	const roll = randomInRange(1, 100);
	if (roll <= earnChance) {
		currentPlayer.depthChart = 'starter';
		addStoryText(
			'Coach pulled you aside: "You earned it. You are starting '
			+ 'next Friday."'
		);
	} else {
		addStoryText(
			'Coach nods respectfully, but does not commit. You are still '
			+ 'in the conversation.'
		);
	}

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);

	showChoices([
		{
			text: 'Move to Week 0',
			primary: true,
			action: preseassonFirstScrimmage,
		},
	]);
}

//============================================
function preseassonFirstScrimmage(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	currentPlayer.currentWeek = 0;
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Preseason: First Scrimmage');
	addStoryText('Week 0. A full-speed practice game against the second team.');

	// Quick scrimmage sim with a weaker opponent
	const result = simulateGame(currentPlayer, currentTeam, 35);

	addStoryText(result.storyText);
	const statParts: string[] = [];
	for (const [key, val] of Object.entries(result.playerStatLine)) {
		statParts.push(`${key}: ${val}`);
	}
	const statLineStr = statParts.join(' | ');
	addResult(statLineStr);

	// Slight confidence boost for scrimmage
	currentPlayer.core.confidence = clampStat(
		currentPlayer.core.confidence + randomInRange(1, 2)
	);
	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);

	showChoices([
		{
			text: 'Begin Regular Season',
			primary: true,
			action: startWeek,
		},
	]);
}

//============================================
function startWeek(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	// Advance week (start from week 1)
	if (currentPlayer.currentWeek === 0) {
		currentPlayer.currentWeek = 1;
	} else {
		currentPlayer.currentWeek += 1;
	}
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline(
		`Week ${currentPlayer.currentWeek} of ${HS_SEASON_WEEKS}`
	);

	// Show the opponent for this week
	const scheduleIdx = currentPlayer.currentWeek - 1;
	if (scheduleIdx < currentTeam.schedule.length) {
		const opp = currentTeam.schedule[scheduleIdx];
		addStoryText(
			`This week: vs ${opp.opponentName}`
		);
	}

	// Step 1: choose weekly focus
	addStoryText('What do you want to focus on this week?');
	showWeeklyFocusUI();
}

//============================================
function showWeeklyFocusUI(): void {
	const focusOptions: { text: string; key: WeeklyFocus }[] = [
		{ text: 'Train', key: 'train' },
		{ text: 'Film Study', key: 'film_study' },
		{ text: 'Recovery', key: 'recovery' },
		{ text: 'Social', key: 'social' },
		{ text: 'Teamwork', key: 'teamwork' },
	];

	showChoices(focusOptions.map(opt => ({
		text: opt.text,
		primary: false,
		action: () => handleWeeklyFocus(opt.key),
	})));
}

//============================================
function handleWeeklyFocus(focus: WeeklyFocus): void {
	if (!currentPlayer) {
		return;
	}

	// Apply focus and get story text
	const focusStory = applyWeeklyFocus(currentPlayer, focus);
	addStoryText(focusStory);
	updateAllStatBars(currentPlayer);
	saveGame(currentPlayer);

	// Step 2: check for random event (35% chance)
	const eventRoll = randomInRange(1, 100);
	if (eventRoll <= 35 && allEvents.length > 0) {
		// Build stats record for filtering
		const statsRecord: Record<string, number> = {
			athleticism: currentPlayer.core.athleticism,
			technique: currentPlayer.core.technique,
			footballIq: currentPlayer.core.footballIq,
			discipline: currentPlayer.core.discipline,
			health: currentPlayer.core.health,
			confidence: currentPlayer.core.confidence,
		};

		const eligible = filterEvents(
			allEvents,
			'high_school',
			currentPlayer.currentWeek,
			currentPlayer.position,
			currentPlayer.storyFlags,
			statsRecord,
		);

		const event = selectEvent(eligible);
		if (event) {
			showEventCard(event);
			return;
		}
	}

	// No event: go straight to game day
	proceedToGameDay();
}

//============================================
function showEventCard(event: GameEvent): void {
	if (!currentPlayer) {
		return;
	}

	// Show event as a modal
	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			// Apply choice effects
			const flavor = applyEventChoice(currentPlayer!, choice);
			ui.hideEventModal();

			// Show the outcome
			addStoryHeadline(event.title);
			addStoryText(flavor);
			updateAllStatBars(currentPlayer!);
			saveGame(currentPlayer!);

			// Continue to game day
			showChoices([
				{ text: 'Game Day', primary: true, action: proceedToGameDay },
			]);
		},
	}));

	ui.showEventModal(event.title, event.description, choiceActions);
}

//============================================
function proceedToGameDay(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	const scheduleIdx = currentPlayer.currentWeek - 1;
	if (scheduleIdx >= currentTeam.schedule.length) {
		// Past end of schedule, go to season end
		endSeason();
		return;
	}

	const opponent = currentTeam.schedule[scheduleIdx];

	// Simulate the game
	const result = simulateGame(
		currentPlayer,
		currentTeam,
		opponent.opponentStrength,
	);

	// Record the result in schedule
	opponent.played = true;
	opponent.teamScore = result.teamScore;
	opponent.opponentScore = result.opponentScore;

	// Update team record
	if (result.result === 'win') {
		currentTeam.wins += 1;
	} else if (result.result === 'loss') {
		currentTeam.losses += 1;
	}

	// Confidence adjusts based on result
	if (result.result === 'win') {
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(1, 3)
		);
	} else {
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(-3, 0)
		);
	}

	// Track season stats for awards
	currentSeasonStats.gamesPlayed += 1;
	if (result.playerStatLine['Yards'] !== undefined) {
		currentSeasonStats.totalYards +=
			typeof result.playerStatLine['Yards'] === 'number'
				? result.playerStatLine['Yards']
				: parseInt(String(result.playerStatLine['Yards']), 10) || 0;
	}
	if (result.playerStatLine['TDs'] !== undefined) {
		currentSeasonStats.totalTouchdowns +=
			typeof result.playerStatLine['TDs'] === 'number'
				? result.playerStatLine['TDs']
				: parseInt(String(result.playerStatLine['TDs']), 10) || 0;
	}
	if (result.playerStatLine['Tackles'] !== undefined) {
		currentSeasonStats.totalTackles +=
			typeof result.playerStatLine['Tackles'] === 'number'
				? result.playerStatLine['Tackles']
				: parseInt(String(result.playerStatLine['Tackles']), 10) || 0;
	}
	if (result.playerStatLine['INTs'] !== undefined) {
		currentSeasonStats.totalInterceptions +=
			typeof result.playerStatLine['INTs'] === 'number'
				? result.playerStatLine['INTs']
				: parseInt(String(result.playerStatLine['INTs']), 10) || 0;
	}

	// Player of the Week: probabilistic per The Show spec
	// Elite: 15-25%, Great: 5-12%, Good: 1-3%, otherwise 0%
	let potwChance = 0;
	if (result.playerRating === 'elite') {
		potwChance = randomInRange(15, 25);
	} else if (result.playerRating === 'great') {
		potwChance = randomInRange(5, 12);
	} else if (result.playerRating === 'good') {
		potwChance = randomInRange(1, 3);
	}
	const potwRoll = randomInRange(1, 100);
	if (potwRoll <= potwChance) {
		currentSeasonStats.playerOfTheWeekCount += 1;
	}

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);

	// Display game result
	clearStory();
	addStoryHeadline('Game Day');
	addStoryText(result.storyText);

	// Format stat line
	const statParts: string[] = [];
	for (const [key, val] of Object.entries(result.playerStatLine)) {
		statParts.push(`${key}: ${val}`);
	}
	const statLineStr = statParts.join(' | ');
	addResult(statLineStr);

	const scoreStr = `${currentTeam.teamName} ${result.teamScore} - `
		+ `${opponent.opponentName} ${result.opponentScore}`;
	addResult(scoreStr);

	// Show player of the week if awarded this week
	if (potwRoll <= potwChance) {
		addResult('*** PLAYER OF THE WEEK ***');
	}

	// Update status bar
	updateStatusBar(
		`Record: ${currentTeam.wins}-${currentTeam.losses}`,
		currentPlayer.recruitingStars > 0
			? `Recruiting: ${currentPlayer.recruitingStars} stars`
			: ''
	);

	// Check if season is over
	if (currentPlayer.currentWeek >= HS_SEASON_WEEKS) {
		showChoices([
			{ text: 'Season Summary', primary: true, action: endSeason },
		]);
	} else {
		showChoices([
			{ text: 'Next Week', primary: true, action: startWeek },
		]);
	}
}

//============================================
function endSeason(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	// Check for playoffs
	if (currentTeam.wins >= 6) {
		// Team qualifies for playoffs
		showChoices([
			{
				text: 'Playoff Time!',
				primary: true,
				action: startPlayoffs,
			},
		]);
		return;
	}

	// No playoffs: go to season summary
	completeSeasonSummary();
}

//============================================
function startPlayoffs(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	clearStory();
	addStoryHeadline('Playoff Time!');
	addStoryText(
		`The ${currentTeam.teamName} qualified for the playoffs with a `
		+ `${currentTeam.wins}-${currentTeam.losses} record!`
	);
	addStoryText('Your playoff run begins. One team stands in the way of states.');

	saveGame(currentPlayer);

	// Start first playoff game
	playPlayoffGame(1);
}

//============================================
function playPlayoffGame(playoffRound: number): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	// 3 rounds max: regional -> state -> championship
	if (playoffRound > 3) {
		// BUG FIX 3: Only show championship message once per season
		if (!wonStateThisSeason) {
			wonStateThisSeason = true;
			// Won state championship!
			clearStory();
			addStoryHeadline('STATE CHAMPIONS!');
			addStoryText(
				`The ${currentTeam.teamName} are State Champions! `
				+ 'You did it. You took your team all the way.'
			);
			addStoryText(
				'This is the biggest moment of your high school career. '
				+ 'The scouts will remember.'
			);
			if (currentPlayer.recruitingStars < 5) {
				currentPlayer.recruitingStars = 5;
			}
			// Track championship in big decisions
			currentPlayer.bigDecisions.push(
				`Won State Championship in Season ${currentPlayer.currentSeason}`
			);
		}

		saveGame(currentPlayer);
		updateAllStatBars(currentPlayer);

		showChoices([
			{
				text: 'End Season',
				primary: true,
				action: completeSeasonSummary,
			},
		]);
		return;
	}

	// BUG FIX 3: Generate opponent with significantly higher strength for playoffs
	// Make state championships rare (~8% for average team)
	let opponentStrength: number;
	if (playoffRound === 1) {
		// Regional: moderate difficulty
		opponentStrength = randomInRange(65, 80);
	} else if (playoffRound === 2) {
		// State Semifinal: much harder
		opponentStrength = randomInRange(78, 92);
	} else {
		// State Final: extremely difficult
		opponentStrength = randomInRange(88, 98);
	}
	const roundNames = ['Regional Playoff', 'State Semifinal', 'State Final'];
	const roundName = roundNames[playoffRound - 1];

	clearStory();
	addStoryHeadline(roundName);
	addStoryText(
		'One game. Winner advances to the next round. '
		+ 'Everything you worked for comes down to this.'
	);

	// Weekly focus before playoff game
	addStoryText('What do you focus on this week?');
	showChoices([
		{
			text: 'Train',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'train', opponentStrength),
		},
		{
			text: 'Film Study',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'film_study', opponentStrength),
		},
		{
			text: 'Recovery',
			primary: false,
			action: () => preparePlayoffGame(playoffRound, 'recovery', opponentStrength),
		},
	]);
}

//============================================
function preparePlayoffGame(
	playoffRound: number,
	focus: WeeklyFocus,
	opponentStrength: number
): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	// Apply weekly focus
	const focusStory = applyWeeklyFocus(currentPlayer, focus);
	addStoryText(focusStory);
	updateAllStatBars(currentPlayer);
	saveGame(currentPlayer);

	// Simulate playoff game
	const result = simulateGame(currentPlayer, currentTeam, opponentStrength);

	// Track stats
	currentSeasonStats.gamesPlayed += 1;
	if (result.playerStatLine['Yards'] !== undefined) {
		currentSeasonStats.totalYards +=
			typeof result.playerStatLine['Yards'] === 'number'
				? result.playerStatLine['Yards']
				: parseInt(String(result.playerStatLine['Yards']), 10) || 0;
	}
	if (result.playerStatLine['TDs'] !== undefined) {
		currentSeasonStats.totalTouchdowns +=
			typeof result.playerStatLine['TDs'] === 'number'
				? result.playerStatLine['TDs']
				: parseInt(String(result.playerStatLine['TDs']), 10) || 0;
	}
	if (result.playerStatLine['Tackles'] !== undefined) {
		currentSeasonStats.totalTackles +=
			typeof result.playerStatLine['Tackles'] === 'number'
				? result.playerStatLine['Tackles']
				: parseInt(String(result.playerStatLine['Tackles']), 10) || 0;
	}
	if (result.playerRating === 'elite') {
		currentSeasonStats.playerOfTheWeekCount += 1;
	}

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);

	clearStory();
	const roundNames = ['Regional Playoff', 'State Semifinal', 'State Final'];
	addStoryHeadline(roundNames[playoffRound - 1]);
	addStoryText(result.storyText);

	// Format stat line
	const statParts: string[] = [];
	for (const [key, val] of Object.entries(result.playerStatLine)) {
		statParts.push(`${key}: ${val}`);
	}
	const statLineStr = statParts.join(' | ');
	addResult(statLineStr);

	if (result.result === 'win') {
		currentTeam.wins += 1;
		addResult('PLAYOFF WIN!');
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(2, 4)
		);

		showChoices([
			{
				text: 'Advance',
				primary: true,
				action: () => playPlayoffGame(playoffRound + 1),
			},
		]);
	} else {
		currentTeam.losses += 1;
		addResult('Playoff Loss. Season Over.');
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(-3, 0)
		);

		showChoices([
			{
				text: 'End Season',
				primary: true,
				action: completeSeasonSummary,
			},
		]);
	}

	saveGame(currentPlayer);
}

//============================================
function completeSeasonSummary(): void {
	if (!currentPlayer || !currentTeam) {
		return;
	}

	clearStory();
	addStoryHeadline('Season Over');
	addStoryText(
		`Final record: ${currentTeam.wins}-${currentTeam.losses}`
	);

	// Season narrative based on record
	const winPct = currentTeam.wins / (currentTeam.wins + currentTeam.losses);
	let seasonStory: string;
	if (winPct >= 0.8) {
		seasonStory = 'An incredible season. The scouts are paying attention.';
	} else if (winPct >= 0.6) {
		seasonStory = 'A solid season. You proved you belong on this team.';
	} else if (winPct >= 0.4) {
		seasonStory = 'A mixed season with some bright spots and tough losses.';
	} else {
		seasonStory = 'A tough season, but you learned more from the '
			+ 'losses than you ever would from easy wins.';
	}
	addStoryText(seasonStory);

	// Depth chart promotion check
	if (currentPlayer.depthChart === 'backup') {
		// Check if performance warrants promotion
		if (currentPlayer.core.technique >= 35
			&& currentPlayer.core.confidence >= 40) {
			currentPlayer.depthChart = 'starter';
			addStoryText(
				'Coach pulled you aside after the last game. '
				+ '"You earned it. You are starting next season."'
			);
		} else {
			addStoryText(
				'You are still on the depth chart as a backup. '
				+ 'Keep working.'
			);
		}
	} else if (currentPlayer.depthChart === 'starter') {
		addStoryText('You held your starting spot all season. Respect.');
	}

	// Calculate and award honors
	const seasonAwards: string[] = [];

	// All-Conference: avg stat >= 60
	const avgStats = Math.round(
		(currentPlayer.core.technique + currentPlayer.core.athleticism) / 2
	);
	if (avgStats >= 60) {
		seasonAwards.push('All-Conference');
		addStoryText(
			'The coaches voted you to the All-Conference team. '
			+ 'Your name is in the papers.'
		);
	}

	// All-State: avg stat >= 75
	if (avgStats >= 75) {
		seasonAwards.push('All-State');
		addStoryText(
			'You made All-State. This is the highest honor in high school football. '
			+ 'Your family is so proud.'
		);
	}

	// Record season in career history
	const historyEntry = currentPlayer.careerHistory[
		currentPlayer.careerHistory.length - 1
	];
	if (historyEntry) {
		historyEntry.awards = seasonAwards;
		historyEntry.highlights.push(
			`Player of the Week: ${currentSeasonStats.playerOfTheWeekCount} times`
		);
	} else {
		currentPlayer.careerHistory.push({
			phase: 'high_school',
			year: currentPlayer.seasonYear,
			age: currentPlayer.age,
			team: currentTeam.teamName,
			position: currentPlayer.position,
			wins: currentTeam.wins,
			losses: currentTeam.losses,
			depthChart: currentPlayer.depthChart,
			highlights: [
				`Player of the Week: ${currentSeasonStats.playerOfTheWeekCount} times`,
			],
			awards: seasonAwards,
		});
	}

	// Recruiting stars for juniors/seniors
	if (currentPlayer.age >= 16) {
		const overallRating = Math.round(
			(currentPlayer.core.athleticism
			+ currentPlayer.core.technique
			+ currentPlayer.core.footballIq
			+ currentPlayer.core.confidence) / 4
		);
		if (overallRating >= 75) {
			currentPlayer.recruitingStars = 5;
		} else if (overallRating >= 60) {
			currentPlayer.recruitingStars = 4;
		} else if (overallRating >= 45) {
			currentPlayer.recruitingStars = 3;
		} else if (overallRating >= 30) {
			currentPlayer.recruitingStars = 2;
		} else {
			currentPlayer.recruitingStars = 1;
		}
		addStoryText(
			`Recruiting update: You are rated as a `
			+ `${currentPlayer.recruitingStars}-star recruit.`
		);
	}

	// Age up and prepare for next season
	currentPlayer.age += 1;
	currentPlayer.seasonYear += 1;
	currentPlayer.currentWeek = 0;
	saveGame(currentPlayer);
	updateHeader(currentPlayer);

	// Check if high school is over (age 18 = graduated)
	if (currentPlayer.age >= 18) {
		showChoices([
			{
				text: 'Graduate and move on',
				primary: true,
				action: graduateHighSchool,
			},
		]);
	} else {
		showChoices([
			{
				text: 'Start next season',
				primary: true,
				action: startHighSchoolSeason,
			},
		]);
	}
}

//============================================
function graduateHighSchool(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'college';
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Graduation Day');

	if (currentPlayer.recruitingStars >= 4) {
		addStoryText(
			'The college offers are pouring in. You did it. '
			+ 'All those early mornings and late practices paid off.'
		);
	} else if (currentPlayer.recruitingStars >= 2) {
		addStoryText(
			'A few colleges showed interest. Not the biggest programs, '
			+ 'but a chance is all you need.'
		);
	} else {
		addStoryText(
			'The recruiting trail was quiet, but you refuse to give up. '
			+ 'There has to be a program willing to take a chance on you.'
		);
	}

	addStoryText('The next chapter begins...');

	showChoices([
		{
			text: 'Head to college',
			primary: true,
			action: beginCollege,
		},
	]);
}

//============================================
// COLLEGE PHASE - weekly loop like high school
//============================================

let collegeYear = 0;
let collegeTeam: Team | null = null;
const COLLEGE_SEASON_WEEKS = 12;

//============================================
function beginCollege(): void {
	if (!currentPlayer) {
		return;
	}

	collegeYear = 0;
	collegeTeam = null;
	// Reset high school team when entering college
	persistentHSTeam = null;

	// Clear high school team name so college.ts assigns a real college
	currentPlayer.teamName = '';
	// Welcome story from college.ts (assigns college name)
	const welcomeStory = startCollege(currentPlayer);
	// Apply new team colors for college
	const collegePalette = generateTeamPalette();
	applyPalette(collegePalette);
	currentPlayer.teamPalette = collegePalette;
	clearStory();
	addStoryHeadline('College Football');
	addStoryText(welcomeStory);

	// Player starts as backup in college (earn your spot again)
	currentPlayer.depthChart = 'backup';
	saveGame(currentPlayer);
	updateHeader(currentPlayer);

	showChoices([
		{ text: 'Start Freshman Season', primary: true, action: startCollegeSeason },
	]);
}

//============================================
function startCollegeSeason(): void {
	if (!currentPlayer) {
		return;
	}

	collegeYear += 1;
	currentPlayer.age += 1;
	currentPlayer.currentSeason += 1;
	currentPlayer.currentWeek = 0;

	// Generate college team (reuse same team name across years)
	if (!collegeTeam) {
		collegeTeam = generateHighSchoolTeam(currentPlayer.teamName);
		// College teams are stronger than high school
		collegeTeam.strength = randomInRange(55, 95);
	} else {
		// New season: reset record, regenerate schedule
		collegeTeam.wins = 0;
		collegeTeam.losses = 0;
		collegeTeam.strength += randomInRange(1, 3);
		collegeTeam.schedule = [];
		// Generate new schedule
		const tempTeam = generateHighSchoolTeam('temp');
		collegeTeam.schedule = tempTeam.schedule;
	}

	clearStory();
	const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
	const yearLabel = yearLabels[collegeYear - 1] || `Year ${collegeYear}`;
	addStoryHeadline(`College ${yearLabel} Season`);
	addStoryText(
		`${currentPlayer.teamName} - ${yearLabel} year. `
		+ `The competition is faster, stronger, and smarter than high school.`
	);

	// Promotion check at start of season
	if (collegeYear >= 2 && currentPlayer.depthChart === 'backup') {
		if (currentPlayer.core.technique >= 50
			&& currentPlayer.core.confidence >= 45) {
			currentPlayer.depthChart = 'starter';
			addStoryText(
				'Coach called your name at the team meeting. '
				+ 'You earned the starting job.'
			);
		} else {
			addStoryText(
				'Still fighting for a starting spot. Keep working.'
			);
		}
	}

	saveGame(currentPlayer);
	updateHeader(currentPlayer);
	updateAllStatBars(currentPlayer);

	showChoices([
		{ text: 'Begin Week 1', primary: true, action: startCollegeWeek },
	]);
}

//============================================
function startCollegeWeek(): void {
	if (!currentPlayer || !collegeTeam) {
		return;
	}

	currentPlayer.currentWeek += 1;
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline(
		`Week ${currentPlayer.currentWeek} of ${COLLEGE_SEASON_WEEKS}`
	);

	// Show opponent
	const schedIdx = currentPlayer.currentWeek - 1;
	if (schedIdx < collegeTeam.schedule.length) {
		const opp = collegeTeam.schedule[schedIdx];
		addStoryText(`This week: vs ${opp.opponentName}`);
	}

	// Weekly focus choice
	addStoryText('What do you want to focus on this week?');
	showWeeklyFocusUI_College();
}

//============================================
function showWeeklyFocusUI_College(): void {
	const focusOptions: { text: string; key: WeeklyFocus }[] = [
		{ text: 'Train', key: 'train' },
		{ text: 'Film Study', key: 'film_study' },
		{ text: 'Recovery', key: 'recovery' },
		{ text: 'Social / NIL', key: 'social' },
		{ text: 'Teamwork', key: 'teamwork' },
	];

	showChoices(focusOptions.map(opt => ({
		text: opt.text,
		primary: false,
		action: () => handleCollegeWeeklyFocus(opt.key),
	})));
}

//============================================
function handleCollegeWeeklyFocus(focus: WeeklyFocus): void {
	if (!currentPlayer) {
		return;
	}

	// Apply focus and get story text
	const focusStory = applyWeeklyFocus(currentPlayer, focus);
	addStoryText(focusStory);
	updateAllStatBars(currentPlayer);
	saveGame(currentPlayer);

	// Check for NIL deal on social focus
	if (focus === 'social' && collegeYear >= 2) {
		const nilDeal = generateNILDeal(currentPlayer);
		if (nilDeal) {
			addStoryText(nilDeal.storyText);
			currentPlayer.career.money += nilDeal.amount;
			saveGame(currentPlayer);
		}
	}

	// Random event (30% chance)
	const eventRoll = randomInRange(1, 100);
	if (eventRoll <= 30 && allEvents.length > 0) {
		const statsRecord: Record<string, number> = {
			athleticism: currentPlayer.core.athleticism,
			technique: currentPlayer.core.technique,
			footballIq: currentPlayer.core.footballIq,
			discipline: currentPlayer.core.discipline,
			health: currentPlayer.core.health,
			confidence: currentPlayer.core.confidence,
		};

		// Filter for college events, fall back to HS events
		let eligible = filterEvents(
			allEvents, 'college',
			currentPlayer.currentWeek,
			currentPlayer.position,
			currentPlayer.storyFlags, statsRecord,
		);
		if (eligible.length === 0) {
			eligible = filterEvents(
				allEvents, 'high_school',
				currentPlayer.currentWeek,
				currentPlayer.position,
				currentPlayer.storyFlags, statsRecord,
			);
		}

		const event = selectEvent(eligible);
		if (event) {
			showCollegeEventCard(event);
			return;
		}
	}

	// No event: proceed to game
	proceedToCollegeGame();
}

//============================================
function showCollegeEventCard(event: GameEvent): void {
	if (!currentPlayer) {
		return;
	}

	const choiceActions = event.choices.map(choice => ({
		text: choice.text,
		action: () => {
			const flavor = applyEventChoice(currentPlayer!, choice);
			ui.hideEventModal();
			addStoryHeadline(event.title);
			addStoryText(flavor);
			updateAllStatBars(currentPlayer!);
			saveGame(currentPlayer!);
			showChoices([
				{ text: 'Game Day', primary: true, action: proceedToCollegeGame },
			]);
		},
	}));

	ui.showEventModal(event.title, event.description, choiceActions);
}

//============================================
function proceedToCollegeGame(): void {
	if (!currentPlayer || !collegeTeam) {
		return;
	}

	const schedIdx = currentPlayer.currentWeek - 1;
	if (schedIdx >= collegeTeam.schedule.length) {
		endCollegeSeason();
		return;
	}

	const opponent = collegeTeam.schedule[schedIdx];

	// College opponents are tougher
	const collegeOpponentStrength = Math.min(
		100, opponent.opponentStrength + randomInRange(10, 20)
	);

	const result = simulateGame(
		currentPlayer, collegeTeam, collegeOpponentStrength
	);

	// Record result
	opponent.played = true;
	opponent.teamScore = result.teamScore;
	opponent.opponentScore = result.opponentScore;

	if (result.result === 'win') {
		collegeTeam.wins += 1;
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(1, 3)
		);
	} else {
		collegeTeam.losses += 1;
		currentPlayer.core.confidence = clampStat(
			currentPlayer.core.confidence + randomInRange(-3, 0)
		);
	}

	// Draft stock updates for juniors/seniors
	if (collegeYear >= 3) {
		const draftStock = calculateDraftStock(currentPlayer);
		currentPlayer.draftStock = draftStock;
	}

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);

	clearStory();
	addStoryHeadline('Game Day');
	addStoryText(result.storyText);

	// Stat line
	const statParts: string[] = [];
	for (const [key, val] of Object.entries(result.playerStatLine)) {
		statParts.push(`${key}: ${val}`);
	}
	addResult(statParts.join(' | '));
	addResult(
		`${collegeTeam.teamName} ${result.teamScore} - `
		+ `${opponent.opponentName} ${result.opponentScore}`
	);

	// Show draft stock for juniors/seniors
	if (collegeYear >= 3) {
		addStoryText(`Draft stock: ${currentPlayer.draftStock}/100`);
	}

	// Check if season is over
	if (currentPlayer.currentWeek >= COLLEGE_SEASON_WEEKS) {
		showChoices([
			{ text: 'Season Summary', primary: true, action: endCollegeSeason },
		]);
	} else {
		showChoices([
			{ text: 'Next Week', primary: true, action: startCollegeWeek },
		]);
	}
}

//============================================
function endCollegeSeason(): void {
	if (!currentPlayer || !collegeTeam) {
		return;
	}

	clearStory();
	const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
	const yearLabel = yearLabels[collegeYear - 1] || `Year ${collegeYear}`;
	addStoryHeadline(`${yearLabel} Season Over`);
	addStoryText(
		`Final record: ${collegeTeam.wins}-${collegeTeam.losses}`
	);

	// Season narrative
	const winPct = collegeTeam.wins
		/ (collegeTeam.wins + collegeTeam.losses);
	if (winPct >= 0.75) {
		addStoryText(
			'An incredible season. Bowl game bound. '
			+ 'The scouts are paying serious attention.'
		);
	} else if (winPct >= 0.5) {
		addStoryText(
			'A solid winning season at the college level.'
		);
	} else {
		addStoryText(
			'A tough season. But you grew as a player.'
		);
	}

	// Starter promotion
	if (currentPlayer.depthChart === 'backup'
		&& currentPlayer.core.technique >= 50) {
		currentPlayer.depthChart = 'starter';
		addStoryText('You earned the starting job for next season.');
	}

	// Record season
	currentPlayer.careerHistory.push({
		phase: 'college',
		year: currentPlayer.seasonYear,
		age: currentPlayer.age,
		team: currentPlayer.teamName,
		position: currentPlayer.position,
		wins: collegeTeam.wins,
		losses: collegeTeam.losses,
		depthChart: currentPlayer.depthChart,
		highlights: [],
		awards: [],
	});

	currentPlayer.seasonYear += 1;
	currentPlayer.currentWeek = 0;
	saveGame(currentPlayer);
	updateHeader(currentPlayer);

	// Show end-of-year options
	const buttons: { text: string; primary: boolean; action: () => void }[] = [];

	// Draft declaration for juniors/seniors
	if (collegeYear >= 3) {
		const declareCheck = checkDeclarationEligibility(
			currentPlayer, collegeYear
		);
		if (declareCheck.canDeclare) {
			buttons.push({
				text: 'Declare for NFL Draft',
				primary: true,
				action: declareForDraft,
			});
		}
	}

	if (collegeYear >= 4) {
		// Senior: must enter draft
		buttons.push({
			text: 'Enter NFL Draft',
			primary: true,
			action: declareForDraft,
		});
	} else {
		buttons.push({
			text: 'Next Season',
			primary: buttons.length === 0,
			action: startCollegeSeason,
		});
	}

	showChoices(buttons);
}

//============================================
function declareForDraft(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'nfl';
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('Declaring for the NFL Draft');

	if (currentPlayer.draftStock >= 80) {
		addStoryText(
			'You are projected as a first-round pick. '
			+ 'The dream is about to become reality.'
		);
	} else if (currentPlayer.draftStock >= 50) {
		addStoryText(
			'You have a shot at the mid rounds. '
			+ 'Not a lock, but your name is on the board.'
		);
	} else {
		addStoryText(
			'You are a long shot, but stranger things have happened. '
			+ 'All it takes is one team to believe in you.'
		);
	}

	showChoices([
		{
			text: 'Draft Day',
			primary: true,
			action: startNFLCareer,
		},
	]);
}

//============================================
function startNFLCareer(): void {
	if (!currentPlayer) {
		return;
	}

	clearStory();
	addStoryHeadline('NFL Draft Day');

	// Simple draft simulation based on draft stock
	const stock = currentPlayer.draftStock;
	let round: number;
	let teamIdx: number;
	let draftStory: string;

	if (stock >= 85) {
		round = 1;
		draftStory = 'Your name is called in the first round. '
			+ 'You walk across the stage, shake hands, and put on the hat. '
			+ 'This is the moment you have worked for your entire life.';
	} else if (stock >= 65) {
		round = randomInRange(2, 3);
		draftStory = `Round ${round}. Your phone rings. `
			+ 'You are going to the league. '
			+ 'Not the first name called, but you made it.';
	} else if (stock >= 40) {
		round = randomInRange(4, 6);
		draftStory = `Day three. Round ${round}. `
			+ 'Most people counted you out, but one team saw something. '
			+ 'You are an NFL player.';
	} else {
		round = 7;
		draftStory = 'The draft ends without your name being called. '
			+ 'But within minutes, your phone rings. '
			+ 'An undrafted free agent deal. You have a shot.';
	}

	// Pick a random NFL team
	const nflTeams = [
		'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens',
		'Buffalo Bills', 'Carolina Panthers', 'Chicago Bears',
		'Cincinnati Bengals', 'Cleveland Browns', 'Dallas Cowboys',
		'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
		'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars',
		'Kansas City Chiefs', 'Las Vegas Raiders', 'Los Angeles Chargers',
		'Los Angeles Rams', 'Miami Dolphins', 'Minnesota Vikings',
		'New England Patriots', 'New Orleans Saints', 'New York Giants',
		'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers',
		'San Francisco 49ers', 'Seattle Seahawks',
		'Tampa Bay Buccaneers', 'Tennessee Titans',
		'Washington Commanders',
	];
	teamIdx = randomInRange(0, nflTeams.length - 1);
	const team = nflTeams[teamIdx];

	currentPlayer.teamName = team;
	// Apply real NFL team colors
	const nflPalette = generateNFLPalette(team);
	applyPalette(nflPalette);
	currentPlayer.teamPalette = nflPalette;
	currentPlayer.bigDecisions.push(
		`Drafted by ${team} in round ${round}`
	);

	addStoryText(draftStory);
	addResult(`Selected by the ${team}`);
	addResult(`Round ${round}`);

	saveGame(currentPlayer);
	updateHeader(currentPlayer);

	// NFL career placeholder until nfl.ts is wired
	showChoices([
		{
			text: 'Begin NFL Career',
			primary: true,
			action: playNFLSeason,
		},
	]);
}

//============================================
// Simple NFL season loop (will be replaced by nfl.ts when available)
let nflYear = 0;

//============================================
function playNFLSeason(): void {
	if (!currentPlayer) {
		return;
	}

	nflYear += 1;
	currentPlayer.age += 1;
	currentPlayer.currentSeason += 1;
	clearStory();
	addStoryHeadline(
		`NFL Season ${nflYear} - ${currentPlayer.teamName}`
	);

	// Simulate NFL season based on stats
	const overall = Math.round(
		(currentPlayer.core.athleticism * 0.25
		+ currentPlayer.core.technique * 0.3
		+ currentPlayer.core.footballIq * 0.2
		+ currentPlayer.core.confidence * 0.15
		+ currentPlayer.core.discipline * 0.1)
	);

	// Age-based decline
	if (currentPlayer.age >= 30) {
		const declineRate = currentPlayer.age >= 33 ? 5 : 3;
		currentPlayer.core.athleticism = clampStat(
			currentPlayer.core.athleticism - randomInRange(2, declineRate)
		);
		currentPlayer.core.health = clampStat(
			currentPlayer.core.health - randomInRange(1, declineRate)
		);
		addStoryText(
			'Your body is not recovering like it used to.'
		);
	} else {
		// Slight growth in prime years
		currentPlayer.core.technique = clampStat(
			currentPlayer.core.technique + randomInRange(0, 2)
		);
		currentPlayer.core.footballIq = clampStat(
			currentPlayer.core.footballIq + randomInRange(1, 3)
		);
	}

	// Season narrative
	const wins = randomInRange(
		Math.max(2, Math.round(overall / 8)),
		Math.min(15, Math.round(overall / 5))
	);
	const losses = 17 - wins;

	if (wins >= 12) {
		addStoryText(
			'A dominant season. You are playing at an elite level. '
			+ 'The team made the playoffs.'
		);
	} else if (wins >= 9) {
		addStoryText(
			'A winning season. You are a key contributor '
			+ 'and the team is competitive.'
		);
	} else if (wins >= 6) {
		addStoryText(
			'A rough season with some bright spots. '
			+ 'You kept fighting even when the team struggled.'
		);
	} else {
		addStoryText(
			'A brutal season. Nothing went right. '
			+ 'But you showed up every week.'
		);
	}

	addResult(`Team record: ${wins}-${losses}`);

	// Contract / money
	const salary = overall * randomInRange(8000, 15000);
	currentPlayer.career.money += salary;
	addStoryText(
		`Season salary: $${salary.toLocaleString()}`
	);

	// NFL midseason event (meaningful decision each season)
	const nflEvents = getNFLSeasonEvent(currentPlayer, nflYear);
	addStoryHeadline(nflEvents.title);
	addStoryText(nflEvents.description);

	saveGame(currentPlayer);
	updateAllStatBars(currentPlayer);
	updateHeader(currentPlayer);

	// Check for retirement
	const shouldRetire = currentPlayer.age >= 36
		|| (currentPlayer.age >= 32
			&& currentPlayer.core.athleticism < 40
			&& currentPlayer.core.health < 40);

	const choiceButtons: { text: string; primary: boolean; action: () => void }[] = [];

	// Show event choices
	for (const choice of nflEvents.choices) {
		choiceButtons.push({
			text: choice.text,
			primary: false,
			action: () => {
				if (!currentPlayer) return;
				for (const [stat, delta] of Object.entries(choice.effects)) {
					const key = stat as keyof CoreStats;
					if (key in currentPlayer.core) {
						currentPlayer.core[key] = clampStat(
							currentPlayer.core[key] + delta
						);
					}
				}
				addStoryText(choice.flavor);
				updateAllStatBars(currentPlayer);
				saveGame(currentPlayer);
			},
		});
	}

	if (shouldRetire) {
		choiceButtons.push({
			text: 'Retire',
			primary: true,
			action: retirePlayer,
		});
	}

	choiceButtons.push({
		text: shouldRetire ? 'One More Season' : 'Next Season',
		primary: !shouldRetire,
		action: playNFLSeason,
	});

	showChoices(choiceButtons);
}

//============================================
interface NFLEvent {
	title: string;
	description: string;
	choices: {
		text: string;
		effects: Record<string, number>;
		flavor: string;
	}[];
}

//============================================
function getNFLSeasonEvent(player: Player, year: number): NFLEvent {
	const events: NFLEvent[] = [
		{
			title: 'Contract Negotiation',
			description: 'Your agent says the team wants to extend your contract. '
				+ 'Do you push for more money or lock in security?',
			choices: [
				{
					text: 'Push for max money',
					effects: { confidence: 3 },
					flavor: 'You bet on yourself. The negotiations drag on but '
						+ 'you land a bigger deal.',
				},
				{
					text: 'Take the security',
					effects: { discipline: 3, confidence: -1 },
					flavor: 'You lock in a long-term deal. '
						+ 'Less flashy, but your future is secure.',
				},
			],
		},
		{
			title: 'Injury Decision',
			description: 'The trainers say you can play through the injury, '
				+ 'but there is a risk of making it worse.',
			choices: [
				{
					text: 'Play through it',
					effects: { confidence: 4, health: -5 },
					flavor: 'You gut it out. The crowd roars, '
						+ 'but your body pays the price.',
				},
				{
					text: 'Sit out and heal',
					effects: { health: 5, confidence: -2 },
					flavor: 'You sit and watch from the sideline. '
						+ 'Hard to watch, but the right call.',
				},
			],
		},
		{
			title: 'Media Spotlight',
			description: 'A reporter asks you a loaded question about '
				+ 'your teammate after a tough loss.',
			choices: [
				{
					text: 'Defend your teammate',
					effects: { discipline: 2, confidence: 1 },
					flavor: 'You have his back publicly. '
						+ 'The locker room respects it.',
				},
				{
					text: 'Keep it real',
					effects: { confidence: 2, discipline: -2 },
					flavor: 'You speak honestly. Some teammates are not happy, '
						+ 'but the media loves it.',
				},
			],
		},
		{
			title: 'Rookie Mentorship',
			description: 'A young player drafted to your position asks '
				+ 'if you will mentor them.',
			choices: [
				{
					text: 'Take them under your wing',
					effects: { discipline: 3, footballIq: 2 },
					flavor: 'Teaching someone else makes you better too. '
						+ 'The kid has real potential.',
				},
				{
					text: 'Focus on your own game',
					effects: { technique: 2, confidence: 1 },
					flavor: 'You stay locked in on your own performance. '
						+ 'Nothing personal, just business.',
				},
			],
		},
		{
			title: 'Trade Rumors',
			description: 'The trade deadline is approaching and your name '
				+ 'keeps coming up in rumors.',
			choices: [
				{
					text: 'Request a trade to a contender',
					effects: { confidence: 3, discipline: -1 },
					flavor: 'You want a ring. The front office grants your wish '
						+ 'and ships you to a playoff team.',
				},
				{
					text: 'Stay loyal to your team',
					effects: { discipline: 3 },
					flavor: 'You stay put. The fans appreciate it, '
						+ 'even if the wins are not there.',
				},
			],
		},
		{
			title: 'Playoff Push',
			description: 'Your team is fighting for a playoff spot in Week 17. '
				+ 'Win and you are in.',
			choices: [
				{
					text: 'Rise to the occasion',
					effects: { confidence: 5, health: -2 },
					flavor: 'You play the game of your life. '
						+ 'The team punches its ticket to the playoffs.',
				},
				{
					text: 'Trust the process',
					effects: { discipline: 2, footballIq: 2 },
					flavor: 'You play within yourself and let the team do its thing. '
						+ 'Calm under pressure.',
				},
			],
		},
	];

	// Pick one based on year to avoid repeats
	const idx = (year - 1) % events.length;
	return events[idx];
}

//============================================
function retirePlayer(): void {
	if (!currentPlayer) {
		return;
	}

	currentPlayer.phase = 'legacy';
	saveGame(currentPlayer);

	clearStory();
	addStoryHeadline('The End of an Era');

	const totalSeasons = currentPlayer.careerHistory.length;
	const totalMoney = currentPlayer.career.money;

	addStoryText(
		`After ${nflYear} NFL seasons, you hang up the cleats.`
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

	if (nflYear >= 10 && avgStats >= 65) {
		addStoryHeadline('Hall of Fame');
		addStoryText(
			'Years from now, you stand at the podium in Canton. '
			+ 'Your name will be remembered forever.'
		);
	} else if (nflYear >= 7 && avgStats >= 55) {
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

	showChoices([
		{
			text: 'Start a New Career',
			primary: true,
			action: () => {
				deleteSave();
				currentPlayer = null;
				nflYear = 0;
				collegeYear = 0;
				hardClearStory();
				startCharacterCreation();
			},
		},
	]);
}

//============================================
function generateSchoolName(): string {
	// Silly minor-league-style high school names
	const prefixes = [
		'Westfield', 'North Valley', 'Lincoln', 'Riverside',
		'Cedar Creek', 'Oakmont', 'Fairview', 'Heritage',
		'Summit', 'Crestwood', 'Lakewood', 'Eastside',
		'Mountainview', 'Bayshore', 'Pinecrest', 'Highland',
		'Pine Bluff', 'Lakeview', 'Milltown', 'Copper Hills',
		'Dry Creek', 'Maple Fork', 'River City', 'Willow Springs',
		'Elkhorn', 'Blue Ridge', 'Fox Hollow', 'Stonebridge',
	];
	const mascots = [
		// Animals
		'Alpacas', 'Bumblebees', 'Cobras', 'Ferrets', 'Foxes',
		'Frogs', 'Gophers', 'Jackrabbits', 'Lemurs', 'Narwhals',
		'Puffins', 'Raccoons', 'Seals', 'Squids', 'Turtles',
		'Wombats', 'Lobsters', 'Platypus', 'Tadpoles', 'Zebras',
		// Food
		'Avocados', 'Beets', 'Hot Peppers', 'Kumquats', 'Spuds',
		// Plants
		'Dandelions', 'Clovers', 'Marigolds', 'Ferns',
		// Rare weird
		'Wyverns',
	];
	const prefix = prefixes[randomInRange(0, prefixes.length - 1)];
	const mascot = mascots[randomInRange(0, mascots.length - 1)];
	return `${prefix} ${mascot}`;
}

//============================================
// Wrapper functions that delegate to ui.ts or local helpers
// (needed because main.ts inline functions still reference these names)
//============================================

function updateStatusBar(record: string, recruiting: string): void {
	ui.updateStatusBar(record, recruiting);
}

function addResult(text: string): void {
	ui.addResult(text);
}

//============================================
// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);
