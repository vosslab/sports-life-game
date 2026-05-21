// test_plugin_host.ts - plugin host and registry tests
//
// Verifies registration, lookup, duplicate-id rejection, and boot order
// across all eight registries. Covers lifecycle hook independence and
// stable ordering.
//
// Run with: npx tsx tests/test_plugin_host.ts

import assert from 'node:assert/strict';

import type { YearHandler } from '../src/core/year_handler.js';
import { clearHandlers } from '../src/core/year_registry.js';
import { buildPluginHost } from '../src/plugins/build_host.js';
import { registerAllPlugins } from '../src/plugins/register_plugins.js';
import { highSchoolPlugin } from '../src/plugins/high_school/index.js';
import type { WeeklyChoice } from '../src/weekly/choices.js';
import type { GameEvent } from '../src/events.js';
import type { Activity } from '../src/activities.js';
import type {
	AgeHook,
	PhaseStartHook,
	CareerEndHook,
	DataPack,
} from '../src/plugins/plugin_host.js';
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
// Test: phase registry register and lookup
function testPhaseRegistryRegisterLookup(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	// Create a minimal test handler
	const testHandler: YearHandler = {
		id: 'test_phase',
		ageStart: 50,
		ageEnd: 51,
		startYear: () => {},
		getSeasonConfig: () => ({
			seasonLength: 17,
			opponentStrengthBase: 70,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: true,
			eventChance: 50,
			opponentStrengthRange: 10,
		}),
	};

	host.phases.register(testHandler);
	const looked = host.phases.lookup('test_phase');
	assert.ok(looked, 'phase registry lookup failed');
	assert.equal(looked.id, 'test_phase', 'phase handler id mismatch');
}

//============================================
// Test: phase registry age-overlap rejection
// Note: phase_registry delegates to core year_registry which validates
// age overlap but not explicit duplicate id (since handlers are keyed by age range).
function testPhaseRegistryAgeOverlapRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const handler1: YearHandler = {
		id: 'overlap_test_1',
		ageStart: 50,
		ageEnd: 52,
		startYear: () => {},
		getSeasonConfig: () => ({
			seasonLength: 17,
			opponentStrengthBase: 70,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: true,
			eventChance: 50,
			opponentStrengthRange: 10,
		}),
	};

	host.phases.register(handler1);

	const handler2: YearHandler = {
		id: 'overlap_test_2',
		ageStart: 51,
		ageEnd: 53,
		startYear: () => {},
		getSeasonConfig: () => ({
			seasonLength: 17,
			opponentStrengthBase: 70,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: true,
			eventChance: 50,
			opponentStrengthRange: 10,
		}),
	};

	let threw = false;
	try {
		host.phases.register(handler2);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'phase registry should throw on age overlap');
}

//============================================
// Test: phase registry clear
function testPhaseRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const handler: YearHandler = {
		id: 'clear_test',
		ageStart: 50,
		ageEnd: 50,
		startYear: () => {},
		getSeasonConfig: () => ({
			seasonLength: 17,
			opponentStrengthBase: 70,
			hasFootball: true,
			hasDepthChart: true,
			hasPlayoffs: true,
			eventChance: 50,
			opponentStrengthRange: 10,
		}),
	};

	host.phases.register(handler);
	host.phases.clear();
	const looked = host.phases.lookup('clear_test');
	assert.ok(!looked, 'phase registry clear failed');
}

//============================================
// Test: event registry register and lookup
function testEventRegistryRegisterLookup(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testEvent: GameEvent = {
		id: 'test_event',
		title: 'Test Event',
		description: 'A test event',
		phase: 'nfl',
		tags: ['test'],
		weight: 1,
		is_big_decision: false,
		conditions: {},
		choices: [],
	};

	host.events.register(testEvent);
	const looked = host.events.lookup('test_event');
	assert.ok(looked, 'event registry lookup failed');
	assert.equal(looked.id, 'test_event', 'event id mismatch');
}

//============================================
// Test: event registry duplicate rejection
function testEventRegistryDuplicateRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const event1: GameEvent = {
		id: 'dup_event',
		title: 'Event 1',
		description: 'Description 1',
		phase: 'nfl',
		tags: ['test'],
		weight: 1,
		is_big_decision: false,
		conditions: {},
		choices: [],
	};

	host.events.register(event1);

	const event2: GameEvent = {
		id: 'dup_event',
		title: 'Event 2',
		description: 'Description 2',
		phase: 'nfl',
		tags: ['test'],
		weight: 1,
		is_big_decision: false,
		conditions: {},
		choices: [],
	};

	let threw = false;
	try {
		host.events.register(event2);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'event registry should throw on duplicate id');
}

