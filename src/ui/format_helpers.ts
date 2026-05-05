// format_helpers.ts - Formatting utilities for stats and display values
//
// Exports formatStatKey and formatStatLine for converting stat data
// into human-readable display strings.

import type { StatLine } from '../week_sim.js';

//============================================
// Map camelCase stat keys to human-readable display labels
const STAT_LABELS: Record<string, string> = {
	// Passer stats
	passYards: 'Pass Yards',
	passTds: 'TDs',
	passInts: 'INTs',
	completions: 'Completions',
	attempts: 'Attempts',
	completionPct: 'Comp %',
	// Runner stats
	rushYards: 'Rush Yards',
	carries: 'Carries',
	rushTds: 'Rush TDs',
	fumbles: 'Fumbles',
	// Receiver stats
	receptions: 'Receptions',
	recYards: 'Rec Yards',
	recTds: 'Rec TDs',
	targets: 'Targets',
	// Tight end stats
	blockGrade: 'Block Grade',
	// Lineman stats
	grade: 'Grade',
	keyPlays: 'Key Plays',
	pressureRate: 'Pressure Rate',
	// Defender stats
	tackles: 'Tackles',
	sacks: 'Sacks',
	ints: 'INTs',
	// Kicker stats
	fgMade: 'FG Made',
	fgAttempts: 'FG Att',
	fgPercent: 'FG %',
	puntAvg: 'Punt Avg',
	xpMade: 'XP Made',
	xpAttempts: 'XP Att',
};

//============================================
// Format a stat key into a display label
export function formatStatKey(key: string): string {
	return STAT_LABELS[key] || key;
}

//============================================
// Format an entire stat line into a human-readable display string
export function formatStatLine(statLine: StatLine): string {
	const parts: string[] = [];
	for (const [key, val] of Object.entries(statLine)) {
		const label = formatStatKey(key);
		parts.push(`${label}: ${val}`);
	}
	return parts.join(' | ');
}
