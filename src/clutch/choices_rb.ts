// choices_rb.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// RB choice pools
export const RB_CHOICES: ChoiceTemplate[] = [
	{
		id: 'rb_follow_blocks',
		label: 'Follow your blockers',
		description: 'Trust the hole. Grind out the yards.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Followed the lead block perfectly and burst through for a 20-yard gain!',
			'The hole opens up and you are gone. First down and then some!',
		],
		successNarrative: [
			'Hit the hole hard. Four yards. First down.',
			'Good eyes through the gap. Picked up six before contact.',
		],
		failureNarrative: [
			'No hole. Stuffed at the line for a one-yard gain.',
			'The blocking broke down. You got what you could.',
		],
		disasterNarrative: [],
	},
	{
		id: 'rb_bounce_outside',
		label: 'Bounce it outside',
		description: 'If you turn the corner, it is open field.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'tie_game', 'hold_lead'],
		bigSuccessNarrative: [
			'Turn the corner and nobody can catch you. Untouched. Touchdown!',
			'You hit the edge at full speed. The safety takes a bad angle. Gone!',
		],
		successNarrative: [
			'Bounce outside, turn the corner. Daylight. Big gain.',
			'Speed to the edge. You outrun the linebacker. First and goal.',
		],
		failureNarrative: [
			'The defensive end set the edge. Tackled for a loss.',
			'Tried to bounce it but the corner was sealed.',
		],
		disasterNarrative: [
			'Tried to reverse field and the ball popped loose. Fumble!',
			'Hit hard at the edge. The ball squirts out. Turnover.',
		],
	},
	{
		id: 'rb_truck',
		label: 'Lower your shoulder',
		description: 'Fight for every inch. Risk the fumble.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive', 'tie_game', 'red_zone'],
		bigSuccessNarrative: [
			'You truck the safety so hard his helmet pops off. Nobody else wants to try. Touchdown!',
			'Three defenders bounce off you as you power into the end zone!',
		],
		successNarrative: [
			'You lower the boom on the linebacker. He goes backwards. First down.',
			'Contact at the five. You drive your legs. They cannot bring you down.',
		],
		failureNarrative: [
			'Lowered the shoulder but the pile pushed you back. No gain.',
			'Met at the line by the whole front. Stuffed.',
		],
		disasterNarrative: [
			'The hit jars the ball loose. Fumble. Defense recovers.',
			'Massive shot. Ball pops out. Turnover.',
		],
	},
	{
		id: 'rb_cutback',
		label: 'Cut back against the grain',
		description: 'The defense is flowing one way. Go the other.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['comeback_drive', 'backed_up', 'tie_game'],
		bigSuccessNarrative: [
			'Cutback lane is wide open! You reverse field and nobody is home. Touchdown!',
			'One sharp cut and you split the defense. Gone for a huge gain!',
		],
		successNarrative: [
			'Great read. You plant and cut back. 8 yards the other way. First down.',
			'The defense overflowed. You cut back and picked up a big chunk.',
		],
		failureNarrative: [
			'You tried to cut back but the backside end stayed home. Loss of 2.',
			'Cutback went nowhere. The linebacker was waiting.',
		],
		disasterNarrative: [
			'Tried to reverse field and got hit from behind. Ball comes loose. Fumble!',
			'The cutback left you exposed. Big hit. Fumble recovered by the defense.',
		],
	},
	{
		id: 'rb_leap',
		label: 'Leap over the pile',
		description: 'Go airborne. Land in the end zone or land on your back.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'You go airborne! Leap over the entire pile and land in the end zone! Touchdown! Unbelievable!',
			'Hurdled the whole defensive line. The crowd cannot believe what they just saw. Score!',
		],
		successNarrative: [
			'You dive over the top. Reaches the ball across the goal line. Touchdown!',
			'Leap at the pile. You stretch the ball over. Just barely in!',
		],
		failureNarrative: [
			'You tried to go over but got caught in the pile. No gain.',
			'Leap came up short. Stuffed at the line.',
		],
		disasterNarrative: [
			'You went airborne but the ball got knocked out at the peak. Fumble! Opponent recovers!',
			'Tried to leap and got upended. Hit the ground hard. Ball squirts free. Turnover.',
		],
	},
	{
		id: 'rb_clock_grind',
		label: 'Take what they give you',
		description: 'Run hard between the tackles. Eat clock.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Simple run. But the hole was massive. 15 yards. That might be the dagger!',
			'Straight ahead, breaks one tackle, second level is empty. First down!',
		],
		successNarrative: [
			'Three yards. Clock running. Exactly what the coach wanted.',
			'Runs between the tackles for 4. First down. The defense is gassed.',
			'Gain of 3. He stays in bounds. Another 40 seconds drained. That might be enough.',
		],
		failureNarrative: [
			'Stuffed for one. But the clock keeps ticking.',
			'No hole. Gain of nothing. But 30 seconds burned off the clock.',
		],
		disasterNarrative: [],
	},
	// --- Final play ---
	{
		id: 'rb_dive_for_pylon',
		label: 'Dive for the pylon',
		description: 'Last play. Stretch the ball out. Reach for it.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You stretch the ball out as you dive. The tip of the ball crosses the plane. TOUCHDOWN! Review confirms it!',
			'Full extension dive. The ball touches the pylon before your knee is down. Score! Game over!',
		],
		successNarrative: [
			'You dive and reach. The ball breaks the plane by an inch. Touchdown!',
			'Stretch play. You extend with everything. The ref signals touchdown!',
		],
		failureNarrative: [
			'You dive but they stop you a yard short. Ball at the 1. But time has expired.',
			'Reached for the pylon but the safety knocked you out of bounds at the 2.',
		],
		disasterNarrative: [
			'Dive for the pylon and the ball gets knocked loose. Fumble as time expires.',
			'Tried to extend but the ball was stripped at the goal line. Heartbreak.',
		],
	},
];
