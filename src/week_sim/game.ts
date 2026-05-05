// game.ts - per-week game simulation orchestrator.
//
// Split from `src/week_sim.ts` during M4. Combines player performance
// scoring, position-specific stat-line generation, team-score math, and
// narrative text into a single `simulateGame` entry point used by the
// season simulator and weekly engine.

import {
	Player, PerformanceRating, PositionBucket, clampStat, randomInRange,
} from '../player.js';
import { Team } from '../team.js';
import { rand } from '../core/rng.js';
import { calculateLetterGrade, calculatePerformanceRating } from './momentum.js';
import {
	StatLine,
	adjustStatLineForDepthChart,
	generateStatLineForPosition,
} from './stat_lines.js';

export type { StatLine } from './stat_lines.js';

//============================================
// Full game result with narrative
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
function rollOvertimePoints(): number {
	const roll = randomInRange(1, 100);
	if (roll <= 55) {
		return 3;
	}
	if (roll <= 95) {
		return 7;
	}
	return 6;
}

//============================================
// Calculate player performance score (0-100)
function calculatePlayerPerformance(player: Player): number {
	const bucket = player.positionBucket;
	let performanceScore = 50;  // baseline

	switch (bucket) {
		case 'passer':
			// QB: footballIq + technique + confidence
			performanceScore = (player.core.footballIq * 0.4
				+ player.core.technique * 0.4
				+ player.core.confidence * 0.2) + randomInRange(-10, 10);
			break;

		case 'runner_receiver':
			// RB/WR/TE: athleticism + technique
			performanceScore = (player.core.athleticism * 0.5
				+ player.core.technique * 0.5) + randomInRange(-10, 10);
			break;

		case 'lineman':
			// OL/DL: technique + discipline
			performanceScore = (player.core.technique * 0.5
				+ player.core.discipline * 0.5) + randomInRange(-10, 10);
			break;

		case 'defender':
			// LB/CB/S: athleticism + footballIq
			performanceScore = (player.core.athleticism * 0.5
				+ player.core.footballIq * 0.5) + randomInRange(-10, 10);
			break;

		case 'kicker':
			// K/P: technique + confidence
			performanceScore = (player.core.technique * 0.5
				+ player.core.confidence * 0.5) + randomInRange(-10, 10);
			break;
	}

	// Add health factor
	performanceScore += (player.core.health - 50) * 0.2;

	// Add confidence factor (skip for QB, already included in formula)
	if (bucket !== 'passer' && bucket !== 'kicker') {
		performanceScore += (player.core.confidence - 50) * 0.15;
	}

	return clampStat(performanceScore);
}

//============================================
// Calculate player contribution to team score.
// Kept modest: one player among 22 on the field.
function calculatePlayerContribution(
	depthChartStatus: string, performanceScore: number, bucket: PositionBucket | null,
): number {
	// Base contribution from performance (scaled down -- one player out of 22)
	let contribution = Math.floor((performanceScore - 50) * 0.10);

	// Depth chart multiplier
	switch (depthChartStatus) {
		case 'starter':
			contribution *= 1.0;
			break;
		case 'backup':
			contribution *= 0.5;
			break;
		case 'bench':
			contribution *= 0.1;
			break;
	}

	// Position impact multiplier
	switch (bucket) {
		case 'passer':
		case 'runner_receiver':
			contribution *= 1.2;
			break;
		case 'defender':
			contribution *= 1.0;
			break;
		case 'lineman':
		case 'kicker':
			contribution *= 0.8;
			break;
	}

	return Math.round(contribution);
}

