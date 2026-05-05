// career_stats_view.ts - render per-season stat history table for the Career tab.
//
// Reads Player.careerHistory (one SeasonRecord per completed season) and the
// current in-progress season stats, picks position-relevant columns, and
// builds a compact HTML table.

import { Player, Position, SeasonRecord, SeasonStatTotals } from './player.js';

//============================================
// One column descriptor for the stat table
export interface StatColumn {
	key: keyof SeasonStatTotals | 'wl' | 'year' | 'team' | 'pos';
	label: string;
	// Optional formatter for numeric values; default toString
	format?: (val: number) => string;
}

//============================================
// Default integer formatter
function fmtInt(val: number): string {
	return Math.round(val).toString();
}

//============================================
// Pick stat columns appropriate to a position. Returns ordered list.
// Common columns (year/team/pos/GP/WL) are always prepended by the renderer.
export function pickStatColumns(position: Position | null): StatColumn[] {
	if (position === 'QB') {
		return [
			{ key: 'completions', label: 'Cmp', format: fmtInt },
			{ key: 'attempts', label: 'Att', format: fmtInt },
			{ key: 'passYards', label: 'PYds', format: fmtInt },
			{ key: 'passTds', label: 'PTD', format: fmtInt },
			{ key: 'passInts', label: 'INT', format: fmtInt },
		];
	}
	if (position === 'RB') {
		return [
			{ key: 'carries', label: 'Car', format: fmtInt },
			{ key: 'rushYards', label: 'RYds', format: fmtInt },
			{ key: 'rushTds', label: 'RTD', format: fmtInt },
			{ key: 'receptions', label: 'Rec', format: fmtInt },
			{ key: 'recYards', label: 'RecYds', format: fmtInt },
		];
	}
	if (position === 'WR' || position === 'TE') {
		return [
			{ key: 'targets', label: 'Tgt', format: fmtInt },
			{ key: 'receptions', label: 'Rec', format: fmtInt },
			{ key: 'recYards', label: 'RecYds', format: fmtInt },
			{ key: 'recTds', label: 'TD', format: fmtInt },
		];
	}
	if (position === 'LB' || position === 'DL' || position === 'CB' || position === 'S') {
		return [
			{ key: 'tackles', label: 'Tkl', format: fmtInt },
			{ key: 'sacks', label: 'Sk', format: fmtInt },
			{ key: 'ints', label: 'INT', format: fmtInt },
		];
	}
	if (position === 'K' || position === 'P') {
		return [
			{ key: 'fgMade', label: 'FGM', format: fmtInt },
			{ key: 'fgAttempts', label: 'FGA', format: fmtInt },
			{ key: 'xpMade', label: 'XPM', format: fmtInt },
			{ key: 'xpAttempts', label: 'XPA', format: fmtInt },
		];
	}
	// Lineman or unknown: show generic totals
	return [
		{ key: 'totalYards', label: 'Yds', format: fmtInt },
		{ key: 'totalTouchdowns', label: 'TD', format: fmtInt },
	];
}

//============================================
// Phase label for the year column
function phaseShort(phase: string): string {
	if (phase === 'high_school') {
		return 'HS';
	}
	if (phase === 'college') {
		return 'COL';
	}
	if (phase === 'nfl') {
		return 'NFL';
	}
	return phase;
}

//============================================
// Format a year cell: "HS Yr1", "COL Yr3", etc.
function formatYearCell(record: SeasonRecord): string {
	return phaseShort(record.phase) + ' Yr' + record.year;
}

//============================================
// Sum a list of season records into a single totals row
function sumStatTotals(records: SeasonRecord[]): SeasonStatTotals {
	const totals: SeasonStatTotals = {
		gamesPlayed: 0, totalYards: 0, totalTouchdowns: 0,
		passYards: 0, passTds: 0, passInts: 0, completions: 0, attempts: 0,
		rushYards: 0, carries: 0, rushTds: 0, fumbles: 0,
		receptions: 0, recYards: 0, recTds: 0, targets: 0,
		tackles: 0, sacks: 0, ints: 0,
		fgMade: 0, fgAttempts: 0, xpMade: 0, xpAttempts: 0,
		playerOfTheWeekCount: 0,
	};
	for (const r of records) {
		const s = r.statTotals;
		if (!s) {
			continue;
		}
		totals.gamesPlayed += s.gamesPlayed;
		totals.totalYards += s.totalYards;
		totals.totalTouchdowns += s.totalTouchdowns;
		totals.passYards += s.passYards;
		totals.passTds += s.passTds;
		totals.passInts += s.passInts;
		totals.completions += s.completions;
		totals.attempts += s.attempts;
		totals.rushYards += s.rushYards;
		totals.carries += s.carries;
		totals.rushTds += s.rushTds;
		totals.fumbles += s.fumbles;
		totals.receptions += s.receptions;
		totals.recYards += s.recYards;
		totals.recTds += s.recTds;
		totals.targets += s.targets;
		totals.tackles += s.tackles;
		totals.sacks += s.sacks;
		totals.ints += s.ints;
		totals.fgMade += s.fgMade;
		totals.fgAttempts += s.fgAttempts;
		totals.xpMade += s.xpMade;
		totals.xpAttempts += s.xpAttempts;
		totals.playerOfTheWeekCount += s.playerOfTheWeekCount;
	}
	return totals;
}

