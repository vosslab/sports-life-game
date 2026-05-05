// year_handler.ts - core interfaces for the year-handler registry
//
// These interfaces are frozen after M1. Do not change them during M2-M7.

import { Player, CareerPhase } from '../player.js';
import { GameEvent } from '../events.js';
import { NCAASchool } from '../ncaa.js';
import { ChoiceOption } from './choice_option.js';
import type { Activity, WeekState } from '../activities.js';
import type { GoalInfo } from '../week_sim.js';
import type { SeasonGoal } from '../player.js';
import type { StatLine } from '../week_sim.js';

//============================================
// Re-export ChoiceOption for legacy importers (main.ts, popup.ts).
export type { ChoiceOption } from './choice_option.js';

//============================================
// Action bar config used by the weekly engine and main.ts.
export interface MainButtonConfig {
	nextLabel: string;
	nextAction: () => void;
	// True to show the Age Up shortcut alongside Next Week.
	ageUpVisible: boolean;
	ageUpAction?: () => void;
}

//============================================
// Activities tab payload provided by simulation, rendered by UI.
export interface ActivitiesRender {
	activities: readonly Activity[];
	weekState: WeekState;
	isUnlocked: (activity: Activity) => boolean;
	effectPreview: (activity: Activity) => string;
	onSelect: (activity: Activity) => void;
	goalInfo?: {
		goals: GoalInfo[];
		currentGoal: SeasonGoal;
		onGoalChange: (goal: SeasonGoal) => void;
	};
}

//============================================
// Weekly engine return type: impossible to misuse
// Every call to runSeasonWeek() must return one of these.
// Handlers do NOT decide whether a week advanced.
export type WeekAdvanceResult =
	| { kind: 'next_week'; nextWeek: number }
	| { kind: 'season_ended' };

//============================================
// Season configuration returned by handlers
// Tells the weekly engine how to run this year's season.
export interface SeasonConfig {
	seasonLength: number;       // total weeks in the season (0 = no football)
	hasFootball: boolean;       // whether this age band plays football
	hasDepthChart: boolean;     // whether depth chart is tracked
	hasPlayoffs: boolean;       // whether playoffs exist
	eventChance: number;        // percentage chance of random event per week (0-100)
	opponentStrengthBase: number; // base opponent strength for this level
	opponentStrengthRange: number; // random range added to base
}

//============================================
// Year handler: one per age band
// Handlers are thin. They set up the year, call shared helpers, and trigger transitions.
export interface YearHandler {
	id: string;
	ageStart: number;
	ageEnd: number;
	// Called when the player enters this age
	startYear(player: Player, ctx: CareerContext): void;
	// Returns season config if this age band has football
	getSeasonConfig?(player: Player): SeasonConfig;
	// Called at end of season or end of year (for non-football years)
	endYear?(player: Player, ctx: CareerContext): void;
}

//============================================
// Career context: story-oriented output only
// Handlers must NOT directly manipulate tabs or low-level DOM.
export interface CareerContext {
	// Event pool
	events: GameEvent[];
	// NCAA school data (for college offers)
	ncaaSchools: { fbs: NCAASchool[]; fcs: NCAASchool[] };
	// Story output (BitLife-style log)
	clearStory(): void;
	addHeadline(text: string): void;
	addText(text: string): void;
	addResult(text: string): void;
	// Choice presentation (renders buttons on Life tab)
	showChoices(options: ChoiceOption[]): void;
	// Choice/event popup modal with title and description
	// style: 'decision' (default, centered bold) or 'narrative' (gold title, left-aligned)
	waitForInteraction(title: string, options: ChoiceOption[], description?: string, style?: string): void;
	// Persistence
	save(): void;
	// Stats display refresh
	updateStats(player: Player): void;
	// Header refresh
	updateHeader(player: Player): void;
	// Italic stat-change line appended to the story log
	addStatChange(text: string): void;
	// Compact game-day status line on the Life tab
	updateLifeStatus(record: string, nextOpponent: string, extraStatus?: string): void;
	// Format a simulator stat line (like "Pass Yards: 250 | TDs: 2") for the log
	formatStatLine(statLine: StatLine): string;
	// Re-render the Activities tab with the simulation's current state
	renderActivitiesTab(payload: ActivitiesRender): void;
	// Toggle the bottom action bar
	hideMainActionBar(): void;
	showMainActionBar(): void;
	// Configure the action-bar buttons for the current week
	configureMainButtons(config: MainButtonConfig): void;
	// UI tab routing (replaces direct tabs.js imports in simulation)
	switchToLifeTab(): void;
	hideTabBar(): void;
	showTabBar(): void;
	syncTabsToPhase(phase: Player['phase']): void;
}


//============================================
// Transition result: what happens after a year ends
export type TransitionResult =
	| { kind: 'next_year' }
	| { kind: 'college_choice' }
	| { kind: 'nfl_draft' }
	| { kind: 'retirement' };

//============================================
// Milestone event that fires at a specific age
export interface MilestoneEvent {
	age: number;
	id: string;
	title: string;
	description: string;
	// Effect applied automatically (no choice needed)
	autoEffect?: (player: Player) => void;
	// Or present choices
	choices?: {
		text: string;
		effect: (player: Player) => void;
		flavor: string;
	}[];
}