//============================================
// Generate narrative story text for the game
function generateGameStory(
	player: Player, performanceScore: number, result: 'win' | 'loss' | 'tie',
	teamScore: number, opponentScore: number, statLine: StatLine,
	regulationTieScore?: number,
): string {
	const rating = calculatePerformanceRating(performanceScore);
	const bucket = player.positionBucket;

	if (player.depthChart === 'bench') {
		return `You mostly watched from the sideline as the team `
			+ `${result === 'win' ? 'won' : 'lost'} ${teamScore}-${opponentScore}.`;
	}

	// Build stat summary text
	let statSummary = '';

	if (bucket === 'passer' && 'passYards' in statLine) {
		const yards = statLine.passYards as number;
		const tds = statLine.passTds as number;
		const ints = statLine.passInts as number;
		statSummary = `You threw for ${yards} yards and ${tds} touchdowns`;
		if (ints > 0) {
			statSummary += `, with ${ints} interception${ints === 1 ? '' : 's'}`;
		}
		statSummary += '.';
	} else if (bucket === 'runner_receiver' && 'rushYards' in statLine) {
		const yards = statLine.rushYards as number;
		const carries = statLine.carries as number;
		const tds = statLine.rushTds as number;
		statSummary = `You rushed for ${yards} yards on ${carries} carries`;
		if (tds > 0) {
			statSummary += ` with ${tds} touchdown${tds === 1 ? '' : 's'}`;
		}
		statSummary += '.';
	} else if (bucket === 'runner_receiver' && 'receptions' in statLine) {
		const catches = statLine.receptions as number;
		const yards = statLine.recYards as number;
		const tds = statLine.recTds as number;
		statSummary = `You caught ${catches} pass${catches === 1 ? '' : 'es'} for ${yards} yards`;
		if (tds > 0) {
			statSummary += ` and ${tds} touchdown${tds === 1 ? '' : 's'}`;
		}
		// TE blocking mention
		if ('blockGrade' in statLine) {
			statSummary += `. Your blocking earned a ${statLine.blockGrade} grade`;
		}
		statSummary += '.';
	} else if (bucket === 'lineman' && 'grade' in statLine) {
		const grade = statLine.grade as string;
		statSummary = `You earned a ${grade} grade for your effort up front.`;
	} else if (bucket === 'defender' && 'tackles' in statLine) {
		const tackles = statLine.tackles as number;
		const sacks = statLine.sacks as number;
		statSummary = `You had ${tackles} tackles`;
		if (sacks > 0) {
			statSummary += ` and ${sacks} sack${sacks === 1 || sacks === 1.0 ? '' : 's'}`;
		}
		statSummary += '.';
	} else if (bucket === 'kicker' && 'fgMade' in statLine) {
		const fgMade = statLine.fgMade as number;
		const fgAttempts = statLine.fgAttempts as number;
		statSummary = `You made ${fgMade}-${fgAttempts} field goals.`;
	}

	if (player.depthChart === 'backup') {
		if (statSummary.length > 0) {
			statSummary = 'In limited snaps, ' + statSummary.charAt(0).toLowerCase()
				+ statSummary.slice(1);
		} else {
			statSummary = 'You saw limited snaps off the bench. ';
		}
	}

	// Build game result text
	let resultText = '';
	const wentToOvertime = regulationTieScore !== undefined && teamScore !== opponentScore;
	const isTie = teamScore === opponentScore;

	if (result === 'win') {
		const margin = teamScore - opponentScore;
		if (wentToOvertime && regulationTieScore !== undefined) {
			resultText = ` Regulation ended tied ${regulationTieScore}-${regulationTieScore}. `
				+ `After overtime, you won ${teamScore}-${opponentScore}!`;
		} else if (margin >= 14) {
			resultText = ` A commanding ${teamScore}-${opponentScore} victory!`;
		} else if (margin >= 7) {
			resultText = ` A solid ${teamScore}-${opponentScore} win.`;
		} else {
			resultText = ` A close ${teamScore}-${opponentScore} victory.`;
		}
	} else if (result === 'loss') {
		const margin = opponentScore - teamScore;
		if (wentToOvertime && regulationTieScore !== undefined) {
			resultText = ` Regulation ended tied ${regulationTieScore}-${regulationTieScore}. `
				+ `After overtime, the team fell ${teamScore}-${opponentScore}.`;
		} else if (rating === 'elite' || rating === 'great') {
			resultText = ` Despite your solid performance, the team fell short ${teamScore}-${opponentScore}.`;
		} else {
			resultText = ` You lost ${teamScore}-${opponentScore}.`;
		}
	} else if (isTie) {
		// Pure tie (should not occur after OT simulation, but kept for completeness)
		resultText = ` The game ended in a hard-fought ${teamScore}-${opponentScore} tie.`;
	}

	return statSummary + resultText;
}

