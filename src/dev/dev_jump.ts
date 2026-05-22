// dev_jump.ts - Life Jump: skip ahead in the career
//
// Life Jump: skip ahead to a chosen phase and age. Constructs a synthetic Player
// with phase-appropriate defaults. Reachable via the bottom-right Life Jump button
// or `?life=<phase>&age=<n>&team=<id>` URL parameter. The synthetic player is
// created in-memory only; it is not persisted to localStorage unless manually saved.

import type { Player } from '../player.js';
import type { PluginHost } from '../plugins/plugin_host.js';
import { createPlayer } from '../player.js';
import { randomAvatarConfig } from '../avatar.js';

// Default NFL team for Life Jump when no team specified.
// 'NO' = New Orleans Saints, used as a stable neutral default.
export const DEFAULT_NFL_TEAM_ID = 'NO';

//============================================
// DevJumpParams: URL query and hotkey picker input

export interface DevJumpParams {
	phase: 'childhood' | 'high_school' | 'college' | 'nfl' | 'legacy';
	age: number;
	team?: string; // optional NFL team ID
}

//============================================
// parseDevJumpParams: extract ?life=<phase>&age=<n>&team=<id> from URL
//
// Accepts both `?life=` (preferred) and `?dev=` (back-compat) for the phase.
// Example: ?life=nfl&age=24&team=KC
// Returns null if phase param is absent or malformed.

export function parseDevJumpParams(searchString: string): DevJumpParams | null {
	const params = new URLSearchParams(searchString);
	const phasStr = params.get('life') ?? params.get('dev');

	if (!phasStr) return null;

	const phaseValue = phasStr.toLowerCase();
	const validPhases = ['childhood', 'high_school', 'college', 'nfl', 'legacy'];
	if (!validPhases.includes(phaseValue)) return null;

	const ageStr = params.get('age');
	if (!ageStr) return null;

	const age = parseInt(ageStr, 10);
	if (isNaN(age) || age < 0) return null;

	const team = params.get('team');

	const result: DevJumpParams = {
		phase: phaseValue as DevJumpParams['phase'],
		age,
	};
	if (team) {
		result.team = team;
	}
	return result;
}

//============================================
// applyDevJump: construct and return a synthetic Player
//
// Construct synthetic Player for given phase + age. Reuses createPlayer baseline
// then overrides phase, age, and phase-appropriate stats and identity. Returns
// Player ready for the year handler to enter.

export function applyDevJump(_host: PluginHost, params: DevJumpParams): Player {
	// Create a baseline player (starts at age 0, childhood phase)
	const player = createPlayer('Dev', 'Jumper');

	// Override phase and age
	player.phase = params.phase;
	player.age = params.age;

	// Update season year to match age context
	const BASE_YEAR = 2010;
	player.seasonYear = BASE_YEAR + params.age;

	// Phase-specific defaults
	switch (params.phase) {
		case 'childhood':
			// Childhood defaults: age, no position, no team yet
			player.position = null;
			player.positionBucket = null;
			player.teamName = '';
			break;

		case 'high_school':
			// High school: select a position, generate school identity
			player.position = 'QB';
			player.positionBucket = 'passer';
			player.teamName = 'Central High';
			player.hsName = 'Central High';
			player.hsMascot = 'Wildcats';
			player.depthChart = 'bench';
			player.core.athleticism = Math.min(100, player.core.athleticism + 20);
			player.core.technique = Math.min(100, player.core.technique + 15);
			break;

		case 'college':
			// College: set college year, position, team, GPA
			player.position = 'QB';
			player.positionBucket = 'passer';
			player.teamName = 'State University';
			player.collegeYear = Math.max(1, Math.min(4, params.age - 18));
			player.gpa = 3.0;
			player.eligibilityYears = 4;
			player.depthChart = 'backup';
			player.core.athleticism = Math.min(100, player.core.athleticism + 30);
			player.core.technique = Math.min(100, player.core.technique + 40);
			player.core.footballIq = Math.min(100, player.core.footballIq + 25);
			break;

		case 'nfl':
			// NFL: default team, stat boosts, populated career history
			player.position = 'QB';
			player.positionBucket = 'passer';
			player.nflYear = Math.max(1, params.age - 22);
			player.nflTeamId = params.team || DEFAULT_NFL_TEAM_ID;
			player.teamName = player.nflTeamId;
			player.depthChart = 'starter';
			player.core.athleticism = Math.min(100, player.core.athleticism + 40);
			player.core.technique = Math.min(100, player.core.technique + 35);
			player.core.footballIq = Math.min(100, player.core.footballIq + 30);
			player.core.confidence = Math.min(100, player.core.confidence + 25);
			for (let yr = 1; yr <= player.nflYear; yr++) {
				player.careerHistory.push({
					phase: 'nfl',
					year: yr,
					age: 22 + yr - 1,
					team: player.nflTeamId,
					position: 'QB',
					wins: 8,
					losses: 8,
					ties: 0,
					depthChart: 'starter',
					highlights: [],
					awards: [],
				});
			}
			break;

		case 'legacy':
			// Legacy: retired player with full career history and stat decay
			player.nflYear = Math.max(1, params.age - 22);
			player.position = 'QB';
			player.positionBucket = 'passer';
			player.depthChart = 'bench';
			player.nflTeamId = params.team || DEFAULT_NFL_TEAM_ID;
			player.teamName = player.nflTeamId;
			player.core.athleticism = Math.max(0, player.core.athleticism - 30);
			player.core.health = Math.max(0, player.core.health - 20);
			for (let yr = 1; yr <= player.nflYear; yr++) {
				player.careerHistory.push({
					phase: 'nfl',
					year: yr,
					age: 22 + yr - 1,
					team: player.nflTeamId,
					position: 'QB',
					wins: 10,
					losses: 6,
					ties: 0,
					depthChart: 'starter',
					highlights: [],
					awards: [],
				});
			}
			break;
	}

	// Regenerate avatar for the new phase and age
	player.avatarConfig = randomAvatarConfig(`${player.firstName} ${player.lastName}`, {
		archetype: 'player',
		age: params.age,
	});

	return player;
}
