// test_simulator.ts - characterization tests for the simulator and clutch.
//
// Added in M4. Verifies that:
//   * `simulateGame` is deterministic under a fixed seed.
//   * `accumulateGameStats` sums numeric stats across multiple calls.
//   * Performance rating and letter grade boundaries match the documented
//     buckets (poor/below_average/average/good/great/elite, F..A).
//   * `buildClutchMoment` produces a valid moment for an eligible context
//     and `resolveClutchMoment` returns a result with a non-empty narrative.
//
// Run with: npx tsx tests/test_simulator.ts

import assert from 'node:assert/strict';

import { seedDefaultRng } from '../src/core/rng.js';
import { accumulateGameStats, createPlayer } from '../src/player.js';
import { Team } from '../src/team.js';
import {
	calculateLetterGrade,
	calculatePerformanceRating,
	simulateGame,
} from '../src/week_sim/index.js';
import {
	ClutchGameContext,
	buildClutchMoment,
	resolveClutchMoment,
} from '../src/clutch/index.js';

//============================================
// Build a deterministic player + team for the simulator harness.
function makeStarterRb() {
	const player = createPlayer('Test', 'Player');
	player.position = 'RB';
	player.positionBucket = 'runner_receiver';
	player.depthChart = 'starter';
	player.phase = 'high_school';
	// Force stats so the rating is at least 'good'.
	player.core = {
		athleticism: 80,
		technique: 75,
		footballIq: 60,
		discipline: 60,
		health: 90,
		confidence: 70,
	};
	return player;
}

function makeTeam(strength: number): Team {
	return {
		teamName: 'Test Team',
		strength,
		coachPersonality: 'supportive',
		wins: 0,
		losses: 0,
		schedule: [],
	};
}

//============================================
function testSimulateGameDeterministic(): void {
	seedDefaultRng(0xCAFEBABE);
	const player1 = makeStarterRb();
	const team1 = makeTeam(70);
	const result1 = simulateGame(player1, team1, 50, false);

	seedDefaultRng(0xCAFEBABE);
	const player2 = makeStarterRb();
	const team2 = makeTeam(70);
	const result2 = simulateGame(player2, team2, 50, false);

	assert.equal(result1.teamScore, result2.teamScore, 'teamScore must match across seeds');
	assert.equal(result1.opponentScore, result2.opponentScore, 'opponentScore must match');
	assert.equal(result1.result, result2.result, 'result must match');
	assert.equal(result1.playerGrade, result2.playerGrade, 'grade must match');
	assert.equal(result1.playerRating, result2.playerRating, 'rating must match');
	console.log('  ok: simulateGame is deterministic under a fixed seed');
}

//============================================
function testOffenseBeatsWeakDefense(): void {
	// Behavioral property: a stacked offense vs a weak opponent should win
	// more often than not over many runs. Use 50 runs at a fixed seed range.
	let wins = 0;
	const runs = 50;
	for (let i = 0; i < runs; i++) {
		seedDefaultRng(0x1000 + i);
		const player = makeStarterRb();
		const team = makeTeam(85);
		const result = simulateGame(player, team, 30, false);
		if (result.result === 'win') {
			wins++;
		}
	}
	assert.ok(wins > runs * 0.6, `expected >60% wins for a stacked team; got ${wins}/${runs}`);
	console.log(`  ok: stacked offense wins ${wins}/${runs} vs weak defense`);
}

//============================================
function testAccumulateGameStats(): void {
	const player = makeStarterRb();
	assert.equal(player.seasonStats.gamesPlayed, 0);

	accumulateGameStats(player, { rushYards: 100, carries: 20, rushTds: 1, fumbles: 0 });
	accumulateGameStats(player, { rushYards: 50, carries: 12, rushTds: 0, fumbles: 1 });

	assert.equal(player.seasonStats.gamesPlayed, 2, 'gamesPlayed should increment');
	assert.equal(player.careerGamesPlayed, 2, 'careerGamesPlayed should increment');
	assert.equal(player.seasonStats.rushYards, 150, 'rushYards should sum');
	assert.equal(player.seasonStats.carries, 32, 'carries should sum');
	assert.equal(player.seasonStats.rushTds, 1, 'rushTds should sum');
	assert.equal(player.seasonStats.fumbles, 1, 'fumbles should sum');
	assert.equal(player.seasonStats.totalYards, 150, 'totalYards = passYards + rushYards + recYards');
	assert.equal(player.seasonStats.totalTouchdowns, 1, 'totalTouchdowns = passTds + rushTds + recTds');
	console.log('  ok: accumulateGameStats sums correctly across calls');
}

