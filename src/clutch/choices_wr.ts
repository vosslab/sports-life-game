// choices_wr.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// WR/TE choice pools
export const WR_CHOICES: ChoiceTemplate[] = [
	{
		id: 'wr_crisp_route',
		label: 'Run a crisp route',
		description: 'Make the catch. Secure the ball.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['comeback_drive', 'tie_game', 'hold_lead'],
		bigSuccessNarrative: [
			'Route so crisp the defender slips. Easy catch, easy score!',
			'Perfect route. You waltz into the end zone untouched.',
		],
		successNarrative: [
			'Sharp cut. Clean catch. First down.',
			'Textbook route. The ball hits you right in the numbers.',
		],
		failureNarrative: [
			'Good route but the ball was just off your fingertips.',
			'You got open but the throw was behind you.',
		],
		disasterNarrative: [],
	},
	{
		id: 'wr_double_move',
		label: 'Sell the double move',
		description: 'Fake the out, break inside. If he bites, you are gone.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['comeback_drive', 'tie_game'],
		bigSuccessNarrative: [
			'The corner bites on the first move. Five yards clear. Catch in stride. Touchdown!',
			'Double move worked perfectly. Safety bit, corner lost. Easy touchdown.',
		],
		successNarrative: [
			'Double move fools the corner. Wide open down the seam.',
			'Pump fake freezes the safety. You blow past him. Big gain.',
		],
		failureNarrative: [
			'The corner did not bite. He stayed on your hip.',
			'Safety read it. Double coverage. Ball thrown away.',
		],
		disasterNarrative: [
			'Corner jumped the inside break. Stepped right in front. Interception.',
			'Safety read the route combo. Tipped ball, intercepted.',
		],
	},
	{
		id: 'wr_contested',
		label: 'Go up and get it',
		description: 'Contested ball. You or him.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'red_zone', 'tie_game'],
		bigSuccessNarrative: [
			'You outjump the corner by a foot. One-handed grab in the end zone!',
			'Moss the defender. Catch of the year. Stadium goes crazy. Touchdown!',
		],
		successNarrative: [
			'Jump ball in traffic. You rip it away from the defender. First down.',
			'Contested catch at the sideline. You highpoint the ball. Incredible.',
		],
		failureNarrative: [
			'Went up but the defender knocked it away.',
			'Could not come down with it. The corner made a good play.',
		],
		disasterNarrative: [
			'Went up but the ball deflected right to the safety. Pick.',
			'Tipped at the highest point. Falls into the defender hands.',
		],
	},
	{
		id: 'wr_toe_tap',
		label: 'Toe-tap at the sideline',
		description: 'Get both feet in. That is all that matters.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['comeback_drive', 'red_zone', 'hold_lead'],
		bigSuccessNarrative: [
			'Toe-tap, both feet down, catches it falling out of bounds in the end zone! Touchdown!',
			'Unbelievable body control. He gets both feet in at the sideline. Score!',
		],
		successNarrative: [
			'Sideline catch. Both feet in. First down. Reviewed and confirmed.',
			'Toe-tap along the boundary. Great body awareness. Chains move.',
		],
		failureNarrative: [
			'One foot on the line. Ruled out of bounds. Incomplete.',
			'Great catch but the replay shows the toe was on the white. Incomplete.',
		],
		disasterNarrative: [],
	},
	{
		id: 'wr_yac',
		label: 'Catch and create after the catch',
		description: 'Catch the short one and make them miss.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['hold_lead', 'ice_game', 'tie_game'],
		bigSuccessNarrative: [
			'Short catch, spin move, broken tackle. He is gone! Touchdown!',
			'Catches the slant and turns on the jets. 40 yards after the catch!',
		],
		successNarrative: [
			'Quick slant, catch, and a nice move. 12 yards after the catch.',
			'Short throw, makes one guy miss, picks up 15. First down.',
		],
		failureNarrative: [
			'Caught it but immediately tackled. 2-yard gain.',
			'Short throw but the corner closed fast. No room to work.',
		],
		disasterNarrative: [
			'Caught it but the hit came immediately. Ball jarred loose. Fumble!',
			'Made the catch but got stripped going upfield. Turnover.',
		],
	},
	{
		id: 'wr_block_and_seal',
		label: 'Seal your man and spring the runner',
		description: 'You might not touch the ball, but you can spring the play.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Devastating block at the point of attack. The runner goes 20 yards!',
			'You pancake the corner. Your back goes untouched into the end zone!',
		],
		successNarrative: [
			'Clean block on the edge. The runner picks up the first down.',
			'Good seal block. Your man gets 5 yards thanks to you.',
		],
		failureNarrative: [
			'You tried to block but the defender slipped off. No impact.',
			'Your man fought through the block and made the tackle.',
		],
		disasterNarrative: [],
	},
	// --- Final play ---
	{
		id: 'wr_hail_mary_jump',
		label: 'Win the jump ball in the end zone',
		description: 'The ball is coming your way. Outfight everyone for it.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'The Hail Mary comes down. Three defenders around you. You rip it out of the air. TOUCHDOWN!',
			'You climb the ladder and snatch it at the highest point. Nobody can believe it. Score!',
		],
		successNarrative: [
			'The ball bounces off a defender hands right to you. You pull it in. Touchdown!',
			'You fight for position and come down with the tip. Reviewed and confirmed. Score!',
		],
		failureNarrative: [
			'You went up for it but the defender tipped it away. Game over.',
			'Jostling in the end zone. The ball falls through your hands. That is the season.',
		],
		disasterNarrative: [
			'You went up but the safety snatched it right over you. Intercepted.',
			'The ball bounced off your hands to a defender. Picked off as time expires.',
		],
	},
];
