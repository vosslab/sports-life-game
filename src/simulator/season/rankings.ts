import { EnhancedTeamRecord } from "./standings.js";

// A single ranked team entry
export interface RankedTeam {
	teamId: string;
	teamName: string;
	rank: number;
	previousRank: number | null;  // null if unranked last week
	wins: number;
	losses: number;
	rankingScore: number;         // internal score used for sorting
}

// Weekly rankings
export interface WeeklyRankings {
	week: number;
	leagueType: "ihsa" | "fcs" | "nfl";
	ranked: RankedTeam[];         // top 25 (or top 10 for IHSA)
	notableChanges: string[];     // "Team X jumps 5 spots after upset win"
}

//============================================
// Ranking score computation with league-specific adjustments
//============================================

// Compute the raw ranking score for a team based on record, SOS, and point differential
function computeRawScore(
	record: EnhancedTeamRecord,
	leagueType: string
): number {
	const totalGames = record.wins + record.losses;
	const winPercentage = totalGames > 0 ? record.wins / totalGames : 0;

	// Base score: win percentage * 100 (0-100 scale)
	let score = winPercentage * 100;

	// Strength of schedule bonus: SOS * 20
	// SOS is typically 0-1, so this adds up to 20 points
	const sosBonus = record.strengthOfSchedule * 20;
	score += sosBonus;

	// Point differential bonus: PD * 0.5, clamped to +/- 25
	const pdBonus = Math.max(-25, Math.min(25, record.pointDifferential * 0.5));
	score += pdBonus;

	// League-specific adjustments
	if (leagueType === "nfl") {
		// NFL values point differential more heavily (more parity, tight margins matter)
		const nflPdBonus = Math.max(-10, Math.min(10, record.pointDifferential * 0.15));
		score += nflPdBonus;
	} else if (leagueType === "ihsa") {
		// IHSA high school rankings: less emphasis on SOS since scheduling is local
		score -= sosBonus * 0.5; // Reduce SOS impact by half
	}

	return score;
}

// Apply inertia: previously ranked teams tend to maintain their rank
function applyRankingInertia(
	newScore: number,
	previousRank: number | null,
	leagueType: string
): number {
	if (previousRank === null) {
		// First time ranked, use raw score
		return newScore;
	}

	// Convert previous rank to a pseudo-score for blending
	// Lower rank = higher score (rank 1 should be ~115 points conceptually)
	const previousScore = Math.max(50, 140 - previousRank * 5);

	// FCS ranked teams get +5 inertia bonus (harder to fall out of rankings)
	const inertiaBonus = leagueType === "fcs" ? 5 : 0;

	// Blend: 70% new score + 30% old score + bonus
	const blendedScore = newScore * 0.7 + previousScore * 0.3 + inertiaBonus;
	return blendedScore;
}

//============================================
// Main ranking computation function
//============================================

export function computeRankings(
	records: EnhancedTeamRecord[],
	leagueType: string,
	previousRankings: WeeklyRankings | null,
	week: number
): WeeklyRankings {
	// Map previous ranks for easy lookup
	const previousRankMap = new Map<string, number>();
	if (previousRankings) {
		previousRankings.ranked.forEach((team) => {
			previousRankMap.set(team.teamId, team.rank);
		});
	}

	// Compute scoring for each team
	const scoredTeams = records.map((record) => {
		const rawScore = computeRawScore(record, leagueType);
		const previousRank = previousRankMap.get(record.teamId) ?? null;
		const finalScore = applyRankingInertia(rawScore, previousRank, leagueType);

		return {
			teamId: record.teamId,
			teamName: record.teamName,
			wins: record.wins,
			losses: record.losses,
			rankingScore: finalScore,
			previousRank,
		};
	});

	// Sort by ranking score descending
	scoredTeams.sort((a, b) => b.rankingScore - a.rankingScore);

	// Determine cutoff for rankings
	const rankingCutoff = leagueType === "ihsa" ? 10 : 25;
	const rankedTeams = scoredTeams.slice(0, rankingCutoff);

	// Assign final rank numbers
	const ranked: RankedTeam[] = rankedTeams.map((team, index) => ({
		teamId: team.teamId,
		teamName: team.teamName,
		rank: index + 1,
		previousRank: team.previousRank,
		wins: team.wins,
		losses: team.losses,
		rankingScore: team.rankingScore,
	}));

	// Detect notable changes
	const notableChanges = detectNotableChanges(
		{
			week,
			leagueType: leagueType as "ihsa" | "fcs" | "nfl",
			ranked,
			notableChanges: [],
		},
		previousRankings
	);

	return {
		week,
		leagueType: leagueType as "ihsa" | "fcs" | "nfl",
		ranked,
		notableChanges,
	};
}

//============================================
// Notable changes detection
//============================================

