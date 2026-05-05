// fotomagic.ts - Fotomagic social media feed (Bitlife-style).
//
// The player can post to a fake photo-sharing app to gain popularity.
// Posts are auto-prompted only on notable games (milestones, big stat lines,
// playoff games, career firsts) to avoid nagging. The Social tab also has a
// manual "New Post" button for any-time posting.

import { Player, clampStat } from '../player.js';
import type { GameResult, StatLine } from '../week_sim.js';
import { waitForInteraction } from '../popup.js';

//============================================
// A single post on the player's Fotomagic feed.
export interface FotomagicPost {
	id: string;
	week: number;
	age: number;
	phase: string;
	kind: 'game' | 'milestone' | 'manual';
	caption: string;
	statSnippet?: string;
	likes: number;
}

//============================================
// Hard cap on how many posts to render in the tab. Older posts stay in
// memory but only the most recent N are rendered.
export const FEED_RENDER_LIMIT = 25;

//============================================
// Add a post to the player's feed. Mutates player state.
export function addPost(player: Player, post: FotomagicPost): void {
	if (!player.fotomagicFeed) {
		player.fotomagicFeed = [];
	}
	player.fotomagicFeed.push(post);
}

//============================================
// Return the N most recent posts (reverse chronological).
export function recentPosts(player: Player, limit: number): FotomagicPost[] {
	const feed = player.fotomagicFeed || [];
	const reversed = [...feed].reverse();
	return reversed.slice(0, limit);
}

//============================================
// Generate a unique post id.
let postIdCounter = 0;
function nextPostId(): string {
	postIdCounter += 1;
	return 'fmp_' + Date.now() + '_' + postIdCounter;
}

//============================================
// Estimate "likes" based on player popularity. More followers = more likes.
function estimateLikes(player: Player, kind: FotomagicPost['kind']): number {
	const baseFollowers = Math.floor(player.career.popularity * 12);
	const engagement = kind === 'milestone' ? 0.6 : kind === 'game' ? 0.3 : 0.15;
	const noise = 0.7 + Math.random() * 0.6;
	return Math.max(1, Math.floor(baseFollowers * engagement * noise));
}

//============================================
// Decide if a game is "notable" enough to auto-prompt the player to post.
// Returns the reason if notable, or null if routine.
export function isNotableGame(
	result: GameResult,
	context: { isPlayoff: boolean; isFirstWin: boolean; isFirstStart: boolean },
): string | null {
	if (context.isPlayoff) {
		return 'playoff game';
	}
	if (context.isFirstWin) {
		return 'first career win';
	}
	if (context.isFirstStart) {
		return 'first career start';
	}
	if (result.playerRating === 'elite') {
		return 'elite performance';
	}
	const stats = result.playerStatLine;
	const passTds = numStat(stats, 'passTds');
	const rushTds = numStat(stats, 'rushTds');
	const recTds = numStat(stats, 'recTds');
	const totalTds = passTds + rushTds + recTds;
	if (totalTds >= 3) {
		return totalTds + ' TD game';
	}
	const passYards = numStat(stats, 'passYards');
	if (passYards >= 300) {
		return passYards + ' passing yards';
	}
	const rushYards = numStat(stats, 'rushYards');
	if (rushYards >= 150) {
		return rushYards + ' rushing yards';
	}
	const recYards = numStat(stats, 'recYards');
	if (recYards >= 120) {
		return recYards + ' receiving yards';
	}
	const sacks = numStat(stats, 'sacks');
	if (sacks >= 3) {
		return sacks + '-sack game';
	}
	const ints = numStat(stats, 'ints');
	if (ints >= 2) {
		return ints + ' interceptions';
	}
	return null;
}

//============================================
// Helper: read a numeric stat value safely
function numStat(stats: StatLine, key: string): number {
	const v = stats[key];
	return typeof v === 'number' ? v : 0;
}

//============================================
// Build a default caption for a game post based on result + reason.
export function buildGameCaption(
	result: GameResult,
	opponentName: string,
	reason: string,
): string {
	const wl = result.result === 'win' ? 'W' : 'L';
	return wl + ' vs ' + opponentName + '. ' + reason + '. #fotomagic';
}

//============================================
// Build a short stat snippet for display in the feed card.
export function buildStatSnippet(statLine: StatLine): string {
	const parts: string[] = [];
	const passYds = numStat(statLine, 'passYards');
	const passTd = numStat(statLine, 'passTds');
	const rushYds = numStat(statLine, 'rushYards');
	const rushTd = numStat(statLine, 'rushTds');
	const recYds = numStat(statLine, 'recYards');
	const recTd = numStat(statLine, 'recTds');
	const tackles = numStat(statLine, 'tackles');
	const sacks = numStat(statLine, 'sacks');
	const ints = numStat(statLine, 'ints');
	if (passYds > 0) {
		parts.push(passYds + ' pass yds, ' + passTd + ' TD');
	}
	if (rushYds > 0) {
		parts.push(rushYds + ' rush yds, ' + rushTd + ' TD');
	}
	if (recYds > 0) {
		parts.push(recYds + ' rec yds, ' + recTd + ' TD');
	}
	if (tackles > 0 || sacks > 0 || ints > 0) {
		parts.push(tackles + ' tk, ' + sacks + ' sk, ' + ints + ' int');
	}
	return parts.join(' | ');
}

