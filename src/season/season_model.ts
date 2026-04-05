// season_model.ts - LeagueSeason: the single source of truth
//
// Owns all teams, all games, the current week, and derived standings.
// Records are always derived from finalized games, never stored separately.
// advanceWeek() refuses to advance if any current-week game is not final.

import { TeamId, GameId, StandingsRow } from './season_types.js';
import { SeasonTeam } from './team_model.js';
import { SeasonGame } from './game_model.js';
import { calculateStandings, calculateConferenceStandings } from './standings_model.js';
import { CareerPhase } from '../player.js';

//============================================
// Schedule display row for UI consumption
export interface ScheduleDisplayRow {
	week: number;
	opponentName: string;
	opponentId: TeamId;
	isConferenceGame: boolean;
	played: boolean;
	result: 'win' | 'loss' | 'tie' | undefined;
	teamScore: number | undefined;
	opponentScore: number | undefined;
}

//============================================
// The season object. One per active season.
export class LeagueSeason {
	teams: Map<TeamId, SeasonTeam>;
	games: SeasonGame[];
	currentWeek: number;
	seasonLength: number;
	playerTeamId: TeamId;
	phase: CareerPhase;

	constructor(
		teams: Map<TeamId, SeasonTeam>,
		games: SeasonGame[],
		seasonLength: number,
		playerTeamId: TeamId,
		phase: CareerPhase,
	) {
		this.teams = teams;
		this.games = games;
		this.seasonLength = seasonLength;
		this.playerTeamId = playerTeamId;
		this.phase = phase;
		this.currentWeek = 0;
	}

	//============================================
	// MUTATION: Record a game result by game id
	recordGameResult(gameId: GameId, homeScore: number, awayScore: number): void {
		const game = this.games.find(g => g.id === gameId);
		if (!game) {
			throw new Error(`Game not found: ${gameId}`);
		}
		if (game.status === 'final') {
			throw new Error(`Game already finalized: ${gameId}`);
		}
		game.recordResult(homeScore, awayScore);
	}

	//============================================
	// MUTATION: Advance to the next week.
	// STRICT: refuses if any current-week game is not finalized.
	// Returns true if there are more weeks, false if season is over.
	advanceWeek(): boolean {
		// Check that all current week games are finalized (skip week 0 which is pre-season)
		if (this.currentWeek > 0) {
			const unfinished = this.getGamesForWeek(this.currentWeek)
				.filter(g => g.status !== 'final');
			if (unfinished.length > 0) {
				throw new Error(
					`Cannot advance: ${unfinished.length} unfinished game(s) in week ${this.currentWeek}`
				);
			}
		}

		this.currentWeek += 1;

		// Return whether the season continues
		return this.currentWeek <= this.seasonLength;
	}

	//============================================
	// QUERY: Get all games for a specific week
	getGamesForWeek(week: number): SeasonGame[] {
		return this.games.filter(g => g.week === week);
	}

	//============================================
	// QUERY: Get full standings (all teams or filtered by conference)
	getStandings(conferenceId?: string): StandingsRow[] {
		if (conferenceId !== undefined) {
			return calculateConferenceStandings(this.games, this.teams, conferenceId);
		}
		return calculateStandings(this.games, this.teams);
	}

	//============================================
	// QUERY: Derive a team's record from finalized games
	getTeamRecord(teamId: TeamId): { wins: number; losses: number; ties: number } {
		let wins = 0;
		let losses = 0;
		let ties = 0;

		for (const game of this.games) {
			if (game.status !== 'final') {
				continue;
			}
			if (!game.involvesTeam(teamId)) {
				continue;
			}

			const winner = game.getWinner();
			if (winner === undefined) {
				ties += 1;
			} else if (winner === teamId) {
				wins += 1;
			} else {
				losses += 1;
			}
		}

		return { wins, losses, ties };
	}

	//============================================
	// QUERY: Get the game for a team in the current week
	getNextOpponent(teamId: TeamId): SeasonGame | undefined {
		return this.games.find(
			g => g.week === this.currentWeek && g.involvesTeam(teamId)
		);
	}

	//============================================
	// QUERY: Get the player's current-week game
	getPlayerGame(): SeasonGame | undefined {
		return this.getNextOpponent(this.playerTeamId);
	}

	//============================================
	// QUERY: Get display-friendly schedule for a team
	getScheduleDisplay(teamId: TeamId): ScheduleDisplayRow[] {
		// Get all games for this team, sorted by week
		const teamGames = this.games
			.filter(g => g.involvesTeam(teamId))
			.sort((a, b) => a.week - b.week);

		return teamGames.map(game => {
			const opponentId = game.getOpponentId(teamId);
			const opponent = opponentId ? this.teams.get(opponentId) : undefined;
			const opponentName = opponent ? opponent.getDisplayName() : 'Unknown';

			let result: 'win' | 'loss' | 'tie' | undefined = undefined;
			if (game.status === 'final') {
				const winner = game.getWinner();
				if (winner === undefined) {
					result = 'tie';
				} else if (winner === teamId) {
					result = 'win';
				} else {
					result = 'loss';
				}
			}

			return {
				week: game.week,
				opponentName,
				opponentId: opponentId || '',
				isConferenceGame: game.isConferenceGame,
				played: game.status === 'final',
				result,
				teamScore: game.getTeamScore(teamId),
				opponentScore: game.getOpponentScore(teamId),
			};
		});
	}

	//============================================
	// QUERY: Is the season over?
	isSeasonOver(): boolean {
		return this.currentWeek > this.seasonLength;
	}

	//============================================
	// QUERY: Get a team by id
	getTeam(teamId: TeamId): SeasonTeam | undefined {
		return this.teams.get(teamId);
	}

	//============================================
	// QUERY: Get current week number
	getCurrentWeek(): number {
		return this.currentWeek;
	}

	//============================================
	// QUERY: Shortcut for player team record
	getPlayerRecord(): { wins: number; losses: number; ties: number } {
		return this.getTeamRecord(this.playerTeamId);
	}

	//============================================
	// QUERY: Get the player's team object
	getPlayerTeam(): SeasonTeam | undefined {
		return this.teams.get(this.playerTeamId);
	}
}
