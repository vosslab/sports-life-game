// tabs.ts - tab bar state, switching logic, and phase-adaptive configuration

import { CareerPhase } from './player.js';

//============================================
// Tab ID and configuration types
export type TabId = 'life' | 'stats' | 'activities' | 'team' | 'career';

export interface TabConfig {
	id: TabId;
	label: string;
}

//============================================
// Phase-to-tab mapping
const PHASE_TABS: Record<CareerPhase, TabConfig[]> = {
	childhood: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'activities', label: 'Activities' },
	],
	youth: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'activities', label: 'Activities' },
	],
	high_school: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'activities', label: 'Activities' },
		{ id: 'team', label: 'Team' },
		{ id: 'career', label: 'Career' },
	],
	college: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'activities', label: 'Activities' },
		{ id: 'team', label: 'Team' },
		{ id: 'career', label: 'Career' },
	],
	nfl: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'activities', label: 'Activities' },
		{ id: 'team', label: 'Team' },
		{ id: 'career', label: 'Career' },
	],
	legacy: [
		{ id: 'life', label: 'Life' },
		{ id: 'stats', label: 'Stats' },
		{ id: 'career', label: 'Career' },
	],
};

//============================================
// All possible tab panel IDs for DOM queries
const ALL_TAB_IDS: TabId[] = ['life', 'stats', 'activities', 'team', 'career'];

// Current active tab
let currentTab: TabId = 'life';

// Callback fired when a tab is switched to (for refreshing tab content)
let onTabSwitch: ((tabId: TabId) => void) | null = null;

//============================================
// Register a callback to be called whenever a tab is switched
export function setOnTabSwitch(callback: (tabId: TabId) => void): void {
	onTabSwitch = callback;
}

//============================================
// Get the tab configuration for a given career phase
export function getTabsForPhase(phase: CareerPhase): TabConfig[] {
	return PHASE_TABS[phase];
}

//============================================
// Get current active tab
export function getCurrentTab(): TabId {
	return currentTab;
}

//============================================
// Switch to a specific tab: show its panel, hide all others, update tab bar styling
export function switchTab(tabId: TabId): void {
	currentTab = tabId;

	// Fire the tab switch callback so content can refresh
	if (onTabSwitch) {
		onTabSwitch(tabId);
	}

	// Hide all tab panels, show the selected one
	for (const id of ALL_TAB_IDS) {
		const panel = document.getElementById(`tab-${id}`);
		if (panel) {
			if (id === tabId) {
				panel.classList.remove('hidden');
				panel.classList.add('active');
			} else {
				panel.classList.add('hidden');
				panel.classList.remove('active');
			}
		}
	}

	// Update tab bar button styling
	const tabBar = document.getElementById('tab-bar');
	if (tabBar) {
		const buttons = Array.from(tabBar.querySelectorAll('.tab-button'));
		for (const btn of buttons) {
			const btnTab = (btn as HTMLElement).dataset.tab;
			if (btnTab === tabId) {
				btn.classList.add('tab-active');
			} else {
				btn.classList.remove('tab-active');
			}
		}
	}
}

//============================================
// Check if sidebar is visible (iPad width)
export function isSidebarVisible(): boolean {
	return window.matchMedia('(min-width: 768px)').matches;
}

// Re-render the tab bar buttons for a given career phase
export function updateTabBar(phase: CareerPhase): void {
	const tabBar = document.getElementById('tab-bar');
	if (!tabBar) {
		return;
	}

	// Clear existing buttons
	tabBar.innerHTML = '';

	// Get tabs for this phase
	const tabs = getTabsForPhase(phase);

	// Create a button for each tab
	// (CSS hides stats/activities tabs on iPad via data-tab selectors)
	for (const tab of tabs) {
		const button = document.createElement('button');
		button.className = 'tab-button';
		button.dataset.tab = tab.id;
		button.textContent = tab.label;

		// Mark current tab as active
		if (tab.id === currentTab) {
			button.classList.add('tab-active');
		}

		// Click handler switches to this tab
		button.addEventListener('click', () => {
			switchTab(tab.id);
		});

		tabBar.appendChild(button);
	}

	// If current tab is not available in this phase, default to life
	const availableIds = tabs.map(t => t.id);
	if (availableIds.indexOf(currentTab) === -1) {
		switchTab('life');
	}

	// Show or hide sidebar based on viewport
	updateSidebarVisibility();
}

// Toggle sidebar visibility based on viewport width
export function updateSidebarVisibility(): void {
	const sidebar = document.getElementById('sidebar');
	if (!sidebar) {
		return;
	}

	if (isSidebarVisible()) {
		sidebar.classList.remove('hidden');
	} else {
		sidebar.classList.add('hidden');
	}
}

// Listen for viewport resize to toggle sidebar
let resizeListenerAdded = false;

export function initSidebarListener(): void {
	if (resizeListenerAdded) {
		return;
	}
	resizeListenerAdded = true;
	window.addEventListener('resize', () => {
		updateSidebarVisibility();
	});
	// Initial check
	updateSidebarVisibility();
}

//============================================
// Show the tab bar (used after modals close, character creation ends)
export function showTabBar(): void {
	const tabBar = document.getElementById('tab-bar');
	if (tabBar) {
		tabBar.classList.remove('hidden');
	}
}

//============================================
// Hide the tab bar (used during modals, character creation)
export function hideTabBar(): void {
	const tabBar = document.getElementById('tab-bar');
	if (tabBar) {
		tabBar.classList.add('hidden');
	}
}
