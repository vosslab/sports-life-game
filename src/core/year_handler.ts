// year_handler.ts - core interfaces for the year-handler registry
//
// These interfaces are frozen after M1. Do not change them during M2-M7.

import { Player, CareerPhase } from '../player.js';
import { GameEvent } from '../events.js';
import { NCAASchool } from '../ncaa.js';
import { ChoiceOption } from '../ui.js';

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