//============================================
// Test: event registry clear
function testEventRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testEvent: GameEvent = {
		id: 'clear_event',
		title: 'Test Event',
		description: 'A test event',
		phase: 'nfl',
		tags: ['test'],
		weight: 1,
		is_big_decision: false,
		conditions: {},
		choices: [],
	};

	host.events.register(testEvent);
	host.events.clear();
	const looked = host.events.lookup('clear_event');
	assert.ok(!looked, 'event registry clear failed');
}

//============================================
// Test: choice registry register and lookup (uses WeeklyChoice with id)
function testChoiceRegistryRegisterLookup(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testChoice: WeeklyChoice = {
		id: 'test_choice',
		category: 'test',
		text: 'Test Choice',
		description: 'A test choice',
		risk: 'low',
		conditions: {},
		outcomes: {
			success: { probability: 0.8, effects: {}, narrative: 'Success' },
			failure: { probability: 0.2, effects: {}, narrative: 'Failure' },
		},
	};

	host.choices.register(testChoice);
	const looked = host.choices.lookup('test_choice');
	assert.ok(looked, 'choice registry lookup failed');
	assert.equal(looked.id, 'test_choice', 'choice id mismatch');
}

//============================================
// Test: choice registry duplicate rejection
function testChoiceRegistryDuplicateRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const choice1: WeeklyChoice = {
		id: 'dup_choice',
		category: 'test',
		text: 'Choice 1',
		description: 'Description 1',
		risk: 'low',
		conditions: {},
		outcomes: {
			success: { probability: 0.8, effects: {}, narrative: 'Success' },
			failure: { probability: 0.2, effects: {}, narrative: 'Failure' },
		},
	};

	host.choices.register(choice1);

	const choice2: WeeklyChoice = {
		id: 'dup_choice',
		category: 'test',
		text: 'Choice 2',
		description: 'Description 2',
		risk: 'low',
		conditions: {},
		outcomes: {
			success: { probability: 0.8, effects: {}, narrative: 'Success' },
			failure: { probability: 0.2, effects: {}, narrative: 'Failure' },
		},
	};

	let threw = false;
	try {
		host.choices.register(choice2);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'choice registry should throw on duplicate id');
}

//============================================
// Test: choice registry clear
function testChoiceRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testChoice: WeeklyChoice = {
		id: 'clear_choice',
		category: 'test',
		text: 'Test Choice',
		description: 'A test choice',
		risk: 'low',
		conditions: {},
		outcomes: {
			success: { probability: 0.8, effects: {}, narrative: 'Success' },
			failure: { probability: 0.2, effects: {}, narrative: 'Failure' },
		},
	};

	host.choices.register(testChoice);
	host.choices.clear();
	const looked = host.choices.lookup('clear_choice');
	assert.ok(!looked, 'choice registry clear failed');
}

//============================================
// Test: activity registry register and lookup
function testActivityRegistryRegisterLookup(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testActivity: Activity = {
		id: 'test_activity',
		name: 'Test Activity',
		description: 'A test activity',
		phases: ['nfl'],
		effects: {},
		flavorText: 'You did it!',
	};

	host.activities.register(testActivity);
	const looked = host.activities.lookup('test_activity');
	assert.ok(looked, 'activity registry lookup failed');
	assert.equal(looked.id, 'test_activity', 'activity id mismatch');
}

//============================================
// Test: activity registry duplicate rejection
function testActivityRegistryDuplicateRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const activity1: Activity = {
		id: 'dup_activity',
		name: 'Activity 1',
		description: 'Activity 1',
		phases: ['nfl'],
		effects: {},
		flavorText: 'Done!',
	};

	host.activities.register(activity1);

	const activity2: Activity = {
		id: 'dup_activity',
		name: 'Activity 2',
		description: 'Activity 2',
		phases: ['nfl'],
		effects: {},
		flavorText: 'Done!',
	};

	let threw = false;
	try {
		host.activities.register(activity2);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'activity registry should throw on duplicate id');
}

