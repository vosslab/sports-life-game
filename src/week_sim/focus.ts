// focus.ts - season-goal driven weekly stat updates and flavor text.
//
// Split from the legacy `src/week_sim.ts` during M4 of the modularization
// plan. This module owns the weekly application of the player's chosen
// season goal: stat changes, recovery, injury rolls, and the random flavor
// pool used by the story log.

import {
	Player, clampStat, randomInRange, modifyStat, modifyGpa,
} from '../player.js';

//============================================
// Legacy type alias kept for any remaining references during migration
export type WeeklyFocus = 'train' | 'film_study' | 'recovery' | 'social' | 'teamwork';

//============================================
// Flavor text pools for season goals (randomly selected each week)
const GRIND_FLAVOR: string[] = [
	'Your extra reps are paying off. Coaches are starting to trust you more.',
	'You stayed late running drills until the lights shut off.',
	'Coach pulled you aside after practice and said he noticed your improvement.',
	'The repetition is starting to click. Moves that felt awkward now feel automatic.',
	'Your hands are blistered but your footwork has never been better.',
	'You pushed through a brutal practice. Every rep felt like it mattered.',
	'The scout team could not keep up with you today.',
	'A tough session, but you walked off the field feeling sharper.',
];

const HEALTHY_FLAVOR: string[] = [
	'A full week of rest and ice baths. Your body feels like new.',
	'You took it easy and let your body recover. Smart move.',
	'Sleep, stretching, and cold tubs. You feel recharged.',
	'The trainers worked on your sore spots. You feel fresh.',
	'A light week gave your body the reset it needed.',
	'You focused on nutrition and sleep. Energy levels are way up.',
	'Ice, compression, and proper rest. You are ready to dominate.',
	'Sometimes the best training is no training. You feel great.',
];

const POPULAR_FLAVOR: string[] = [
	'You hung out with teammates all week. Your bond is stronger.',
	'Team dinner, group chat, and weekend plans. You are one of the crew now.',
	'You made some new friends outside of football. Life feels balanced.',
	'A fun week off the field. Your confidence got a nice boost.',
	'You went to a party and everyone knew your name. Feels good.',
	'Teammates invited you to everything this week. You belong here.',
	'Social media blew up after your highlight got shared around school.',
	'By focusing on team chemistry, your voice carries more weight in the locker room.',
];

const ACADEMIC_FLAVOR: string[] = [
	'You aced the history test. Coach likes players who handle their business.',
	'Hours in the library are paying off. Your GPA is climbing.',
	'You stayed disciplined and finished every assignment on time.',
	'The academic advisor said you are one of the best student-athletes.',
	'Film study and textbook study. Your brain is getting a workout.',
	'Studying film all week, you noticed patterns nobody else caught.',
	'Coach quizzed you on formations and you nailed every one.',
	'The playbook is starting to feel like a second language.',
];

//============================================
// Pick a random string from a flavor pool
function pickFlavor(pool: string[]): string {
	return pool[randomInRange(0, pool.length - 1)];
}

//============================================
// Apply season goal effects to player stats each week.
// Each goal has a real trade-off: gaining one thing costs another.
// Health decays every week from the grind of football (wear and tear).
export function applySeasonGoal(player: Player): string {
	const goal = player.seasonGoal;
	let storyText = '';

	// Natural health recovery: bodies heal each week (counteracts wear and tear)
	// Recovery is stronger when health is low (body prioritizes healing)
	const recoveryAmount = player.core.health < 50 ? randomInRange(2, 4) : randomInRange(1, 2);
	modifyStat(player, 'health', recoveryAmount);

	// Weekly wear and tear from football: minor, predictable
	modifyStat(player, 'health', -1);

	switch (goal) {
		case 'grind': {
			// Grind mode: best skill growth, small health cost from overtraining
			modifyStat(player, 'technique', randomInRange(1, 3));
			modifyStat(player, 'athleticism', randomInRange(1, 2));
			modifyStat(player, 'health', -randomInRange(0, 1));
			modifyStat(player, 'discipline', randomInRange(0, 1));
			modifyGpa(player, -randomInRange(0, 3) / 100);
			storyText = pickFlavor(GRIND_FLAVOR);
			break;
		}

		case 'healthy': {
			// Stay healthy: extra recovery, light skill maintenance
			modifyStat(player, 'health', randomInRange(2, 4));
			modifyStat(player, 'technique', randomInRange(0, 1));
			modifyStat(player, 'confidence', randomInRange(0, 1));
			modifyGpa(player, randomInRange(-1, 1) / 100);
			storyText = pickFlavor(HEALTHY_FLAVOR);
			break;
		}

		case 'popular': {
			// Be popular / build brand: social gains, mild discipline cost
			const socialGain = randomInRange(2, 3);
			player.career.popularity = clampStat(player.career.popularity + socialGain);
			modifyStat(player, 'confidence', randomInRange(1, 2));
			modifyStat(player, 'discipline', -randomInRange(0, 1));
			player.hidden.leadership = clampStat(player.hidden.leadership + randomInRange(1, 2));
			modifyGpa(player, -randomInRange(0, 3) / 100);
			storyText = pickFlavor(POPULAR_FLAVOR);
			break;
		}

		case 'academic': {
			// Hit the books: GPA and IQ growth, steady discipline
			modifyStat(player, 'footballIq', randomInRange(1, 3));
			modifyStat(player, 'discipline', randomInRange(1, 2));
			modifyStat(player, 'technique', randomInRange(0, 1));
			modifyGpa(player, randomInRange(5, 12) / 100);
			storyText = pickFlavor(ACADEMIC_FLAVOR);
			break;
		}
	}

	// Random injury chance (3% per week, higher when health is low)
	if (player.core.health < 30 && randomInRange(1, 100) <= 8) {
		const injuryDamage = randomInRange(4, 8);
		modifyStat(player, 'health', -injuryDamage);
		modifyStat(player, 'confidence', -randomInRange(1, 2));
		storyText += ' You tweaked something in practice. The trainers are keeping an eye on it.';
	} else if (randomInRange(1, 100) <= 3) {
		const injuryDamage = randomInRange(2, 5);
		modifyStat(player, 'health', -injuryDamage);
		storyText += ' Minor injury scare this week. You are playing through some pain.';
	}

	// Confidence drifts down on the bench (less harshly)
	if (player.depthChart === 'bench' && randomInRange(1, 100) <= 20) {
		modifyStat(player, 'confidence', -randomInRange(0, 1));
	}

	return storyText;
}

//============================================
// Legacy wrapper: old phase handlers still pass a WeeklyFocus, but we apply
// the player's season goal instead. The focus arg is ignored.
export function applyWeeklyFocus(player: Player, _focus: WeeklyFocus): string {
	return applySeasonGoal(player);
}
