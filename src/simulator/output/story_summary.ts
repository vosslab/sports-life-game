export interface StoryGameSummary {
	result: "win" | "loss";
	score: { team: number; opponent: number };
	gameTone:
		| "blowout_win"
		| "blowout_loss"
		| "close_win"
		| "close_loss"
		| "comeback_win"
		| "collapse_loss"
		| "defensive_struggle"
		| "shootout";
	significance:
		| "normal"
		| "upset"
		| "rivalry"
		| "playoff_implication"
		| "ranking_implication";
	playerStoryStats: {
		headlineStat?: string;
		touchdowns?: number;
		turnovers?: number;
		sacks?: number;
		interceptions?: number;
		longPlay?: boolean;
		clutchImpact?: boolean;
	};
	notableMoments: string[];
}

//============================================
// Extract numeric values from stat line entries
function extractNumber(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		const num = parseFloat(value);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}

//============================================
// Scan play log for score changes indicating comebacks or collapses
function analyzeScoreTrends(
	playLog: string[],
	teamScore: number,
	opponentScore: number,
	isHome: boolean,
): { wasTrailingBy10: boolean; wasLeadingBy10: boolean } {
	// Simple heuristic: scan for patterns suggesting earlier deficit or lead
	// For more sophisticated tracking, the play log would include actual score states

	let wasTrailingBy10 = false;
	let wasLeadingBy10 = false;

	// Look for comeback/collapse indicators in play log
	const logText = playLog.join(" ").toUpperCase();

	// Comebacks often mention being behind or rallying
	if (
		logText.includes("COMEBACK") ||
		logText.includes("RALLY") ||
		logText.includes("DOWN 10") ||
		logText.includes("DEFICIT")
	) {
		wasTrailingBy10 = true;
	}

	// Collapses mention being ahead then losing
	if (
		logText.includes("COLLAPSE") ||
		logText.includes("BLOWN LEAD") ||
		logText.includes("UP 10")
	) {
		wasLeadingBy10 = true;
	}

	return { wasTrailingBy10, wasLeadingBy10 };
}

//============================================
// Determine game tone based on score and trends
function determineGameTone(
	teamScore: number,
	opponentScore: number,
	wasTrailingBy10: boolean,
	wasLeadingBy10: boolean,
	result: "win" | "loss",
): StoryGameSummary["gameTone"] {
	const margin = Math.abs(teamScore - opponentScore);
	const totalPoints = teamScore + opponentScore;

	// Blowout: 21+ point margin
	if (margin >= 21) {
		return result === "win" ? "blowout_win" : "blowout_loss";
	}

	// Comeback: won after being down 10+
	if (result === "win" && wasTrailingBy10) {
		return "comeback_win";
	}

	// Collapse: lost after being up 10+
	if (result === "loss" && wasLeadingBy10) {
		return "collapse_loss";
	}

	// Shootout: high scoring, close game (60+ combined points, <14 margin)
	if (totalPoints >= 60 && margin < 14) {
		return "shootout";
	}

	// Defensive struggle: low scoring (20 or fewer combined points)
	if (totalPoints <= 20) {
		return "defensive_struggle";
	}

	// Close: tight margin (7 or fewer)
	if (margin <= 7) {
		return result === "win" ? "close_win" : "close_loss";
	}

	// Default to win/loss
	return result === "win" ? "close_win" : "close_loss";
}

