// season_arc.ts - season arc phase tracking
//
// Each season progresses through 5 phases that change the weekly tone,
// available choices, and narrative framing.

export type ArcPhase = 'preseason' | 'opening' | 'midseason' | 'stretch' | 'postseason';

//============================================
// Determine arc phase from current week and season length
export function getArcPhase(currentWeek: number, seasonLength: number): ArcPhase {
	if (currentWeek <= 0) {
		return 'preseason';
	}
	// Opening: first ~25% of season
	const openingEnd = Math.max(2, Math.floor(seasonLength * 0.25));
	if (currentWeek <= openingEnd) {
		return 'opening';
	}
	// Stretch run: last ~30% of season
	const stretchStart = Math.ceil(seasonLength * 0.7);
	if (currentWeek >= stretchStart) {
		return 'stretch';
	}
	// Midseason: everything in between
	return 'midseason';
}

//============================================
// Get display name for the arc phase (for UI headers)
export function getArcPhaseLabel(phase: ArcPhase): string {
	switch (phase) {
		case 'preseason': return 'Preseason';
		case 'opening': return 'Early Season';
		case 'midseason': return 'Midseason';
		case 'stretch': return 'Stretch Run';
		case 'postseason': return 'Postseason';
	}
}

//============================================
// Get narrative flavor for the phase transition
export function getPhaseTransitionText(phase: ArcPhase): string {
	switch (phase) {
		case 'preseason': return 'A new season begins. Time to set the tone.';
		case 'opening': return 'The season is underway. Every game matters.';
		case 'midseason': return 'Deep into the season now. The grind is real.';
		case 'stretch': return 'The final stretch. Everything is on the line.';
		case 'postseason': return 'The season is over. Time to reflect and decide.';
	}
}
