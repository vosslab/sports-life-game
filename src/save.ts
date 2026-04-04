// save.ts - localStorage save/load for game state

import { Player, createEmptySeasonStats } from './player.js';

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
