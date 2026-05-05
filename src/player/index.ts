// player/index.ts - narrow Player slice exports.
//
// New code should import the slice it actually needs (PlayerIdentity,
// PlayerStats, PlayerCareer, PlayerSeasonState) instead of the wide Player
// alias. Legacy importers continue to use src/player.ts directly; that
// transitional alias is removed at M3 exit.

export type {
	PlayerIdentity,
	Position,
	PositionBucket,
	CareerPhase,
	DepthChartStatus,
} from './identity.js';

export type { CoreStats, CareerStats, HiddenStats } from './stats.js';

export type { PlayerCareer, SeasonRecord } from './career.js';

export type { PlayerSeasonState, SeasonGoal } from './season_state.js';

export type { PlayerSnapshot } from './snapshot.js';
