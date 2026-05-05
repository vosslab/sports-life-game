// types.ts - shared types for the season simulator

export interface SimConfig {
	seed: number;
	playerStrength: number;
	playerName: string;
	playerMascot: string;
	runs: number;
	quiet: boolean;
	details: boolean;
	boxScores: boolean;
	rankings: boolean;
	awards: boolean;
	json: boolean;
	conferenceTeams: number;
	gamesPerTeam: number;
	nonConferenceTeams: number;
}

export interface AggregateStats {
	playerAvgWins: number;
	playerAvgLosses: number;
	undefeatedRate: number;
	conferenceWinRate: number;
	avgPF: number;
	avgPA: number;
	avgDiff: number;
	bestSeason: { wins: number; losses: number; diff: number };
	worstSeason: { wins: number; losses: number; diff: number };
	rankDistribution: Map<number, number>;
}

export interface JsonOutput {
	seed: number;
	runs: number;
	playerTeam: string;
	playerStrength: number;
	seasons: Array<{
		standings: Array<{
			rank: number;
			name: string;
			wins: number;
			losses: number;
			ties: number;
			pf: number;
			pa: number;
			diff: number;
			confRecord: string;
		}>;
	}>;
	aggregateStats: AggregateStats;
	conferenceTitleCounts: Record<string, number>;
}
