// feed_render.ts - render the Fotomagic Social tab content.

import { Player } from '../player.js';
import {
	FotomagicPost, FEED_RENDER_LIMIT, recentPosts,
	addPost, buildManualPost, applyPostPopularity,
} from './fotomagic.js';

//============================================
// Format a post timestamp like "HS Yr 2 - Wk 4"
function formatPostTime(post: FotomagicPost): string {
	const phaseShort = post.phase === 'high_school' ? 'HS'
		: post.phase === 'college' ? 'COL'
		: post.phase === 'nfl' ? 'NFL'
		: post.phase;
	if (post.week > 0) {
		return phaseShort + ' Age ' + post.age + ' - Wk ' + post.week;
	}
	return phaseShort + ' Age ' + post.age;
}

//============================================
// Build a single feed card element.
function buildPostCard(post: FotomagicPost): HTMLElement {
	const card = document.createElement('div');
	card.className = 'fotomagic-post';

	// Header: avatar placeholder + time
	const header = document.createElement('div');
	header.className = 'fotomagic-post-header';
	const avatar = document.createElement('div');
	avatar.className = 'fotomagic-avatar-placeholder';
	avatar.textContent = '@';
	header.appendChild(avatar);
	const meta = document.createElement('div');
	meta.className = 'fotomagic-post-meta';
	meta.textContent = formatPostTime(post);
	header.appendChild(meta);
	card.appendChild(header);

	// Image placeholder (Fotomagic is a photo app)
	const image = document.createElement('div');
	image.className = 'fotomagic-post-image';
	const kindLabel = post.kind === 'milestone' ? 'MILESTONE'
		: post.kind === 'game' ? 'GAME DAY' : 'POST';
	image.textContent = kindLabel;
	card.appendChild(image);

	// Caption
	const caption = document.createElement('div');
	caption.className = 'fotomagic-post-caption';
	caption.textContent = post.caption;
	card.appendChild(caption);

	// Stat snippet (optional)
	if (post.statSnippet) {
		const snippet = document.createElement('div');
		snippet.className = 'fotomagic-post-stats';
		snippet.textContent = post.statSnippet;
		card.appendChild(snippet);
	}

	// Likes
	const likes = document.createElement('div');
	likes.className = 'fotomagic-post-likes';
	likes.textContent = post.likes.toLocaleString() + ' likes';
	card.appendChild(likes);

	return card;
}

//============================================
// Render the Social tab into the given container.
export function renderSocialTab(
	player: Player,
	container: HTMLElement,
	onAfterPost: () => void,
): void {
	container.innerHTML = '';

	// Header bar with handle and follower count
	const handle = '@' + player.firstName.toLowerCase() + '.'
		+ player.lastName.toLowerCase();
	const followers = Math.floor(player.career.popularity * 12);
	const headerBar = document.createElement('div');
	headerBar.className = 'fotomagic-header';
	const handleEl = document.createElement('div');
	handleEl.className = 'fotomagic-handle';
	handleEl.textContent = handle;
	headerBar.appendChild(handleEl);
	const followersEl = document.createElement('div');
	followersEl.className = 'fotomagic-followers';
	followersEl.textContent = followers.toLocaleString() + ' followers';
	headerBar.appendChild(followersEl);
	container.appendChild(headerBar);

	// New Post button
	const newPostBtn = document.createElement('button');
	newPostBtn.className = 'choice-button fotomagic-new-post';
	newPostBtn.textContent = 'New Post';
	newPostBtn.addEventListener('click', () => {
		const text = window.prompt('What do you want to post on Fotomagic?');
		if (text === null) {
			return;
		}
		const trimmed = text.trim();
		if (trimmed.length === 0) {
			return;
		}
		const post = buildManualPost(player, trimmed);
		addPost(player, post);
		applyPostPopularity(player, 'manual');
		onAfterPost();
	});
	container.appendChild(newPostBtn);

	// Feed
	const posts = recentPosts(player, FEED_RENDER_LIMIT);
	if (posts.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'fotomagic-empty';
		empty.textContent = 'No posts yet. Share something after your next game.';
		container.appendChild(empty);
		return;
	}

	const feed = document.createElement('div');
	feed.className = 'fotomagic-feed';
	for (const post of posts) {
		feed.appendChild(buildPostCard(post));
	}
	container.appendChild(feed);
}