//============================================
function testRatingBoundaries(): void {
	assert.equal(calculatePerformanceRating(0), 'poor', '0 is poor');
	assert.equal(calculatePerformanceRating(50), 'average', '50 is average');
	assert.equal(calculatePerformanceRating(100), 'elite', '100 is elite');
	assert.equal(calculatePerformanceRating(86), 'elite', '86 is elite');
	assert.equal(calculatePerformanceRating(85), 'great', '85 is great');
	console.log('  ok: performance rating boundaries map correctly');
}

//============================================
function testLetterGradeBoundaries(): void {
	assert.equal(calculateLetterGrade(85), 'A', '85 -> A');
	assert.equal(calculateLetterGrade(70), 'B', '70 -> B');
	assert.equal(calculateLetterGrade(55), 'C', '55 -> C');
	assert.equal(calculateLetterGrade(40), 'D', '40 -> D');
	assert.equal(calculateLetterGrade(0), 'F', '0 -> F');
	console.log('  ok: letter grade boundaries map correctly');
}

//============================================
function testBuildAndResolveClutch(): void {
	const player = makeStarterRb();
	const ctx: ClutchGameContext = {
		teamName: 'Eagles',
		opponentName: 'Hawks',
		teamScore: 21,
		opponentScore: 24,
		isPlayoff: true,
		isKeyGame: true,
		isStarter: true,
		position: 'RB',
		positionBucket: 'runner_receiver',
	};

	seedDefaultRng(0xC0FFEE);
	const moment = buildClutchMoment(player, ctx);
	assert.ok(moment, 'eligible playoff context should produce a clutch moment');
	if (moment === null) {
		return;
	}
	assert.ok(moment.scene.length > 0, 'scene text should be non-empty');
	assert.ok(moment.choices.length > 0, 'choices array should be non-empty');
	for (const choice of moment.choices) {
		assert.ok(typeof choice.id === 'string' && choice.id.length > 0, 'choice id non-empty');
		assert.ok(typeof choice.label === 'string' && choice.label.length > 0, 'choice label non-empty');
		assert.ok(['safe', 'balanced', 'heroic'].includes(choice.risk), 'risk is a known tier');
	}

	const result = resolveClutchMoment(player, ctx, moment.choices[0].id, moment.situationType);
	assert.equal(typeof result.success, 'boolean', 'success is boolean');
	assert.equal(typeof result.points, 'number', 'points is number');
	assert.ok(result.narrative.length > 0, 'narrative is non-empty');
	assert.ok(['heroic', 'steady', 'costly'].includes(result.momentumTag), 'momentumTag is known');
	console.log('  ok: buildClutchMoment + resolveClutchMoment produce valid output');
}

//============================================
function testClutchSkippedForBlowout(): void {
	const player = makeStarterRb();
	const ctx: ClutchGameContext = {
		teamName: 'Eagles',
		opponentName: 'Hawks',
		teamScore: 42,
		opponentScore: 7,
		isPlayoff: true,
		isKeyGame: true,
		isStarter: true,
		position: 'RB',
		positionBucket: 'runner_receiver',
	};
	const moment = buildClutchMoment(player, ctx);
	assert.equal(moment, null, 'blowout margin should not trigger a clutch moment');
	console.log('  ok: blowout margin skips clutch moment');
}

//============================================
function main(): void {
	console.log('test_simulator.ts');
	testSimulateGameDeterministic();
	testOffenseBeatsWeakDefense();
	testAccumulateGameStats();
	testRatingBoundaries();
	testLetterGradeBoundaries();
	testBuildAndResolveClutch();
	testClutchSkippedForBlowout();
	console.log('test_simulator.ts: all tests passed');
}

main();