//============================================
// Extract headline stat based on position bucket and stat line.
// Position buckets: "passer", "runner_receiver", "lineman", "defender", "kicker"
// Stat keys use camelCase matching adapter output and accumulateGameStats.
function extractHeadlineStat(
	positionBucket: string,
	playerStatLine: Record<string, number | string>,
): string | undefined {
	const num = (key: string): number => {
		const v = playerStatLine[key];
		return typeof v === 'number' ? v : 0;
	};

	switch (positionBucket) {
		case 'passer': {
			const yards = num('passYards');
			const tds = num('passTds');
			if (tds >= 2) {
				return `${tds} passing touchdowns`;
			}
			if (yards > 0) {
				return `${yards} passing yards`;
			}
			return undefined;
		}
		case 'runner_receiver': {
			// Check which stats are present to distinguish RB from WR/TE
			const rushYards = num('rushYards');
			const rushTds = num('rushTds');
			const recYards = num('recYards');
			const recTds = num('recTds');
			const receptions = num('receptions');
			if (rushYards > 0 || rushTds > 0) {
				// RB stats
				if (rushTds >= 1) {
					return `${rushTds} rushing touchdown${rushTds > 1 ? "s" : ""}`;
				}
				return `${rushYards} rushing yards`;
			}
			// WR/TE stats
			if (recTds >= 1) {
				return `${recTds} receiving touchdown${recTds > 1 ? "s" : ""}`;
			}
			if (receptions >= 5) {
				return `${receptions} receptions for ${recYards} yards`;
			}
			if (recYards > 0) {
				return `${recYards} receiving yards`;
			}
			return undefined;
		}
		case 'defender': {
			const ints = num('ints');
			const sacks = num('sacks');
			const tackles = num('tackles');
			if (ints >= 1) {
				return `${ints} interception${ints > 1 ? "s" : ""}`;
			}
			if (sacks >= 1) {
				return `${sacks} sack${sacks > 1 ? "s" : ""}`;
			}
			if (tackles > 0) {
				return `${tackles} tackles`;
			}
			return undefined;
		}
		case 'kicker': {
			const fgMade = num('fgMade');
			const fgAttempts = num('fgAttempts');
			if (fgAttempts > 0) {
				return `${fgMade}/${fgAttempts} field goals`;
			}
			return undefined;
		}
		case 'lineman': {
			const grade = playerStatLine['grade'];
			if (grade) {
				return `Grade: ${grade}`;
			}
			return undefined;
		}
	}

	return undefined;
}

//============================================
// Scan play log for notable moments
function extractNotableMoments(playLog: string[]): string[] {
	const moments: string[] = [];

	for (const entry of playLog) {
		const upperEntry = entry.toUpperCase();

		// Touchdowns
		if (upperEntry.includes("TOUCHDOWN")) {
			moments.push(entry);
		}
		// Turnovers (interceptions or fumbles)
		else if (upperEntry.includes("INTERCEPTED") || upperEntry.includes("FUMBLE")) {
			moments.push(entry);
		}
		// Big plays (40+ yards)
		else if (
			upperEntry.includes("GAIN") &&
			(upperEntry.includes("40+") || upperEntry.includes("50+") || upperEntry.includes("60+"))
		) {
			moments.push(entry);
		}
		// Also check for plays with yard mentions of 30+
		else if (entry.match(/(\d{2,3})\s+yard/i)) {
			const match = entry.match(/(\d{2,3})\s+yard/i);
			if (match) {
				const yards = parseInt(match[1], 10);
				if (yards >= 30) {
					moments.push(entry);
				}
			}
		}

		// Keep only first 5 moments
		if (moments.length >= 5) {
			break;
		}
	}

	return moments;
}

//============================================
// Scan play log for long plays (40+ yards)
function hasLongPlay(playLog: string[]): boolean {
	for (const entry of playLog) {
		const upperEntry = entry.toUpperCase();

		// Look for mentions of large gains
		if (
			upperEntry.includes("40 YARD") ||
			upperEntry.includes("50 YARD") ||
			upperEntry.includes("60 YARD") ||
			upperEntry.includes("40+") ||
			upperEntry.includes("50+") ||
			upperEntry.includes("60+")
		) {
			return true;
		}

		// Check for numeric yard amounts >= 40
		const match = entry.match(/(\d{2,3})\s+yard/i);
		if (match) {
			const yards = parseInt(match[1], 10);
			if (yards >= 40) {
				return true;
			}
		}
	}

	return false;
}

