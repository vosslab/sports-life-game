// milestones.ts - career milestone definitions and checking logic

import { Player } from './player.js';

//============================================
// A milestone: one-time event with condition and narrative text
export interface Milestone {
	id: string;
	phase: string;
	check: (player: Player, seasonWins: number, seasonLosses: number) => boolean;
	headline: string;
	text: string;
}

//============================================
// All milestones across all career phases
const MILESTONES: Milestone[] = [
	// High School milestones
	{
		id: 'hs_first_start',
		phase: 'high_school',
		check: (player) => player.depthChart === 'starter',
		headline: 'Depth Chart Posted',
		text: 'Coach posted the depth chart. Your name is at the top.',
	},
	{
		id: 'hs_first_win',
		phase: 'high_school',
		check: (player, wins) => wins === 1,
		headline: 'First Win',
		text: 'Nothing beats your first win. The locker room is electric.',
	},
	{
		id: 'hs_first_loss',
		phase: 'high_school',
		check: (player, wins, losses) => losses === 1,
		headline: 'First Loss',
		text: 'Silence in the locker room. This is what losing feels like.',
	},
	{
		id: 'hs_rivalry_game',
		phase: 'high_school',
		check: (player, wins) => player.currentWeek >= 8 && wins >= 5,
		headline: 'Rivalry Game Week',
		text: 'This is the rivalry game. The whole town is watching.',
	},
	{
		id: 'hs_undefeated_late',
		phase: 'high_school',
		check: (player, wins, losses) => player.currentWeek >= 8 && losses === 0,
		headline: 'Undefeated Record',
		text: 'Undefeated this late. The pressure is building.',
	},
	{
		id: 'hs_recruiting_attention',
		phase: 'high_school',
		check: (player) => player.recruitingStars >= 3,
		headline: 'Recruiting Interest',
		text: 'College scouts are starting to show up at practice.',
	},

	// College milestones
	{
		id: 'college_first_start',
		phase: 'college',
		check: (player) => player.depthChart === 'starter' && player.collegeYear === 1,
		headline: 'College Starter',
		text: 'Starting in front of 80,000 fans. This is different.',
	},
	{
		id: 'college_gameday_crew',
		phase: 'college',
		check: (player) => player.collegeYear >= 2 && player.career.popularity >= 60,
		headline: 'ESPN GameDay',
		text: 'The ESPN GameDay crew is here. They mentioned your name.',
	},
	{
		id: 'college_academic_trouble',
		phase: 'college',
		check: (player) => player.core.discipline < 30,
		headline: 'Academic Advisor Calls',
		text: 'Academic advisor called. Your grades are slipping.',
	},
	{
		id: 'college_nil_deal',
		phase: 'college',
		check: (player) => player.career.popularity >= 50 && player.collegeYear >= 2,
		headline: 'NIL Opportunity',
		text: 'A local business wants to put your face on a billboard.',
	},
	{
		id: 'college_draft_buzz',
		phase: 'college',
		check: (player) => player.draftStock >= 60 && player.collegeYear >= 3,
		headline: 'Mock Draft Buzz',
		text: 'Mock drafts are starting to include your name.',
	},

	// NFL milestones
	{
		id: 'nfl_first_nfl_start',
		phase: 'nfl',
		check: (player) => player.depthChart === 'starter' && player.nflYear === 1,
		headline: '53-Man Roster',
		text: '53-man roster. Active on game day. This is the NFL.',
	},
	{
		id: 'nfl_first_nfl_win',
		phase: 'nfl',
		check: (player, wins) => wins === 1 && player.nflYear === 1,
		headline: 'First NFL Win',
		text: 'Your first NFL win. The ball hits different when it counts.',
	},
	{
		id: 'nfl_100th_game',
		phase: 'nfl',
		check: (player) => player.seasonStats.gamesPlayed >= 100,
		headline: '100 Games',
		text: '100 games. Not many make it this far.',
	},
	{
		id: 'nfl_pro_bowl_invite',
		phase: 'nfl',
		check: (player) => player.career.popularity >= 70 && player.nflYear >= 2,
		headline: 'Pro Bowl Invite',
		text: 'Pro Bowl invite! Your peers voted you one of the best.',
	},
	{
		id: 'nfl_contract_year',
		phase: 'nfl',
		check: (player) => player.nflYear === 4,
		headline: 'Contract Year',
		text: 'Contract year. Every snap matters. Play well and get paid.',
	},
	{
		id: 'nfl_veteran_leader',
		phase: 'nfl',
		check: (player) => player.nflYear >= 8 && player.core.discipline >= 60,
		headline: 'Veteran Leader',
		text: 'Young guys look up to you now. You are the old head.',
	},
	{
		id: 'nfl_body_breaking',
		phase: 'nfl',
		check: (player) => player.age >= 33 && player.core.health < 50,
		headline: 'Body Breaking Down',
		text: 'Your body is starting to break down. Every morning hurts.',
	},
];

//============================================
// Check and return any milestones that should fire this week
export function checkMilestones(
	player: Player,
	seasonWins: number,
	seasonLosses: number,
): Milestone[] {
	const triggered: Milestone[] = [];

	for (const milestone of MILESTONES) {
		// Skip if not in this phase
		if (milestone.phase !== player.phase) {
			continue;
		}

		// Skip if already fired
		if (player.milestones[milestone.id]) {
			continue;
		}

		// Check if condition is met
		if (milestone.check(player, seasonWins, seasonLosses)) {
			player.milestones[milestone.id] = true;
			triggered.push(milestone);
		}
	}

	return triggered;
}
