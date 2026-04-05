// kid_years.ts - ages 1-7: BitLife-style events, no football
//
// Each year: 1-2 random life events with choices.
// Stats affected: athleticism (playing outside), discipline (school), confidence (social).
// Fast-forward feel: ~30-60 seconds per year.

import { Player } from '../player.js';
import { YearHandler, CareerContext } from '../core/year_handler.js';
import { applyAgeDrift } from '../shared/year_helpers.js';
import { advanceToNextYear } from '../core/year_runner.js';
import { filterEvents, selectEvent, selectEventByCategory, applyEventChoice, GameEvent } from '../events.js';

//============================================
// Age-appropriate headlines for flavor
const AGE_HEADLINES: Record<number, string> = {
	1: 'Baby steps',
	2: 'Toddler chaos',
	3: 'Preschool legend',
	4: 'Starting school',
	5: 'Kindergarten',
	6: 'First grade',
	7: 'Second grade',
};

//============================================
export const kidYearsHandler: YearHandler = {
	id: 'kid_years',
	ageStart: 1,
	ageEnd: 7,

	startYear(player: Player, ctx: CareerContext): void {
		// Apply natural growth for this age
		applyAgeDrift(player);
		ctx.updateHeader(player);

		// Clear previous year's content so the log stays manageable
		ctx.clearStory();

		const headline = AGE_HEADLINES[player.age] || `Age ${player.age}`;
		ctx.addHeadline(`Age ${player.age} - ${headline}`);
		const yearWord = player.age === 1 ? 'year' : 'years';
		ctx.addText(`${player.firstName} is ${player.age} ${yearWord} old.`);

		// How many events to show this year (older = more)
		const eventCount = player.age <= 3 ? 1 : 2;

		// Filter childhood events by age conditions
		const statsRecord: Record<string, number> = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
		};

		const eligible = filterEvents(
			ctx.events, 'childhood', 0, player.position,
			player.storyFlags, statsRecord, undefined, player.age,
		);

		// Filter out events that already fired, or whose family already fired
		const fresh = eligible.filter(e => {
			if (player.seenEventIds[e.id]) {
				return false;
			}
			if (e.family && player.seenEventFamilies[e.family]) {
				return false;
			}
			return true;
		});

		// Filter out events whose tags are over the lifetime cap (max 2 per tag)
		const TAG_CAP = 2;
		const notOverused = fresh.filter(e => {
			for (const tag of e.tags) {
				if ((player.eventTagCounts[tag] || 0) >= TAG_CAP) {
					return false;
				}
			}
			return true;
		});
		// Fall back to fresh if tag filtering removed everything
		const pool = notOverused.length > 0 ? notOverused : fresh;

		// Pick events using category-aware selection (strict, no internal fallback)
		const yearEvents: GameEvent[] = [];
		const usedIds = new Set<string>();

		if (eventCount === 1) {
			// Ages 1-3: 1 core event, fall back to any if no core available
			const picked = selectEventByCategory(pool, 'core') || selectEvent(pool);
			if (picked) {
				yearEvents.push(picked);
				usedIds.add(picked.id);
			}
		} else {
			// Ages 4-7: first check for big_decision (25% chance)
			const bigDecisions = pool.filter(e => e.event_category === 'big_decision');
			const rollBig = bigDecisions.length > 0 && Math.random() < 0.25;

			if (rollBig) {
				// Big decision takes first slot
				const big = selectEvent(bigDecisions);
				if (big) {
					yearEvents.push(big);
					usedIds.add(big.id);
				}
			}

			// Fill remaining slots: core first, then social/identity
			if (yearEvents.length < 1) {
				const core = selectEventByCategory(pool, 'core') || selectEvent(pool);
				if (core) {
					yearEvents.push(core);
					usedIds.add(core.id);
				}
			}
			if (yearEvents.length < 2) {
				const remaining = pool.filter(e => !usedIds.has(e.id));
				const second = selectEventByCategory(remaining, 'social')
					|| selectEventByCategory(remaining, 'identity')
					|| selectEvent(remaining);
				if (second) {
					yearEvents.push(second);
					usedIds.add(second.id);
				}
			}
		}

		// Mark selected events as fired, record families, and increment tag counts
		for (const ev of yearEvents) {
			player.seenEventIds[ev.id] = true;
			if (ev.family) {
				player.seenEventFamilies[ev.family] = true;
			}
			for (const tag of ev.tags) {
				player.eventTagCounts[tag] = (player.eventTagCounts[tag] || 0) + 1;
			}
		}

		// Present events sequentially, then show "Continue"
		if (yearEvents.length > 0) {
			presentEvent(player, ctx, yearEvents, 0);
		} else {
			// No events available, just show continue
			ctx.addText('Another year goes by.');
			showContinue(player, ctx);
		}
	},
};

