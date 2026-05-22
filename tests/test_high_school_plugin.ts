// test_high_school_plugin.ts - High school plugin lifecycle hook verification
//
// Tests that high school lifecycle hooks (hs_entry, drivers_permit)
// fire when their conditions are met.
//
// Run with: npm run test:node -- --test-name-pattern='high_school_plugin'

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
void test('high_school_plugin: hs_entry hook is registered', () => {
	withFreshRegistry(() => {
		const phaseHooks = lifecycleReg.getPhaseStartHooks();
		const hsEntry = phaseHooks.find((h) => h.id === 'hs-entry');
		assert.ok(hsEntry, 'hs-entry hook not found in phase start hooks');
		assert.equal(hsEntry.phase, 'high_school', 'hs-entry hook has wrong phase');
	});
});

//============================================
void test('high_school_plugin: drivers_permit hook is registered', () => {
	withFreshRegistry(() => {
		const ageHooks = lifecycleReg.getAgeHooks();
		const driversPerm = ageHooks.find((h) => h.id === 'hs-drivers-permit');
		assert.ok(driversPerm, 'hs-drivers-permit hook not found in age hooks');
		assert.equal(driversPerm.age, 15, 'drivers-permit hook has wrong age');
	});
});

//============================================
void test('high_school_plugin: hs_entry hook fires correctly', () => {
	withFreshRegistry(() => {
		const phaseHooks = lifecycleReg.getPhaseStartHooks();
		const hsEntry = phaseHooks.find((h) => h.id === 'hs-entry');
		assert.ok(hsEntry, 'hs-entry hook not found');

		const player = createPlayer('Test', 'Player');
		player.age = 14;
		player.phase = 'high_school';
		const ctx = new MockGameContext(player);

		// Fire the hook
		hsEntry.fire(player, ctx);

		const stories = ctx.getStories();
		assert.ok(stories.length > 0, 'hs-entry hook should produce output');
	});
});

//============================================
void test('high_school_plugin: drivers_permit hook fires correctly', () => {
	withFreshRegistry(() => {
		const ageHooks = lifecycleReg.getAgeHooks();
		const driversPerm = ageHooks.find((h) => h.id === 'hs-drivers-permit');
		assert.ok(driversPerm, 'drivers-permit hook not found');

		const player = createPlayer('Test', 'Player');
		player.age = 15;
		const ctx = new MockGameContext(player);

		// Fire the hook
		driversPerm.fire(player, ctx);

		const stories = ctx.getStories();
		assert.ok(stories.length > 0, 'drivers-permit hook should produce output');
	});
});

//============================================
// Integration tests: verify hooks fire when handlers call them
void test('high_school_plugin: hs_entry fires from frosh/soph handler', () => {
	withFreshRegistry(() => {
		// Create a player at age 14 entering HS
		const player = createPlayer('Test', 'Player');
		player.age = 14;
		player.phase = 'high_school';
		player.hsName = '';
		player.hsMascot = '';
		const ctx = new MockGameContext(player);

		// Call firePhaseStartHooks like the handler would
		firePhaseStartHooks('high_school', player, ctx);

		const stories = ctx.getStories();
		const hasHeadline = stories.some((s) => s.type === 'headline' && s.text.includes('Freshman'));
		assert.ok(hasHeadline, 'hs_entry hook should have fired with headline');
	});
});

//============================================
void test('high_school_plugin: drivers_permit fires from varsity handler at age 15', () => {
	withFreshRegistry(() => {
		// Create a player at age 15 (varsity eligibility, but driver permit age)
		const player = createPlayer('Test', 'Player');
		player.age = 15;
		player.phase = 'high_school';
		const ctx = new MockGameContext(player);

		// Call fireAgeHooks like the handler would
		fireAgeHooks(player, ctx);

		const stories = ctx.getStories();
		const hasPermit = stories.some((s) => s.type === 'text' && s.text.includes("driver's permit"));
		assert.ok(hasPermit, 'drivers_permit hook should have fired at age 15');
	});
});