//============================================
// Build complete story summary from simulation results
export function buildStorySummary(
	homeScore: number,
	awayScore: number,
	isHome: boolean,
	playerStatLine: Record<string, number | string>,
	positionBucket: string,
	playLog: string[],
): StoryGameSummary {
	const teamScore = isHome ? homeScore : awayScore;
	const opponentScore = isHome ? awayScore : homeScore;
	const result = teamScore > opponentScore ? "win" : "loss";

	// Analyze score trends
	const { wasTrailingBy10, wasLeadingBy10 } = analyzeScoreTrends(
		playLog,
		teamScore,
		opponentScore,
		isHome,
	);

	// Determine game tone
	const gameTone = determineGameTone(
		teamScore,
		opponentScore,
		wasTrailingBy10,
		wasLeadingBy10,
		result,
	);

	// Extract player stats using camelCase keys matching the adapter output
	const headlineStat = extractHeadlineStat(positionBucket, playerStatLine);
	const touchdowns = extractNumber(
		playerStatLine["passTds"] ?? playerStatLine["rushTds"] ?? playerStatLine["recTds"] ?? 0,
	);
	const turnovers = extractNumber(playerStatLine["passInts"] ?? 0)
		+ extractNumber(playerStatLine["fumbles"] ?? 0);
	const sacks = extractNumber(playerStatLine["sacks"] ?? 0);
	const interceptions = extractNumber(playerStatLine["ints"] ?? 0);

	// Notable moments and long plays
	const longPlay = hasLongPlay(playLog);
	const notableMoments = extractNotableMoments(playLog);

	return {
		result,
		score: { team: teamScore, opponent: opponentScore },
		gameTone,
		significance: "normal",
		playerStoryStats: {
			headlineStat,
			touchdowns: touchdowns > 0 ? touchdowns : undefined,
			turnovers: turnovers > 0 ? turnovers : undefined,
			sacks: sacks > 0 ? sacks : undefined,
			interceptions: interceptions > 0 ? interceptions : undefined,
			longPlay: longPlay || undefined,
			clutchImpact: undefined,
		},
		notableMoments,
	};
}

//============================================
// Generate narrative text from story summary
export function generateStoryText(summary: StoryGameSummary, playerName: string): string {
	const scorePhrase =
		summary.score.team > summary.score.opponent
			? `${summary.score.team}-${summary.score.opponent} win`
			: `${summary.score.team}-${summary.score.opponent} loss`;

	let narrative = "";

	// Build core narrative based on game tone
	switch (summary.gameTone) {
		case "blowout_win":
			narrative = `${playerName} dominated in a ${summary.score.team}-${summary.score.opponent} blowout.`;
			break;

		case "blowout_loss":
			narrative = `${playerName} fell short in a ${summary.score.team}-${summary.score.opponent} blowout loss.`;
			break;

		case "comeback_win":
			narrative = `${playerName} led a remarkable comeback to secure a ${scorePhrase}.`;
			break;

		case "collapse_loss":
			narrative = `${playerName} couldn't hold on as the team collapsed in a ${scorePhrase}.`;
			break;

		case "close_win":
			narrative = `${playerName} delivered in a close ${scorePhrase}.`;
			break;

		case "close_loss":
			narrative = `${playerName} came up short in a tight ${scorePhrase}.`;
			break;

		case "shootout":
			narrative = `${playerName} participated in an exciting high-scoring battle that ended ${scorePhrase}.`;
			break;

		case "defensive_struggle":
			narrative = `${playerName} battled in a defensive struggle that ended ${scorePhrase}.`;
			break;

		default:
			narrative = `${playerName} played in a ${scorePhrase}.`;
	}

	// Add headline stat if available
	if (summary.playerStoryStats.headlineStat) {
		narrative += ` ${playerName} posted ${summary.playerStoryStats.headlineStat}.`;
	}

	return narrative;
}
