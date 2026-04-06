// standings.ts - Enhanced league standings with full tiebreaker logic
//
// This utility provides enhanced standings tracking that integrates with the
// simulator layer. It complements the existing standings_model.ts (which
// derives standings from finalized games) by adding streak tracking, last 5
// results, strength of schedule, and playoff seeding.
//
// Use this when you need to display detailed standings information or compute
// playoff seeding. The existing standings_model.ts remains the source of truth
// for win/loss/point calculations.

//============================================
// Enhanced team record with streak and advanced stats
export interface EnhancedTeamRecord {
	teamId: string;
	teamName: string;
	wins: number;
	losses: number;
	ties: number;
	pointsFor: number;
	pointsAgainst: number;
	pointDifferential: number;
	conferenceWins: number;
	conferenceLosses: number;
	divisionWins: number;
	divisionLosses: number;
	streak: number;           // positive = win streak, negative = loss streak, 0 = no games
	last5: string;            // e.g. "WWLWL" (most recent first on left)
	strengthOfSchedule: number; // opponent win% (0.0 to 1.0)
	ranking?: number;         // playoff seeding rank
}

//============================================
// Full standings for a conference/league
export interface LeagueStandings {
	leagueId: string;
	week: number;
	records: EnhancedTeamRecord[];
}

//============================================
// Create an empty team record
export function createEmptyRecord(
	teamId: string,
	teamName: string,
): EnhancedTeamRecord {
	return {
		teamId,
		teamName,
		wins: 0,
		losses: 0,
		ties: 0,
		pointsFor: 0,
		pointsAgainst: 0,
		pointDifferential: 0,
		conferenceWins: 0,
		conferenceLosses: 0,
		divisionWins: 0,
		divisionLosses: 0,
		streak: 0,
		last5: '',
		strengthOfSchedule: 0,
	};
}

//============================================
// Record a single game outcome (mutates the record in place)
export function recordGameOutcome(
	record: EnhancedTeamRecord,
	pointsFor: number,
	pointsAgainst: number,
	isConference: boolean,
	isDivision: boolean,
): void {
	// Determine outcome
	const isWin = pointsFor > pointsAgainst;
	const isTie = pointsFor === pointsAgainst;

	// Update W/L/T
	if (isWin) {
		record.wins++;
	} else if (isTie) {
		record.ties++;
	} else {
		record.losses++;
	}

	// Update points
	record.pointsFor += pointsFor;
	record.pointsAgainst += pointsAgainst;
	record.pointDifferential = record.pointsFor - record.pointsAgainst;

	// Update conference record
	if (isConference) {
		if (isWin) {
			record.conferenceWins++;
		} else if (!isTie) {
			record.conferenceLosses++;
		}
	}

	// Update division record
	if (isDivision) {
		if (isWin) {
			record.divisionWins++;
		} else if (!isTie) {
			record.divisionLosses++;
		}
	}

	// Update streak
	// Positive streak = wins, negative streak = losses, 0 = no streak
	if (isWin) {
		record.streak = record.streak <= 0 ? 1 : record.streak + 1;
	} else if (isTie) {
		record.streak = 0; // Ties break streaks
	} else {
		record.streak = record.streak >= 0 ? -1 : record.streak - 1;
	}

	// Update last 5
	const outcome = isWin ? 'W' : isTie ? 'T' : 'L';
	record.last5 = outcome + record.last5;
	if (record.last5.length > 5) {
		record.last5 = record.last5.slice(0, 5);
	}
}

