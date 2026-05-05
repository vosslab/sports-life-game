// save/index.ts - canonical save/load for sports-life-game.
//
// Drop-in replacement for the previous src/save.ts. Behavior:
//   saveGame(player) -> writes { schemaVersion: 1, ...player } to localStorage.
//   loadGame()        -> returns the player iff schemaVersion === 1.
//                        Anything else (missing key, missing/older/newer
//                        schemaVersion, malformed JSON) yields null and
//                        clears the slot so the game starts fresh next time.
//
// No migrators. The pre-v1 inference-by-field-presence pattern is gone.

import { Player } from '../player.js';
import { CURRENT_SCHEMA_VERSION, SAVE_KEY, SaveEnvelope } from './schema.js';
import { validateRawSave } from './validate.js';

//============================================
// Persist player state. The envelope wraps the player payload with the
// current schema version; the player object itself is kept as-is so existing
// callers do not need to learn a new shape.
export function saveGame(player: Player): void {
	const envelope: SaveEnvelope = {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		...player,
	} as unknown as SaveEnvelope;
	localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
}

//============================================
// Load player state. Returns null on empty or invalid storage; logs a
// warning and clears the slot so we never bounce off the same bad save.
export function loadGame(): Player | null {
	const raw: string | null = localStorage.getItem(SAVE_KEY);
	const result = validateRawSave(raw);
	if (result.kind === 'ok') {
		// Strip the schemaVersion before handing the payload back; the live
		// Player object does not carry it.
		const envelope = result.envelope;
		const { schemaVersion: _ignored, ...payload } = envelope as { schemaVersion: number; [k: string]: unknown };
		return payload as unknown as Player;
	}
	if (result.kind === 'reset') {
		console.warn('[save] ' + result.reason + '; resetting save slot.');
		localStorage.removeItem(SAVE_KEY);
	}
	return null;
}

//============================================
export function deleteSave(): void {
	localStorage.removeItem(SAVE_KEY);
}

//============================================
export function hasSave(): boolean {
	return localStorage.getItem(SAVE_KEY) !== null;
}
