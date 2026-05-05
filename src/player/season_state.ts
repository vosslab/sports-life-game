// season_state.ts - in-progress season and weekly state.
//
// These fields churn during play (every week or every event). They are the
// most volatile slice of Player and the most likely to be reshaped during
// the simulator and event-system passes (M3/M4).

import { ActiveCrisis } from '../crisis.js';
import { StoryFlags } from '../player.js';
import { FotomagicPost } from '../social/fotomagic.js';

//============================================
export type SeasonGoal = 'grind' | 'healthy' | 'popular' | 'academic';

//============================================
export interface PlayerSeasonState {
	// Calendar.
	currentSeason: number;
	currentWeek: number;
	seasonYear: number;

	// Academic / social.
	gpa: number;
	relationships: Record<string, number>;

	// Persistent goal across the season.
	seasonGoal: SeasonGoal;

	// Crisis arc.
	activeCrisis: ActiveCrisis | null;
	scheduledCrises: string[];
	crisisTriggeredThisSeason: boolean;

	// Story log and flags.
	storyFlags: StoryFlags;
	storyLog: string[];

	// Milestones and event de-duplication.
	milestones: Record<string, boolean>;
	seenEventIds: Record<string, boolean>;
	seenEventFamilies: Record<string, boolean>;
	eventTagCounts: Record<string, number>;
	flagProgress: Record<string, number>;

	// Optional Fotomagic feed; older saves load with this undefined.
	fotomagicFeed?: FotomagicPost[];
}
