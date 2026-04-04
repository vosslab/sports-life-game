// ncaa.ts - NCAA schools and college schedule generation

//============================================
// NCAA school data structure
export interface NCAASchool {
	fullName: string;       // "Clemson University"
	commonName: string;     // "Clemson"
	nickname: string;       // "Tigers"
	city: string;
	state: string;
	subdivision: string;    // "FBS" or "FCS"
	conference: string;     // "Atlantic Coast Conference"
}

//============================================
// College schedule entry for a single game
export interface CollegeScheduleEntry {
	week: number;
	opponentName: string;   // "Clemson Tigers"
	opponentStrength: number;
	conference: boolean;     // true if conference game
	played: boolean;
	playerScore: number;
	opponentScore: number;
}

//============================================
// Power conference names for high star recruits
const POWER_CONFERENCES = [
	'Atlantic Coast Conference',
	'Big Ten Conference',
	'Big 12 Conference',
	'Southeastern Conference',
	'Pac-12 Conference',
];

//============================================
// Mid-major conferences for 3-star and 4-star recruits
const MID_MAJOR_CONFERENCES = [
	'American Conference',
	'Mountain West Conference',
	'Sun Belt Conference',
	'Mid-American Conference',
	'Western Athletic Conference',
	'Conference USA',
];

//============================================
// Load NCAA schools from both FBS and FCS CSV files
export async function loadNCAASchools(): Promise<{
	fbs: NCAASchool[];
	fcs: NCAASchool[];
}> {
	const fbsSchools: NCAASchool[] = [];
	const fcsSchools: NCAASchool[] = [];

	// Load FBS schools
	try {
		const fbsResponse = await fetch('src/data/ncaa_schools-FBS.csv');
		if (fbsResponse.ok) {
			const text = await fbsResponse.text();
			const lines = text.split('\n');

			// Skip header line
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (line.length === 0) continue;

				const school = parseNCAASchoolLine(line, 'FBS');
				if (school) {
					fbsSchools.push(school);
				}
			}
		}
	} catch (error) {
		// Return empty array on error
		console.error('Failed to load FBS schools:', error);
	}

	// Load FCS schools
	try {
		const fcsResponse = await fetch('src/data/ncaa_schools-FCS.csv');
		if (fcsResponse.ok) {
			const text = await fcsResponse.text();
			const lines = text.split('\n');

			// Skip header line
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (line.length === 0) continue;

				const school = parseNCAASchoolLine(line, 'FCS');
				if (school) {
					fcsSchools.push(school);
				}
			}
		}
	} catch (error) {
		// Return empty array on error
		console.error('Failed to load FCS schools:', error);
	}

	return { fbs: fbsSchools, fcs: fcsSchools };
}

//============================================
// Parse a single CSV line into an NCAASchool
function parseNCAASchoolLine(
	line: string,
	subdivision: string
): NCAASchool | null {
	// Split by comma, but be careful with quoted fields
	const parts = line.split(',');

	if (parts.length < 8) {
		return null;
	}

	const fullName = parts[0].trim();
	const commonName = parts[1].trim();
	let nickname = parts[2].trim();
	const city = parts[3].trim();
	const state = parts[4].trim();
	// parts[5] is Type (skip)
	// parts[6] is Subdivision (we already know it)
	let conference = parts[7].trim();

	// Clean up nickname - strip [q] or similar bracket annotations
	nickname = stripBracketAnnotations(nickname);

	// Clean up conference - strip [FB 3] or similar
	conference = stripBracketAnnotations(conference);

	return {
		fullName,
		commonName,
		nickname,
		city,
		state,
		subdivision,
		conference,
	};
}

//============================================
// Helper to strip bracket annotations like [q], [FB 3], etc.
function stripBracketAnnotations(text: string): string {
	return text.replace(/\[.*?\]/g, '').trim();
}

//============================================
// Get all schools from a specific conference
export function getConferenceSchools(
	schools: NCAASchool[],
	conference: string
): NCAASchool[] {
	return schools.filter(school => school.conference === conference);
}

//============================================
// Get unique sorted list of all conferences
export function getUniqueConferences(schools: NCAASchool[]): string[] {
	const conferences = new Set<string>();
	for (const school of schools) {
		if (school.conference.length > 0) {
			conferences.add(school.conference);
		}
	}
	return Array.from(conferences).sort();
}

