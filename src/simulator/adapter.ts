//============================================
// Simulator Adapter
//
// Bridges the new play-by-play simulator to the existing game.
// week_sim.ts calls this instead of the old formula-based simulateGame().
//
// Three contracts:
// 1. Input: builds GameTeamContext from Player + Team + opponentStrength
// 2. Output: SimulatorGameResult from the engine
// 3. Story: converts to GameResult (existing shape) via story_summary
//============================================

import {
	Player,
	PerformanceRating,
	PositionBucket,
	clampStat,
} from "../player.js";
import { Team } from "../team.js";
import { simulateGame, SimulatorGameResult } from "./engine/game_engine.js";
import {
	GameTeamContext,
	TeamProfile,
	createDefaultTeamProfile,
} from "./models/team_strength_model.js";
import { NFL_RULES, NFL_TUNING } from "./rules/nfl_rules.js";
import { FCS_RULES, FCS_TUNING } from "./rules/fcs_rules.js";
import {
	IHSA_FROSH_SOPH_RULES, IHSA_FROSH_SOPH_TUNING,
	IHSA_VARSITY_RULES, IHSA_VARSITY_TUNING,
} from "./rules/ihsa_rules.js";
import { LeagueRules } from "./rules/league_rules.js";
import { LeagueTuning } from "./rules/league_tuning.js";
import { getSnapShare } from "./output/stat_line.js";
import { buildStorySummary, generateStoryText } from "./output/story_summary.js";

// Re-export the StatLine type for compatibility
export type StatLine = Record<string, number | string>;

//============================================
// The GameResult interface that the rest of the game expects
export interface GameResult {
	playerRating: PerformanceRating;
	playerGrade: string;
	playerStatLine: StatLine;
	teamScore: number;
	opponentScore: number;
	result: 'win' | 'loss';
	storyText: string;
}

//============================================
// Main entry point: replaces old simulateGame in week_sim.ts
//============================================

export function simulateWeeklyGame(
	player: Player,
	team: Team,
	opponentStrength: number,
	playoffIntensity: boolean = false,
): GameResult {
	// Build league rules for current phase and age
	const rules = getLeagueRulesForPhase(player.phase, player.age);
	const tuning = getLeagueTuningForPhase(player.phase, player.age);

	// Build team contexts
	const homeContext = buildPlayerTeamContext(player, team);
	const awayContext = buildOpponentContext(opponentStrength, playoffIntensity);

	// Run the simulator
	const simResult = simulateGame(homeContext, awayContext, rules, tuning);

	// Convert to the existing GameResult shape
	const gameResult = convertToGameResult(simResult, player, homeContext);

	return gameResult;
}

//============================================
// Build GameTeamContext for the player's team
//============================================

function buildPlayerTeamContext(player: Player, team: Team): GameTeamContext {
	// Start with base profile from team strength
	const profile = createDefaultTeamProfile(team.teamName, team.strength);

	// Apply player stat boosts based on position (only if starter or backup)
	if (player.depthChart === 'starter' || player.depthChart === 'backup') {
		const scale = player.depthChart === 'starter' ? 1.0 : 0.4;
		applyPlayerBoosts(profile, player, scale);
	}

	// Compute momentum from recent record
	const totalGames = team.wins + team.losses;
	let momentum = 0;
	if (totalGames > 0) {
		// Simple momentum: win% mapped to -1 to 1
		momentum = ((team.wins / totalGames) - 0.5) * 2;
	}

	return {
		profile,
		momentum,
		fatigue: 0,
		injuryAdjustment: -(100 - player.core.health) * 0.005,
		weatherAdjustment: 0,
	};
}

//============================================
// Apply player stat boosts to team profile
//============================================

