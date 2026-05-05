// snapshot.ts - composed type for save/load and whole-career snapshots.
//
// PlayerSnapshot is the canonical name for "the entire player as a serializable
// object". It is intentionally identical in shape to the legacy `Player`
// interface in src/player.ts; the alias exists so save/load and history paths
// have a stable name even after `Player` is narrowed in M3.

import { Player } from '../player.js';

//============================================
export type PlayerSnapshot = Player;
