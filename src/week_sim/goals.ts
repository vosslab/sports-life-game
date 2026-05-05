// goals.ts - season goal catalog and activity preference mapping.
//
// Split from `src/week_sim.ts` during M4. Pure metadata helpers used by the
// UI to render the season-goal picker and by the activity scheduler to bias
// background work toward the chosen goal.

import { CareerPhase, SeasonGoal } from '../player.js';

//============================================
// Goal display info for UI
export interface GoalInfo {
	key: SeasonGoal;
	name: string;
	description: string;
	effectHint: string;
}

//============================================
// Get available goals for a career phase
export function getGoalsForPhase(phase: CareerPhase): GoalInfo[] {
	const goals: GoalInfo[] = [
		{
			key: 'grind',
			name: 'Grind Mode',
			description: phase === 'college'
				? 'Earn the starting job. Train hard every week.'
				: phase === 'nfl'
					? 'Peak performance. Push your body to the limit.'
					: 'Train harder than everyone else.',
			effectHint: 'TEC/ATH up, HP down',
		},
		{
			key: 'healthy',
			name: 'Stay Healthy',
			description: phase === 'nfl'
				? 'Longevity focus. Protect your body for the long haul.'
				: 'Recovery and balance. Stay on the field.',
			effectHint: 'HP up, moderate stats',
		},
		{
			key: 'popular',
			name: phase === 'high_school' ? 'Be Popular' : 'Build the Brand',
			description: phase === 'nfl'
				? 'Endorsements, media, and fan engagement.'
				: phase === 'college'
					? 'NIL deals, social life, and building your name.'
					: 'Social life and confidence. Be the big name on campus.',
			effectHint: 'POP/CON up, DIS down',
		},
	];

	// Academic goal only available in HS and college
	if (phase === 'high_school' || phase === 'college') {
		goals.push({
			key: 'academic',
			name: 'Hit the Books',
			description: phase === 'college'
				? 'Keep your eligibility. GPA and football IQ improve.'
				: 'Focus on academics. GPA and discipline improve.',
			effectHint: 'GPA/IQ/DIS up, less athletic growth',
		});
	}

	return goals;
}

//============================================
// Map season goal to preferred background activity IDs
export function getPreferredActivitiesForGoal(goal: SeasonGoal): string[] {
	switch (goal) {
		case 'grind':
			return ['hs_extra_practice', 'hs_weight_room', 'col_position_drills', 'nfl_advanced_training'];
		case 'healthy':
			return ['hs_rest_recover', 'col_recovery', 'nfl_recovery'];
		case 'popular':
			return [
				'hs_hang_with_friends', 'col_team_bonding', 'col_nil_meeting',
				'nfl_media', 'nfl_endorsement',
			];
		case 'academic':
			return ['hs_study_hall', 'col_film_study', 'nfl_film_breakdown'];
	}
}
