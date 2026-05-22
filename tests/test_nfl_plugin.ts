// test_nfl_plugin.ts - NFL plugin lifecycle hook verification
//
// Tests that NFL lifecycle hooks (nfl_entry, draft_day, retirement)
// fire when their conditions are met.
//
// Run with: npm run test:node -- --test-name-pattern='nfl_plugin'

/// <reference types="node" />

import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Player } from '../src/player.js';
import { createPlayer } from '../src/player.js';
import type { GameContext } from '../src/core/game_context.js';
import { registerAllPlugins } from '../src/plugins/register_plugins.js';
import { buildPluginHost } from '../src/plugins/build_host.js';
import { clearHandlers } from '../src/core/year_registry.js';
import * as lifecycleReg from '../src/plugins/registries/lifecycle_registry.js';
import * as eventReg from '../src/plugins/registries/event_registry.js';
import * as activityReg from '../src/plugins/registries/activity_registry.js';
import * as choiceReg from '../src/plugins/registries/choice_registry.js';
import * as rulesReg from '../src/plugins/registries/rules_registry.js';
import * as uiReg from '../src/plugins/registries/ui_registry.js';
import * as dataPackReg from '../src/plugins/registries/data_pack_registry.js';
import { firePhaseStartHooks, fireAgeHooks } from '../src/plugins/lifecycle_hooks_runner.js';

//============================================
// Mock GameContext for testing
class MockGameContext implements GameContext {
	private stories: { type: string; text: string }[] = [];
	private _player: Player;

	constructor(player: Player) {
		this._player = player;
	}

	getPlayer(): Player {
		return this._player;
	}

	events: never[] = [];
	ncaaSchools = { fbs: [], fcs: [] };

	clearStory(): void {
		this.stories = [];
	}

	addHeadline(text: string): void {
		this.stories.push({ type: 'headline', text });
	}

	addText(text: string): void {
		this.stories.push({ type: 'text', text });
	}

	addResult(text: string): void {
		this.stories.push({ type: 'result', text });
	}

	showChoices(): void {}
	waitForInteraction(): void {}
	save(): void {}
	updateStats(): void {}
	updateHeader(): void {}
	addStatChange(): void {}
	updateLifeStatus(): void {}
	formatStatLine(): string {
		return '';
	}
	renderActivitiesTab(): void {}
	hideMainActionBar(): void {}
	showMainActionBar(): void {}
	configureMainButtons(): void {}
	switchToLifeTab(): void {}
	hideTabBar(): void {}
	showTabBar(): void {}
	syncTabsToPhase(): void {}

	getStories(): { type: string; text: string }[] {
		return this.stories;
	}
}

//============================================
function withFreshRegistry<T>(fn: () => T): T {
	clearHandlers();
	eventReg.clear();
	activityReg.clear();
	choiceReg.clear();
	rulesReg.clear();
	uiReg.clear();
	lifecycleReg.clear();
	dataPackReg.clear();

	const host = buildPluginHost();
	registerAllPlugins(host);
	const result = fn();

	clearHandlers();
	eventReg.clear();
	activityReg.clear();
	choiceReg.clear();
	rulesReg.clear();
	uiReg.clear();
	lifecycleReg.clear();
	dataPackReg.clear();

	return result;
}

//============================================
void test('nfl_plugin: nfl_entry hook is registered', () => {
	withFreshRegistry(() => {
		const phaseHooks = lifecycleReg.getPhaseStartHooks();
		const nflEntry = phaseHooks.find((h) => h.id === 'nfl-entry');
		assert.ok(nflEntry, 'nfl-entry hook not found in phase start hooks');
		assert.equal(nflEntry.phase, 'nfl', 'nfl-entry hook has wrong phase');
	});
});

//============================================
void test('nfl_plugin: draft_day hook is registered', () => {
	withFreshRegistry(() => {
		const ageHooks = lifecycleReg.getAgeHooks();
		const draftDay = ageHooks.find((h) => h.id === 'nfl-age-22-draft-day');
		assert.ok(draftDay, 'nfl-age-22-draft-day hook not found in age hooks');
		assert.equal(draftDay.age, 22, 'draft-day hook has wrong age');
		assert.equal(draftDay.once, true, 'draft-day hook should fire once');
	});
});

