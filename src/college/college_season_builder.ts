// college_season_builder.ts - build a college season using real NCAA school data
//
// Creates a conference from the player's school plus conference opponents.
// 11-game schedule: 7 conference (full round-robin) + 4 non-conference.
// Uses actual NCAA school names from the CSV data.

import { TeamId } from '../season/season_types.js';
import { SeasonTeam } from '../season/team_model.js';
import { LeagueSeason } from '../season/season_model.js';
import { SeasonGame } from '../season/game_model.js';
import {
	resetGameIdCounter, nextGameId, generateRoundRobinRounds,
	generateBipartiteRotation, shuffleArray, validateSchedule,
} from '../season/season_builder.js';
import { NCAASchool, formatSchoolName, getConferenceSchools } from '../ncaa.js';
import { randomInRange } from '../player.js';
import { CoachPersonality } from '../team.js';

//============================================
// Power conference names for strength assignment
const POWER_CONFERENCES = [
	'Atlantic Coast Conference',
	'Big Ten Conference',
	'Big 12 Conference',
	'Southeastern Conference',
	'Pac-12 Conference',
];

//============================================
// Build a complete college season
export function buildCollegeSeason(
	playerSchool: NCAASchool,
	allSchools: NCAASchool[],
): LeagueSeason {
	resetGameIdCounter();

	const playerTeamId: TeamId = 'player';
	const teams = new Map<TeamId, SeasonTeam>();
	const conferenceTeamIds: TeamId[] = [];
	const nonConfTeamIds: TeamId[] = [];

	// Create the player's team
	const playerStrength = getSchoolStrength(playerSchool);
	const playerTeam = new SeasonTeam(
		playerTeamId,
		playerSchool.commonName,
		playerSchool.nickname,
		playerStrength,
		randomCoachPersonality(),
		'player_conference',
	);
	teams.set(playerTeamId, playerTeam);
	conferenceTeamIds.push(playerTeamId);

	// Get conference opponents from real NCAA data
	const confSchools = getConferenceSchools(allSchools, playerSchool.conference)
		.filter(s => s.commonName !== playerSchool.commonName);

	// Shuffle and take up to 7 conference opponents (for 8-team conference)
	const shuffledConf = [...confSchools];
	shuffleArray(shuffledConf);
	const confOpponents = shuffledConf.slice(0, 7);

	// Create SeasonTeam for each conference opponent
	for (let i = 0; i < confOpponents.length; i++) {
		const school = confOpponents[i];
		const teamId = `conf_${i}`;
		const strength = getSchoolStrength(school);

		teams.set(teamId, new SeasonTeam(
			teamId,
			school.commonName,
			school.nickname,
			strength,
			randomCoachPersonality(),
			'player_conference',
		));
		conferenceTeamIds.push(teamId);
	}

	// Get non-conference opponents from schools outside the player's conference.
	// Pool size equals conference size so every conf team can be paired with a
	// distinct non-conf opponent each non-conf week.
	const nonConfSchools = allSchools.filter(
		s => s.conference !== playerSchool.conference
			&& s.commonName !== playerSchool.commonName
	);
	shuffleArray(nonConfSchools);
	const NUM_NONCONF_TEAMS = conferenceTeamIds.length;
	if (nonConfSchools.length < NUM_NONCONF_TEAMS) {
		throw new Error(
			'College season builder: only ' + nonConfSchools.length
			+ ' out-of-conference schools available, need ' + NUM_NONCONF_TEAMS,
		);
	}
	const ncOpponents = nonConfSchools.slice(0, NUM_NONCONF_TEAMS);

	for (let i = 0; i < ncOpponents.length; i++) {
		const school = ncOpponents[i];
		const teamId = `nonconf_${i}`;
		const strength = getSchoolStrength(school);

		teams.set(teamId, new SeasonTeam(
			teamId,
			school.commonName,
			school.nickname,
			strength,
			randomCoachPersonality(),
		));
		nonConfTeamIds.push(teamId);
	}

	// Build the 11-week schedule (4 non-conf + 7 conf rounds)
	const allGames = buildCollegeSchedule(playerTeamId, conferenceTeamIds, nonConfTeamIds);

	// Validate
	const validation = validateSchedule(allGames, 11);
	if (!validation.valid) {
		console.warn('College schedule validation warnings:', validation.errors);
	}

	return new LeagueSeason(teams, allGames, 11, playerTeamId, 'college');
}

//============================================
// Build the 11-week college schedule.
// Uses proper round-robin rounds so ALL conference teams play every week.
// 8 teams = 7 rounds of 4 games. Conference rounds fill weeks 5-11.
// In weeks 1-4, every conf team is paired with a distinct non-conf team via
// a bipartite rotation so all teams play exactly 11 games.
function buildCollegeSchedule(
	playerTeamId: TeamId,
	conferenceTeamIds: TeamId[],
	nonConfTeamIds: TeamId[],
): SeasonGame[] {
	// Generate conflict-free round-robin rounds
	const rounds = generateRoundRobinRounds(conferenceTeamIds);

	// Non-conference weeks 1-4, conference rounds in weeks 5-11 (7 rounds)
	const confWeeks = [5, 6, 7, 8, 9, 10, 11];
	const ncWeeks = [1, 2, 3, 4];

	const allGames: SeasonGame[] = [];

	// Create conference games from round-robin rounds
	for (let r = 0; r < rounds.length && r < confWeeks.length; r++) {
		const week = confWeeks[r];
		for (const [home, away] of rounds[r]) {
			allGames.push(new SeasonGame(nextGameId(), week, home, away, true));
		}
	}

	// Bipartite rotation: every conf team plays one non-conf team each non-conf
	// week, with no opponent repeats across the 4 non-conf weeks.
	const confOrdered = [...conferenceTeamIds];
	shuffleArray(confOrdered);
	const ncOrdered = [...nonConfTeamIds];
	shuffleArray(ncOrdered);

	const ncRounds = generateBipartiteRotation(confOrdered, ncOrdered, ncWeeks.length);
	for (let r = 0; r < ncRounds.length; r++) {
		const week = ncWeeks[r];
		for (const [home, away] of ncRounds[r]) {
			allGames.push(new SeasonGame(nextGameId(), week, home, away, false));
		}
	}

	// Keep the playerTeamId parameter for future scheduling tweaks
	void playerTeamId;

	return allGames;
}

//============================================
// Determine team strength from school subdivision and conference
function getSchoolStrength(school: NCAASchool): number {
	if (school.subdivision === 'FBS') {
		if (POWER_CONFERENCES.includes(school.conference)) {
			// FBS power conference: 60-90
			return 60 + randomInRange(0, 30);
		}
		// FBS mid-major: 40-70
		return 40 + randomInRange(0, 30);
	}
	// FCS: 20-50
	return 20 + randomInRange(0, 30);
}

//============================================
// Random coach personality
function randomCoachPersonality(): CoachPersonality {
	const choices: CoachPersonality[] = ['supportive', 'demanding', 'volatile'];
	return choices[randomInRange(0, 2)];
}
