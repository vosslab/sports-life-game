// save.ts - localStorage save/load for game state

import { Player, createEmptySeasonStats } from './player.js';
import { randomAvatarConfig } from './avatar.js';

const SAVE_KEY = 'gridiron_life_save';

//============================================
// Save player state to localStorage
export function saveGame(player: Player): void {
	const json = JSON.stringify(player);
	localStorage.setItem(SAVE_KEY, json);
}

//============================================
// Load player state from localStorage, returns null if no save exists
export function loadGame(): Player | null {
	const json = localStorage.getItem(SAVE_KEY);
	if (!json) {
		return null;
	}
	// Parse the saved JSON and supply defaults for missing fields
	const player = JSON.parse(json) as Player;
	// Migration: supply defaults for fields added after initial release
	if (player.collegeYear === undefined) {
		player.collegeYear = 0;
	}
	if (player.nflYear === undefined) {
		player.nflYear = 0;
	}
	if (player.gpa === undefined) {
		player.gpa = 2.5;
	}
	if (player.relationships === undefined) {
		player.relationships = {};
	}
	if (player.teamPalette === undefined) {
		player.teamPalette = null;
	}
	// Migration: persistent team identity fields
	if (player.townName === undefined) {
		player.townName = '';
	}
	if (player.townMascot === undefined) {
		player.townMascot = '';
	}
	if (player.hsName === undefined) {
		player.hsName = '';
	}
	if (player.hsMascot === undefined) {
		player.hsMascot = '';
	}
	// Migration: NFL identity fields
	if (player.nflTeamId === undefined) {
		player.nflTeamId = '';
	}
	if (player.nflConference === undefined) {
		player.nflConference = '';
	}
	if (player.nflDivision === undefined) {
		player.nflDivision = '';
	}
	// Migration: college status fields
	if (player.isRedshirt === undefined) {
		player.isRedshirt = false;
	}
	if (player.eligibilityYears === undefined) {
		player.eligibilityYears = 4;
	}
	// Migration: portrait config
	if (player.avatarConfig === undefined) {
		player.avatarConfig = randomAvatarConfig(
			`${player.firstName} ${player.lastName}`,
			{ archetype: 'player', age: player.age },
		);
	}
	// Migration: array fields (must default to empty arrays)
	if (player.storyLog === undefined) {
		player.storyLog = [];
	}
	if (player.careerHistory === undefined) {
		player.careerHistory = [];
	}
	if (player.bigDecisions === undefined) {
		player.bigDecisions = [];
	}
	if (player.collegeOffers === undefined) {
		player.collegeOffers = [];
	}
	// Migration: story and milestone tracking
	if (player.storyFlags === undefined) {
		player.storyFlags = {};
	}
	if (player.milestones === undefined) {
		player.milestones = {};
	}
	// Migration: numeric/boolean fields
	if (player.teamStrength === undefined) {
		player.teamStrength = 50;
	}
	if (player.positionBucket === undefined) {
		player.positionBucket = null;
	}
	if (player.recruitingStars === undefined) {
		player.recruitingStars = 0;
	}
	if (player.draftStock === undefined) {
		player.draftStock = 0;
	}
	if (player.useRealTeamNames === undefined) {
		player.useRealTeamNames = true;
	}
	// Migration: patch careerHistory entries for fields added later
	for (const entry of player.careerHistory) {
		if (entry.ties === undefined) {
			entry.ties = 0;
		}
		if (entry.highlights === undefined) {
			entry.highlights = [];
		}
		if (entry.awards === undefined) {
			entry.awards = [];
		}
	}
	if (player.seasonStats === undefined) {
		player.seasonStats = createEmptySeasonStats();
	} else {
		// Migrate individual fields added after initial seasonStats release
		const defaults = createEmptySeasonStats();
		const stats = player.seasonStats as unknown as Record<string, number>;
		const defs = defaults as unknown as Record<string, number>;
		for (const key of Object.keys(defs)) {
			if (stats[key] === undefined) {
				stats[key] = defs[key];
			}
		}
	}
	return player;
}

//============================================
// Delete saved game
export function deleteSave(): void {
	localStorage.removeItem(SAVE_KEY);
}

//============================================
// Check if a save exists
export function hasSave(): boolean {
	return localStorage.getItem(SAVE_KEY) !== null;
}
