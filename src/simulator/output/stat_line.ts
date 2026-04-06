//============================================
// Player Stat Line - Extract position-specific stats from team box score
// Converts team-level statistics into individual player stat lines
// for accumulation into player career stats
//============================================

import { TeamBoxScore } from "./box_score.js";

//============================================
// Type representing a single game's stat line
export type StatLine = Record<string, number | string>;

//============================================
// Position buckets supported by stat extraction
// Internal position types for stat extraction
// The game uses "runner_receiver" as a combined bucket, but stats differ
type StatPosition = "passer" | "runner" | "receiver" | "lineman" | "defender" | "kicker";

//============================================
// Depth chart status for snap share calculation
type DepthChartStatus = "starter" | "backup" | "bench";

//============================================
// Get snap share for a player based on position and depth chart status
// Snap share represents the percentage of team plays the player participated in
function getSnapShare(positionBucket: string, depthChart: DepthChartStatus): number {
	const snapShares: Record<StatPosition, Record<DepthChartStatus, number>> = {
		passer: {
			starter: 0.95,
			backup: 0.05,
			bench: 0.0,
		},
		runner: {
			starter: 0.55,
			backup: 0.30,
			bench: 0.15,
		},
		receiver: {
			starter: 0.70,
			backup: 0.20,
			bench: 0.10,
		},
		lineman: {
			starter: 0.75,
			backup: 0.20,
			bench: 0.05,
		},
		defender: {
			starter: 0.70,
			backup: 0.20,
			bench: 0.10,
		},
		kicker: {
			starter: 1.0,
			backup: 0.0,
			bench: 0.0,
		},
	};

	// Handle combined runner_receiver bucket: default to receiver snap shares
	const key = positionBucket === "runner_receiver" ? "receiver" : positionBucket;
	const shares = snapShares[key as StatPosition];
	if (!shares) {
		return 0.5;  // fallback
	}
	return shares[depthChart];
}

//============================================
// Generate a grade (A-F) based on team offensive or defensive performance
function generateGrade(metric: number, maxValue: number): string {
	const percentage = (metric / maxValue) * 100;
	if (percentage >= 90) return "A";
	if (percentage >= 80) return "B";
	if (percentage >= 70) return "C";
	if (percentage >= 60) return "D";
	return "F";
}

//============================================
// Extract player stat line from team box score
// Scales team stats by snap share and position-specific roles
export function extractPlayerStatLine(
	positionBucket: string,
	teamBox: TeamBoxScore,
	snapShare: number,
	depthChart: string,
): StatLine {
	const line: StatLine = {};

	const normalizedPosition = positionBucket.toLowerCase() as StatPosition;
	const normalizedDepth = depthChart.toLowerCase() as DepthChartStatus;
	const calculatedSnapShare = snapShare || getSnapShare(normalizedPosition, normalizedDepth);

	//============================================
	// Passer stats
	if (normalizedPosition === "passer") {
		line.attempts = Math.round(teamBox.passAttempts * calculatedSnapShare);
		line.completions = Math.round(teamBox.passCompletions * calculatedSnapShare);
		line.passYards = Math.round(teamBox.passYards * calculatedSnapShare);
		line.passTds = Math.round(teamBox.passTds * calculatedSnapShare);
		line.passInts = Math.round(teamBox.interceptions * calculatedSnapShare);
	}

	//============================================
	// Runner stats
	if (normalizedPosition === "runner") {
		line.carries = Math.round(teamBox.rushAttempts * calculatedSnapShare);
		line.rushYards = Math.round(teamBox.rushYards * calculatedSnapShare);
		line.rushTds = Math.round(teamBox.rushTds * calculatedSnapShare);
		// Estimate fumbles proportional to carries
		const fumbleRate = teamBox.fumblesLost > 0 ? teamBox.fumblesLost / teamBox.rushAttempts : 0;
		line.fumbles = Math.round(fumbleRate * (line.carries as number));
	}

	//============================================
	// Receiver stats (WR/TE)
	if (normalizedPosition === "receiver") {
		// Estimate targets as portion of pass attempts (assume each target is one play)
		line.targets = Math.round(teamBox.passAttempts * calculatedSnapShare * 0.3); // ~30% of passes targeted at one receiver
		line.receptions = Math.round((line.targets as number) * 0.65); // ~65% catch rate
		line.recYards = Math.round(teamBox.passYards * calculatedSnapShare * 0.35); // Receiver gets ~35% of team passing yards
		line.recTds = Math.round(teamBox.passTds * calculatedSnapShare);
	}

	//============================================
	// Lineman stats (OL/DL)
	if (normalizedPosition === "lineman") {
		// Offensive or defensive lineman - generate grade based on performance
		const oppSacks = teamBox.sacks; // Defense sacks = offense failure
		const oppRushAttempts = teamBox.rushAttempts;
		const olGrade = generateGrade(oppRushAttempts - oppSacks, oppRushAttempts);

		line.grade = olGrade;
		line.keyPlays = Math.round(teamBox.thirdDownConversions * calculatedSnapShare);
	}

	//============================================
	// Defender stats (DL/LB/DB)
	if (normalizedPosition === "defender") {
		// Defensive stats estimated from opposing offense stats
		// Tackles = proportional to opponent run attempts + incomplete passes
		const estimatedTackles = Math.round(
			(teamBox.rushAttempts + (teamBox.passAttempts - teamBox.passCompletions)) * calculatedSnapShare * 0.15,
		);
		line.tackles = Math.max(0, estimatedTackles); // Can't be negative

		// Sacks directly from team sack count
		line.sacks = Math.round(teamBox.sacks * calculatedSnapShare);

		// Interceptions directly from team INT count
		line.ints = Math.round(teamBox.interceptions * calculatedSnapShare);
	}

	//============================================
	// Kicker stats (K/P)
	if (normalizedPosition === "kicker") {
		line.fgAttempts = teamBox.fgAttempts;
		line.fgMade = teamBox.fgMade;
		line.xpAttempts = teamBox.xpAttempts;
		line.xpMade = teamBox.xpMade;
	}

	return line;
}

//============================================
// Export getSnapShare for external use
export { getSnapShare };
