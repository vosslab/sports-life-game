// year_helpers.ts - stat drift curves and age-based growth/decline
//
// These helper functions are used by year handlers to apply
// age-appropriate stat changes during offseason or year transitions.

import { Player, modifyStat, getPositionBucket } from '../player.js';

//============================================
// Apply natural age-based stat drift
// Called at year start by handlers. Different curves for different age bands.
export function applyAgeDrift(player: Player): void {
	const age = player.age;

	if (age <= 7) {
		applyChildhoodGrowth(player);
	} else if (age <= 13) {
		applyYouthGrowth(player);
	} else if (age <= 17) {
		applyHighSchoolGrowth(player);
	} else if (age <= 21) {
		applyCollegeGrowth(player);
	} else if (age <= 26) {
		applyNFLEarlyGrowth(player);
	} else if (age <= 31) {
		applyNFLPeakDrift(player);
	} else if (age <= 36) {
		applyNFLVeteranDecline(player);
	} else {
		applyNFLTwilightDecline(player);
	}
}

//============================================
function applyChildhoodGrowth(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(0, 2));
	modifyStat(player, 'health', randomDrift(0, 1));
	modifyStat(player, 'confidence', randomDrift(-1, 2));
}

//============================================
function applyYouthGrowth(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(1, 3));
	modifyStat(player, 'technique', randomDrift(1, 3));
	modifyStat(player, 'footballIq', randomDrift(0, 2));
	modifyStat(player, 'discipline', randomDrift(0, 2));
	modifyStat(player, 'health', randomDrift(0, 2));
}

//============================================
function applyHighSchoolGrowth(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(1, 3));
	modifyStat(player, 'technique', randomDrift(2, 4));
	modifyStat(player, 'footballIq', randomDrift(1, 3));
	modifyStat(player, 'discipline', randomDrift(0, 2));
}

//============================================
function applyCollegeGrowth(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(0, 2));
	modifyStat(player, 'technique', randomDrift(2, 4));
	modifyStat(player, 'footballIq', randomDrift(2, 3));
	modifyStat(player, 'discipline', randomDrift(1, 2));
}

//============================================
function applyNFLEarlyGrowth(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(0, 1));
	modifyStat(player, 'technique', randomDrift(1, 3));
	modifyStat(player, 'footballIq', randomDrift(1, 2));
}

//============================================
function applyNFLPeakDrift(player: Player): void {
	modifyStat(player, 'technique', randomDrift(0, 2));
	modifyStat(player, 'footballIq', randomDrift(0, 2));
	// Athleticism starts to slip after 29
	if (player.age >= 30) {
		modifyStat(player, 'athleticism', randomDrift(-2, 0));
	}
}

//============================================
function applyNFLVeteranDecline(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(-4, -2));
	modifyStat(player, 'technique', randomDrift(-1, 1));
	modifyStat(player, 'footballIq', randomDrift(0, 1));
	modifyStat(player, 'health', randomDrift(-2, 0));
}

//============================================
function applyNFLTwilightDecline(player: Player): void {
	modifyStat(player, 'athleticism', randomDrift(-5, -3));
	modifyStat(player, 'technique', randomDrift(-2, 0));
	modifyStat(player, 'health', randomDrift(-3, -1));
}

//============================================
// Random integer in [min, max] inclusive
function randomDrift(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

//============================================
// Assign position based on size and athleticism (coach decision)
// Used by peewee and travel handlers when coach assigns position.
export function coachAssignPosition(player: Player): void {
	const size = player.hidden.size;
	const ath = player.core.athleticism;

	// Big kids go to line or TE
	if (size >= 4) {
		if (ath >= 60) {
			player.position = 'TE';
		} else if (ath >= 40) {
			player.position = 'DL';
		} else {
			player.position = 'OL';
		}
	// Medium kids: QB, LB, or S
	} else if (size >= 3) {
		if (ath >= 65) {
			player.position = 'QB';
		} else if (ath >= 50) {
			player.position = 'LB';
		} else {
			player.position = 'S';
		}
	// Small kids: WR, RB, CB, or K
	} else {
		if (ath >= 65) {
			player.position = 'WR';
		} else if (ath >= 50) {
			player.position = 'RB';
		} else if (ath >= 35) {
			player.position = 'CB';
		} else {
			player.position = 'K';
		}
	}

	// Set position bucket to match
	player.positionBucket = getPositionBucket(player.position);
}