function applyPlayerBoosts(profile: TeamProfile, player: Player, scale: number): void {
	const core = player.core;

	switch (player.positionBucket) {
		case 'passer':
			// QB boosts pass offense and consistency
			profile.passOffense += (core.technique - 50) * 0.02 * scale;
			profile.passOffense += (core.footballIq - 50) * 0.02 * scale;
			profile.consistency += (core.confidence - 50) * 0.01 * scale;
			break;
		case 'runner_receiver':
			// RB/WR/TE boosts both run and pass offense plus explosiveness
			profile.runOffense += (core.athleticism - 50) * 0.015 * scale;
			profile.passOffense += (core.athleticism - 50) * 0.01 * scale;
			profile.explosiveness += (core.athleticism - 50) * 0.02 * scale;
			break;
		case 'lineman':
			// OL/DL boosts run offense and discipline
			profile.runOffense += (core.technique - 50) * 0.015 * scale;
			profile.discipline += (core.discipline - 50) * 0.01 * scale;
			break;
		case 'defender':
			// LB/DB boosts defense
			profile.runDefense += (core.athleticism - 50) * 0.015 * scale;
			profile.passDefense += (core.footballIq - 50) * 0.015 * scale;
			break;
		case 'kicker':
			// Kicker boosts special teams
			profile.specialTeams += (core.technique - 50) * 0.03 * scale;
			break;
	}
}

//============================================
// Build GameTeamContext for opponent
//============================================

function buildOpponentContext(
	opponentStrength: number,
	playoffIntensity: boolean,
): GameTeamContext {
	// Playoff opponents get a boost
	const effectiveStrength = playoffIntensity
		? Math.min(100, opponentStrength + Math.floor(Math.random() * 8) + 5)
		: opponentStrength;

	const profile = createDefaultTeamProfile("Opponent", effectiveStrength);

	return {
		profile,
		momentum: 0,
		fatigue: 0,
		injuryAdjustment: 0,
		weatherAdjustment: 0,
	};
}

//============================================
// Get league rules for current career phase
//============================================

function getLeagueRulesForPhase(phase: string, age?: number): LeagueRules {
	// Phase comes from Player.phase:
	// 'childhood' | 'high_school' | 'college' | 'nfl' | 'legacy'
	if (phase === 'high_school') {
		// Ages 14-15: frosh/soph, ages 16-17: varsity
		if (age !== undefined && age <= 15) {
			return IHSA_FROSH_SOPH_RULES;
		}
		return IHSA_VARSITY_RULES;
	}
	if (phase === 'college') {
		return FCS_RULES;
	}
	// NFL and fallback
	return NFL_RULES;
}

function getLeagueTuningForPhase(phase: string, age?: number): LeagueTuning {
	if (phase === 'high_school') {
		if (age !== undefined && age <= 15) {
			return IHSA_FROSH_SOPH_TUNING;
		}
		return IHSA_VARSITY_TUNING;
	}
	if (phase === 'college') {
		return FCS_TUNING;
	}
	return NFL_TUNING;
}

//============================================
// Convert SimulatorGameResult to the existing GameResult shape
//============================================

function convertToGameResult(
	sim: SimulatorGameResult,
	player: Player,
	homeContext: GameTeamContext,
): GameResult {
	// Determine win/loss from player's perspective (player is always home)
	const teamScore = sim.homeScore;
	const opponentScore = sim.awayScore;
	const result: 'win' | 'loss' = teamScore > opponentScore ? 'win' : 'loss';

	// Extract player stat line from the simulation
	// Build a rough box score from the play log for stat extraction
	const bucket = player.positionBucket ?? 'runner_receiver';
	const snapShare = getSnapShare(bucket, player.depthChart);
	const playerStatLine = extractPlayerStatsFromSim(sim, player, bucket, snapShare);

	// Calculate performance rating from stat quality
	const performanceScore = estimatePerformanceScore(playerStatLine, bucket);
	const playerRating = calculatePerformanceRating(performanceScore);
	const playerGrade = calculateLetterGrade(performanceScore);

	// Build story summary and generate text
	const story = buildStorySummary(
		sim.homeScore, sim.awayScore, true,
		playerStatLine, bucket, sim.playLog,
	);
	const storyText = generateStoryText(story, player.teamName);

	return {
		playerRating,
		playerGrade,
		playerStatLine,
		teamScore,
		opponentScore,
		result,
		storyText,
	};
}

