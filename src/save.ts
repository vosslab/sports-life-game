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
	// Parse the saved JSON back into a Player object
	const player = JSON.parse(json) as Player;
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
