//============================================
// Weekly Narrative Generator
//
// Produces story beats from league-wide simulation results each week.
// Scans standings, rankings, and game results for notable events.
// Returns narrative strings the UI can display in a weekly recap.
//============================================

//============================================
// A single narrative beat for the weekly recap
export interface NarrativeBeat {
	headline: string;
	detail: string;
	importance: number;  // 0-100, higher = more notable
}

//============================================
// Weekly recap containing all narrative beats
export interface WeeklyRecap {
	week: number;
	beats: NarrativeBeat[];
}

//============================================
// Game result summary for narrative scanning
export interface GameOutcomeSummary {
	homeTeamId: string;
	homeTeamName: string;
	awayTeamId: string;
	awayTeamName: string;
	homeScore: number;
	awayScore: number;
	homeRanking?: number;
	awayRanking?: number;
}

//============================================
// Team record snapshot for streak detection
export interface TeamSnapshot {
	teamId: string;
	teamName: string;
	wins: number;
	losses: number;
	streak: number;  // positive = win streak
	ranking?: number;
}

//============================================
// Build the weekly recap from game results and standings
export function buildWeeklyRecap(
	week: number,
	gameResults: GameOutcomeSummary[],
	teamSnapshots: TeamSnapshot[],
	playerTeamId: string,
): WeeklyRecap {
	const beats: NarrativeBeat[] = [];

	// Scan each game for notable outcomes
	for (const game of gameResults) {
		// Skip the player's game (they already saw that)
		if (game.homeTeamId === playerTeamId || game.awayTeamId === playerTeamId) {
			continue;
		}

		const margin = Math.abs(game.homeScore - game.awayScore);
		const homeWon = game.homeScore > game.awayScore;
		const winnerName = homeWon ? game.homeTeamName : game.awayTeamName;
		const loserName = homeWon ? game.awayTeamName : game.homeTeamName;
		const winnerScore = Math.max(game.homeScore, game.awayScore);
		const loserScore = Math.min(game.homeScore, game.awayScore);

		// Upset: ranked team loses to unranked
		const winnerRank = homeWon ? game.homeRanking : game.awayRanking;
		const loserRank = homeWon ? game.awayRanking : game.homeRanking;
		if (loserRank !== undefined && loserRank <= 25 && winnerRank === undefined) {
			beats.push({
				headline: `Upset! #${loserRank} ${loserName} falls`,
				detail: `${winnerName} defeats #${loserRank} ${loserName} ${winnerScore}-${loserScore}`,
				importance: 90 - loserRank,
			});
		}

		// Blowout: margin >= 28
		if (margin >= 28) {
			beats.push({
				headline: `${winnerName} dominates`,
				detail: `${winnerName} cruises past ${loserName} ${winnerScore}-${loserScore}`,
				importance: 40,
			});
		}

		// Thriller: margin <= 3 and high scoring
		if (margin <= 3 && (game.homeScore + game.awayScore) >= 40) {
			beats.push({
				headline: "Instant classic",
				detail: `${winnerName} edges ${loserName} ${winnerScore}-${loserScore} in a thriller`,
				importance: 60,
			});
		}
	}

	// Scan team snapshots for streaks
	for (const snap of teamSnapshots) {
		if (snap.teamId === playerTeamId) {
			continue;
		}

		// Long win streak
		if (snap.streak >= 5) {
			beats.push({
				headline: `${snap.teamName} stays hot`,
				detail: `${snap.teamName} has won ${snap.streak} straight games`,
				importance: 35 + snap.streak * 3,
			});
		}

		// Long losing streak
		if (snap.streak <= -5) {
			const lossStreak = Math.abs(snap.streak);
			beats.push({
				headline: `${snap.teamName} struggles continue`,
				detail: `${snap.teamName} has lost ${lossStreak} straight games`,
				importance: 30,
			});
		}

		// Undefeated team (at least 4 games in)
		if (snap.losses === 0 && snap.wins >= 4) {
			beats.push({
				headline: `${snap.teamName} remains unbeaten`,
				detail: `${snap.teamName} improves to ${snap.wins}-0`,
				importance: 50 + snap.wins * 2,
			});
		}
	}

	// Sort by importance descending, keep top 5
	beats.sort((a, b) => b.importance - a.importance);
	const topBeats = beats.slice(0, 5);

	return { week, beats: topBeats };
}

//============================================
// Format the weekly recap as displayable text
export function formatWeeklyRecap(recap: WeeklyRecap): string {
	if (recap.beats.length === 0) {
		return "";
	}

	let output = `Week ${recap.week} Around the League:\n`;
	for (const beat of recap.beats) {
		output += `  ${beat.headline} - ${beat.detail}\n`;
	}
	return output;
}

//============================================
// Detect playoff clinch/elimination scenarios
export function detectPlayoffImplications(
	teamSnapshots: TeamSnapshot[],
	weeksRemaining: number,
	playoffSpots: number,
): NarrativeBeat[] {
	const beats: NarrativeBeat[] = [];
	const sorted = [...teamSnapshots].sort((a, b) => {
		const aWinPct = a.wins / Math.max(1, a.wins + a.losses);
		const bWinPct = b.wins / Math.max(1, b.wins + b.losses);
		return bWinPct - aWinPct;
	});

	for (let i = 0; i < sorted.length; i++) {
		const team = sorted[i];
		const totalGames = team.wins + team.losses;
		if (totalGames < 3) {
			continue;
		}

		// Clinch: team has enough wins that they can't fall below playoff line
		// Simplified: if wins > (total possible games / 2) + remaining games for bubble teams
		const maxPossibleWins = totalGames + weeksRemaining;
		const bubbleTeam = sorted[Math.min(playoffSpots, sorted.length - 1)];
		const bubbleMaxWins = bubbleTeam.wins + weeksRemaining;
		if (team.wins > bubbleMaxWins && i < playoffSpots) {
			beats.push({
				headline: `${team.teamName} clinches playoff spot`,
				detail: `${team.teamName} (${team.wins}-${team.losses}) secures a postseason berth`,
				importance: 75,
			});
		}

		// Elimination: can't catch the playoff cutoff even with all remaining wins
		if (i >= playoffSpots) {
			const bestCase = team.wins + weeksRemaining;
			const cutoffTeam = sorted[playoffSpots - 1];
			if (bestCase < cutoffTeam.wins) {
				beats.push({
					headline: `${team.teamName} eliminated`,
					detail: `${team.teamName} (${team.wins}-${team.losses}) is eliminated from playoff contention`,
					importance: 45,
				});
			}
		}
	}

	return beats;
}