//============================================
// Extract player stats from simulation result
// Uses the team's play count and player's snap share
//============================================

function extractPlayerStatsFromSim(
	sim: SimulatorGameResult,
	player: Player,
	positionBucket: string,
	snapShare: number,
): StatLine {
	// Count play types from the play log
	let passPlays = 0;
	let completions = 0;
	let passYards = 0;
	let passTds = 0;
	let passInts = 0;
	let rushPlays = 0;
	let rushYards = 0;
	let rushTds = 0;
	let sacks = 0;
	let fumbles = 0;
	let fgAttempts = 0;
	let fgMade = 0;
	let xpAttempts = 0;
	let xpMade = 0;

	// Parse play log entries for the player's team
	for (const entry of sim.playLog) {
		// Play log entries start with team abbreviation
		if (!entry.includes(sim.homeTeam)) {
			continue;
		}

		if (entry.includes("Pass complete")) {
			passPlays++;
			completions++;
			const yardsMatch = entry.match(/for (\d+) yards/);
			if (yardsMatch) {
				passYards += parseInt(yardsMatch[1], 10);
			}
			if (entry.includes("TOUCHDOWN")) {
				passTds++;
			}
		} else if (entry.includes("Pass incomplete")) {
			passPlays++;
		} else if (entry.includes("INTERCEPTED")) {
			passPlays++;
			passInts++;
		} else if (entry.includes("Sacked")) {
			passPlays++;
			sacks++;
			if (entry.includes("FUMBLE")) {
				fumbles++;
			}
		} else if (entry.includes("Rush for")) {
			rushPlays++;
			const yardsMatch = entry.match(/for (-?\d+) yards/);
			if (yardsMatch) {
				rushYards += parseInt(yardsMatch[1], 10);
			}
			if (entry.includes("TOUCHDOWN")) {
				rushTds++;
			}
			if (entry.includes("FUMBLE")) {
				fumbles++;
			}
		} else if (entry.includes("field goal is GOOD")) {
			fgAttempts++;
			fgMade++;
		} else if (entry.includes("field goal is NO GOOD")) {
			fgAttempts++;
		} else if (entry.includes("Extra point is GOOD")) {
			xpAttempts++;
			xpMade++;
		} else if (entry.includes("Extra point is NO GOOD")) {
			xpAttempts++;
		}
	}

	// Scale stats by snap share for the player's position
	const stat: StatLine = {};

	switch (positionBucket) {
		case 'passer': {
			const share = snapShare;
			stat.passYards = Math.round(passYards * share);
			stat.passTds = Math.round(passTds * share);
			stat.passInts = Math.round(passInts * share);
			stat.completions = Math.round(completions * share);
			stat.attempts = Math.round(passPlays * share);
			const pct = stat.attempts > 0 ? Math.round((stat.completions as number) / (stat.attempts as number) * 100) : 0;
			stat.completionPct = `${pct}%`;
			break;
		}
		case 'runner_receiver': {
			const share = snapShare;
			// RB/WR/TE: split between rush and receiving based on position
			// Use player.position to decide emphasis
			const pos = player.position ?? '';
			const isRb = pos === 'RB';
			if (isRb) {
				stat.rushYards = Math.round(rushYards * share);
				stat.carries = Math.round(rushPlays * share);
				stat.rushTds = Math.round(rushTds * share);
				stat.fumbles = Math.round(fumbles * share);
			} else {
				// WR/TE: receiving stats
				// A starter WR gets ~30% of team pass targets
				// Snap share scales that proportionally (backup gets fewer)
				const receiverShare = 0.30 * share;
				stat.targets = Math.max(1, Math.round(passPlays * receiverShare));
				stat.receptions = Math.max(0, Math.round(completions * receiverShare));
				stat.recYards = Math.round(passYards * receiverShare);
				stat.recTds = Math.round(passTds * receiverShare);
			}
			break;
		}
		case 'lineman': {
			// Linemen get grades based on team performance
			// Grade based on sacks allowed: NFL average is ~3-4 per game
			// Center C at 3-4 sacks (average performance)
			const totalSacks = sacks;
			const grade = totalSacks <= 1 ? 'A'
				: totalSacks <= 2 ? 'B'
				: totalSacks <= 4 ? 'C'
				: totalSacks <= 6 ? 'D' : 'F';
			stat.grade = grade;
			stat.keyPlays = Math.floor(Math.random() * 6) + 2;
			break;
		}
		case 'defender': {
			const share = snapShare;
			// Defenders generate stats from opponent plays
			const oppPlays = sim.awayPlays;
			stat.tackles = Math.round((oppPlays * 0.15) * share);
			stat.sacks = Math.round(sacks * share * 0.3);
			stat.ints = Math.round(passInts * share * 0.4);
			break;
		}
		case 'kicker': {
			stat.fgMade = fgMade;
			stat.fgAttempts = fgAttempts;
			stat.xpMade = xpMade;
			stat.xpAttempts = xpAttempts;
			break;
		}
	}

	return stat;
}