//============================================
// Simulate a game with player and team stats
export function simulateGame(
	player: Player, team: Team, opponentStrength: number,
	playoffIntensity: boolean = false,
): GameResult {
	// Calculate player performance based on position and stats
	let performanceScore = calculatePlayerPerformance(player);

	// Apply controlled variance based on confidence
	const baseVariance = randomInRange(-12, 12);
	const confidenceModifier = player.core.confidence > 70
		? 0.5  // High confidence dampens negative variance
		: player.core.confidence < 30
			? 1.5  // Low confidence amplifies negative variance
			: 1.0;

	// Scale variance by confidence, then clamp to safe range
	const scaledVariance = baseVariance * confidenceModifier;
	const adjustedVariance = Math.max(-12, Math.min(12, scaledVariance));
	performanceScore = clampStat(performanceScore + adjustedVariance);

	// Depth chart affects how many real snaps the player sees.
	if (player.depthChart === 'backup') {
		performanceScore = clampStat(performanceScore - randomInRange(10, 22));
	} else if (player.depthChart === 'bench') {
		performanceScore = clampStat(performanceScore - randomInRange(20, 35));
	}

	// Generate position-specific stat line
	let playerStatLine = generateStatLineForPosition(
		player.positionBucket, player.position, performanceScore,
	);
	// Estimate score context for depth chart scaling
	const strengthDiff = team.strength - opponentStrength;
	playerStatLine = adjustStatLineForDepthChart(
		playerStatLine, player.depthChart, player.positionBucket, strengthDiff,
	);

	// Calculate player contribution to team score
	const playerContribution = calculatePlayerContribution(
		player.depthChart, performanceScore, player.positionBucket,
	);

	// Team score calculation: base from team strength + player contribution
	const baseTeamScore = Math.floor((team.strength / 100) * 28) + randomInRange(3, 17);
	let teamScore = baseTeamScore + playerContribution;

	// Opponent score from opponent strength; playoff intensity boosts opponents.
	const effectiveOpponentStrength = playoffIntensity
		? opponentStrength + randomInRange(5, 12)
		: opponentStrength;
	const opponentBaseScore = Math.floor((effectiveOpponentStrength / 100) * 28)
		+ randomInRange(3, 17) + randomInRange(0, 3);

	// Opponent star player contribution (mirrors the player's advantage)
	const opponentStarBoost = randomInRange(1, 6);
	// "Any given Sunday" upset factor: weaker teams sometimes punch above weight
	const upsetBonus = opponentStrength < team.strength
		? randomInRange(0, 4)
		: 0;
	let opponentScore = Math.max(
		0,
		opponentBaseScore + opponentStarBoost + upsetBonus + randomInRange(-5, 5),
	);

	// Determine winner using logistic curve (for overtime tiebreaker)
	const teamDifferential = (team.strength + playerContribution) - effectiveOpponentStrength;
	const winProbability = 1 / (1 + Math.exp(-0.07 * teamDifferential));

	let result: 'win' | 'loss';
	const regulationTeamScore = teamScore;
	const regulationOpponentScore = opponentScore;
	const regulationTieScore = teamScore === opponentScore ? teamScore : undefined;
	if (teamScore === opponentScore) {
		// Tie: simulate overtime with less-biased win probability
		// Formula: 0.7 * original prob + 0.15 gives range 0.15-0.85, centered at 0.5
		const otWinProbability = winProbability * 0.7 + 0.15;
		result = rand() < otWinProbability ? 'win' : 'loss';
		const overtimePoints = rollOvertimePoints();
		if (result === 'win') {
			teamScore += overtimePoints;
		} else {
			opponentScore += overtimePoints;
		}

		// Overtime should only add points, never reduce regulation scores.
		teamScore = Math.max(teamScore, regulationTeamScore);
		opponentScore = Math.max(opponentScore, regulationOpponentScore);
	} else {
		result = teamScore > opponentScore ? 'win' : 'loss';
	}

	// Generate story text
	const storyText = generateGameStory(
		player, performanceScore, result, teamScore, opponentScore, playerStatLine,
		regulationTieScore,
	);

	const rating = calculatePerformanceRating(performanceScore);
	const grade = calculateLetterGrade(performanceScore);

	return {
		playerRating: rating,
		playerGrade: grade,
		playerStatLine,
		teamScore,
		opponentScore,
		result,
		storyText,
	};
}

//============================================
// Calculate player performance score (exported for practice/depth-chart paths)
export function calculatePlayerPerformanceScore(player: Player): number {
	return calculatePlayerPerformance(player);
}
