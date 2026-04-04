// save.ts - localStorage save/load for game state

import { Player } from './player.js';

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