//============================================
// Estimate a 0-100 performance score from stat line
// Used to generate playerRating and playerGrade
//============================================

function estimatePerformanceScore(stat: StatLine, positionBucket: string): number {
	const num = (key: string): number => {
		const v = stat[key];
		return typeof v === 'number' ? v : 0;
	};

	let score = 50; // baseline average

	switch (positionBucket) {
		case 'passer':
			// QB: yards, TDs, and INT ratio drive rating
			score = 40 + (num('passYards') / 350) * 30 + num('passTds') * 8 - num('passInts') * 12;
			break;
		case 'runner_receiver':
			// RB/WR/TE: check which stats are present to score appropriately
			if (num('rushYards') > 0 || num('carries') > 0) {
				// RB scoring
				score = 40 + (num('rushYards') / 120) * 25 + num('rushTds') * 10 - num('fumbles') * 15;
			} else {
				// WR/TE scoring
				score = 40 + (num('recYards') / 100) * 20 + num('receptions') * 3 + num('recTds') * 10;
			}
			break;
		case 'lineman': {
			const gradeMap: Record<string, number> = { 'A': 90, 'B': 78, 'C': 63, 'D': 48, 'F': 20 };
			score = gradeMap[stat.grade as string] ?? 50;
			break;
		}
		case 'defender':
			score = 40 + num('tackles') * 3 + num('sacks') * 10 + num('ints') * 15;
			break;
		case 'kicker': {
			// Kicker score: FG accuracy + XP reliability
			// Average game: 1-2 FGs, 3-4 XPs → should be C (~60)
			let kickScore = 45;
			if (num('fgAttempts') > 0) {
				kickScore += (num('fgMade') / num('fgAttempts')) * 20;
				kickScore += num('fgMade') * 5;
			}
			if (num('xpAttempts') > 0) {
				kickScore += (num('xpMade') / num('xpAttempts')) * 10;
			}
			score = kickScore;
			break;
		}
			break;
	}

	return clampStat(Math.round(score));
}

//============================================
// Performance rating thresholds (matches existing week_sim.ts)
//============================================

function calculatePerformanceRating(score: number): PerformanceRating {
	if (score >= 86) {
		return 'elite';
	}
	if (score >= 71) {
		return 'great';
	}
	if (score >= 56) {
		return 'good';
	}
	if (score >= 41) {
		return 'average';
	}
	if (score >= 21) {
		return 'below_average';
	}
	return 'poor';
}

//============================================

function calculateLetterGrade(score: number): string {
	if (score >= 86) {
		return 'A';
	}
	if (score >= 71) {
		return 'B';
	}
	if (score >= 56) {
		return 'C';
	}
	if (score >= 41) {
		return 'D';
	}
	return 'F';
}