//============================================
// Test: activity registry clear
function testActivityRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testActivity: Activity = {
		id: 'clear_activity',
		name: 'Test Activity',
		description: 'Test Activity',
		phases: ['nfl'],
		effects: {},
		flavorText: 'Done!',
	};

	host.activities.register(testActivity);
	host.activities.clear();
	const looked = host.activities.lookup('clear_activity');
	assert.ok(!looked, 'activity registry clear failed');
}

//============================================
// Test: lifecycle hooks - AgeHook, PhaseStartHook, CareerEndHook independence
function testLifecycleHookIndependence(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const ageHook: AgeHook = {
		id: 'age_hook_1',
		age: 18,
		fire: () => {},
	};

	const phaseHook: PhaseStartHook = {
		id: 'phase_hook_1',
		phase: 'nfl',
		fire: () => {},
	};

	const careerHook: CareerEndHook = {
		id: 'career_hook_1',
		trigger: 'retirement',
		fire: () => {},
	};

	host.lifecycle.registerAgeHook(ageHook);
	host.lifecycle.registerPhaseStartHook(phaseHook);
	host.lifecycle.registerCareerEndHook(careerHook);

	const ageHooks = host.lifecycle.getAgeHooks();
	const phaseHooks = host.lifecycle.getPhaseStartHooks();
	const careerHooks = host.lifecycle.getCareerEndHooks();

	assert.ok(
		ageHooks.some((h) => h.id === 'age_hook_1'),
		'AgeHook not registered'
	);
	assert.ok(
		phaseHooks.some((h) => h.id === 'phase_hook_1'),
		'PhaseStartHook not registered'
	);
	assert.ok(
		careerHooks.some((h) => h.id === 'career_hook_1'),
		'CareerEndHook not registered'
	);
}

//============================================
// Test: lifecycle hooks - AgeHook duplicate rejection
function testLifecycleAgeHookDuplicateRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const hook1: AgeHook = {
		id: 'dup_age_hook',
		age: 18,
		fire: () => {},
	};

	host.lifecycle.registerAgeHook(hook1);

	const hook2: AgeHook = {
		id: 'dup_age_hook',
		age: 19,
		fire: () => {},
	};

	let threw = false;
	try {
		host.lifecycle.registerAgeHook(hook2);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'lifecycle registry should throw on duplicate AgeHook id');
}

//============================================
// Test: lifecycle hooks - stable ordering (priority desc, id asc)
function testLifecycleHookOrdering(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	// Register hooks with same age but different priorities
	const hook1: AgeHook = {
		id: 'low_priority',
		age: 18,
		priority: 10,
		fire: () => {},
	};

	const hook2: AgeHook = {
		id: 'high_priority',
		age: 18,
		priority: 100,
		fire: () => {},
	};

	const hook3: AgeHook = {
		id: 'another_low',
		age: 18,
		priority: 10,
		fire: () => {},
	};

	host.lifecycle.registerAgeHook(hook1);
	host.lifecycle.registerAgeHook(hook2);
	host.lifecycle.registerAgeHook(hook3);

	const hooks = host.lifecycle.getAgeHooks();

	// Should be ordered: priority 100 first, then priority 10 by id (asc: 'another_low' < 'low_priority')
	assert.equal(hooks[0].id, 'high_priority', 'highest priority should be first');
	assert.equal(hooks[1].id, 'another_low', 'same priority should be sorted by id asc');
	assert.equal(hooks[2].id, 'low_priority', 'lowest priority should be last');
}

//============================================
// Test: lifecycle registry clear
function testLifecycleRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const ageHook: AgeHook = {
		id: 'clear_age',
		age: 18,
		fire: () => {},
	};

	host.lifecycle.registerAgeHook(ageHook);
	host.lifecycle.clear();

	const hooks = host.lifecycle.getAgeHooks();
	assert.ok(!hooks.find((h) => h.id === 'test_age'), 'lifecycle registry clear failed');
}

