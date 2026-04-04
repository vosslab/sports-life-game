// week_sim.ts - weekly simulation engine for game loops and events

import {
	Player, CoreStats, PositionBucket, PerformanceRating,
	clampStat, randomInRange, getPositionBucket, modifyStat,
} from './player.js';
import { Team } from './team.js';

//============================================
// Weekly focus system
export type WeeklyFocus = 'train' | 'film_study' | 'recovery' | 'social' | 'teamwork';

//============================================
// Game stat line (record of stat name to value)
export type StatLine = Record<string, number | string>;

//============================================
// Full game result with narrative
export interface GameResult {
	playerRating: PerformanceRating;
	playerStatLine: StatLine;
	teamScore: number;
	opponentScore: number;
	result: 'win' | 'loss' | 'tie';
	storyText: string;
}

//============================================
// Apply weekly focus to player stats
export function applyWeeklyFocus(player: Player, focus: WeeklyFocus): string {
	let storyText = '';

	switch (focus) {
		case 'train':
			// Train: +2-4 technique
			const trainGain = randomInRange(2, 4);
			modifyStat(player, 'technique', trainGain);
			storyText = 'Your extra reps are paying off. Coaches are starting to trust you '
				+ 'more.';
			break;

		case 'film_study':
			// Film study: +2-3 footballIq
			const filmGain = randomInRange(2, 3);
			modifyStat(player, 'footballIq', filmGain);
			storyText = 'Studying film all week, you noticed patterns in the opponent offense. '
				+ 'You feel smarter on the field.';
			break;

		case 'recovery':
			// Recovery: +3-5 health
			const recoveryGain = randomInRange(3, 5);
			modifyStat(player, 'health', recoveryGain);
			storyText = 'A full week of rest and ice baths. Your body feels like new. '
				+ 'You are ready to dominate.';
			break;

		case 'social':
			// Social: +2-4 popularity (career stat)
			const socialGain = randomInRange(2, 4);
			player.career.popularity = clampStat(player.career.popularity + socialGain);
			storyText = 'You hung out with the team all week. Your teammates respect you now.';
			break;

		case 'teamwork':
			// Teamwork: +2-3 leadership (hidden stat)
			const leadershipGain = randomInRange(2, 3);
			player.hidden.leadership = clampStat(player.hidden.leadership + leadershipGain);
			storyText = 'By focusing on team chemistry, your voice carries more weight in '
				+ 'the locker room.';
			break;
	}

	return storyText;
}

//============================================
// Update momentum based on game performance
export function updateMomentum(
	currentMomentum: number, rating: PerformanceRating,
): number {
	let newMomentum = currentMomentum;

	// Apply momentum changes based on performance rating
	switch (rating) {
		case 'elite':
			newMomentum += 3;
			break;
		case 'great':
			newMomentum += 2;
			break;
		case 'good':
			newMomentum += 1;
			break;
		case 'below_average':
			newMomentum -= 2;
			break;
		case 'poor':
			newMomentum -= 3;
			break;
		// 'average' has no change
	}

	// Decay momentum toward 0 each week
	newMomentum *= 0.7;

	// Clamp to range -10 to +10
	return Math.max(-10, Math.min(10, newMomentum));
}

//============================================
// Calculate performance rating from a 0-100 score
export function calculatePerformanceRating(score: number): PerformanceRating {
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
// Generate stat line for a passer performance
function generatePasserStats(performanceScore: number): StatLine {
	// Performance score ranges from 0-100
	// Higher score = better stats
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Base yards on adjusted score: 150-350
	const baseYards = 150 + Math.floor((adjustedScore / 100) * 200);
	const passYards = baseYards + randomInRange(-20, 20);

	// TDs scale with score: 0-4
	const tdMax = Math.floor((adjustedScore / 100) * 4);
	const passTds = randomInRange(0, tdMax);

	// INTs: better players throw fewer
	const intMax = adjustedScore < 40 ? 3 : adjustedScore < 60 ? 2 : 1;
	const passInts = randomInRange(0, intMax);

	// Completions: around 60-70% for average, higher for better
	const completionPct = Math.floor(55 + (adjustedScore / 100) * 30);
	const attempts = Math.floor(passYards / 7.5) + randomInRange(-2, 2);
	const completions = Math.floor(attempts * (completionPct / 100));

	return {
		passYards,
		passTds,
		passInts,
		completions,
		attempts,
		completionPct: `${completionPct}%`,
	};
}

//============================================
// Generate stat line for a runner/receiver performance
function generateRunnerReceiverStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Rushing or receiving yards: 20-150
	const baseYards = 20 + Math.floor((adjustedScore / 100) * 130);
	const yards = baseYards + randomInRange(-10, 10);

	// Touchdowns: 0-2
	const tdMax = adjustedScore > 70 ? 2 : adjustedScore > 50 ? 1 : 0;
	const tds = randomInRange(0, tdMax);

	// Catches (if receiver)
	const catches = Math.floor((adjustedScore / 100) * 8) + randomInRange(0, 3);

	// Carries (if runner)
	const carries = Math.floor((adjustedScore / 100) * 20) + randomInRange(2, 5);

	return {
		yards,
		tds,
		catches,
		carries,
	};
}