//============================================
// Assign a player college based on recruiting stars
export function assignPlayerCollege(
	recruitingStars: number,
	schools: NCAASchool[]
): NCAASchool {
	let candidates: NCAASchool[] = [];

	if (recruitingStars >= 5) {
		// 5 stars: pick from Power conferences
		for (const conf of POWER_CONFERENCES) {
			const schoolsInConf = getConferenceSchools(schools, conf);
			candidates = candidates.concat(schoolsInConf);
		}
	} else if (recruitingStars >= 4) {
		// 4 stars: mix of Power and mid-major
		for (const conf of POWER_CONFERENCES) {
			const schoolsInConf = getConferenceSchools(schools, conf);
			candidates = candidates.concat(schoolsInConf);
		}
		for (const conf of MID_MAJOR_CONFERENCES) {
			const schoolsInConf = getConferenceSchools(schools, conf);
			// Add only 50% of mid-major schools for 4 stars
			const selected = schoolsInConf.slice(
				0,
				Math.ceil(schoolsInConf.length * 0.5)
			);
			candidates = candidates.concat(selected);
		}
	} else if (recruitingStars >= 3) {
		// 3 stars: mid-major conferences
		for (const conf of MID_MAJOR_CONFERENCES) {
			const schoolsInConf = getConferenceSchools(schools, conf);
			candidates = candidates.concat(schoolsInConf);
		}
	} else if (recruitingStars >= 2) {
		// 2 stars: FCS schools
		candidates = schools.filter(s => s.subdivision === 'FCS');
	} else {
		// 1 star: smaller FCS schools (secondary in conference)
		const allFCS = schools.filter(s => s.subdivision === 'FCS');
		// Take second half for "smaller" schools
		candidates = allFCS.slice(
			Math.ceil(allFCS.length * 0.5)
		);
	}

	// Fallback to all schools if no candidates
	if (candidates.length === 0) {
		candidates = schools;
	}

	// Pick random school from candidates
	const index = Math.floor(Math.random() * candidates.length);
	return candidates[index];
}

//============================================
// Format school name as "CommonName Nickname"
export function formatSchoolName(school: NCAASchool): string {
	return `${school.commonName} ${school.nickname}`;
}

//============================================
// Generate a 12-game college schedule
export function generateCollegeSchedule(
	playerSchool: NCAASchool,
	allSchools: NCAASchool[]
): CollegeScheduleEntry[] {
	const schedule: CollegeScheduleEntry[] = [];

	// Get conference schools
	const conferenceSchools = getConferenceSchools(
		allSchools,
		playerSchool.conference
	).filter(s => s.commonName !== playerSchool.commonName);

	// Get non-conference opponents from other conferences
	const nonConferenceSchools = allSchools.filter(
		s =>
			s.conference !== playerSchool.conference &&
			s.commonName !== playerSchool.commonName
	);

	// Generate 8 conference games
	const confGames = selectRandomSchools(conferenceSchools, 8);
	for (const opponent of confGames) {
		const week = 4 + Math.floor(Math.random() * 9); // weeks 4-12
		const strength = getTeamStrength(opponent);

		schedule.push({
			week,
			opponentName: formatSchoolName(opponent),
			opponentStrength: strength,
			conference: true,
			played: false,
			playerScore: 0,
			opponentScore: 0,
		});
	}

	// Generate 4 non-conference games
	const nonConfGames = selectRandomSchools(nonConferenceSchools, 4);
	let nonConfWeeks = [1, 2, 3, 4];

	for (const opponent of nonConfGames) {
		const weekIndex = Math.floor(Math.random() * nonConfWeeks.length);
		const week = nonConfWeeks[weekIndex];
		nonConfWeeks.splice(weekIndex, 1);

		const strength = getTeamStrength(opponent);

		schedule.push({
			week,
			opponentName: formatSchoolName(opponent),
			opponentStrength: strength,
			conference: false,
			played: false,
			playerScore: 0,
			opponentScore: 0,
		});
	}

	// Sort by week
	schedule.sort((a, b) => a.week - b.week);

	return schedule;
}

//============================================
// Get opponent strength based on subdivision/conference
function getTeamStrength(school: NCAASchool): number {
	if (school.subdivision === 'FBS') {
		// FBS power conference teams: 60-90
		if (POWER_CONFERENCES.includes(school.conference)) {
			return 60 + Math.floor(Math.random() * 31);
		}
		// FBS other (mid-major): 40-70
		return 40 + Math.floor(Math.random() * 31);
	}
	// FCS: 20-50
	return 20 + Math.floor(Math.random() * 31);
}

//============================================
// Helper to select N random schools from an array
function selectRandomSchools(
	schools: NCAASchool[],
	count: number
): NCAASchool[] {
	const selected: NCAASchool[] = [];
	const available = [...schools];

	for (let i = 0; i < count && available.length > 0; i++) {
		const index = Math.floor(Math.random() * available.length);
		selected.push(available[index]);
		available.splice(index, 1);
	}

	return selected;
}
