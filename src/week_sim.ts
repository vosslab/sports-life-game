// week_sim.ts - weekly simulation engine for game loops and events

import {
	Player, CoreStats, Position, PositionBucket, PerformanceRating, DepthChartStatus,
	clampStat, randomInRange, getPositionBucket, modifyStat,
} from './player.js';
import { Team } from './team.js';

//============================================
// Weekly focus system
export type WeeklyFocus = 'train' | 'film_study' | 'recovery' | 'social' | 'teamwork';

//============================================
// Flavor text pools for weekly focus (randomly selected each week)
const TRAIN_FLAVOR: string[] = [
	'Your extra reps are paying off. Coaches are starting to trust you more.',
	'You stayed late running drills until the lights shut off.',
	'Coach pulled you aside after practice and said he noticed your improvement.',
	'The repetition is starting to click. Moves that felt awkward now feel automatic.',
	'Your hands are blistered but your footwork has never been better.',
	'You pushed through a brutal practice. Every rep felt like it mattered.',
	'The scout team could not keep up with you today.',
	'A tough session, but you walked off the field feeling sharper.',
];

const FILM_STUDY_FLAVOR: string[] = [
	'Studying film all week, you noticed patterns in the opponent offense.',
	'You found a tendency in the film that nobody else caught.',
	'Hours of film review are paying off. You see the game in slow motion now.',
	'Coach quizzed you on formations and you nailed every one.',
	'The playbook is starting to feel like a second language.',
	'You spotted a blitz package on film that could give the team an edge.',
	'Late nights in the film room. Your eyes are tired but your mind is sharp.',
	'You drew up adjustments from film that impressed the coaching staff.',
];

const RECOVERY_FLAVOR: string[] = [
	'A full week of rest and ice baths. Your body feels like new.',
	'You took it easy and let your body recover. Smart move.',
	'Sleep, stretching, and cold tubs. You feel recharged.',
	'The trainers worked on your sore spots. You feel fresh.',
	'A light week gave your body the reset it needed.',
	'You focused on nutrition and sleep. Energy levels are way up.',
	'Ice, compression, and proper rest. You are ready to dominate.',
	'Sometimes the best training is no training. You feel great.',
];

const SOCIAL_FLAVOR: string[] = [
	'You hung out with teammates all week. Your bond is stronger.',
	'Team dinner, group chat, and weekend plans. You are one of the crew now.',
	'You made some new friends outside of football. Life feels balanced.',
	'A fun week off the field. Your confidence got a nice boost.',
	'You went to a party and everyone knew your name. Feels good.',
	'Teammates invited you to everything this week. You belong here.',
	'You skipped a few study sessions, but the vibes were worth it.',
	'Social media blew up after your highlight got shared around school.',
];

const TEAMWORK_FLAVOR: string[] = [
	'By focusing on team chemistry, your voice carries more weight in the locker room.',
	'You helped a younger player with their technique after practice.',
	'The team ran extra drills together. Everyone is on the same page.',
	'You organized a team workout. Coaches noticed the leadership.',
	'A teammate was struggling and you pulled them aside to talk. It helped.',
	'You led stretches and kept the energy positive all week.',
	'The locker room feels tighter. That is your influence.',
	'Teammates are starting to look to you when things get tough.',
];

//============================================
// Pick a random string from a flavor pool
function pickFlavor(pool: string[]): string {
	return pool[randomInRange(0, pool.length - 1)];
}

//============================================
// Game stat line (record of stat name to value)
export type StatLine = Record<string, number | string>;

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

export interface DepthChartUpdate {
	changed: boolean;
	newStatus: DepthChartStatus;
	message: string;
}

export interface PracticeResult {
	grade: string;
	storyText: string;
	depthUpdate: DepthChartUpdate;
}

