// career.ts - long-arc career fields: history, recruiting, draft.
//
// These accrue across seasons and rarely shrink. SeasonRecord is owned here
// because its primary consumer is careerHistory[].

import { CareerPhase, DepthChartStatus, Position } from './identity.js';
import { RecruitingProfile } from '../recruiting_profile.js';

// Re-import the canonical SeasonStatTotals via the legacy path. Future passes
// may move it to ./stats.ts; for now the legacy file remains the source.
import type { SeasonStatTotals } from '../player.js';

//============================================
export interface SeasonRecord {
	phase: CareerPhase;
	year: number;
	age: number;
	team: string;
	position: Position | null;
	wins: number;
	losses: number;
	ties: number;
	depthChart: DepthChartStatus;
	highlights: string[];
	awards: string[];
	statTotals?: SeasonStatTotals;
}

//============================================
export interface PlayerCareer {
	careerGamesPlayed: number;
	careerHistory: SeasonRecord[];
	bigDecisions: string[];

	// Recruiting (HS/college).
	recruitingStars: number;
	collegeOffers: string[];
	recruitingProfile: RecruitingProfile | null;
	draftStock: number;

	// Career year tracking persisted across saves.
	collegeYear: number;
	nflYear: number;
	isRedshirt: boolean;
	eligibilityYears: number;
}