//============================================
// Sort standings by NFL tiebreaker logic
// Primary: win percentage
// Secondary: conference win percentage
// Tertiary: point differential
// Returns a NEW sorted array (does not mutate input)
export function sortStandings(
	records: EnhancedTeamRecord[],
): EnhancedTeamRecord[] {
	const sorted = [...records].sort((a, b) => {
		// Total games played
		const gamesA = a.wins + a.losses + a.ties;
		const gamesB = b.wins + b.losses + b.ties;

		// Win percentage (wins + 0.5*ties) / total games
		const winPctA = gamesA > 0 ? (a.wins + 0.5 * a.ties) / gamesA : 0;
		const winPctB = gamesB > 0 ? (b.wins + 0.5 * b.ties) / gamesB : 0;

		if (Math.abs(winPctB - winPctA) > 0.0001) {
			return winPctB - winPctA; // Descending
		}

		// Conference win percentage
		const confGamesA = a.conferenceWins + a.conferenceLosses;
		const confGamesB = b.conferenceWins + b.conferenceLosses;

		const confWinPctA = confGamesA > 0
			? (a.conferenceWins + 0.5 * 0) / confGamesA
			: 0;
		const confWinPctB = confGamesB > 0
			? (b.conferenceWins + 0.5 * 0) / confGamesB
			: 0;

		if (Math.abs(confWinPctB - confWinPctA) > 0.0001) {
			return confWinPctB - confWinPctA; // Descending
		}

		// Point differential
		return b.pointDifferential - a.pointDifferential; // Descending
	});

	// Assign ranking
	sorted.forEach((record, index) => {
		record.ranking = index + 1;
	});

	return sorted;
}

//============================================
// Compute strength of schedule from a team's upcoming/completed opponents
// schedule: array of opponent team IDs in order played
// records: all team records (to look up opponent win%)
// Returns opponent average win percentage (0.0 to 1.0)
export function computeStrengthOfSchedule(
	records: EnhancedTeamRecord[],
	schedule: string[], // Array of opponent teamIds
): number {
	if (schedule.length === 0) {
		return 0;
	}

	// Build a map of teamId -> record for quick lookup
	const recordMap = new Map<string, EnhancedTeamRecord>();
	for (const record of records) {
		recordMap.set(record.teamId, record);
	}

	// Sum opponent win percentages
	let totalWinPct = 0;
	let countedGames = 0;

	for (const opponentId of schedule) {
		const opponent = recordMap.get(opponentId);
		if (opponent) {
			const games = opponent.wins + opponent.losses + opponent.ties;
			if (games > 0) {
				const winPct = (opponent.wins + 0.5 * opponent.ties) / games;
				totalWinPct += winPct;
				countedGames++;
			}
		}
	}

	// Return average
	return countedGames > 0 ? totalWinPct / countedGames : 0;
}

//============================================
// Get playoff seeds from sorted standings
// Returns top N team IDs ordered by seeding rank
export function getPlayoffSeeds(
	standings: LeagueStandings,
	numSeeds: number,
): string[] {
	const seeds: string[] = [];
	const limit = Math.min(numSeeds, standings.records.length);

	for (let i = 0; i < limit; i++) {
		seeds.push(standings.records[i].teamId);
	}

	return seeds;
}

//============================================
// Format standings as a readable text table
// Highlights the player's team with a leading '>' marker
// Columns: Rank, Team, W-L-T, PF-PA, Diff, Streak, Last 5
export function formatStandingsTable(
	standings: LeagueStandings,
	playerTeamId: string,
): string {
	const lines: string[] = [];

	// Header
	lines.push(
		'Rank  Team                  Record       PF-PA   Diff  Streak  Last5',
	);
	lines.push(
		'----  --------------------  ----------  -------  ----  ------  -----',
	);

	// Body
	for (const record of standings.records) {
		const rank = record.ranking ?? '?';
		const rankStr = rank.toString().padStart(2);

		// Team name (add marker for player's team)
		const marker = record.teamId === playerTeamId ? '>' : ' ';
		const teamStr = marker + record.teamName.substring(0, 19).padEnd(19);

		// Record
		const recordStr = `${record.wins}-${record.losses}-${record.ties}`
			.padEnd(10);

		// Points for and against
		const pfpaStr = `${record.pointsFor}-${record.pointsAgainst}`
			.padStart(7);

		// Point differential
		const diffStr = record.pointDifferential.toString().padStart(4);

		// Streak
		const streakDisplay = record.streak === 0
			? '--'
			: record.streak > 0
			? `W${record.streak}`
			: `L${Math.abs(record.streak)}`;
		const streakStr = streakDisplay.padStart(6);

		// Last 5
		const last5Str = record.last5 || '--';

		const line = `${rankStr}  ${teamStr}  ${recordStr}  ${pfpaStr}  ${diffStr}  ${streakStr}  ${last5Str}`;
		lines.push(line);
	}

	return lines.join('\n');
}