//============================================
// Apply popularity gain from posting. Routine notable: +1, milestone: +3.
// Caps weekly gain so spamming the manual button doesn't break the curve.
export function applyPostPopularity(
	player: Player,
	kind: FotomagicPost['kind'],
): void {
	let delta = 1;
	if (kind === 'milestone') {
		delta = 3;
	} else if (kind === 'manual') {
		delta = 1;
	}
	// Diminishing returns: if player already posted 3+ times this week, no gain
	const thisWeekCount = (player.fotomagicFeed || []).filter(
		p => p.week === player.currentWeek && p.age === player.age,
	).length;
	if (thisWeekCount >= 3) {
		delta = 0;
	}
	player.career.popularity = clampStat(player.career.popularity + delta);
}

//============================================
// Build a post object from a game result. Caller decides whether to actually
// add it to the feed (i.e. user hit Post in the prompt).
export function buildGamePost(
	player: Player,
	result: GameResult,
	opponentName: string,
	reason: string,
	kind: 'game' | 'milestone',
): FotomagicPost {
	const post: FotomagicPost = {
		id: nextPostId(),
		week: player.currentWeek,
		age: player.age,
		phase: player.phase,
		kind,
		caption: buildGameCaption(result, opponentName, reason),
		statSnippet: buildStatSnippet(result.playerStatLine),
		likes: estimateLikes(player, kind),
	};
	return post;
}

//============================================
// Build a free-form manual post (used by the New Post button).
export function buildManualPost(player: Player, caption: string): FotomagicPost {
	const post: FotomagicPost = {
		id: nextPostId(),
		week: player.currentWeek,
		age: player.age,
		phase: player.phase,
		kind: 'manual',
		caption: caption.slice(0, 200),
		likes: estimateLikes(player, 'manual'),
	};
	return post;
}

//============================================
// Show a modal asking the player whether to post a Fotomagic update about
// this game. Only fires on notable games. No-op in childhood/youth and
// when the player has opted to skip the rest of this season.
export function maybePromptShareAfterGame(
	player: Player,
	result: GameResult,
	opponentName: string,
	context: { isPlayoff: boolean; isFirstWin: boolean; isFirstStart: boolean },
	onContinue: () => void,
): void {
	// Only available from high school onward
	if (player.phase !== 'high_school' && player.phase !== 'college'
		&& player.phase !== 'nfl') {
		onContinue();
		return;
	}
	// Player can opt-out for the rest of the season via a flag
	if (player.storyFlags && player.storyFlags['fotomagicSkipSeason']) {
		onContinue();
		return;
	}
	const reason = isNotableGame(result, context);
	if (!reason) {
		onContinue();
		return;
	}
	// Pick post kind: milestone for firsts/playoffs, otherwise game
	const kind: 'game' | 'milestone' = (
		context.isPlayoff || context.isFirstWin || context.isFirstStart
			|| result.playerRating === 'elite'
	) ? 'milestone' : 'game';

	const draftPost = buildGamePost(player, result, opponentName, reason, kind);

	waitForInteraction(
		'Fotomagic',
		[
			{
				text: 'Post',
				primary: true,
				action: () => {
					addPost(player, draftPost);
					applyPostPopularity(player, kind);
					onContinue();
				},
			},
			{
				text: 'Skip',
				action: () => {
					onContinue();
				},
			},
			{
				text: 'Skip rest of season',
				action: () => {
					if (!player.storyFlags) {
						player.storyFlags = {};
					}
					player.storyFlags['fotomagicSkipSeason'] = true;
					onContinue();
				},
			},
		],
		'Share to Fotomagic? ' + draftPost.caption,
		'narrative',
	);
}

//============================================
// Inline assertions
console.assert(FEED_RENDER_LIMIT === 25, 'feed cap is 25');
const _testPlayer = { fotomagicFeed: [] as FotomagicPost[] } as unknown as Player;
addPost(_testPlayer, {
	id: 't1', week: 1, age: 14, phase: 'high_school',
	kind: 'manual', caption: 'hi', likes: 1,
});
console.assert(_testPlayer.fotomagicFeed!.length === 1, 'addPost grows feed');
console.assert(recentPosts(_testPlayer, 5).length === 1, 'recentPosts returns 1');
