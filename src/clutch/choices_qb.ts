// choices_qb.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// QB choice pools keyed by situation
export const QB_CHOICES: ChoiceTemplate[] = [
	// --- Comeback options ---
	{
		id: 'qb_sideline_zip',
		label: 'Zip one to the sideline',
		description: 'Stop the clock and move the chains.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['comeback_drive'],
		bigSuccessNarrative: [
			'Bullet to the sideline. He steps out at the 10. Clock stops. You are in business!',
			'Perfect out route. Your man gets both feet in and steps out. First and goal!',
		],
		successNarrative: [
			'Quick out to the sideline. Caught. Clock stops. First down.',
			'Sideline throw, clean catch. Chains move and the clock is stopped.',
		],
		failureNarrative: [
			'Sideline throw just out of reach. Incomplete. Clock stops but you lose a down.',
			'He could not get both feet in. Ruled out of bounds. Incomplete.',
		],
		disasterNarrative: [],
	},
	{
		id: 'qb_scramble_comeback',
		label: 'Trust your legs',
		description: 'Scramble and try to make something happen.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['comeback_drive', 'backed_up'],
		bigSuccessNarrative: [
			'You tuck it and run. Juke the linebacker. Spin off the safety. Nobody can catch you! Touchdown!',
			'Scramble drill. You weave through traffic and dive into the end zone!',
		],
		successNarrative: [
			'You take off. Pick up 12 on the scramble. First down.',
			'Nothing open downfield so you run for it. Big gain to the red zone.',
		],
		failureNarrative: [
			'You try to run but the defensive end corrals you. Short gain.',
			'Scrambled right into pressure. Sacked for a loss.',
		],
		disasterNarrative: [
			'You try to make a hero play and the ball gets stripped. Fumble!',
			'Scramble goes wrong. You try to throw on the run and it is intercepted.',
		],
	},
	{
		id: 'qb_deep_shot',
		label: 'Take the deep shot now',
		description: 'One throw could change everything.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['comeback_drive', 'tie_game'],
		bigSuccessNarrative: [
			'You launch it 50 yards. Your receiver runs under it in stride. Touchdown!',
			'Deep ball, double coverage, does not matter. Your arm just made a statement. Touchdown!',
		],
		successNarrative: [
			'Heave to the end zone. Your receiver goes up over the corner. Caught! Touchdown!',
			'Bomb down the sideline. Perfect throw, perfect catch. The crowd erupts.',
		],
		failureNarrative: [
			'Deep ball sails out of bounds. You put too much on it.',
			'Receiver could not get separation. Ball falls incomplete.',
		],
		disasterNarrative: [
			'You heave it deep but the safety reads it all the way. Picked off.',
			'Underthrown deep ball. Corner steps in front. Interception returned to midfield.',
		],
	},
	// --- Hold lead / ice game options ---
	{
		id: 'qb_checkdown_clock',
		label: 'Check down and run the clock',
		description: 'Safe completion. Burn time. Win the game.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Check down to the flat and your back breaks a tackle. First down! Clock is bleeding.',
			'Short throw, the receiver makes a man miss and picks up 15. That might ice it!',
		],
		successNarrative: [
			'Dump pass to the back. He picks up five. First down. Keep the clock moving.',
			'Quick out to the tight end. Eight yards. Chains move. Clock burns.',
			'Short completion underneath. He stays in bounds. Clock keeps running. That is a smart play.',
		],
		failureNarrative: [
			'Short pass batted down at the line. Clock stops.',
			'Check down lands in the dirt. Incomplete. Clock stops.',
		],
		disasterNarrative: [],
	},
	{
		id: 'qb_bootleg',
		label: 'Keep it on a bootleg',
		description: 'Freeze the defense with a fake. Pick up the first if you can.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['hold_lead', 'ice_game', 'backed_up'],
		bigSuccessNarrative: [
			'Play fake sells perfectly. You bootleg left and walk into the end zone! Dagger!',
			'Everyone bites on the run fake. You keep it, turn the corner. Touchdown! Game over!',
		],
		successNarrative: [
			'Bootleg right. Defense bites on the fake. You pick up 10 and slide. First down.',
			'Naked bootleg. Linebacker freezes. You scramble for the first. Clock running.',
		],
		failureNarrative: [
			'The end read it. He did not bite on the fake. You throw it away.',
			'Bootleg got blown up. The corner crashed down. No gain.',
		],
		disasterNarrative: [
			'The defense was not fooled. Sack, fumble. They recover.',
			'You try to force a throw on the run. It is tipped and intercepted!',
		],
	},
	{
		id: 'qb_dagger',
		label: 'Dagger throw over the middle',
		description: 'Put this game away with one strike.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'Thread the needle over the middle. Receiver catches it in stride. Touchdown! That is the dagger!',
			'You zip it into a window that barely exists. 35-yard gain. Game. Over.',
		],
		successNarrative: [
			'Over the middle to the tight end. First down at the 20. This might be it.',
			'Seam route. Ball placed perfectly. First down and the clock is running.',
		],
		failureNarrative: [
			'Linebacker dropped into the lane. You throw it away.',
			'Coverage was tighter than you thought. Incomplete.',
		],
		disasterNarrative: [
			'Safety was sitting on that throw. Intercepted! They have new life!',
			'The linebacker read your eyes. Pick! The other team is alive again!',
		],
	},
	// --- Tie game options ---
	{
		id: 'qb_playaction_tie',
		label: 'Trust your read over the middle',
		description: 'If the linebacker bites, the middle opens up.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['tie_game', 'red_zone'],
		bigSuccessNarrative: [
			'Perfect read. The play fake freezes everyone. Wide open in the end zone. Touchdown!',
			'You see the blitz, adjust the protection, and hit the hot route. Walk-in score!',
		],
		successNarrative: [
			'The linebacker bites. Seam route wide open. First down at the 5.',
			'You read the coverage perfectly. Tight end sneaks behind the linebackers. Huge gain.',
		],
		failureNarrative: [
			'Linebacker did not bite. Receiver was blanketed. You throw it away.',
			'Coverage held. The window was never there. Incomplete.',
		],
		disasterNarrative: [
			'Safety read your eyes the whole way. Intercepted!',
			'Linebacker dropped into the passing lane. Pick.',
		],
	},
	// --- Red zone options ---
	{
		id: 'qb_back_shoulder',
		label: 'Back-shoulder fade to the corner',
		description: 'Only your guy can get it. If the throw is right.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'Back shoulder, toe-tap. Only he could catch that. Touchdown!',
			'Perfect placement. The corner never had a chance. Score!',
		],
		successNarrative: [
			'Back shoulder throw, caught at the 1. First and goal.',
			'Fade to the corner of the end zone. Caught! Touchdown!',
		],
		failureNarrative: [
			'Fade falls just out of reach. He got a hand on it but could not hold on.',
			'The corner blanketed him. You had to throw it away.',
		],
		disasterNarrative: [
			'Underthrown fade. The corner turns and picks it off in the end zone.',
			'Safety jumped the route from the back side. Interception.',
		],
	},
	{
		id: 'qb_sneak',
		label: 'QB sneak on the hard count',
		description: 'Catch them jumping. Dive for the line.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['red_zone'],
		bigSuccessNarrative: [
			'Hard count draws them offside! Free play! You throw it up and your man catches a touchdown!',
			'You catch them on the snap count. Dive forward. Touchdown! Just barely across!',
		],
		successNarrative: [
			'Sneak forward behind the center. Picks up 2. First down.',
			'You dive over the pile. Spot of the ball at the 1. First and goal.',
		],
		failureNarrative: [
			'Sneak stuffed at the line. No gain.',
			'They were ready for it. The pile pushes you back a yard.',
		],
		disasterNarrative: [],
	},
	// --- Backed up options ---
	{
		id: 'qb_escape_pocket',
		label: 'Quick throw to escape pressure',
		description: 'Get rid of it before they get to you.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['backed_up'],
		bigSuccessNarrative: [
			'Quick slant picked up 15. Out of the shadow of your own end zone!',
			'Rapid release. The receiver takes it up the sideline for a huge gain!',
		],
		successNarrative: [
			'Quick out. Caught for 6. First down. You can breathe.',
			'Short throw to the flat. He gets 4 yards and goes out of bounds.',
		],
		failureNarrative: [
			'Quick throw batted at the line. Incomplete.',
			'Nobody was open quick enough. You eat the sack.',
		],
		disasterNarrative: [],
	},
	// --- Must have stop (QB should not appear here, but just in case) ---
	{
		id: 'qb_clutch_audible',
		label: 'Read the defense and audible',
		description: 'You see something. Change the play.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You read the blitz, audible to a screen, and your back takes it to the house!',
			'Perfect audible. They were in the wrong defense. Easy score.',
		],
		successNarrative: [
			'You catch them in a bad look. Audible to the hot route. First down.',
			'The defense showed their hand. You audibled and picked up a big gain.',
		],
		failureNarrative: [
			'The audible confused your own lineman. Play broke down.',
			'You changed the play but the defense adjusted too. No gain.',
		],
		disasterNarrative: [
			'Wrong read on the audible. The corner jumped the route. Interception.',
			'The audible call did not reach the receiver. Miscommunication. Picked off.',
		],
	},
	// --- Final play options ---
	{
		id: 'qb_hail_mary',
		label: 'Hail Mary to the end zone',
		description: 'Heave it as far as you can. Pray somebody comes down with it.',
		risk: 'heroic',
		keyStat: 'confidence',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You launch it to the end zone. Bodies everywhere. Your man comes down with it! TOUCHDOWN! The stadium explodes!',
			'Hail Mary from 45 yards out. It hangs in the air forever. Caught in triple coverage. TOUCHDOWN!',
		],
		successNarrative: [
			'Heave to the end zone. Tipped once, tipped twice, and your tight end pulls it in. Score!',
			'You throw it into the pile. Your receiver outfights two defenders. Touchdown!',
		],
		failureNarrative: [
			'Hail Mary launched. A sea of hands. Knocked away. Game over.',
			'You put everything into it. The ball falls through outstretched fingers. That is it.',
		],
		disasterNarrative: [
			'Hail Mary intercepted. The safety was waiting behind everyone. It is over.',
			'Underthrown Hail Mary. Picked off and returned. Final insult.',
		],
	},
	{
		id: 'qb_final_scramble',
		label: 'Scramble and find someone',
		description: 'Buy time. Something might open up.',
		risk: 'balanced',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You scramble left, then right. The defense loses you. You find a man wide open in the end zone. TOUCHDOWN!',
			'Broken play. You roll out, pump fake, and throw across your body. Somehow it gets there. Score!',
		],
		successNarrative: [
			'You scramble and dump it to a crossing route. He takes it inside the 5. Clock runs out but you scored!',
			'Escape the pocket and throw on the run. Caught at the 2. He dives in. Touchdown!',
		],
		failureNarrative: [
			'You scramble but nobody can get open. Time runs out in your hands.',
			'Rolled out but the defense contained you. You throw it away as the clock hits zero.',
		],
		disasterNarrative: [
			'Tried to force one on the run. Intercepted. Heartbreaking way to end it.',
			'Scramble goes wrong. Sacked as time expires.',
		],
	},
];