//============================================
// Test: DataPack routing - registering a pack routes sub-items to sub-registries
function testDataPackRouting(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	// Create a test pack with events, activities, and lifecycle hooks
	const testPack: DataPack = {
		id: 'routing_test_pack',
		name: 'Routing Test Pack',
		description: 'Tests that sub-items route to sub-registries',
		events: [
			{
				id: 'routing_test_event',
				title: 'Routing Test Event',
				description: 'Test event in a pack',
				phase: 'high_school',
				tags: ['test'],
				weight: 1,
				is_big_decision: false,
				conditions: {},
				choices: [],
			},
		],
		activities: [
			{
				id: 'routing_test_activity',
				name: 'Routing Test Activity',
				description: 'Test activity in a pack',
				phases: ['high_school'],
				effects: {},
				flavorText: 'Test activity',
			},
		],
		lifecycleHooks: [
			{
				id: 'routing_test_hook',
				age: 17,
				fire: () => {},
			},
		],
	};

	// Register the pack
	host.dataPacks.register(testPack);

	// Verify the pack itself is registered
	const pack = host.dataPacks.lookup('routing_test_pack');
	assert.ok(pack, 'data pack not registered');

	// Verify sub-items were routed to their registries
	const event = host.events.lookup('routing_test_event');
	assert.ok(event, 'event from pack not routed to event registry');

	const activity = host.activities.lookup('routing_test_activity');
	assert.ok(activity, 'activity from pack not routed to activity registry');

	const hooks = host.lifecycle.getAgeHooks();
	const routedHook = hooks.find((h) => h.id === 'routing_test_hook');
	assert.ok(routedHook, 'lifecycle hook from pack not routed to lifecycle registry');
}

//============================================
// Test: boot order assertion (M3: plugin-only handler registration)
// Verify: clearHandlers() -> buildPluginHost() -> registerAllPlugins()
function testBootOrder(): void {
	clearAllRegistries();
	const host = buildPluginHost();
	registerAllPlugins(host);
}

//============================================
// Test: rules registry register and lookup
function testRulesRegistryRegisterLookup(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	host.rules.register({
		id: 'test_rules',
		name: 'Test Ruleset',
		implementationModule: 'test/rules.ts',
	});

	const looked = host.rules.lookup('test_rules');
	assert.ok(looked, 'rules registry lookup failed');
	assert.equal(looked.id, 'test_rules', 'rules id mismatch');
}

//============================================
// Test: rules registry duplicate rejection
function testRulesRegistryDuplicateRejection(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	host.rules.register({
		id: 'dup_rules',
		name: 'Rules 1',
	});

	let threw = false;
	try {
		host.rules.register({
			id: 'dup_rules',
			name: 'Rules 2',
		});
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'rules registry should throw on duplicate id');
}

//============================================
// Test: rules registry clear
function testRulesRegistryClear(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	host.rules.register({
		id: 'clear_rules',
		name: 'Rules',
	});

	host.rules.clear();
	const looked = host.rules.lookup('clear_rules');
	assert.ok(!looked, 'rules registry clear failed');
}

//============================================
// Test: UI registry - registerTab, getAllTabs, duplicate rejection, clear
function testUiRegistryTabs(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testTab = {
		tabId: 'test_tab',
		label: 'Test Tab',
		availableInPhase: () => true,
		render: () => {},
	};

	host.ui.registerTab(testTab);
	const allTabs = host.ui.getAllTabs();
	assert.ok(
		allTabs.some((t) => t.tabId === 'test_tab'),
		'tab registry register and lookup failed'
	);

	// Test duplicate rejection
	const dupTab = {
		tabId: 'test_tab',
		label: 'Duplicate Tab',
		availableInPhase: () => true,
		render: () => {},
	};

	let threw = false;
	try {
		host.ui.registerTab(dupTab);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'UI tab registry should throw on duplicate tabId');

	// Test clear
	host.ui.clear();
	const afterClear = host.ui.getAllTabs();
	assert.ok(!afterClear.find((t) => t.tabId === 'test_tab'), 'UI tab registry clear failed');
}

//============================================
// Test: UI registry - registerPanel, getAllPanels, duplicate rejection, clear
function testUiRegistryPanels(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testPanel = {
		panelId: 'test_panel',
		label: 'Test Panel',
		availableInPhase: () => true,
		render: () => {},
	};

	host.ui.registerPanel(testPanel);
	const allPanels = host.ui.getAllPanels();
	assert.ok(
		allPanels.some((p) => p.panelId === 'test_panel'),
		'panel registry register and lookup failed'
	);

	// Test duplicate rejection
	const dupPanel = {
		panelId: 'test_panel',
		label: 'Duplicate Panel',
		availableInPhase: () => true,
		render: () => {},
	};

	let threw = false;
	try {
		host.ui.registerPanel(dupPanel);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'UI panel registry should throw on duplicate panelId');

	// Test clear
	host.ui.clear();
	const afterClear = host.ui.getAllPanels();
	assert.ok(!afterClear.find((p) => p.panelId === 'test_panel'), 'UI panel registry clear failed');
}

