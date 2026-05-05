import { rand } from '../../core/rng.js';
//============================================
// Team Strength Model
//
// Conversion of nflsim's team_ratings.py to TypeScript for sports-life-game.
// Models per-team offensive and defensive multipliers from 0-100 stats.
// Multipliers are relative to a baseline of 1.0 (50 = average).
//
// Matchup adjustment combines offense and defense multipliers:
//   pass_yard_mult = off_passOffense_mult * def_passDefense_mult
// Good offense (1.2) vs bad defense (1.1) -> 1.32 (highly favorable).
// Bad offense (0.8) vs good defense (0.9) -> 0.72 (suppressed).
//
// All stat values are 0-100; multipliers hover around 1.0 with
// dampening to prevent unrealistic extremes.
//============================================

// Team identity and base ratings (0-100 scale).
export interface TeamProfile {
	name: string;
	overall: number;       // 0-100 composite strength
	offense: number;       // 0-100 offensive power
	defense: number;       // 0-100 defensive power
	runOffense: number;    // 0-100 rushing attack
	passOffense: number;   // 0-100 passing attack
	runDefense: number;    // 0-100 rush defense
	passDefense: number;   // 0-100 pass defense
	specialTeams: number;  // 0-100 special teams quality
	discipline: number;    // 0-100 turnover/penalty control
	explosiveness: number; // 0-100 big-play tendency
	consistency: number;   // 0-100 variance dampening
	depth: number;         // 0-100 bench quality
	ranking?: number;      // optional league ranking
}

// Game-day context: profile plus situational modifiers.
export interface GameTeamContext {
	profile: TeamProfile;
	momentum: number;          // -1 to 1 from recent results
	fatigue: number;           // 0 to 1, higher = more tired
	injuryAdjustment: number;  // negative modifier from key injuries
	weatherAdjustment: number; // modifier for outdoor conditions
}

// Per-play multipliers derived from matchup.
// Each >1 means advantage (more yards, higher completion, more sacks/ints).
export interface MatchupAdjustment {
	passYardMult: number;    // >1 = offense passes for more yards
	rushYardMult: number;    // >1 = offense rushes for more yards
	compRateMult: number;    // >1 = offense has higher completion rate
	sackRateMult: number;    // >1 = offense suffers more sacks
	intRateMult: number;     // >1 = offense throws more INTs
	fumbleRateMult: number;  // >1 = offense fumbles more
}

//============================================
// Compute matchup adjustment from two GameTeamContext objects.
//
// Maps 0-100 stats to multipliers, adjusts for momentum/fatigue,
// and dampens extremes to keep outcomes realistic.
//============================================
export function computeMatchupAdjustment(
	offense: GameTeamContext,
	defense: GameTeamContext,
): MatchupAdjustment {
	// Extract base multipliers from 0-100 stats
	// stat 50 = 1.0 (average), 75 = 1.5 (50% better), 25 = 0.5 (50% worse)

	// Pass yards: offensive passing strength vs defensive pass defense
	const offPassMult = statToMultiplier(offense.profile.passOffense);
	const defPassMult = statToMultiplier(defense.profile.passDefense);
	let passYardMult = offPassMult * defPassMult;

	// Rush yards: offensive run strength vs defensive run defense
	const offRushMult = statToMultiplier(offense.profile.runOffense);
	const defRushMult = statToMultiplier(defense.profile.runDefense);
	let rushYardMult = offRushMult * defRushMult;

	// Completion rate: passing strength vs coverage
	// Offense determines base completion, defense suppresses it
	const offCompMult = statToMultiplier(offense.profile.passOffense);
	const defCompMult = statToMultiplier(defense.profile.passDefense);
	let compRateMult = offCompMult * defCompMult;

	// Sack rate: inverted discipline (low discipline -> more sacks)
	// Offensive discipline (OL/QB protection), defensive pass rush
	const offSackMult = 1.0 / statToMultiplier(offense.profile.discipline);
	const defSackMult = statToMultiplier(defense.profile.passDefense);
	let sackRateMult = offSackMult * defSackMult;

	// INT rate: inverted discipline (low discipline -> more INTs)
	const offIntMult = 1.0 / statToMultiplier(offense.profile.discipline);
	const defIntMult = statToMultiplier(defense.profile.passDefense);
	let intRateMult = offIntMult * defIntMult;

	// Fumble rate: inverted discipline (low discipline -> more fumbles)
	const offFumbleMult = 1.0 / statToMultiplier(offense.profile.discipline);
	const defFumbleMult = statToMultiplier(defense.profile.defense);
	let fumbleRateMult = offFumbleMult * defFumbleMult;

	// Apply momentum and fatigue modifiers
	// Momentum ranges -1 to 1; add 1 to shift to 0-2 range, then scale
	const momentumFactor = 1.0 + (offense.momentum - defense.momentum) * 0.15;
	const fatigueOffFactor = 1.0 - offense.fatigue * 0.2;
	const fatigueDefFactor = 1.0 - defense.fatigue * 0.1;

	passYardMult *= momentumFactor * fatigueOffFactor / fatigueDefFactor;
	rushYardMult *= momentumFactor * fatigueOffFactor / fatigueDefFactor;
	compRateMult *= momentumFactor * fatigueOffFactor / fatigueDefFactor;
	sackRateMult *= momentumFactor * fatigueDefFactor / fatigueOffFactor;
	intRateMult *= momentumFactor * fatigueDefFactor / fatigueOffFactor;
	fumbleRateMult *= momentumFactor * fatigueDefFactor / fatigueOffFactor;

	// Apply injury adjustments (injuries suppress offense)
	passYardMult *= (1.0 + offense.injuryAdjustment);
	rushYardMult *= (1.0 + offense.injuryAdjustment);
	compRateMult *= (1.0 + offense.injuryAdjustment);

	// Apply weather adjustments
	passYardMult *= (1.0 + offense.weatherAdjustment);
	rushYardMult *= (1.0 + offense.weatherAdjustment);

	// Dampen toward 1.0 (strength 0.3) to prevent extreme outcomes
	// Strong dampening keeps multipliers from straying too far from reality
	const dampingStrength = 0.3;
	passYardMult = dampenMultiplier(passYardMult, dampingStrength);
	rushYardMult = dampenMultiplier(rushYardMult, dampingStrength);
	compRateMult = dampenMultiplier(compRateMult, dampingStrength);
	sackRateMult = dampenMultiplier(sackRateMult, dampingStrength);
	intRateMult = dampenMultiplier(intRateMult, dampingStrength);
	fumbleRateMult = dampenMultiplier(fumbleRateMult, dampingStrength);

	return {
		passYardMult,
		rushYardMult,
		compRateMult,
		sackRateMult,
		intRateMult,
		fumbleRateMult,
	};
}

