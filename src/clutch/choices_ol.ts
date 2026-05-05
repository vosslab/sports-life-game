// choices_ol.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// Lineman choice pools (OL/DL)
export const LINEMAN_CHOICES: ChoiceTemplate[] = [
	{
		id: 'line_hold_assignment',
		label: 'Hold your assignment',
		description: 'Stay home. Do your job.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'Dominant block. You pancake your man and the runner walks in!',
			'You seal the edge so clean the back does not even get touched.',
		],
		successNarrative: [
			'Solid block. Your man goes nowhere. The play works.',
			'You hold the edge. The runner finds a lane. First down.',
		],
		failureNarrative: [
			'Held your ground but the play was designed the other way.',
			'Good block but the play got blown up elsewhere.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_double_team',
		label: 'Double the star pass rusher',
		description: 'Take their best player out of the play entirely.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['comeback_drive', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'You drive their star five yards off the ball. The QB has forever. Touchdown pass!',
			'Total domination at the point of attack. Score!',
		],
		successNarrative: [
			'Double team seals their best player. The QB has all day.',
			'You and the guard crush the defensive end. Play works perfectly.',
		],
		failureNarrative: [
			'He split the double team. Got a hand on the quarterback.',
			'Tried the combo block but the stunt confused you.',
		],
		disasterNarrative: [
			'He blew through both of you. Strip sack!',
			'Double team whiffed completely. Free rusher. Sack and fumble.',
		],
	},
	{
		id: 'line_shoot_gap',
		label: 'Shoot the gap',
		description: 'Guess right and it is a huge play. Guess wrong, disaster.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'Timed it perfectly. You hit the runner so hard the ball pops out. Fumble recovery!',
			'You explode through the gap. Sack! Momentum swing!',
		],
		successNarrative: [
			'You fire into the backfield. Hit the runner behind the line.',
			'Right gap, right time. You blow up the play.',
		],
		failureNarrative: [
			'Wrong gap. They ran right past where you were.',
			'You guessed run but it was a pass.',
		],
		disasterNarrative: [
			'You bit hard and left a gaping hole. Walk-in touchdown.',
			'Completely wrong read. They go 40 yards through the gap you abandoned.',
		],
	},
	{
		id: 'line_pull_and_lead',
		label: 'Pull and lead the way',
		description: 'Get out in space and pave a path.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'red_zone', 'hold_lead'],
		bigSuccessNarrative: [
			'You pull around and obliterate the linebacker. Your back walks in!',
			'Perfect pull. You flatten the safety at the second level. Touchdown run!',
		],
		successNarrative: [
			'You pull and get a clean block at the second level. Big gain.',
			'Lead block around the edge. The runner follows you for 10.',
		],
		failureNarrative: [
			'You got out in space but whiffed on the block.',
			'The linebacker was faster than you. He made the tackle before you got there.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_drive_block',
		label: 'Drive block straight ahead',
		description: 'Move the pile. Create a crease.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['red_zone', 'hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'You drive your man back 5 yards. The runner walks through untouched!',
			'Pancake block! Your man is flat on his back. The play goes for a score!',
		],
		successNarrative: [
			'Good push at the point of attack. The runner picks up 3.',
			'You move the pile. Just enough for a first down.',
		],
		failureNarrative: [
			'Stalemate at the line. No push.',
			'He anchored and held his ground. No crease to speak of.',
		],
		disasterNarrative: [],
	},
	{
		id: 'line_swim_move',
		label: 'Hit him with the swim move',
		description: 'Get around the blocker with technique.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['must_have_stop', 'comeback_drive'],
		bigSuccessNarrative: [
			'Beautiful swim move. You are past the tackle. Sack! The ball comes out! Fumble!',
			'He never saw it coming. You swim past him and hit the QB. Strip sack!',
		],
		successNarrative: [
			'Swim move works. You get pressure on the quarterback. Incomplete pass.',
			'You beat the tackle clean. Sack! Third and long.',
		],
		failureNarrative: [
			'He caught your arm on the swim. You are locked up.',
			'Tried the swim but he recovered. No pressure.',
		],
		disasterNarrative: [
			'You committed too hard on the move. Screen pass goes right where you were. Big gain.',
			'Swim move left the lane open. Runner goes right past you.',
		],
	},
	// --- Final play ---
	{
		id: 'line_goal_line_trench',
		label: 'Win the trench battle at the goal line',
		description: 'Last play. Move the pile or hold the line.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You drive your man back and create a crease. Your runner dives through. TOUCHDOWN!',
			'Absolute domination at the point of attack. The pile moves forward. Score!',
		],
		successNarrative: [
			'You hold the line. No penetration. Your runner finds a gap. He is in!',
			'You win the leverage battle. Just enough push. Touchdown.',
		],
		failureNarrative: [
			'Stalemate at the goal line. The pile goes nowhere. Game over.',
			'You push but they push back harder. Stuffed at the line.',
		],
		disasterNarrative: [
			'You get driven back into your own runner. Fumble at the goal line!',
			'The defense blows through the line. Strip sack on the final play.',
		],
	},
];
