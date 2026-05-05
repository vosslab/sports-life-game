// choices_def.ts - clutch choice pool extracted from clutch_moment.ts.
//
// Pure data. Split during M4 modularization. Imported by
// `src/clutch/resolve.ts` to drive position-aware choice selection.

import { ChoiceTemplate } from './types.js';

//============================================
// Defender choice pools (LB/CB/S)
export const DEFENDER_CHOICES: ChoiceTemplate[] = [
	{
		id: 'def_stay_zone',
		label: 'Stay in your zone',
		description: 'Do not get beat deep. Make them earn it underneath.',
		risk: 'safe',
		keyStat: 'discipline',
		situations: ['must_have_stop', 'hold_lead', 'tie_game'],
		bigSuccessNarrative: [
			'Your zone discipline forces a bad throw. You undercut it and pick it off!',
			'Patient in coverage. The QB throws right into your zone. Interception!',
		],
		successNarrative: [
			'You stay home and make the tackle. Short gain. They have to punt.',
			'Textbook zone coverage. Nothing open. They settle for a check down. Fourth down.',
			'You take away the deep ball. They gain three underneath. Not enough. Punt team comes on.',
		],
		failureNarrative: [
			'You stayed back but they dink-and-dunked past you. First down.',
			'Conservative coverage. They moved the chains underneath.',
			'You gave too much cushion. Short throw, easy catch, first down.',
		],
		disasterNarrative: [],
	},
	{
		id: 'def_jump_route',
		label: 'Jump the route',
		description: 'You have seen this formation before. If you are right, it is a pick.',
		risk: 'balanced',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You jump the route before the ball is even out. Pick six! Touchdown!',
			'Intercepted and nothing but open field ahead. You take it all the way back!',
		],
		successNarrative: [
			'You read the QB eyes and jump the slant. Interception!',
			'Film study pays off. You knew that route was coming. Pick.',
		],
		failureNarrative: [
			'You jumped early but it was a pump fake. The receiver ran past you.',
			'Guessed wrong. They hit the crossing route behind you.',
		],
		disasterNarrative: [
			'You bit on the fake. Wide open receiver behind you. Touchdown!',
			'Jumped the wrong route. Your man caught it in stride. Easy score.',
		],
	},
	{
		id: 'def_blitz',
		label: 'Sell out on the blitz',
		description: 'Get there or get burned. No middle ground.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['must_have_stop', 'tie_game'],
		bigSuccessNarrative: [
			'Blind side hit! The ball pops out. You fall on it! Fumble recovery!',
			'You get there and he never sees you coming. Strip sack!',
		],
		successNarrative: [
			'Blitz gets home! You hit the QB as he throws. Incomplete.',
			'Untouched off the edge. Sack! Third and long.',
		],
		failureNarrative: [
			'Blitz picked up. QB steps up clean and finds the open man.',
			'You got blocked at the line. They had the hot route ready.',
		],
		disasterNarrative: [
			'They saw the blitz. Quick screen. Your man scores untouched.',
			'Blitz left the middle wide open. Touchdown.',
		],
	},
	{
		id: 'def_tackle_for_loss',
		label: 'Read and react downhill',
		description: 'Trust your eyes. If it is a run, blow it up.',
		risk: 'balanced',
		keyStat: 'technique',
		situations: ['must_have_stop', 'hold_lead', 'ice_game'],
		bigSuccessNarrative: [
			'You read run perfectly. Tackle for loss! The runner fumbles! Your ball!',
			'You shoot the gap. Blow up the play in the backfield. Turnover on downs!',
		],
		successNarrative: [
			'You key on the guard and fill the hole. Runner goes nowhere. They face 4th and long.',
			'Textbook run fit. Tackle for a loss of 2. Third and long.',
			'You read the mesh point and crash the handoff. Stopped for no gain. Punt unit jogs on.',
		],
		failureNarrative: [
			'It was a pass all along. You are out of position.',
			'Read run but the play action fooled you. Tight end is open behind you.',
		],
		disasterNarrative: [
			'You crashed too hard on the run fake. Play action, wide open man, touchdown.',
			'Committed to the run stop. Screen pass goes right past you for a huge gain.',
		],
	},
	{
		id: 'def_press_coverage',
		label: 'Press at the line and jam him',
		description: 'Disrupt the timing. Get physical.',
		risk: 'safe',
		keyStat: 'technique',
		situations: ['must_have_stop', 'hold_lead', 'backed_up'],
		bigSuccessNarrative: [
			'You jam him at the line and the timing is completely off. QB panics and throws it away.',
			'Press coverage. He cannot get off the line. QB holds it too long. Sack!',
		],
		successNarrative: [
			'Good jam at the line. The throw is late. Incomplete.',
			'You get hands on him and slow his release. The QB throws it elsewhere.',
		],
		failureNarrative: [
			'He got off the press with a swim move. Got behind you.',
			'Tried to jam but he was too quick. He is open underneath.',
		],
		disasterNarrative: [],
	},
	{
		id: 'def_disguise_coverage',
		label: 'Disguise your coverage and bait the throw',
		description: 'Show one look, play another. Make the QB guess wrong.',
		risk: 'heroic',
		keyStat: 'footballIq',
		situations: ['must_have_stop', 'tie_game', 'comeback_drive'],
		bigSuccessNarrative: [
			'You disguise Cover 2 as Cover 0. The QB throws right to you. Pick six!',
			'Showed blitz, dropped back. He threw it right where you ended up. Interception!',
		],
		successNarrative: [
			'Your disguise worked. The QB hesitated. Sack by your teammate.',
			'Showed man, played zone. The throw goes to nobody. Incomplete.',
		],
		failureNarrative: [
			'The QB saw through the disguise. He found the soft spot.',
			'Your trick did not work. He audibled to the right play.',
		],
		disasterNarrative: [
			'Your disguise backfired. You were in no man is land. Easy touchdown.',
			'The receiver ran right through the seam your disguise created. Score.',
		],
	},
	// --- Final play ---
	{
		id: 'def_goal_line_stand',
		label: 'Sell out for the goal line stand',
		description: 'Last play. They need one yard. Do not let them get it.',
		risk: 'heroic',
		keyStat: 'discipline',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You plug the hole and stop the runner cold. Goal line stand! The defense wins the game!',
			'You meet the runner at the line. He goes nowhere. Denied! What a stop!',
		],
		successNarrative: [
			'You fill the gap. He tries to leap but you swat him down. Stuffed at the 1.',
			'The whole defense rallies. You make the tackle. No score. Game over. You win.',
		],
		failureNarrative: [
			'He dives over the pile. The ball crosses the plane. Touchdown. They win.',
			'You had the angle but he slipped through your hands. Score. Game over.',
		],
		disasterNarrative: [
			'You overcommit and he bounces outside. Nobody is there. Walk-in touchdown.',
			'You crash inside and the QB keeps it on the read option. Wide open. Touchdown.',
		],
	},
	{
		id: 'def_final_strip',
		label: 'Go for the strip',
		description: 'Last chance. Rip that ball out.',
		risk: 'heroic',
		keyStat: 'athleticism',
		situations: ['final_play'],
		bigSuccessNarrative: [
			'You punch the ball out at the 3-yard line! Your teammate dives on it! Game over!',
			'Strip! The ball comes loose! Fumble recovery! What a play to end the game!',
		],
		successNarrative: [
			'You tackle him and the ball comes loose. Reviewed. Fumble before crossing the line. Your ball!',
			'You rip at the ball as he reaches. It pops out. Down by contact, but he was short. Game over.',
		],
		failureNarrative: [
			'You went for the strip instead of the tackle. He keeps his feet and scores.',
			'Tried to punch it out but he held on. Touchdown. You should have just tackled him.',
		],
		disasterNarrative: [
			'You whiffed on the strip. He walks in untouched. Not even close.',
			'Your strip attempt was a swing and a miss. Easy score.',
		],
	},
];