//============================================
// Create a balanced team profile from a single overall rating.
//
// Fills in sub-stats with slight random variation (+/-5) to avoid
// teams with identical sub-ratings. All values clamped to 0-100.
//============================================
export function createDefaultTeamProfile(
	name: string,
	overall: number,
): TeamProfile {
	// Clamp overall to valid range
	const clampedOverall = Math.max(0, Math.min(100, overall));

	// Helper to add variation and clamp
	const varyAndClamp = (base: number): number => {
		const variation = (rand() - 0.5) * 10; // +/-5
		return Math.max(0, Math.min(100, base + variation));
	};

	// Derived stats from overall rating
	const offense = varyAndClamp(clampedOverall);
	const defense = varyAndClamp(clampedOverall);
	const specialTeams = varyAndClamp(clampedOverall * 0.8);
	const discipline = varyAndClamp(clampedOverall * 0.85);
	const explosiveness = varyAndClamp(clampedOverall * 0.7);
	const consistency = varyAndClamp(clampedOverall * 0.75);
	const depth = varyAndClamp(clampedOverall * 0.65);

	// Subdivide offense and defense
	const runOffense = varyAndClamp(offense);
	const passOffense = varyAndClamp(offense);
	const runDefense = varyAndClamp(defense);
	const passDefense = varyAndClamp(defense);

	return {
		name,
		overall: clampedOverall,
		offense,
		defense,
		runOffense,
		passOffense,
		runDefense,
		passDefense,
		specialTeams,
		discipline,
		explosiveness,
		consistency,
		depth,
	};
}

//============================================
// Convert 0-100 stat to relative multiplier.
//
// Mapping: 50 = 1.0 (average)
//          75 = 1.5 (50% better)
//          25 = 0.5 (50% worse)
//          0  = 0.0 (minimum)
//          100 = 2.0 (double average)
//
// Clamped to 0.5-1.5 to prevent extreme swings.
//============================================
export function statToMultiplier(stat: number): number {
	const mult = stat / 50;
	return Math.max(0.5, Math.min(1.5, mult));
}

//============================================
// Dampen a multiplier toward 1.0.
//
// strength: 0.0 = no dampening (raw multiplier)
//           1.0 = fully dampened (result = 1.0)
//   Recommended: 0.2-0.4 for realistic spread without chaos.
//
// Formula: 1.0 + (mult - 1.0) * (1.0 - strength)
//============================================
function dampenMultiplier(mult: number, strength: number): number {
	return 1.0 + (mult - 1.0) * (1.0 - strength);
}
