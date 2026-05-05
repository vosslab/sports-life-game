// identity.ts - immutable-ish identity fields of a Player.
//
// "Identity" here means: who the player is, what role they play, and which
// team they belong to. These fields change rarely (name never; position once
// or twice over a career; team identity at recruiting/draft).

import { AvatarConfig } from '../avatar.js';
import { TeamPalette } from '../theme.js';

//============================================
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'CB' | 'S' | 'K' | 'P';

//============================================
export type PositionBucket = 'passer' | 'runner_receiver' | 'lineman' | 'defender' | 'kicker';

//============================================
export type CareerPhase = 'childhood' | 'youth' | 'high_school' | 'college' | 'nfl' | 'legacy';

//============================================
export type DepthChartStatus = 'starter' | 'backup' | 'bench';

//============================================
export interface PlayerIdentity {
	firstName: string;
	lastName: string;
	age: number;

	phase: CareerPhase;
	position: Position | null;
	positionBucket: PositionBucket | null;
	depthChart: DepthChartStatus;

	// Current-team fields (changes per career stage, not per week).
	teamName: string;
	teamStrength: number;

	// Persistent team identity strings (generated once, reused).
	townName: string;
	townMascot: string;
	hsName: string;
	hsMascot: string;

	// NFL identity (set at draft).
	nflTeamId: string;
	nflConference: string;
	nflDivision: string;

	// Settings and presentation.
	useRealTeamNames: boolean;
	teamPalette: TeamPalette | null;
	avatarConfig: AvatarConfig | null;
}
