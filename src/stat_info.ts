// Tooltip text for stat labels. Used by the sidebar (rendered in JS) and by
// static labels in index.html that carry a data-tip attribute. CSS in
// styles/stats.css shows the tip on hover/focus.

export type StatKey =
	| 'athleticism'
	| 'technique'
	| 'footballIq'
	| 'discipline'
	| 'health'
	| 'confidence'
	| 'popularity'
	| 'gpa';

export const STAT_INFO: Record<StatKey, { name: string; tip: string }> = {
	athleticism: {
		name: 'Athleticism (ATH)',
		tip: 'Raw physical ability: speed, strength, and agility.',
	},
	technique: {
		name: 'Technique (TEC)',
		tip: 'Skill and refinement of football mechanics from coaching and reps.',
	},
	footballIq: {
		name: 'Football IQ',
		tip: 'Reads, decision-making, and play recognition.',
	},
	discipline: {
		name: 'Discipline (DSC)',
		tip: 'Practice habits, focus, and reliability under pressure.',
	},
	health: {
		name: 'Health (HP)',
		tip: 'Physical condition. Low health raises injury risk.',
	},
	confidence: {
		name: 'Confidence (CON)',
		tip: 'Self-belief. Affects clutch moments and big-game play.',
	},
	popularity: {
		name: 'Popularity (POP)',
		tip: 'How fans, media, and teammates view you.',
	},
	gpa: {
		name: 'GPA',
		tip: 'Academic standing. Required for high school and college eligibility.',
	},
};
