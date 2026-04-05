// season_types.ts - shared types for the season simulation layer
//
// Small shared types only. Keep this boring and reusable.

//============================================
// Unique identifiers
export type TeamId = string;
export type GameId = string;

//============================================
// Game lifecycle status
export type GameStatus = 'scheduled' | 'final';

//============================================
// One row in a standings table (always derived from finalized games)
export interface StandingsRow {
	teamId: TeamId;
	name: string;
	wins: number;
	losses: number;
	ties: number;
	pointsFor: number;
	pointsAgainst: number;
	conferenceWins: number;
	conferenceLosses: number;
	conferenceTies: number;
}

//============================================
// Playoff seed entry
export interface PlayoffSeed {
	teamId: TeamId;
	seed: number;
	wins: number;
	losses: number;
}
