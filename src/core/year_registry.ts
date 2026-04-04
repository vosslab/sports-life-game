// year_registry.ts - age-to-handler mapping
//
// Central registry that maps player age to the correct YearHandler.
// Handlers are registered at app boot. Registry is frozen after init.

import { YearHandler } from './year_handler.js';

//============================================
// All registered handlers, ordered by ageStart
const handlers: YearHandler[] = [];

//============================================
// Register a handler. Called at app boot for each age band.
export function registerHandler(handler: YearHandler): void {
	// Validate no overlap with existing handlers
	for (const existing of handlers) {
		const overlaps = handler.ageStart <= existing.ageEnd
			&& handler.ageEnd >= existing.ageStart;
		if (overlaps) {
			throw new Error(
				`Handler "${handler.id}" (${handler.ageStart}-${handler.ageEnd}) `
				+ `overlaps with "${existing.id}" (${existing.ageStart}-${existing.ageEnd})`
			);
		}
	}
	handlers.push(handler);
	// Keep sorted by ageStart for predictable lookup
	handlers.sort((a, b) => a.ageStart - b.ageStart);
}

//============================================
// Look up the handler for a given age
export function getHandler(age: number): YearHandler {
	for (const handler of handlers) {
		if (age >= handler.ageStart && age <= handler.ageEnd) {
			return handler;
		}
	}
	throw new Error(`No handler registered for age ${age}`);
}

//============================================
// Check if a handler exists for a given age (no throw)
export function hasHandler(age: number): boolean {
	for (const handler of handlers) {
		if (age >= handler.ageStart && age <= handler.ageEnd) {
			return true;
		}
	}
	return false;
}

//============================================
// Get all registered handlers (for debugging/testing)
export function getAllHandlers(): readonly YearHandler[] {
	return handlers;
}

//============================================
// Clear all handlers (for testing only)
export function clearHandlers(): void {
	handlers.length = 0;
}