//============================================
// Generate stat line for a lineman performance
function generateLinemanStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Grade scale A-F based on performance
	let grade: string;
	if (adjustedScore >= 80) {
		grade = 'A';
	} else if (adjustedScore >= 70) {
		grade = 'B';
	} else if (adjustedScore >= 60) {
		grade = 'C';
	} else if (adjustedScore >= 40) {
		grade = 'D';
	} else {
		grade = 'F';
	}

	// Key plays: 0-10 depending on performance
	const keyPlays = Math.floor((adjustedScore / 100) * 10) + randomInRange(0, 2);

	// Pressure rate for lineman
	const pressureRate = Math.max(0, Math.floor((100 - adjustedScore) / 10));

	return {
		grade,
		keyPlays,
		pressureRate: `${pressureRate}%`,
	};
}

//============================================
// Generate stat line for a defender performance
function generateDefenderStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Tackles scale with performance: 2-12
	const tackles = Math.floor(2 + (adjustedScore / 100) * 10) + randomInRange(0, 2);

	// Sacks: 0-3
	const sackMax = adjustedScore > 70 ? 2 : adjustedScore > 50 ? 1 : 0;
	const sacks = randomInRange(0, sackMax) + (randomInRange(0, 3) === 0 ? 0.5 : 0);

	// Interceptions: rare
	const intMax = adjustedScore > 75 ? 1 : 0;
	const ints = randomInRange(0, intMax);

	return {
		tackles,
		sacks,
		ints,
	};
}

//============================================
// Generate stat line for a kicker performance
function generateKickerStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Field goal percentage: 60-95%
	const fgPercent = Math.floor(60 + (adjustedScore / 100) * 35);

	// Field goals made: 2-4
	const fgAttempts = randomInRange(3, 5);
	const fgMade = Math.floor(fgAttempts * (fgPercent / 100));

	// Punt average: 35-50 yards
	const puntAvg = Math.floor(35 + (adjustedScore / 100) * 15) + randomInRange(-3, 3);

	// Extra points almost always made
	const xpMade = randomInRange(4, 6);
	const xpAttempts = xpMade + randomInRange(0, 1);

	return {
		fgMade,
		fgAttempts,
		fgPercent: `${fgPercent}%`,
		puntAvg,
		xpMade,
		xpAttempts,
	};
}

//============================================
// Simulate a game with player and team stats
export function simulateGame(
	player: Player, team: Team, opponentStrength: number,
	playoffIntensity: boolean = false,
): GameResult {
	// Calculate player performance based on position and stats
	let performanceScore = calculatePlayerPerformance(player);

	// Apply momentum modifier (if momentum tracking is integrated)
	// This assumes momentum will be tracked externally and passed in
	// For now, momentum is calculated but not used in score
	// performanceScore += momentum; would be added here

	// Apply controlled variance based on confidence
	const baseVariance = randomInRange(-12, 12);
	const confidenceModifier = player.core.confidence > 70
		? 0.5  // High confidence dampens negative variance
		: player.core.confidence < 30
			? 1.5  // Low confidence amplifies negative variance
			: 1.0; // Normal variance

	const adjustedVariance = Math.max(
		-12 * confidenceModifier,
		Math.min(12 * confidenceModifier, baseVariance),
	);
	performanceScore = clampStat(performanceScore + adjustedVariance);

	// Generate position-specific stat line
	const playerStatLine = generateStatLineForPosition(player.positionBucket, performanceScore);

	// Calculate player contribution to team score
	const playerContribution = calculatePlayerContribution(
		player.depthChart, performanceScore, player.positionBucket,
	);

	// Team score calculation
	// Base team score from strength, adjusted by player contribution
	const baseTeamScore = Math.floor((team.strength / 100) * 28) + randomInRange(3, 17);
	const teamScore = baseTeamScore + playerContribution;

	// Opponent score from opponent strength
	// Playoff intensity gives opponents a boost
	const effectiveOpponentStrength = playoffIntensity
		? opponentStrength + randomInRange(10, 15)
		: opponentStrength;
	const opponentBaseScore = Math.floor((effectiveOpponentStrength / 100) * 28) + randomInRange(3, 17);
	const opponentScore = opponentBaseScore + randomInRange(-5, 5);

	// Determine winner using logistic curve
	const teamDifferential = (team.strength + playerContribution) - effectiveOpponentStrength;
	const winProbability = 1 / (1 + Math.exp(-0.08 * teamDifferential));

	let result: 'win' | 'loss' | 'tie';
	if (teamScore === opponentScore) {
		// Tie: simulate overtime with weighted coin flip
		const otWinProbability = winProbability * 0.6 + 0.4;  // Shift towards original prob
		result = Math.random() < otWinProbability ? 'win' : 'loss';
	} else {
		result = teamScore > opponentScore ? 'win' : 'loss';
	}

	// Generate story text
	const storyText = generateGameStory(
		player, performanceScore, result, teamScore, opponentScore, playerStatLine,
	);

	const rating = calculatePerformanceRating(performanceScore);

	return {
		playerRating: rating,
		playerStatLine,
		teamScore,
		opponentScore,
		result,
		storyText,
	};
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

	// Add confidence factor
	performanceScore += (player.core.confidence - 50) * 0.15;

	return clampStat(performanceScore);
}