//============================================
void test('nfl_plugin: retirement hook is registered', () => {
	withFreshRegistry(() => {
		const careerHooks = lifecycleReg.getCareerEndHooks();
		const retirement = careerHooks.find((h) => h.id === 'nfl-retirement');
		assert.ok(retirement, 'nfl-retirement hook not found in career end hooks');
		assert.equal(retirement.trigger, 'retirement', 'retirement hook has wrong trigger');
	});
});

//============================================
void test('nfl_plugin: nfl_entry hook fires correctly', () => {
	withFreshRegistry(() => {
		const phaseHooks = lifecycleReg.getPhaseStartHooks();
		const nflEntry = phaseHooks.find((h) => h.id === 'nfl-entry');
		assert.ok(nflEntry, 'nfl-entry hook not found');

		const player = createPlayer('Test', 'Player');
		player.age = 22;
		player.phase = 'nfl';
		const ctx = new MockGameContext(player);

		// Fire the hook
		nflEntry.fire(player, ctx);

		const stories = ctx.getStories();
		assert.ok(stories.length > 0, 'nfl-entry hook should produce output');
	});
});

//============================================
void test('nfl_plugin: draft_day hook fires correctly', () => {
	withFreshRegistry(() => {
		const ageHooks = lifecycleReg.getAgeHooks();
		const draftDay = ageHooks.find((h) => h.id === 'nfl-age-22-draft-day');
		assert.ok(draftDay, 'draft-day hook not found');

		const player = createPlayer('Test', 'Player');
		player.age = 22;
		player.phase = 'college';
		const ctx = new MockGameContext(player);

		// Fire the hook
		draftDay.fire(player, ctx);

		const stories = ctx.getStories();
		assert.ok(stories.length > 0, 'draft-day hook should produce output');
		assert.equal(player.phase, 'nfl', 'draft-day hook should set phase to nfl');
	});
});

//============================================
void test('nfl_plugin: retirement hook fires correctly', () => {
	withFreshRegistry(() => {
		const careerHooks = lifecycleReg.getCareerEndHooks();
		const retirement = careerHooks.find((h) => h.id === 'nfl-retirement');
		assert.ok(retirement, 'retirement hook not found');

		const player = createPlayer('Test', 'Player');
		player.age = 40;
		player.phase = 'nfl';
		const ctx = new MockGameContext(player);

		// Fire the hook
		retirement.fire(player, ctx);

		const stories = ctx.getStories();
		assert.ok(stories.length > 0, 'retirement hook should produce output');
	});
});

//============================================
// Integration tests: verify hooks fire when handlers call them
void test('nfl_plugin: nfl_entry fires from rookie handler', () => {
	withFreshRegistry(() => {
		// Create a player at age 22 entering NFL
		const player = createPlayer('Test', 'Player');
		player.age = 22;
		player.phase = 'nfl';
		const ctx = new MockGameContext(player);

		// Call firePhaseStartHooks like the handler would
		firePhaseStartHooks('nfl', player, ctx);

		const stories = ctx.getStories();
		const hasHeadline = stories.some(
			(s) => s.type === 'headline' && s.text.includes('Welcome to the NFL')
		);
		assert.ok(hasHeadline, 'nfl_entry hook should have fired with headline');
	});
});

//============================================
void test('nfl_plugin: draft_day fires at age 22', () => {
	withFreshRegistry(() => {
		// Create a player at age 22 (draft day age)
		const player = createPlayer('Test', 'Player');
		player.age = 22;
		player.phase = 'college';
		const ctx = new MockGameContext(player);

		// Call fireAgeHooks like the handler would
		fireAgeHooks(player, ctx);

		const stories = ctx.getStories();
		const hasDraft = stories.some((s) => s.type === 'headline' && s.text.includes('Draft Day'));
		assert.ok(hasDraft, 'draft_day hook should have fired at age 22');
		assert.equal(player.phase, 'nfl', 'phase should be set to nfl by draft hook');
	});
});