//============================================
// Present one event, then chain to the next or show Continue
function presentEvent(
	player: Player, ctx: CareerContext,
	events: GameEvent[], index: number,
	statsBefore?: Record<string, number>,
): void {
	// Capture stats before first event for delta tracking
	if (!statsBefore) {
		statsBefore = {
			athleticism: player.core.athleticism,
			technique: player.core.technique,
			footballIq: player.core.footballIq,
			discipline: player.core.discipline,
			health: player.core.health,
			confidence: player.core.confidence,
			leadership: player.hidden.leadership,
			durability: player.hidden.durability,
		};
	}

	const event = events[index];

	ctx.addHeadline(event.title);
	ctx.addText(event.description);

	// Build choice buttons
	const choiceButtons = event.choices.map(choice => ({
		text: choice.text,
		primary: false,
		action: () => {
			// Show what the player chose, then apply effects
			ctx.addText(`> ${choice.text}`);
			const flavor = applyEventChoice(player, choice);
			ctx.addResult(flavor);
			ctx.updateStats(player);
			ctx.save();

			// Chain to next event or show summary + Continue
			if (index + 1 < events.length) {
				presentEvent(player, ctx, events, index + 1, statsBefore);
			} else {
				// Promote flags and show yearly summary
				promoteFlags(player);
				const deltas: Record<string, number> = {};
				deltas['athleticism'] = player.core.athleticism - statsBefore!['athleticism'];
				deltas['confidence'] = player.core.confidence - statsBefore!['confidence'];
				deltas['discipline'] = player.core.discipline - statsBefore!['discipline'];
				deltas['leadership'] = player.hidden.leadership - statsBefore!['leadership'];
				deltas['durability'] = player.hidden.durability - statsBefore!['durability'];
				deltas['health'] = player.core.health - statsBefore!['health'];
				const summary = generateChildhoodSummary(player, deltas);
				ctx.addText(`*${summary}*`);
				showContinue(player, ctx);
			}
		},
	}));

	ctx.waitForInteraction(event.title, choiceButtons);
}

//============================================
// Show the "Continue to Next Year" button
function showContinue(player: Player, ctx: CareerContext): void {
	ctx.waitForInteraction('Next Year', [{
		text: 'Continue',
		primary: true,
		action: () => advanceToNextYear(player, ctx),
	}]);
}

//============================================
// Check flag progress and promote to personality flags when thresholds are met
export function promoteFlags(player: Player): void {
	const progress = player.flagProgress;
	const flags = player.storyFlags;

	// Threshold 2: need repeated evidence
	const threshold2 = ['fearless', 'poorLoser', 'selfStarter', 'naturalLeader', 'quietWorker'];
	for (const key of threshold2) {
		// Map progress key to flag name (e.g., "fearless" -> "fearlessKid")
		const flagName = key === 'fearless' ? 'fearlessKid' : key;
		if ((progress[key] || 0) >= 2 && !flags[flagName]) {
			flags[flagName] = true;
		}
	}

	// Threshold 1: single instance is enough
	const threshold1 = ['roughAndTumble', 'showoff', 'bookish'];
	for (const key of threshold1) {
		if ((progress[key] || 0) >= 1 && !flags[key]) {
			flags[key] = true;
		}
	}
}

//============================================
// Generate a one-line childhood summary based on flags and biggest stat change
function generateChildhoodSummary(player: Player, statDeltas: Record<string, number>): string {
	const name = player.firstName;
	const flags = player.storyFlags;

	// Find the dominant stat change this year
	let topStat = '';
	let topDelta = 0;
	for (const [stat, delta] of Object.entries(statDeltas)) {
		if (delta > topDelta) {
			topStat = stat;
			topDelta = delta;
		}
	}

	// Count how many personality flags are set (promoted, not counters)
	const personalityFlags = [
		'fearlessKid', 'poorLoser', 'selfStarter', 'naturalLeader',
		'quietWorker', 'showoff', 'bookish', 'roughAndTumble',
	];
	const setFlags = personalityFlags.filter(f => flags[f]);

	// Strong summaries require 2+ flags
	if (setFlags.length >= 2) {
		if (flags['fearlessKid']) {
			return `${name} was already the kid who ran toward trouble, not away from it.`;
		}
		if (flags['selfStarter']) {
			return `${name} practiced without being asked. The neighbors noticed.`;
		}
		if (flags['naturalLeader']) {
			return `Other kids looked to ${name} to settle arguments and pick teams.`;
		}
	}

	// Softer summaries for single flags
	if (flags['fearlessKid']) {
		return `${name} was showing signs of being fearless. Or reckless. Hard to tell at this age.`;
	}
	if (flags['poorLoser']) {
		return `${name} was learning about losing. Slowly. Very slowly.`;
	}
	if (flags['selfStarter']) {
		return `${name} was starting to practice on their own. Not every day, but more than most kids.`;
	}
	if (flags['naturalLeader']) {
		return `${name} had a habit of organizing things. Not always successfully.`;
	}
	if (flags['quietWorker']) {
		return `${name} was the quiet one. But paying attention.`;
	}
	if (flags['showoff']) {
		return `${name} liked an audience. Any audience.`;
	}
	if (flags['bookish']) {
		return `${name} surprised everyone by actually liking homework. Mostly.`;
	}

	// Stat-based summaries as fallback
	if (topStat === 'athleticism') {
		return `${name} could not sit still. Every surface was something to climb, jump off, or run across.`;
	}
	if (topStat === 'confidence') {
		return `${name} walked into every room like they owned it. At age ${player.age}.`;
	}
	if (topStat === 'discipline') {
		return `${name} was learning that patience sometimes beats raw talent.`;
	}
	if (topStat === 'leadership') {
		return `${name} was already organizing games nobody asked for.`;
	}
	if (topStat === 'durability') {
		return `${name} fell down a lot. Got back up every time.`;
	}
	if (topStat === 'health') {
		return `${name} stayed healthy and grew steadily. A quiet year.`;
	}

	// Generic fallback by age band
	if (player.age <= 3) {
		return `${name} was a ball of energy with zero off switch.`;
	}
	if (player.age <= 6) {
		return `${name} was figuring out the rules. And which ones to break.`;
	}
	return `${name} was starting to look like an athlete.`;
}
