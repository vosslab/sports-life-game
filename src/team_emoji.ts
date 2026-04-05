// team_emoji.ts - map team names to emoji for visual identity

//============================================
// Keyword-to-emoji lookup table
const TEAM_EMOJI_MAP: Record<string, string> = {
	// Animals
	'bear': '\uD83D\uDC3B',
	'bears': '\uD83D\uDC3B',
	'bruin': '\uD83D\uDC3B',
	'bruins': '\uD83D\uDC3B',
	'eagle': '\uD83E\uDD85',
	'eagles': '\uD83E\uDD85',
	'tiger': '\uD83D\uDC2F',
	'tigers': '\uD83D\uDC2F',
	'bengal': '\uD83D\uDC2F',
	'bengals': '\uD83D\uDC2F',
	'lion': '\uD83E\uDD81',
	'lions': '\uD83E\uDD81',
	'panther': '\uD83D\uDC06',
	'panthers': '\uD83D\uDC06',
	'wildcat': '\uD83D\uDC06',
	'wildcats': '\uD83D\uDC06',
	'cougar': '\uD83D\uDC06',
	'cougars': '\uD83D\uDC06',
	'jaguar': '\uD83D\uDC06',
	'jaguars': '\uD83D\uDC06',
	'wolf': '\uD83D\uDC3A',
	'wolves': '\uD83D\uDC3A',
	'hawk': '\uD83E\uDD85',
	'hawks': '\uD83E\uDD85',
	'falcon': '\uD83E\uDD85',
	'falcons': '\uD83E\uDD85',
	'raven': '\uD83E\uDD86',
	'ravens': '\uD83E\uDD86',
	'cardinal': '\uD83D\uDC26',
	'cardinals': '\uD83D\uDC26',
	'stallion': '\uD83D\uDC0E',
	'stallions': '\uD83D\uDC0E',
	'mustang': '\uD83D\uDC0E',
	'mustangs': '\uD83D\uDC0E',
	'bronco': '\uD83D\uDC0E',
	'broncos': '\uD83D\uDC0E',
	'colt': '\uD83D\uDC0E',
	'colts': '\uD83D\uDC0E',
	'charger': '\u26A1',
	'chargers': '\u26A1',
	'bulldog': '\uD83D\uDC15',
	'bulldogs': '\uD83D\uDC15',
	'ram': '\uD83D\uDC0F',
	'rams': '\uD83D\uDC0F',
	'shark': '\uD83E\uDD88',
	'sharks': '\uD83E\uDD88',
	'dolphin': '\uD83D\uDC2C',
	'dolphins': '\uD83D\uDC2C',
	'gator': '\uD83D\uDC0A',
	'gators': '\uD83D\uDC0A',
	'hornet': '\uD83D\uDC1D',
	'hornets': '\uD83D\uDC1D',
	'bee': '\uD83D\uDC1D',
	'bees': '\uD83D\uDC1D',
	'dragon': '\uD83D\uDC09',
	'dragons': '\uD83D\uDC09',
	'owl': '\uD83E\uDD89',
	'owls': '\uD83E\uDD89',
	'badger': '\uD83E\uDDA1',
	'badgers': '\uD83E\uDDA1',
	// People/roles
	'knight': '\u2694\uFE0F',
	'knights': '\u2694\uFE0F',
	'viking': '\u2694\uFE0F',
	'vikings': '\u2694\uFE0F',
	'warrior': '\u2694\uFE0F',
	'warriors': '\u2694\uFE0F',
	'trojan': '\uD83C\uDFDB\uFE0F',
	'trojans': '\uD83C\uDFDB\uFE0F',
	'spartan': '\uD83C\uDFDB\uFE0F',
	'spartans': '\uD83C\uDFDB\uFE0F',
	'pirate': '\uD83C\uDFF4\u200D\u2620\uFE0F',
	'pirates': '\uD83C\uDFF4\u200D\u2620\uFE0F',
	'buccaneer': '\uD83C\uDFF4\u200D\u2620\uFE0F',
	'buccaneers': '\uD83C\uDFF4\u200D\u2620\uFE0F',
	'chief': '\uD83D\uDC51',
	'chiefs': '\uD83D\uDC51',
	'king': '\uD83D\uDC51',
	'kings': '\uD83D\uDC51',
	'saint': '\u26AA',
	'saints': '\u26AA',
	'commander': '\u2B50',
	'commanders': '\u2B50',
	'patriot': '\uD83C\uDDFA\uD83C\uDDF8',
	'patriots': '\uD83C\uDDFA\uD83C\uDDF8',
	'cowboy': '\uD83E\uDD20',
	'cowboys': '\uD83E\uDD20',
	'texan': '\u2B50',
	'texans': '\u2B50',
	'packer': '\uD83E\uDDC0',
	'packers': '\uD83E\uDDC0',
	'steeler': '\uD83D\uDD28',
	'steelers': '\uD83D\uDD28',
	'49er': '\u26CF\uFE0F',
	'49ers': '\u26CF\uFE0F',
	// Weather/nature
	'thunder': '\u26A1',
	'storm': '\u26A1',
	'hurricane': '\uD83C\uDF00',
	'hurricanes': '\uD83C\uDF00',
	'tornado': '\uD83C\uDF2A\uFE0F',
	'tornadoes': '\uD83C\uDF2A\uFE0F',
	'flame': '\uD83D\uDD25',
	'flames': '\uD83D\uDD25',
	'blaze': '\uD83D\uDD25',
	'blazers': '\uD83D\uDD25',
	'crimson': '\uD83D\uDD34',
	'tide': '\uD83C\uDF0A',
	'wave': '\uD83C\uDF0A',
};

// Default fallback emoji for unknown teams
const DEFAULT_EMOJI = '\uD83C\uDFC8';

//============================================
// Get emoji for a team name by checking each word against the map
export function getTeamEmoji(teamName: string): string {
	// Split name into words and check each
	const words = teamName.toLowerCase().split(/\s+/);
	for (const word of words) {
		const emoji = TEAM_EMOJI_MAP[word];
		if (emoji) {
			return emoji;
		}
	}
	return DEFAULT_EMOJI;
}

//============================================
// Format a team name with its emoji prefix
export function formatTeamWithEmoji(teamName: string): string {
	const emoji = getTeamEmoji(teamName);
	return `${emoji} ${teamName}`;
}
