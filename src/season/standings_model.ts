// standings_model.ts - derive standings from finalized games
//
// Standings are always computed, never stored. This ensures they
// cannot desync from the actual game results.

import { TeamId, StandingsRow } from './season_types.js';
import { SeasonGame } from './game_model.js';
import { SeasonTeam } from './team_model.js';

//============================================
// Calculate standings from finalized games
// Returns StandingsRow[] sorted by: wins desc, losses asc, pointsFor desc
export function calculateStandings(
	games: SeasonGame[],
	teams: Map<TeamId, SeasonTeam>,
): StandingsRow[] {
	// Initialize a row for every team
	const rows = new Map<TeamId, StandingsRow>();
	for (const [teamId, team] of teams) {
		rows.set(teamId, {
			teamId,
			name: team.getDisplayName(),
			wins: 0,
			losses: 0,
			ties: 0,
			pointsFor: 0,
			pointsAgainst: 0,
			conferenceWins: 0,
			conferenceLosses: 0,
		});
	}

	// Iterate finalized games and accumulate results
	for (const game of games) {
		if (game.status !== 'final') {
			continue;
		}
		if (game.homeScore === undefined || game.awayScore === undefined) {
			continue;
		}

		const homeRow = rows.get(game.homeTeamId);
		const awayRow = rows.get(game.awayTeamId);

		// Update points for/against
		if (homeRow) {
			homeRow.pointsFor += game.homeScore;
			homeRow.pointsAgainst += game.awayScore;
		}
		if (awayRow) {
			awayRow.pointsFor += game.awayScore;
			awayRow.pointsAgainst += game.homeScore;
		}

		// Determine winner and update records
		const winner = game.getWinner();
		if (winner === undefined) {
			// Tie
			if (homeRow) {
				homeRow.ties += 1;
			}
			if (awayRow) {
				awayRow.ties += 1;
			}
		} else if (winner === game.homeTeamId) {
			if (homeRow) {
				homeRow.wins += 1;
			}
			if (awayRow) {
				awayRow.losses += 1;
			}
		} else {
			if (homeRow) {
				homeRow.losses += 1;
			}
			if (awayRow) {
				awayRow.wins += 1;
			}
		}

		// Conference record
		if (game.isConferenceGame) {
			if (winner === game.homeTeamId) {
				if (homeRow) {
					homeRow.conferenceWins += 1;
				}
				if (awayRow) {
					awayRow.conferenceLosses += 1;
				}
			} else if (winner === game.awayTeamId) {
				if (homeRow) {
					homeRow.conferenceLosses += 1;
				}
				if (awayRow) {
					awayRow.conferenceWins += 1;
				}
			}
		}
	}

	// Sort: wins desc, losses asc, pointsFor desc
	const sorted = Array.from(rows.values()).sort((a, b) => {
		if (b.wins !== a.wins) {
			return b.wins - a.wins;
		}
		if (a.losses !== b.losses) {
			return a.losses - b.losses;
		}
		return b.pointsFor - a.pointsFor;
	});

	return sorted;
}

//============================================
// Calculate standings filtered to a specific conference
export function calculateConferenceStandings(
	games: SeasonGame[],
	teams: Map<TeamId, SeasonTeam>,
	conferenceId: string,
): StandingsRow[] {
	// Filter teams to conference
	const confTeams = new Map<TeamId, SeasonTeam>();
	for (const [teamId, team] of teams) {
		if (team.conferenceId === conferenceId) {
			confTeams.set(teamId, team);
		}
	}

	// Filter games to those involving at least one conference team
	const confGames = games.filter(game =>
		confTeams.has(game.homeTeamId) || confTeams.has(game.awayTeamId)
	);

	return calculateStandings(confGames, confTeams);
}

//============================================
// Simple assertions
const testTeams = new Map<TeamId, SeasonTeam>();
const teamA = new SeasonTeam('a', 'Alpha', 'Wolves', 80, 'supportive', 'north');
const teamB = new SeasonTeam('b', 'Beta', 'Bears', 70, 'demanding', 'north');
const teamC = new SeasonTeam('c', 'Gamma', 'Hawks', 60, 'volatile', 'north');
testTeams.set('a', teamA);
testTeams.set('b', teamB);
testTeams.set('c', teamC);

// A beats B 28-14, A beats C 35-7, B beats C 21-17
const g1 = new SeasonGame('g1', 1, 'a', 'b', true);
g1.recordResult(28, 14);
const g2 = new SeasonGame('g2', 2, 'a', 'c', true);
g2.recordResult(35, 7);
const g3 = new SeasonGame('g3', 3, 'b', 'c', true);
g3.recordResult(21, 17);

const standings = calculateStandings([g1, g2, g3], testTeams);
console.assert(standings.length === 3, 'Should have 3 teams in standings');
console.assert(standings[0].teamId === 'a', 'Team A should be first (2-0)');
console.assert(standings[0].wins === 2, 'Team A should have 2 wins');
console.assert(standings[0].losses === 0, 'Team A should have 0 losses');
console.assert(standings[1].teamId === 'b', 'Team B should be second (1-1)');
console.assert(standings[2].teamId === 'c', 'Team C should be third (0-2)');
console.assert(standings[0].pointsFor === 63, 'Team A pointsFor should be 28+35=63');
console.assert(standings[0].conferenceWins === 2, 'Team A should have 2 conf wins');