export function detectNotableChanges(
	current: WeeklyRankings,
	previous: WeeklyRankings | null
): string[] {
	const changes: Array<{
		team: RankedTeam;
		type: "new" | "jump" | "drop" | "fallout";
		magnitude: number;
	}> = [];

	// Map current and previous teams by ID
	const currentMap = new Map(current.ranked.map((t) => [t.teamId, t]));
	const previousMap = previous ? new Map(previous.ranked.map((t) => [t.teamId, t])) : new Map();

	// Check each currently ranked team
	current.ranked.forEach((team) => {
		const prev = previousMap.get(team.teamId);

		if (!prev) {
			// New entry to rankings
			changes.push({
				team,
				type: "new",
				magnitude: 0,
			});
		} else {
			const movement = prev.rank - team.rank;
			if (movement >= 5) {
				// Big jump
				changes.push({
					team,
					type: "jump",
					magnitude: movement,
				});
			} else if (movement <= -5) {
				// Big drop
				changes.push({
					team,
					type: "drop",
					magnitude: Math.abs(movement),
				});
			}
		}
	});

	// Check for teams that fell out of rankings
	if (previous) {
		previous.ranked.forEach((team) => {
			if (!currentMap.has(team.teamId)) {
				changes.push({
					team,
					type: "fallout",
					magnitude: 0,
				});
			}
		});
	}

	// Sort by magnitude (most notable first), keep top 5
	changes.sort((a, b) => {
		// Prioritize falls by always treating them as significant
		if (a.type === "fallout" && b.type !== "fallout") return -1;
		if (a.type !== "fallout" && b.type === "fallout") return 1;

		// Then by magnitude
		return b.magnitude - a.magnitude;
	});

	// Generate narrative strings for top 5 changes
	const narrative: string[] = [];
	changes.slice(0, 5).forEach((change) => {
		if (change.type === "new") {
			narrative.push(
				`${change.team.teamName} enters rankings at #${change.team.rank}`
			);
		} else if (change.type === "jump") {
			const prevRank = change.team.previousRank;
			narrative.push(
				`${change.team.teamName} jumps from #${prevRank} to #${change.team.rank}`
			);
		} else if (change.type === "drop") {
			const prevRank = change.team.previousRank;
			narrative.push(
				`${change.team.teamName} falls from #${prevRank} to #${change.team.rank}`
			);
		} else if (change.type === "fallout") {
			narrative.push(`${change.team.teamName} drops out of rankings`);
		}
	});

	return narrative;
}

//============================================
// Ranking display formatting
//============================================

export function formatRankingsDisplay(
	rankings: WeeklyRankings,
	playerTeamId: string
): string {
	let display = `\n=== Week ${rankings.week} ${rankings.leagueType.toUpperCase()} Rankings ===\n\n`;

	rankings.ranked.forEach((team) => {
		const isPlayerTeam = team.teamId === playerTeamId;
		const prefix = isPlayerTeam ? ">>>" : "   ";

		// Determine movement indicator
		let movementIndicator = "   ";
		if (team.previousRank === null) {
			movementIndicator = " NE"; // New entry
		} else if (team.rank < team.previousRank) {
			const jump = team.previousRank - team.rank;
			movementIndicator = ` ↑${jump}`;
		} else if (team.rank > team.previousRank) {
			const drop = team.rank - team.previousRank;
			movementIndicator = ` ↓${drop}`;
		} else {
			movementIndicator = "  =";
		}

		const record = `${team.wins}-${team.losses}`;
		const line = `${prefix} #${team.rank.toString().padStart(2)} ${team.teamName.padEnd(30)} ${record.padStart(5)}${movementIndicator}`;
		display += line + "\n";
	});

	// Add notable changes if any
	if (rankings.notableChanges.length > 0) {
		display += "\n--- Notable Changes ---\n";
		rankings.notableChanges.forEach((change) => {
			display += `* ${change}\n`;
		});
	}

	return display;
}

//============================================
// Upset detection
//============================================

export interface WeekResult {
	winnerId: string;
	winnerName?: string;
	loserId: string;
	loserName?: string;
	winnerScore: number;
	loserScore: number;
	loserRank?: number;
}

export function getUpsetAlerts(
	rankings: WeeklyRankings,
	weekResults: WeekResult[]
): string[] {
	const alerts: string[] = [];

	// Map ranked teams by ID for quick lookup
	const rankedMap = new Map<string, RankedTeam>();
	rankings.ranked.forEach((team) => {
		rankedMap.set(team.teamId, team);
	});

	weekResults.forEach((result) => {
		const rankedLoser = rankedMap.get(result.loserId);
		const rankedWinner = rankedMap.get(result.winnerId);

		// Upset 1: Unranked beats ranked
		if (!rankedWinner && rankedLoser) {
			const margin = result.winnerScore - result.loserScore;
			const winnerName = result.winnerName || "Unranked team";
			const loserDisplay = `#${rankedLoser.rank} ${rankedLoser.teamName}`;

			alerts.push(
				`UPSET: ${loserDisplay} falls to unranked ${winnerName} ${result.winnerScore}-${result.loserScore}`
			);
		}

		// Upset 2: Much lower-ranked beats top-10
		if (
			rankedWinner &&
			rankedLoser &&
			rankedWinner.rank - rankedLoser.rank >= 10 &&
			rankedLoser.rank <= 10
		) {
			const margin = rankedWinner.rank - rankedLoser.rank;
			const winnerDisplay = `#${rankedWinner.rank} ${rankedWinner.teamName}`;
			const loserDisplay = `#${rankedLoser.rank} ${rankedLoser.teamName}`;

			alerts.push(
				`MAJOR UPSET: ${winnerDisplay} defeats top-10 ${loserDisplay} ${result.winnerScore}-${result.loserScore}`
			);
		}
	});

	return alerts;
}
