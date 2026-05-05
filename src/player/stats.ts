// stats.ts - core, hidden, career, and per-season stat shapes.
//
// All numeric stats are 0-100 unless noted. SeasonStatTotals lives in
// src/player.ts for now to avoid duplication; future passes can move it.

//============================================
// Visible core stats: trained over a career.
export interface CoreStats {
	athleticism: number;
	technique: number;
	footballIq: number;
	discipline: number;
	health: number;
	confidence: number;
}

//============================================
// Career-track stats: cumulative reputation/economic state.
export interface CareerStats {
	popularity: number;
	money: number;
}

//============================================
// Hidden stats: not directly visible to the player but used by simulation.
export interface HiddenStats {
	size: number;
	leadership: number;
	durability: number;
}
