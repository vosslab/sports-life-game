// aggregators.ts - aggregate and compute stats across seasons

import { LeagueSeason } from '../../src/season/season_model.js';
import { AggregateStats, JsonOutput } from './types.js';
import type { SimConfig } from './types.js';

//============================================
export function aggregateWinners(seasons: readonly LeagueSeason[]): Map<string, number> {
	const wins = new Map<string, number>();
	for (const season of seasons) {
		const standings = season.getStandings('main_conference');
		if (standings.length === 0) continue;
		const top = standings[0];
		wins.set(top.name, (wins.get(top.name) ?? 0) + 1);
	}
	return wins;
}

//============================================
export function aggregatePlayerTeamStats(
	seasons: readonly LeagueSeason[],
): AggregateStats {
	const playerTeamName = seasons.length > 0
		? seasons[0].getTeam('player')?.getDisplayName() ?? 'Player Team'
		: 'Player Team';

	const seasonStats: Array<{
		wins: number;
		losses: number;
		ties: number;
		pf: number;
		pa: number;
		diff: number;
		rank: number;
	}> = [];

	for (const season of seasons) {
		const standings = season.getStandings('main_conference');
		const playerRow = standings.find(r => r.name === playerTeamName);
		if (!playerRow) continue;

		const rank = standings.findIndex(r => r.name === playerTeamName) + 1;
		const diff = playerRow.pointsFor - playerRow.pointsAgainst;
		seasonStats.push({
			wins: playerRow.wins,
			losses: playerRow.losses,
			ties: playerRow.ties,
			pf: playerRow.pointsFor,
			pa: playerRow.pointsAgainst,
			diff,
			rank,
		});
	}

	if (seasonStats.length === 0) {
		return {
			playerAvgWins: 0,
			playerAvgLosses: 0,
			undefeatedRate: 0,
			conferenceWinRate: 0,
			avgPF: 0,
			avgPA: 0,
			avgDiff: 0,
			bestSeason: { wins: 0, losses: 0, diff: 0 },
			worstSeason: { wins: 0, losses: 0, diff: 0 },
			rankDistribution: new Map(),
		};
	}

	const totalWins = seasonStats.reduce((s, r) => s + r.wins, 0);
	const totalLosses = seasonStats.reduce((s, r) => s + r.losses, 0);
	const undefeated = seasonStats.filter(r => r.losses === 0).length;
	const totalPF = seasonStats.reduce((s, r) => s + r.pf, 0);
	const totalPA = seasonStats.reduce((s, r) => s + r.pa, 0);
	const totalDiff = seasonStats.reduce((s, r) => s + r.diff, 0);

	const bestIdx = seasonStats.reduce((best, curr, i) => {
		const c = seasonStats[best];
		if (curr.wins !== c.wins) return curr.wins > c.wins ? i : best;
		return curr.diff > c.diff ? i : best;
	}, 0);
	const worstIdx = seasonStats.reduce((worst, curr, i) => {
		const c = seasonStats[worst];
		if (curr.wins !== c.wins) return curr.wins < c.wins ? i : worst;
		return curr.diff < c.diff ? i : worst;
	}, 0);

	const rankDist = new Map<number, number>();
	for (const stat of seasonStats) {
		rankDist.set(stat.rank, (rankDist.get(stat.rank) ?? 0) + 1);
	}

	return {
		playerAvgWins: totalWins / seasonStats.length,
		playerAvgLosses: totalLosses / seasonStats.length,
		undefeatedRate: undefeated / seasonStats.length,
		conferenceWinRate: totalWins / (totalWins + totalLosses),
		avgPF: totalPF / seasonStats.length,
		avgPA: totalPA / seasonStats.length,
		avgDiff: totalDiff / seasonStats.length,
		bestSeason: {
			wins: seasonStats[bestIdx].wins,
			losses: seasonStats[bestIdx].losses,
			diff: seasonStats[bestIdx].diff,
		},
		worstSeason: {
			wins: seasonStats[worstIdx].wins,
			losses: seasonStats[worstIdx].losses,
			diff: seasonStats[worstIdx].diff,
		},
		rankDistribution: rankDist,
	};
}

//============================================
export function buildJsonOutput(
	cfg: SimConfig,
	seasons: readonly LeagueSeason[],
): JsonOutput {
	const playerTeamName = `${cfg.playerName} ${cfg.playerMascot}`;
	const allSeasons = seasons.map(season => {
		const standings = season.getStandings('main_conference');
		return {
			standings: standings.map((row, idx) => ({
				rank: idx + 1,
				name: row.name,
				wins: row.wins,
				losses: row.losses,
				ties: row.ties,
				pf: row.pointsFor,
				pa: row.pointsAgainst,
				diff: row.pointsFor - row.pointsAgainst,
				confRecord: `${row.conferenceWins}-${row.conferenceLosses}`,
			})),
		};
	});

	const wins = aggregateWinners(seasons);
	const conferenceTitleCounts: Record<string, number> = {};
	for (const [name, count] of wins) {
		conferenceTitleCounts[name] = count;
	}

	return {
		seed: cfg.seed,
		runs: cfg.runs,
		playerTeam: playerTeamName,
		playerStrength: cfg.playerStrength,
		seasons: allSeasons,
		aggregateStats: aggregatePlayerTeamStats(seasons),
		conferenceTitleCounts,
	};
}
