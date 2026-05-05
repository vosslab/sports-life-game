// stat_lines.ts - position-specific stat-line generators for game results.
//
// Split from `src/week_sim.ts` during M4. Each generator returns a
// position-specific subset of fields so accumulation in
// `accumulateGameStats` lines up with `SeasonStatTotals`.

import {
	Position, PositionBucket, clampStat, randomInRange,
} from '../player.js';

//============================================
// Game stat line (record of stat name to value)
export type StatLine = Record<string, number | string>;

//============================================
// Generate stat line for a passer performance
function generatePasserStats(performanceScore: number): StatLine {
	// Performance score ranges from 0-100; higher = better stats
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

	return { rushYards, carries, rushTds, fumbles };
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

	return { receptions, recYards, recTds, targets };
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

	return { receptions, recYards, recTds, targets, blockGrade };
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

	return { grade, keyPlays, pressureRate: `${pressureRate}%` };
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

	return { tackles, sacks, ints };
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
// Generate stat line based on position bucket and specific position
export function generateStatLineForPosition(
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
// Scale numeric stats by a multiplier, preserving string stats
export function scaleStat(statLine: StatLine, multiplier: number): StatLine {
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
	if (adjusted['receptions'] === 0) {
		adjusted['recYards'] = 0;
		adjusted['recTds'] = 0;
	}
	if (adjusted['carries'] === 0) {
		adjusted['rushYards'] = 0;
		adjusted['rushTds'] = 0;
	}
	if (adjusted['attempts'] === 0) {
		adjusted['completions'] = 0;
		adjusted['passYards'] = 0;
		adjusted['passTds'] = 0;
		adjusted['passInts'] = 0;
	}

	return adjusted;
}

//============================================
// Scale stat volume based on depth chart status and game context.
// strengthDiff: positive means team is stronger (likely blowout).
export function adjustStatLineForDepthChart(
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
			return scaleStat(statLine, 0.25);
		}
		if (isComfortable) {
			return scaleStat(statLine, 0.15);
		}
		return scaleStat(statLine, 0.08);
	}

	// Backup: role-aware reduced volume
	const backupScale = isBlowout ? 0.50 : 0.35;
	return scaleStat(statLine, backupScale);
}