//============================================
// Apply weekly focus to player stats.
// Each focus has a real trade-off: gaining one thing costs another.
// Health decays every week from the grind of football (wear and tear).
export function applyWeeklyFocus(player: Player, focus: WeeklyFocus): string {
	let storyText = '';

	// Weekly wear and tear: minor health cost from the grind
	const wearAndTear = randomInRange(0, 2);
	modifyStat(player, 'health', -wearAndTear);

	switch (focus) {
		case 'train': {
			// Train hard: technique gain, slight health cost
			const trainGain = randomInRange(3, 6);
			modifyStat(player, 'technique', trainGain);
			modifyStat(player, 'health', -randomInRange(0, 1));
			modifyStat(player, 'confidence', randomInRange(0, 1));
			storyText = pickFlavor(TRAIN_FLAVOR);
			break;
		}

		case 'film_study': {
			// Study film: good IQ gain, slight technique from understanding
			const filmGain = randomInRange(3, 5);
			modifyStat(player, 'footballIq', filmGain);
			modifyStat(player, 'technique', randomInRange(0, 1));
			modifyStat(player, 'discipline', randomInRange(0, 1));
			storyText = pickFlavor(FILM_STUDY_FLAVOR);
			break;
		}

		case 'recovery': {
			// Recovery: big health recovery, undoes the wear and tear and then some
			const recoveryGain = randomInRange(5, 8);
			modifyStat(player, 'health', recoveryGain);
			modifyStat(player, 'confidence', randomInRange(0, 1));
			storyText = pickFlavor(RECOVERY_FLAVOR);
			break;
		}

		case 'social': {
			// Social: popularity and confidence, but discipline drops
			const socialGain = randomInRange(3, 5);
			player.career.popularity = clampStat(player.career.popularity + socialGain);
			modifyStat(player, 'confidence', randomInRange(2, 4));
			modifyStat(player, 'discipline', -randomInRange(1, 3));
			storyText = pickFlavor(SOCIAL_FLAVOR);
			break;
		}

		case 'teamwork': {
			// Teamwork: leadership and discipline, slight confidence
			const leadershipGain = randomInRange(3, 5);
			player.hidden.leadership = clampStat(player.hidden.leadership + leadershipGain);
			modifyStat(player, 'discipline', randomInRange(1, 2));
			modifyStat(player, 'confidence', randomInRange(1, 2));
			storyText = pickFlavor(TEAMWORK_FLAVOR);
			break;
		}
	}

	// Random injury chance (4% per week, higher when health is low)
	if (player.core.health < 30 && randomInRange(1, 100) <= 10) {
		const injuryDamage = randomInRange(6, 12);
		modifyStat(player, 'health', -injuryDamage);
		modifyStat(player, 'confidence', -randomInRange(1, 3));
		storyText += ' You tweaked something in practice. The trainers are keeping an eye on it.';
	} else if (randomInRange(1, 100) <= 4) {
		const injuryDamage = randomInRange(3, 7);
		modifyStat(player, 'health', -injuryDamage);
		storyText += ' Minor injury scare this week. You are playing through some pain.';
	}

	// Confidence drops when on the bench and health is low
	if (player.depthChart === 'bench' && randomInRange(1, 100) <= 30) {
		modifyStat(player, 'confidence', -randomInRange(1, 3));
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
// Generate stat line for a running back
function generateRunnerStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Rushing yards: 20-150
	const baseYards = 20 + Math.floor((adjustedScore / 100) * 130);
	const rushYards = baseYards + randomInRange(-10, 10);

	// Carries: 8-25 based on performance
	const carries = Math.floor((adjustedScore / 100) * 17) + randomInRange(5, 8);

	// Rushing TDs: 0-2
	const tdMax = adjustedScore > 70 ? 2 : adjustedScore > 50 ? 1 : 0;
	const rushTds = randomInRange(0, tdMax);

	// Fumbles: rare, more likely with low performance
	const fumbles = adjustedScore < 30 ? randomInRange(0, 1) : 0;

	return {
		rushYards,
		carries,
		rushTds,
		fumbles,
	};
}

//============================================
// Generate stat line for a wide receiver
function generateReceiverStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// Targets: 4-12 based on performance
	const targets = Math.floor((adjustedScore / 100) * 8) + randomInRange(3, 4);

	// Receptions: fraction of targets based on skill
	const catchRate = 0.5 + (adjustedScore / 100) * 0.3;
	const receptions = Math.max(1, Math.floor(targets * catchRate));

	// Receiving yards: 10-140 based on performance and catches
	const yardsPerCatch = 8 + Math.floor((adjustedScore / 100) * 10) + randomInRange(-2, 2);
	const recYards = receptions * yardsPerCatch;

	// Receiving TDs: 0-2
	const tdMax = adjustedScore > 70 ? 2 : adjustedScore > 50 ? 1 : 0;
	const recTds = randomInRange(0, tdMax);

	return {
		receptions,
		recYards,
		recTds,
		targets,
	};
}

