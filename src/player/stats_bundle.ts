// stats_bundle.ts - the four nested stat objects a Player carries.
//
// Identity, career, and season_state fields live flat on the Player. Stat
// values, on the other hand, are grouped into nested records (player.core,
// player.career, player.hidden, player.seasonStats). This file declares that
// grouping so the composed Player type can be assembled from narrow slices
// without losing structure.

import { CoreStats, CareerStats, HiddenStats } from './stats.js';
import type { SeasonStatTotals } from '../player.js';

//============================================
export interface PlayerStatsBundle {
	core: CoreStats;
	career: CareerStats;
	hidden: HiddenStats;
	seasonStats: SeasonStatTotals;
}
