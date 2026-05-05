// display.ts - output formatting functions for sim_conference_season

import { LeagueSeason } from '../../src/season/season_model.js';
import { StandingsRow } from '../../src/season/season_types.js';
import { AggregateStats } from './types.js';

//============================================
function pad(s: string | number, width: number, right: boolean = true): string {
	const str = String(s);
	if (str.length >= width) return str.slice(0, width);
	const padding = ' '.repeat(width - str.length);
	return right ? str + padding : padding + str;
}

//============================================
export function printStandings(season: LeagueSeason, playerTeamId: string): void {
	const standings: StandingsRow[] = season.getStandings('main_conference');
	console.log('');
	console.log('Conference standings (main_conference):');
	console.log(
		'    ' + pad('Team', 32) + ' ' + pad('W-L', 5, false)
		+ '  ' + pad('Conf', 5, false) + '  ' + pad('PF', 5, false)
		+ '  ' + pad('PA', 5, false) + '  Diff',
	);
	console.log('    ' + '-'.repeat(64));
	for (const row of standings) {
		const marker = row.teamId === playerTeamId ? '>>>' : '   ';
		const record = `${row.wins}-${row.losses}`;
		const conf = `${row.conferenceWins}-${row.conferenceLosses}`;
		const diff = row.pointsFor - row.pointsAgainst;
		const diffStr = (diff >= 0 ? '+' : '') + String(diff);
		console.log(
			`${marker} ${pad(row.name, 32)} ${pad(record, 5, false)}  `
			+ `${pad(conf, 5, false)}  ${pad(row.pointsFor, 5, false)}  `
			+ `${pad(row.pointsAgainst, 5, false)}  ${diffStr}`,
		);
	}
}

//============================================
export function printAggregateSummary(
	wins: Map<string, number>, totalRuns: number, playerName: string,
): void {
	console.log('');
	console.log(`Conference titles across ${totalRuns} season(s):`);
	const entries = [...wins.entries()].sort((a, b) => b[1] - a[1]);
	for (const [name, count] of entries) {
		const pct = ((count / totalRuns) * 100).toFixed(1);
		const marker = name === playerName ? '>>>' : '   ';
		console.log(`${marker} ${pad(name, 32)} ${pad(count, 4, false)}  ${pct}%`);
	}
}

//============================================
export function printAggregatePlayerStats(stats: AggregateStats, totalRuns: number): void {
	console.log('');
	console.log(`Player team aggregate stats across ${totalRuns} season(s):`);
	console.log(
		`  Avg record:        ${stats.playerAvgWins.toFixed(1)}-${stats.playerAvgLosses.toFixed(1)}`,
	);
	console.log(
		`  Win pct:           ${(stats.conferenceWinRate * 100).toFixed(1)}%`,
	);
	console.log(
		`  Undefeated rate:   ${(stats.undefeatedRate * 100).toFixed(1)}%`,
	);
	console.log(
		`  Avg PF/PA:         ${stats.avgPF.toFixed(1)}/${stats.avgPA.toFixed(1)} `
		+ `(diff ${(stats.avgDiff >= 0 ? '+' : '')}${stats.avgDiff.toFixed(1)})`,
	);
	console.log(
		`  Best season:       ${stats.bestSeason.wins}-${stats.bestSeason.losses} `
		+ `(diff ${(stats.bestSeason.diff >= 0 ? '+' : '')}${stats.bestSeason.diff})`,
	);
	console.log(
		`  Worst season:      ${stats.worstSeason.wins}-${stats.worstSeason.losses} `
		+ `(diff ${(stats.worstSeason.diff >= 0 ? '+' : '')}${stats.worstSeason.diff})`,
	);
	console.log('');
	console.log('  Conference rank distribution:');
	for (let rank = 1; rank <= 8; rank++) {
		const count = stats.rankDistribution.get(rank) ?? 0;
		const marker = count > 0 ? '#' : '.';
		const pct = count > 0 ? `(${((count / totalRuns) * 100).toFixed(1)}%)` : '';
		console.log(`    Rank ${rank}: ${marker.repeat(count)} ${pct}`);
	}
}

//============================================
export function printPlayerTeamSchedule(season: LeagueSeason): void {
	const playerTeam = season.getTeam('player');
	if (!playerTeam) return;

	const playerTeamName = playerTeam.getDisplayName();
	const playerGames = season.games.filter(g =>
		g.homeTeamId === 'player' || g.awayTeamId === 'player'
	);
	playerGames.sort((a, b) => a.week - b.week);

	console.log('');
	console.log(`Schedule for ${playerTeamName}:`);
	console.log(
		'  Week  vs Opponent               Strength  Score    Record  Type',
	);
	console.log('  ' + '-'.repeat(66));

	let wins = 0;
	let losses = 0;

	for (const game of playerGames) {
		if (game.status !== 'final' || game.homeScore === undefined) {
			continue;
		}

		const isHome = game.homeTeamId === 'player';
		const oppId = isHome ? game.awayTeamId : game.homeTeamId;
		const oppTeam = season.getTeam(oppId);
		if (!oppTeam) continue;

		const playerScore = isHome ? game.homeScore : game.awayScore;
		const oppScore = isHome ? game.awayScore : game.homeScore;

		const oppName = oppTeam.getDisplayName().substring(0, 25).padEnd(25);
		const strength = `${oppTeam.strength}`.padStart(3);
		const vs = isHome ? 'vs' : '@';
		const scoreStr = `${playerScore}-${oppScore}`;

		if (playerScore > oppScore) {
			wins++;
		} else {
			losses++;
		}

		const confType = game.isConferenceGame ? 'Conf' : 'NC';
		const record = `${wins}-${losses}`;

		console.log(
			`  ${pad(game.week, 3, false)}   ${vs} ${pad(oppName, 25)}  `
			+ `${strength}    ${pad(scoreStr, 7)}  ${pad(record, 6)}  ${confType}`,
		);
	}
}

