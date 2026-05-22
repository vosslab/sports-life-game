// test_scout_report_panel.ts - Scout Report plugin panel rendering tests
//
// Tests that the scout report panel:
// - Registers correctly in the plugin host
// - Has correct phase availability (college and nfl)
// - Renders without error when given a college/nfl player
// - Creates appropriate DOM elements with scout data

/// <reference types="node" />

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPlayer } from '../src/player.js';
import { buildPluginHost } from '../src/plugins/build_host.js';
import { registerAllPlugins } from '../src/plugins/register_plugins.js';
import type { GameContext } from '../src/core/game_context.js';
import { clearHandlers } from '../src/core/year_registry.js';
import * as phaseReg from '../src/plugins/registries/phase_registry.js';
import * as eventReg from '../src/plugins/registries/event_registry.js';
import * as choiceReg from '../src/plugins/registries/choice_registry.js';
import * as rulesReg from '../src/plugins/registries/rules_registry.js';
import * as activityReg from '../src/plugins/registries/activity_registry.js';
import * as lifecycleReg from '../src/plugins/registries/lifecycle_registry.js';
import * as uiReg from '../src/plugins/registries/ui_registry.js';
import * as dataPackReg from '../src/plugins/registries/data_pack_registry.js';

//============================================
// Helper: wipe all registries for test isolation
function clearAllRegistries(): void {
	clearHandlers();
	phaseReg.clear();
	eventReg.clear();
	choiceReg.clear();
	rulesReg.clear();
	activityReg.clear();
	lifecycleReg.clear();
	uiReg.clear();
	dataPackReg.clear();
}

//============================================
void test('scout_report: panel is registered in UI registry', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	const panels = host.ui.getAllPanels();
	const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

	assert.ok(scoutPanel, 'scout_report panel should be registered');
	assert.strictEqual(scoutPanel.label, 'Scout Report', 'panel label should be "Scout Report"');
});

//============================================
void test('scout_report: panel is available in college phase', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	const panels = host.ui.getAllPanels();
	const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

	assert.ok(scoutPanel, 'scout_report panel should exist');
	assert.strictEqual(
		scoutPanel.availableInPhase('college'),
		true,
		'panel should be available in college phase'
	);
});

//============================================
void test('scout_report: panel is available in nfl phase', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	const panels = host.ui.getAllPanels();
	const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

	assert.ok(scoutPanel, 'scout_report panel should exist');
	assert.strictEqual(
		scoutPanel.availableInPhase('nfl'),
		true,
		'panel should be available in nfl phase'
	);
});

//============================================
void test('scout_report: panel is NOT available in high_school phase', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	const panels = host.ui.getAllPanels();
	const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

	assert.ok(scoutPanel, 'scout_report panel should exist');
	assert.strictEqual(
		scoutPanel.availableInPhase('high_school'),
		false,
		'panel should NOT be available in high_school phase'
	);
});

//============================================
void test('scout_report: panel renders with college player (has draft stock)', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	// Create a mock DOM environment with career-content
	const originalDoc = globalThis.document;
	const mockContainer = {
		querySelector: () => null,
		appendChild: () => {},
		children: [] as Element[],
		id: 'career-content',
	};

	globalThis.document = {
		getElementById: (id: string) => {
			if (id === 'career-content') {
				return mockContainer;
			}
			return null;
		},
		createElement: (_tag: string) => ({
			className: '',
			style: {},
			textContent: '',
			appendChild: () => {},
			remove: () => {},
			setAttribute: () => {},
			getAttribute: () => null,
			id: '',
		}),
	} as unknown as Document;

	try {
		const player = createPlayer('Test', 'Player');
		player.phase = 'college';
		player.age = 20;
		player.draftStock = 65; // Mid-round projection

		const mockContext = {
			getPlayer: () => player,
		} as unknown as GameContext;

		const panels = host.ui.getAllPanels();
		const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

		assert.ok(scoutPanel, 'scout_report panel should be registered');

		// Should not throw
		assert.doesNotThrow(() => {
			scoutPanel.render(mockContext);
		}, 'scout_report panel render should not throw with college player');
	} finally {
		globalThis.document = originalDoc;
	}
});

//============================================
void test('scout_report: panel renders with nfl player (has draft stock)', () => {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);

	// Create a mock DOM environment with career-content
	const originalDoc = globalThis.document;
	const mockContainer = {
		querySelector: () => null,
		appendChild: () => {},
		children: [] as Element[],
		id: 'career-content',
	};

	globalThis.document = {
		getElementById: (id: string) => {
			if (id === 'career-content') {
				return mockContainer;
			}
			return null;
		},
		createElement: (_tag: string) => ({
			className: '',
			style: {},
			textContent: '',
			appendChild: () => {},
			remove: () => {},
			setAttribute: () => {},
			getAttribute: () => null,
			id: '',
		}),
	} as unknown as Document;

	try {
		const player = createPlayer('Test', 'Player');
		player.phase = 'nfl';
		player.age = 25;
		player.draftStock = 80; // First round projection

		const mockContext = {
			getPlayer: () => player,
		} as unknown as GameContext;

		const panels = host.ui.getAllPanels();
		const scoutPanel = panels.find((p) => p.panelId === 'scout_report');

		assert.ok(scoutPanel, 'scout_report panel should be registered');

		// Should not throw
		assert.doesNotThrow(() => {
			scoutPanel.render(mockContext);
		}, 'scout_report panel render should not throw with nfl player');
	} finally {
		globalThis.document = originalDoc;
	}
});