//============================================
// Build a synthetic SeasonRecord representing the in-progress current season
// so it can be rendered as the bottom row before the totals row.
function currentSeasonRecord(player: Player): SeasonRecord | null {
	if (!player.position || player.seasonStats.gamesPlayed === 0) {
		return null;
	}
	const record: SeasonRecord = {
		phase: player.phase,
		// Year within phase: best guess based on phase year fields
		year: deriveCurrentYear(player),
		age: player.age,
		team: player.teamName || '',
		position: player.position,
		wins: 0,
		losses: 0,
		ties: 0,
		depthChart: player.depthChart,
		highlights: [],
		awards: [],
		statTotals: player.seasonStats,
	};
	return record;
}

//============================================
// Best-effort current-year-in-phase
function deriveCurrentYear(player: Player): number {
	if (player.phase === 'college') {
		return player.collegeYear || 1;
	}
	if (player.phase === 'nfl') {
		return player.nflYear || 1;
	}
	if (player.phase === 'high_school') {
		// 14=Fr, 15=So, 16=Jr, 17=Sr -> 1..4
		const yr = player.age - 13;
		return yr < 1 ? 1 : yr;
	}
	return 1;
}

//============================================
// Render the career stats table into the given container.
// If no rows exist, renders nothing (lets caller hide gracefully).
export function renderCareerStatsTable(
	container: HTMLElement,
	player: Player,
	phaseFilter?: 'high_school' | 'college' | 'nfl',
): void {
	// Collect rows: completed seasons first, optionally filtered by phase
	const completed = player.careerHistory.filter(r => {
		if (!phaseFilter) {
			return true;
		}
		return r.phase === phaseFilter;
	});

	// Optionally append in-progress current season if it matches the filter
	const current = currentSeasonRecord(player);
	const includeCurrent = current && (!phaseFilter || current.phase === phaseFilter);
	const rows: SeasonRecord[] = [...completed];
	if (includeCurrent && current) {
		rows.push(current);
	}

	// Hide table entirely if no rows have stats
	const hasAnyStats = rows.some(r => r.statTotals && r.statTotals.gamesPlayed > 0);
	if (!hasAnyStats) {
		return;
	}

	// Section heading
	const heading = document.createElement('div');
	heading.className = 'team-tab-section-label';
	heading.textContent = 'Stat History';
	container.appendChild(heading);

	// Pick columns from current player position (best proxy)
	const statCols = pickStatColumns(player.position);

	// Build table
	const wrapper = document.createElement('div');
	wrapper.className = 'career-stats-wrapper';
	const table = document.createElement('table');
	table.className = 'career-stats-table';

	// Header row
	const thead = document.createElement('thead');
	const headRow = document.createElement('tr');
	const headLabels = ['Year', 'Team', 'Pos', 'GP', 'W-L', ...statCols.map(c => c.label)];
	for (const label of headLabels) {
		const th = document.createElement('th');
		th.textContent = label;
		headRow.appendChild(th);
	}
	thead.appendChild(headRow);
	table.appendChild(thead);

	// Body rows
	const tbody = document.createElement('tbody');
	for (const r of rows) {
		const tr = document.createElement('tr');
		const stats = r.statTotals;
		const wlText = (r.wins + r.losses + r.ties) === 0 ? '--' : `${r.wins}-${r.losses}`;
		const cells = [
			formatYearCell(r),
			shortenTeam(r.team),
			r.position || '--',
			stats ? fmtInt(stats.gamesPlayed) : '0',
			wlText,
		];
		for (const text of cells) {
			const td = document.createElement('td');
			td.textContent = text;
			tr.appendChild(td);
		}
		for (const col of statCols) {
			const td = document.createElement('td');
			const val = stats ? (stats as unknown as Record<string, number>)[col.key as string] : 0;
			const numeric = typeof val === 'number' ? val : 0;
			td.textContent = col.format ? col.format(numeric) : numeric.toString();
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}

	// Totals row (only if more than one stat row)
	const statRows = rows.filter(r => r.statTotals && r.statTotals.gamesPlayed > 0);
	if (statRows.length > 1) {
		const totals = sumStatTotals(statRows);
		const totalWins = statRows.reduce((s, r) => s + r.wins, 0);
		const totalLosses = statRows.reduce((s, r) => s + r.losses, 0);
		const tr = document.createElement('tr');
		tr.className = 'career-stats-totals';
		const cells = [
			'Total', '', '',
			fmtInt(totals.gamesPlayed),
			`${totalWins}-${totalLosses}`,
		];
		for (const text of cells) {
			const td = document.createElement('td');
			td.textContent = text;
			tr.appendChild(td);
		}
		for (const col of statCols) {
			const td = document.createElement('td');
			const val = (totals as unknown as Record<string, number>)[col.key as string];
			const numeric = typeof val === 'number' ? val : 0;
			td.textContent = col.format ? col.format(numeric) : numeric.toString();
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}

	table.appendChild(tbody);
	wrapper.appendChild(table);
	container.appendChild(wrapper);
}

//============================================
// Trim long team names so table stays compact
function shortenTeam(name: string): string {
	if (!name) {
		return '--';
	}
	if (name.length <= 14) {
		return name;
	}
	return name.slice(0, 13) + '.';
}

//============================================
// Inline assertions for column picker
console.assert(pickStatColumns('QB').some(c => c.key === 'passYards'), 'QB picks pass yards');
console.assert(pickStatColumns('RB').some(c => c.key === 'rushYards'), 'RB picks rush yards');
console.assert(pickStatColumns('WR').some(c => c.key === 'receptions'), 'WR picks receptions');
console.assert(pickStatColumns('LB').some(c => c.key === 'tackles'), 'LB picks tackles');
console.assert(pickStatColumns('K').some(c => c.key === 'fgMade'), 'K picks fg made');
console.assert(pickStatColumns(null).length > 0, 'null position falls back to generic columns');