//============================================
export function printBoxScores(season: LeagueSeason): void {
	const confGames = season.games.filter(g => g.isConferenceGame && g.status === 'final');
	confGames.sort((a, b) => a.week - b.week);

	console.log('');
	console.log('All conference games:');
	console.log(
		'  Wk  Home Team                    Score  Away Team                    Score',
	);
	console.log('  ' + '-'.repeat(78));

	for (const game of confGames) {
		if (game.homeScore === undefined || game.awayScore === undefined) continue;

		const homeTeam = season.getTeam(game.homeTeamId);
		const awayTeam = season.getTeam(game.awayTeamId);
		if (!homeTeam || !awayTeam) continue;

		const homeName = homeTeam.getDisplayName().substring(0, 28).padEnd(28);
		const awayName = awayTeam.getDisplayName().substring(0, 28).padEnd(28);
		const homeScore = `${game.homeScore}`.padStart(3);
		const awayScore = `${game.awayScore}`.padStart(3);

		console.log(
			`  ${pad(game.week, 2, false)}  ${homeName}  ${homeScore}  `
			+ `${awayName}  ${awayScore}`,
		);
	}
}

//============================================
export function printPowerRanking(season: LeagueSeason): void {
	const standings = season.getStandings('main_conference');

	const strengths = standings.map(s => season.getTeam(s.teamId)?.strength ?? 0);
	const diffs = standings.map(s => s.pointsFor - s.pointsAgainst);
	const maxStrength = Math.max(...strengths);
	const minStrength = Math.min(...strengths);
	const maxDiff = Math.max(...diffs.map(d => Math.abs(d)));

	const scores = standings.map((row, i) => {
		const total = row.wins + row.losses + row.ties || 1;
		const recordPct = row.wins / total;
		const diffNorm = maxDiff > 0 ? diffs[i] / maxDiff : 0;
		const strengthNorm =
			maxStrength > minStrength
				? (strengths[i] - minStrength) / (maxStrength - minStrength)
				: 0;
		const score = recordPct * 0.6 + diffNorm * 0.3 + strengthNorm * 0.1;
		return { row, score, strength: strengths[i], diff: diffs[i] };
	});

	scores.sort((a, b) => b.score - a.score);

	console.log('');
	console.log('Tool-side power ranking (not game canon):');
	console.log(
		'    Team                           Score    W-L  Strength  Diff',
	);
	console.log('    ' + '-'.repeat(60));

	for (let rank = 0; rank < scores.length; rank++) {
		const { row, score, strength, diff } = scores[rank];
		const record = `${row.wins}-${row.losses}`;
		const marker = row.teamId === 'player' ? '>>>' : '   ';
		const diffStr = (diff >= 0 ? '+' : '') + String(diff);
		console.log(
			`${marker} ${rank + 1}. ${pad(row.name, 32)} ${score.toFixed(2)}   `
			+ `${pad(record, 4, false)}    ${pad(strength, 3, false)}       ${diffStr}`,
		);
	}
}

//============================================
export function printAwards(season: LeagueSeason): void {
	const standings = season.getStandings('main_conference');

	console.log('');
	console.log('Awards (heuristic, not game canon):');

	if (standings.length > 0) {
		const best = standings[0];
		console.log(`  Offensive Player of Year: ${best.name} QB (best record)`);
	}

	let dpoyRow = standings[0];
	for (const row of standings) {
		const curr = row.pointsAgainst;
		const comp = dpoyRow.pointsAgainst;
		if (curr < comp) {
			dpoyRow = row;
		}
	}
	console.log(`  Defensive Player of Year: ${dpoyRow.name} DE (fewest points allowed)`);

	if (standings.length > 1) {
		let breakout = standings[0];
		let maxDeviation = -100;
		for (const row of standings) {
			const team = season.getTeam(row.teamId);
			if (!team) continue;
			const expectedWinPct = team.strength / 100;
			const actualWinPct = (row.wins + row.ties * 0.5) / (row.wins + row.losses + row.ties || 1);
			const deviation = actualWinPct - expectedWinPct;
			if (deviation > maxDeviation) {
				maxDeviation = deviation;
				breakout = row;
			}
		}
		console.log(`  Breakout Player: ${breakout.name} (exceeded strength projection)`);
	}
}