//============================================
// Generate stat line based on position bucket
function generateStatLineForPosition(
	bucket: PositionBucket | null, performanceScore: number,
): StatLine {
	switch (bucket) {
		case 'passer':
			return generatePasserStats(performanceScore);
		case 'runner_receiver':
			return generateRunnerReceiverStats(performanceScore);
		case 'lineman':
			return generateLinemanStats(performanceScore);
		case 'defender':
			return generateDefenderStats(performanceScore);
		case 'kicker':
			return generateKickerStats(performanceScore);
		default:
			return {};
	}
}

//============================================
// Calculate player contribution to team score
function calculatePlayerContribution(
	depthChartStatus: string, performanceScore: number, bucket: PositionBucket | null,
): number {
	// Base contribution from performance
	let contribution = Math.floor((performanceScore - 50) * 0.3);

	// Depth chart multiplier
	switch (depthChartStatus) {
		case 'starter':
			contribution *= 1.0;  // full weight
			break;
		case 'backup':
			contribution *= 0.5;  // half weight
			break;
		case 'bench':
			contribution *= 0.1;  // minimal weight
			break;
	}

	// Position impact multiplier
	switch (bucket) {
		case 'passer':
		case 'runner_receiver':
			contribution *= 1.2;  // offensive positions have higher impact
			break;
		case 'defender':
			contribution *= 1.0;   // defensive positions have standard impact
			break;
		case 'lineman':
		case 'kicker':
			contribution *= 0.8;   // linemen and kickers have lower direct impact
			break;
	}

	return Math.round(contribution);
}

//============================================
// Generate narrative story text for the game
function generateGameStory(
	player: Player, performanceScore: number, result: 'win' | 'loss' | 'tie',
	teamScore: number, opponentScore: number, statLine: StatLine,
): string {
	const rating = calculatePerformanceRating(performanceScore);
	const bucket = player.positionBucket;

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
	} else if (bucket === 'runner_receiver' && 'yards' in statLine) {
		const yards = statLine.yards as number;
		const tds = statLine.tds as number;
		statSummary = `You had ${yards} yards and ${tds} touchdown${tds === 1 ? '' : 's'}.`;
	} else if (bucket === 'lineman' && 'grade' in statLine) {
		const grade = statLine.grade as string;
		statSummary = `You earned a ${grade} grade for your effort up front.`;
	} else if (bucket === 'defender' && 'tackles' in statLine) {
		const tackles = statLine.tackles as number;
		const sacks = statLine.sacks as number;
		statSummary = `You had ${tackles} tackles`;
		if (sacks > 0) {
			statSummary += ` and ${sacks} sack${sacks === 1 ? '' : 's'}`;
		}
		statSummary += '.';
	} else if (bucket === 'kicker' && 'fgMade' in statLine) {
		const fgMade = statLine.fgMade as number;
		const fgAttempts = statLine.fgAttempts as number;
		statSummary = `You made ${fgMade}-${fgAttempts} field goals.`;
	}

	// Build game result text
	let resultText = '';
	const isTie = teamScore === opponentScore;

	if (result === 'win') {
		const margin = teamScore - opponentScore;
		if (isTie) {
			resultText = ` After a dramatic overtime, you led the team to a ${teamScore}-${opponentScore} victory!`;
		} else if (margin >= 14) {
			resultText = ` A commanding ${teamScore}-${opponentScore} victory!`;
		} else if (margin >= 7) {
			resultText = ` A solid ${teamScore}-${opponentScore} win.`;
		} else {
			resultText = ` A close ${teamScore}-${opponentScore} victory.`;
		}
	} else if (result === 'loss') {
		const margin = opponentScore - teamScore;
		if (isTie) {
			resultText = ` After a hard-fought overtime, the team fell short ${teamScore}-${opponentScore}.`;
		} else if (rating === 'elite' || rating === 'great') {
			resultText = ` Despite your solid performance, the team fell short ${teamScore}-${opponentScore}.`;
		} else {
			resultText = ` You lost ${teamScore}-${opponentScore}.`;
		}
	} else {
		// Pure tie (should not occur after OT simulation, but kept for completeness)
		resultText = ` The game ended in a hard-fought ${teamScore}-${opponentScore} tie.`;
	}

	return statSummary + resultText;
}

//============================================
// Simple assertions for testing
const testRating = calculatePerformanceRating(90);
console.assert(testRating === 'elite', 'Score 90 should be elite');
const testRatingAvg = calculatePerformanceRating(48);
console.assert(testRatingAvg === 'average', 'Score 48 should be average');
const testRatingPoor = calculatePerformanceRating(15);
console.assert(testRatingPoor === 'poor', 'Score 15 should be poor');