//============================================
// Generate stat line for a tight end (hybrid receiving + blocking)
function generateTightEndStats(performanceScore: number): StatLine {
	const variance = randomInRange(-8, 8);
	const adjustedScore = clampStat(performanceScore + variance);

	// TEs get fewer targets than WRs
	const targets = Math.floor((adjustedScore / 100) * 5) + randomInRange(2, 3);

	// Receptions: moderate catch rate
	const catchRate = 0.55 + (adjustedScore / 100) * 0.25;
	const receptions = Math.max(1, Math.floor(targets * catchRate));

	// Receiving yards: lower ceiling than WR
	const yardsPerCatch = 7 + Math.floor((adjustedScore / 100) * 8) + randomInRange(-2, 2);
	const recYards = receptions * yardsPerCatch;

	// Receiving TDs: 0-1 (TEs score less often)
	const recTds = adjustedScore > 65 ? randomInRange(0, 1) : 0;

	// Blocking grade: A-F letter based on technique component of performance
	let blockGrade: string;
	if (adjustedScore >= 80) {
		blockGrade = 'A';
	} else if (adjustedScore >= 70) {
		blockGrade = 'B+';
	} else if (adjustedScore >= 60) {
		blockGrade = 'B';
	} else if (adjustedScore >= 45) {
		blockGrade = 'C';
	} else {
		blockGrade = 'D';
	}

	return {
		receptions,
		recYards,
		recTds,
		targets,
		blockGrade,
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
	// Positive = team winning, helps bench players get garbage time
	const strengthDiff = team.strength - opponentStrength;
	playerStatLine = adjustStatLineForDepthChart(
		playerStatLine, player.depthChart, player.positionBucket, strengthDiff,
	);

	// Calculate player contribution to team score
	const playerContribution = calculatePlayerContribution(
		player.depthChart, performanceScore, player.positionBucket,
	);

	// Team score calculation
	// Base team score from strength, adjusted by player contribution
	const baseTeamScore = Math.floor((team.strength / 100) * 28) + randomInRange(3, 17);
	let teamScore = baseTeamScore + playerContribution;

	// Opponent score from opponent strength
	// Playoff intensity gives opponents a boost
	const effectiveOpponentStrength = playoffIntensity
		? opponentStrength + randomInRange(5, 12)
		: opponentStrength;
	const opponentBaseScore = Math.floor((effectiveOpponentStrength / 100) * 28) + randomInRange(3, 17) + randomInRange(0, 3);

	// Opponent star player contribution (mirrors the player's advantage)
	const opponentStarBoost = randomInRange(1, 6);
	// "Any given Sunday" upset factor: weaker teams sometimes punch above their weight
	const upsetBonus = opponentStrength < team.strength
		? randomInRange(0, 4)
		: 0;
	let opponentScore = Math.max(0, opponentBaseScore + opponentStarBoost + upsetBonus + randomInRange(-5, 5));

	// Determine winner using logistic curve (for overtime tiebreaker)
	const teamDifferential = (team.strength + playerContribution) - effectiveOpponentStrength;
	const winProbability = 1 / (1 + Math.exp(-0.07 * teamDifferential));

	let result: 'win' | 'loss';
	const regulationTieScore = teamScore;
	if (teamScore === opponentScore) {
		// Tie: simulate overtime with less-biased win probability
		// Formula: 0.7 * original prob + 0.15 gives range 0.15-0.85, centered at 0.5
		const otWinProbability = winProbability * 0.7 + 0.15;
		result = Math.random() < otWinProbability ? 'win' : 'loss';
		const overtimePoints = randomInRange(3, 8);
		if (result === 'win') {
			teamScore += overtimePoints;
		} else {
			opponentScore += overtimePoints;
		}
	} else {
		result = teamScore > opponentScore ? 'win' : 'loss';
	}

	// Generate story text
	const storyText = generateGameStory(
		player, performanceScore, result, teamScore, opponentScore, playerStatLine, regulationTieScore,
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
// Convert performance score into a report-card grade
export function calculateLetterGrade(score: number): string {
	if (score >= 85) {
		return 'A';
	}
	if (score >= 70) {
		return 'B';
	}
	if (score >= 55) {
		return 'C';
	}
	if (score >= 40) {
		return 'D';
	}
	return 'F';
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
// Generate stat line based on position bucket and specific position
function generateStatLineForPosition(
	bucket: PositionBucket | null, position: Position | null,
	performanceScore: number,
): StatLine {
	switch (bucket) {
		case 'passer':
			return generatePasserStats(performanceScore);
		case 'runner_receiver':
			// Route to position-specific generator
			if (position === 'WR') {
				return generateReceiverStats(performanceScore);
			}
			if (position === 'TE') {
				return generateTightEndStats(performanceScore);
			}
			// RB is the default for this bucket
			return generateRunnerStats(performanceScore);
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
// Scale stat volume based on depth chart status and game context
// strengthDiff: positive means team is stronger (likely blowout = more bench time)
function adjustStatLineForDepthChart(
	statLine: StatLine,
	depthChartStatus: string,
	bucket: PositionBucket | null,
	strengthDiff: number,
): StatLine {
	if (depthChartStatus === 'starter') {
		return statLine;
	}

	// Determine if game is a blowout (more bench snaps) or close (fewer)
	const isBlowout = strengthDiff > 14;
	const isComfortable = strengthDiff > 7;

	if (depthChartStatus === 'bench') {
		// Bench QBs usually don't play unless blowout
		if (bucket === 'passer') {
			if (isBlowout) {
				// Garbage time: minimal passing stats
				return {
					passYards: randomInRange(12, 35),
					passTds: 0,
					passInts: randomInRange(0, 1),
					completions: randomInRange(1, 3),
					attempts: randomInRange(2, 4),
					completionPct: `${randomInRange(40, 70)}%`,
				};
			}
			// Close or comfortable game: bench QB does not play
			return {};
		}
		// Other bench positions get limited role stats
		if (isBlowout) {
			// Blowout: bench players see the field
			return scaleStat(statLine, 0.25);
		}
		if (isComfortable) {
			// Comfortable lead: bench gets a few snaps
			return scaleStat(statLine, 0.15);
		}
		// Close game: bench barely plays
		return scaleStat(statLine, 0.08);
	}

	// Backup: role-aware reduced volume
	const backupScale = isBlowout ? 0.50 : 0.35;
	return scaleStat(statLine, backupScale);
}

//============================================
// Scale numeric stats by a multiplier, preserving string stats
function scaleStat(statLine: StatLine, multiplier: number): StatLine {
	const adjusted: StatLine = {};
	for (const [key, value] of Object.entries(statLine)) {
		if (typeof value === 'number') {
			// Percentage and grade stats stay unchanged
			if (key === 'completionPct' || key === 'pressureRate' || key === 'fgPercent') {
				adjusted[key] = value;
			} else {
				adjusted[key] = Math.max(0, Math.round(value * multiplier));
			}
		} else {
			// String values (grades, percentages) pass through
			adjusted[key] = value;
		}
	}
	// Enforce stat consistency: zero out dependent stats when base stat is zero
	// No catches means no receiving yards or TDs
	if (adjusted['receptions'] === 0) {
		adjusted['recYards'] = 0;
		adjusted['recTds'] = 0;
	}
	// No carries means no rushing yards or TDs
	if (adjusted['carries'] === 0) {
		adjusted['rushYards'] = 0;
		adjusted['rushTds'] = 0;
	}
	// No pass attempts means no completions, yards, TDs, or INTs
	if (adjusted['attempts'] === 0) {
		adjusted['completions'] = 0;
		adjusted['passYards'] = 0;
		adjusted['passTds'] = 0;
		adjusted['passInts'] = 0;
	}

	return adjusted;
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
		// Running back narrative
		const yards = statLine.rushYards as number;
		const carries = statLine.carries as number;
		const tds = statLine.rushTds as number;
		statSummary = `You rushed for ${yards} yards on ${carries} carries`;
		if (tds > 0) {
			statSummary += ` with ${tds} touchdown${tds === 1 ? '' : 's'}`;
		}
		statSummary += '.';
	} else if (bucket === 'runner_receiver' && 'receptions' in statLine) {
		// Wide receiver or tight end narrative
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
	} else {
		// Pure tie (should not occur after OT simulation, but kept for completeness)
		resultText = ` The game ended in a hard-fought ${teamScore}-${opponentScore} tie.`;
	}

	return statSummary + resultText;
}

//============================================
// Adjust depth chart week-to-week based on grade and current role
export function evaluateDepthChartUpdate(
	player: Player,
	playerGrade: string,
): DepthChartUpdate {
	if (player.depthChart === 'starter') {
		let demotionChance = 0;
		if (playerGrade === 'D') {
			demotionChance = 18;
		} else if (playerGrade === 'F') {
			demotionChance = 42;
		}

		if (demotionChance > 0 && randomInRange(1, 100) <= demotionChance) {
			player.depthChart = 'backup';
			return {
				changed: true,
				newStatus: 'backup',
				message: 'Coach was not happy with that showing. You got bumped down to backup for now.',
			};
		}
	}

	if (player.depthChart === 'backup') {
		let promotionChance = 0;
		if (playerGrade === 'A') {
			promotionChance = 50;
		} else if (playerGrade === 'B') {
			promotionChance = 30;
		} else if (playerGrade === 'C') {
			promotionChance = 10;
		}

		if (player.core.technique >= 50) {
			promotionChance += 10;
		}
		if (player.core.footballIq >= 50) {
			promotionChance += 8;
		}
		if (player.core.confidence >= 50) {
			promotionChance += 5;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = 'starter';
			return {
				changed: true,
				newStatus: 'starter',
				message: 'Coach saw enough. You are moving up to the starting lineup next week.',
			};
		}
	}

	// Bench -> backup promotion path
	if (player.depthChart === 'bench') {
		let promotionChance = 0;
		if (playerGrade === 'A') {
			promotionChance = 45;
		} else if (playerGrade === 'B') {
			promotionChance = 30;
		} else if (playerGrade === 'C') {
			promotionChance = 15;
		} else if (playerGrade === 'D') {
			promotionChance = 5;
		}

		// Stat bonuses help bench players earn a look
		if (player.core.technique >= 45) {
			promotionChance += 10;
		}
		if (player.core.footballIq >= 45) {
			promotionChance += 8;
		}
		if (player.core.discipline >= 40) {
			promotionChance += 5;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = 'backup';
			return {
				changed: true,
				newStatus: 'backup',
				message: 'Coaches saw your effort in practice. You earned the backup role.',
			};
		}
	}

	return {
		changed: false,
		newStatus: player.depthChart,
		message: '',
	};
}

//============================================
// Practice reps for backups and bench players to compete for a starting job
export function runPracticeSession(player: Player): PracticeResult {
	let practiceScore = calculatePlayerPerformance(player);
	practiceScore = clampStat(practiceScore + randomInRange(-6, 10));
	const grade = calculateLetterGrade(practiceScore);

	let storyText = '';
	if (grade === 'A') {
		storyText = 'You dominated practice this week. Coaches could not ignore the tape.';
	} else if (grade === 'B') {
		storyText = 'You had a strong week of practice and looked sharp in team drills.';
	} else if (grade === 'C') {
		storyText = 'Practice was solid, but not enough to force a big conversation yet.';
	} else if (grade === 'D') {
		storyText = 'Practice was rough. Too many mistakes showed up on film.';
	} else {
		storyText = 'It was a bad week on the practice field. Coaches noticed every rep.';
	}

	let depthUpdate: DepthChartUpdate = {
		changed: false,
		newStatus: player.depthChart,
		message: '',
	};

	if (player.depthChart === 'backup' || player.depthChart === 'bench') {
		let promotionChance = 0;
		if (grade === 'A') {
			promotionChance = player.depthChart === 'bench' ? 28 : 42;
		} else if (grade === 'B') {
			promotionChance = player.depthChart === 'bench' ? 10 : 18;
		}

		if (player.core.technique >= 55) {
			promotionChance += 8;
		}
		if (player.core.footballIq >= 55) {
			promotionChance += 6;
		}
		if (player.core.discipline >= 50) {
			promotionChance += 4;
		}

		if (promotionChance > 0 && randomInRange(1, 100) <= promotionChance) {
			player.depthChart = player.depthChart === 'bench' ? 'backup' : 'starter';
			depthUpdate = {
				changed: true,
				newStatus: player.depthChart,
				message: player.depthChart === 'starter'
					? 'Your practice tape earned you the starting job for this week.'
					: 'Coaches bumped you up the depth chart. You are now the primary backup.',
			};
		}
	}

	return {
		grade,
		storyText,
		depthUpdate,
	};
}

//============================================
// Simple assertions for testing
const testRating = calculatePerformanceRating(90);
console.assert(testRating === 'elite', 'Score 90 should be elite');
const testRatingAvg = calculatePerformanceRating(48);
console.assert(testRatingAvg === 'average', 'Score 48 should be average');
const testRatingPoor = calculatePerformanceRating(15);
console.assert(testRatingPoor === 'poor', 'Score 15 should be poor');
const testGradeA = calculateLetterGrade(88);
console.assert(testGradeA === 'A', 'Score 88 should be grade A');

// Test position-specific stat generators produce correct keys
const testRunnerStats = generateRunnerStats(70);
console.assert('rushYards' in testRunnerStats, 'RB stats should have rushYards');
console.assert('carries' in testRunnerStats, 'RB stats should have carries');
console.assert(!('receptions' in testRunnerStats), 'RB stats should not have receptions');

const testReceiverStats = generateReceiverStats(70);
console.assert('receptions' in testReceiverStats, 'WR stats should have receptions');
console.assert('recYards' in testReceiverStats, 'WR stats should have recYards');
console.assert(!('rushYards' in testReceiverStats), 'WR stats should not have rushYards');

const testTEStats = generateTightEndStats(70);
console.assert('receptions' in testTEStats, 'TE stats should have receptions');
console.assert('blockGrade' in testTEStats, 'TE stats should have blockGrade');
