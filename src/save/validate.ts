// validate.ts - inbound save validation.
//
// Returns one of three outcomes for any candidate JSON string from
// localStorage:
//   - { kind: 'ok', envelope }     -> ready to use
//   - { kind: 'reset', reason }    -> caller starts a fresh game
//   - { kind: 'empty' }            -> no save in storage
//
// No migrators. Anything that does not match CURRENT_SCHEMA_VERSION is
// rejected and the caller falls back to a fresh default state.

import { CURRENT_SCHEMA_VERSION, SaveEnvelope } from './schema.js';

//============================================
export type ValidationResult =
	| { kind: 'ok'; envelope: SaveEnvelope }
	| { kind: 'reset'; reason: string }
	| { kind: 'empty' };

//============================================
// Validate a raw JSON string from localStorage. The caller decides what to do
// with each outcome (ok -> hydrate, reset -> warn user, empty -> show menu).
export function validateRawSave(raw: string | null): ValidationResult {
	if (raw === null || raw === '') {
		return { kind: 'empty' };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (_err) {
		return { kind: 'reset', reason: 'save was not valid JSON' };
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		return { kind: 'reset', reason: 'save was not a JSON object' };
	}
	const envelope: { schemaVersion?: unknown } = parsed as { schemaVersion?: unknown };
	if (envelope.schemaVersion === undefined) {
		return {
			kind: 'reset',
			reason: 'pre-v1 save: schemaVersion field missing (resetting)',
		};
	}
	if (envelope.schemaVersion !== CURRENT_SCHEMA_VERSION) {
		const reason: string =
			'unsupported schemaVersion ' +
			String(envelope.schemaVersion) +
			' (expected ' +
			String(CURRENT_SCHEMA_VERSION) +
			')';
		return { kind: 'reset', reason };
	}
	return { kind: 'ok', envelope: parsed as SaveEnvelope };
}
