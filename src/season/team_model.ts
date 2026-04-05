// team_model.ts - durable team object for the season simulation layer
//
// Identity and ratings only. Do NOT store wins/losses here.
// Records are derived from finalized SeasonGame objects.

import { TeamId } from './season_types.js';
import { CoachPersonality } from '../team.js';

//============================================
// A team within a season
export class SeasonTeam {
	id: TeamId;
	name: string;
	mascot: string;
	strength: number;          // 1-100
	conferenceId: string;      // empty string if no conference
	divisionId: string;        // empty string if no division
	coachPersonality: CoachPersonality;

	constructor(
		id: TeamId,
		name: string,
		mascot: string,
		strength: number,
		coachPersonality: CoachPersonality,
		conferenceId: string = '',
		divisionId: string = '',
	) {
		this.id = id;
		this.name = name;
		this.mascot = mascot;
		this.strength = strength;
		this.coachPersonality = coachPersonality;
		this.conferenceId = conferenceId;
		this.divisionId = divisionId;
	}

	//============================================
	// Display name: "Lincoln Spartans"
	getDisplayName(): string {
		return `${this.name} ${this.mascot}`;
	}
}

//============================================
// Simple assertions
const testTeam = new SeasonTeam('t1', 'Lincoln', 'Spartans', 75, 'supportive', 'north');
console.assert(testTeam.id === 't1', 'Team id should match');
console.assert(testTeam.getDisplayName() === 'Lincoln Spartans', 'Display name should combine name + mascot');
console.assert(testTeam.conferenceId === 'north', 'Conference should be set');
console.assert(testTeam.divisionId === '', 'Division should default to empty');