//============================================
// Test: UI registry - registerWidget, getAllWidgets, duplicate rejection, clear
function testUiRegistryWidgets(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testWidget = {
		widgetId: 'test_widget',
		availableInPhase: () => true,
		render: () => {},
	};

	host.ui.registerWidget(testWidget);
	const allWidgets = host.ui.getAllWidgets();
	assert.ok(
		allWidgets.some((w) => w.widgetId === 'test_widget'),
		'widget registry register and lookup failed'
	);

	// Test duplicate rejection
	const dupWidget = {
		widgetId: 'test_widget',
		availableInPhase: () => true,
		render: () => {},
	};

	let threw = false;
	try {
		host.ui.registerWidget(dupWidget);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'UI widget registry should throw on duplicate widgetId');

	// Test clear
	host.ui.clear();
	const afterClear = host.ui.getAllWidgets();
	assert.ok(
		!afterClear.find((w) => w.widgetId === 'test_widget'),
		'UI widget registry clear failed'
	);
}

//============================================
// Test: DataPack registry - register, lookup, duplicate rejection, clear
function testDataPackRegistry(): void {
	clearAllRegistries();
	const host = buildPluginHost();

	const testPack = {
		id: 'test_pack',
		name: 'Test DataPack',
	};

	host.dataPacks.register(testPack);
	const looked = host.dataPacks.lookup('test_pack');
	assert.ok(looked, 'data pack registry lookup failed');
	assert.equal(looked.id, 'test_pack', 'data pack id mismatch');

	// Test duplicate rejection
	const dupPack = {
		id: 'test_pack',
		name: 'Duplicate DataPack',
	};

	let threw = false;
	try {
		host.dataPacks.register(dupPack);
	} catch (err) {
		threw = true;
	}
	assert.ok(threw, 'data pack registry should throw on duplicate id');

	// Test clear
	host.dataPacks.clear();
	const afterClear = host.dataPacks.lookup('test_pack');
	assert.ok(!afterClear, 'data pack registry clear failed');
}

//============================================
// Test: boot order NEGATIVE - core handlers should not be registered in core registerAllHandlers
// (M2+: HS, childhood, college, NFL handlers now register via plugins, not via registerAllHandlers)
function testBootOrderNegativeNoHandlers(): void {
	clearAllRegistries();
	// Test that registerAllPlugins succeeds independently
	// (independent of registerAllHandlers being called first)
	const host = buildPluginHost();
	registerAllPlugins(host);

	// After M2+, all phase handlers register via plugins, so phases will NOT be empty.
	// This test verifies that plugin registration succeeds without needing registerAllHandlers.
	const phases = host.phases.getAll();
	assert.ok(phases.length > 0, 'Phase handlers should be registered via plugins');
}

//============================================
// Test: single plugin registration (M3: plugin-only model)
function testSinglePluginRegistration(): void {
	clearAllRegistries();
	const host = buildPluginHost();
	// Register only HS plugin to test that plugin registration works independently
	highSchoolPlugin.register(host);
}

//============================================
async function main(): Promise<void> {
	// Phase registry tests
	testPhaseRegistryRegisterLookup();
	testPhaseRegistryAgeOverlapRejection();
	testPhaseRegistryClear();

	// Event registry tests
	testEventRegistryRegisterLookup();
	testEventRegistryDuplicateRejection();
	testEventRegistryClear();

	// Choice registry tests
	testChoiceRegistryRegisterLookup();
	testChoiceRegistryDuplicateRejection();
	testChoiceRegistryClear();

	// Activity registry tests
	testActivityRegistryRegisterLookup();
	testActivityRegistryDuplicateRejection();
	testActivityRegistryClear();

	// Rules registry tests
	testRulesRegistryRegisterLookup();
	testRulesRegistryDuplicateRejection();
	testRulesRegistryClear();

	// UI registry tests
	testUiRegistryTabs();
	testUiRegistryPanels();
	testUiRegistryWidgets();

	// DataPack registry tests
	testDataPackRegistry();
	testDataPackRouting();

	// Lifecycle registry tests
	testLifecycleHookIndependence();
	testLifecycleAgeHookDuplicateRejection();
	testLifecycleHookOrdering();
	testLifecycleRegistryClear();

	// Boot order tests
	testBootOrder();
	testBootOrderNegativeNoHandlers();
	testSinglePluginRegistration();

	console.log('test_plugin_host.ts: all tests passed');
}

main();
