// game_view_state.ts - the simulation -> render contract.
//
// `GameViewState` is the only shape the render layer (src/render/, lands in
// M5) is allowed to consume. Simulation code projects a Player into this
// shape; the render layer reads it. There are no setters, no live Player
// references, and no DOM nodes. This is a pure data contract.
//
// This file ships ahead of the render implementation so handler-level code
// in M3 has a stable target to populate, rather than reaching for `ui.*`
// directly.
//
// Add fields here only when an existing render call needs them. Keep the
// shape as flat as practical.

import {
	CareerPhase,
	DepthChartStatus,
	Position,
	PositionBucket,
	SeasonRecord,
	SeasonGoal,
} from '../player/index.js';

//============================================
// Header strip: name, age, phase, team, current calendar position.
export interface HeaderView {
	firstName: string;
	lastName: string;
	age: number;
	phase: CareerPhase;
	teamName: string;
	position: Position | null;
	depthChart: DepthChartStatus;
	currentSeason: number;
	currentWeek: number;
	seasonYear: number;
}

//============================================
// One stat bar entry for the sidebar.
export interface StatBarView {
	key: string;
	label: string;
	value: number;
	max: number;
	tip?: string;
}

//============================================
// Career tab payload.
export interface CareerView {
	gamesPlayed: number;
	history: readonly SeasonRecord[];
	primaryBucket: PositionBucket | null;
}

//============================================
// Story log feed.
export interface StoryView {
	headlines: readonly string[];
	log: readonly string[];
}

//============================================
// Social feed (Fotomagic).
export interface SocialPostView {
	id: string;
	timestamp: number;
	caption: string;
	statSnippet?: string;
	likes: number;
}

export interface SocialView {
	posts: readonly SocialPostView[];
}

//============================================
// Composite payload the render layer pulls from each tick.
export interface GameViewState {
	header: HeaderView;
	statBars: readonly StatBarView[];
	career: CareerView;
	story: StoryView;
	social: SocialView;
	seasonGoal: SeasonGoal;
}
