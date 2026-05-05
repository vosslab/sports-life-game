// choices_kicker.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// Kicker choice pools
export const KICKER_CHOICES: ChoiceTemplate[] = [
	{
		id: 'kick_routine',
		label: 'Trust your normal swing',
		description: 'Routine kick. Nail the fundamentals.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['tie_game', 'comeback_drive', 'hold_lead'],
		bigSuccessNarrative: [
			'Absolutely crushed it. Good from 32 and it would have been good from 52.',
			'Pure stroke. Right through the middle with room to spare.',
		],
		successNarrative: [
			'Right down the middle. Good. Three points.',
			'Smooth approach, clean contact. Splits the uprights.',
		],
		failureNarrative: [
			'Pulled it left. The kick hooks wide. No good.',
			'Short approach felt off. Drifts wide right.',
		],
		disasterNarrative: [],
	},
	{
		id: 'kick_low_drive',
		label: 'Drive it low and hard',
		description: 'Line drive into the wind. Gutsy.',
		risk: 'balanced',
		keyStat: 'confidence',
		situations: ['tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'Low rocket right through the rush. Good! Absolutely fearless in the wind.',
			'Knuckleball through the uprights. The wind could not touch it.',
		],
		successNarrative: [
			'Low line drive just clears the crossbar. Good!',
			'Drilled it hard and flat. Barely clears the rush but it is through.',
		],
		failureNarrative: [
			'Too low. Blocked at the line of scrimmage.',
			'Line drive hits the upright. Bounces back. No good.',
		],
		disasterNarrative: [
			'Blocked! Defense scoops it up and returns it for a touchdown!',
			'The kick is blocked and recovered in the end zone. Touchdown!',
		],
	},
	{
		id: 'kick_long_bomb',
		label: 'Go for the long bomb',
		description: '50+ yards. Career-defining or career-haunting.',
		risk: 'heroic',
		keyStat: 'technique',
		situations: ['tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'54 yards. Right down the pipe. Ice in his veins! Stadium erupts!',
			'From 56 yards out... he hammers it... GOOD! Career-best!',
		],
		successNarrative: [
			'From 52 yards... it has the distance... it is good! Barely.',
			'Long attempt. The kick is up... and it sneaks inside the left upright.',
		],
		failureNarrative: [
			'Long attempt falls short. Did not have the leg.',
			'From 53... no good. Drifts wide as it fades.',
		],
		disasterNarrative: [
			'Way short! Defense fields it and runs it back.',
			'Shanked it badly. The return man picks it up with room to run.',
		],
	},
	{
		id: 'kick_onside',
		label: 'Attempt an onside kick',
		description: 'You need the ball back. All or nothing.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive'],
		bigSuccessNarrative: [
			'Onside kick! It bounces off a defender and your team recovers! You have the ball back!',
			'Perfect top-spin. It hops right into your teammate hands. Recovered!',
		],
		successNarrative: [
			'Onside kick, chaotic scramble. Your team dives on it! Recovered!',
			'Risky onside kick. The ball takes a crazy bounce but your team gets it!',
		],
		failureNarrative: [
			'The opposing team was ready for it. They recover easily.',
			'Onside kick goes right to their front line. No chance.',
		],
		disasterNarrative: [
			'Onside kick squibs and the returner picks it up. Returned for a touchdown!',
			'Everyone saw it coming. They grab it and run it back. Disaster.',
		],
	},
	{
		id: 'kick_pin_deep',
		label: 'Pin them deep with a coffin corner',
		description: 'Punt it out of bounds inside the 10.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Perfect coffin corner. The ball goes out at the 2. They are buried.',
			'Pinpoint punt. It rolls dead at the 3-yard line. Your defense loves you.',
		],
		successNarrative: [
			'Good punt. Rolls out of bounds at the 8. Long field for them.',
			'Solid coffin corner kick. They start at the 12.',
		],
		failureNarrative: [
			'Tried to pin them but the punt went into the end zone. Touchback at the 25.',
			'Angled kick was too strong. Through the end zone for a touchback.',
		],
		disasterNarrative: [
			'Shanked it! The punt goes 15 yards. They have great field position.',
			'The coffin corner kick veers badly. Returned to midfield.',
		],
	},
	// --- Final play ---
	{
		id: 'kick_game_winner',
		label: 'Game-winning field goal',
		description: 'This is the kick. Make it and you are a hero. Miss it and...',
		risk: 'balanced',
		keyStat: 'confidence',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'The snap is good. The hold is down. You swing through it. GOOD! Game winner! Your teammates tackle you!',
			'Right down the pipe. No doubt about it. The kick is GOOD! You just won the game!',
		],
		successNarrative: [
			'It barely clears the crossbar. Good! You win! The sideline erupts.',
			'Hooks at the last second but sneaks inside the upright. Good! What a finish!',
		],
		failureNarrative: [
			'You push it right. The kick drifts wide. No good. Season over.',
			'It had the distance but not the direction. Wide left. Game over.',
		],
		disasterNarrative: [
			'Blocked! The kick is blocked and returned! They score! Unbelievable ending.',
			'You shank it completely. Not even close. The other team storms the field.',
		],
	},
	{
		id: 'kick_block_attempt',
		label: 'Get a hand on it',
		description: 'They are kicking for the win. Time your jump.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You get a hand on it! Blocked! The kick is no good! You saved the game!',
			'Perfect timing! You leap and deflect the kick! The bench goes wild!',
		],
		successNarrative: [
			'You get enough of a push to disrupt the timing. The kick hooks wide. No good!',
			'You tip the kick just enough. It falls short of the crossbar. You survive!',
		],
		failureNarrative: [
			'You time the jump but the ball sails over your fingertips. Good. They win.',
			'You tried to get there but the holder got it down clean. The kick splits the uprights.',
		],
		disasterNarrative: [
			'You jumped offsides. Penalty. They move up 5 yards and kick the easy winner.',
			'Roughing the kicker. First down. They run out the clock and win.',
		],
	},
];
