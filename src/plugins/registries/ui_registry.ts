// ui_registry.ts - UI (tabs, panels, widgets) registration
//
// Thin registry for TabRegistration, PanelRegistration, and WidgetRegistration.
// Supports registerTab, registerPanel, registerWidget.
// Lookup methods: getAllTabs, getAllPanels, getAllWidgets.
// Throws on duplicate tabId, panelId, or widgetId.

import type {
	TabRegistration,
	PanelRegistration,
	WidgetRegistration,
	UiRegistry,
} from '../plugin_host.js';

//============================================
// Module-level state: separate maps for each UI type
const tabs = new Map<string, TabRegistration>();
const panels = new Map<string, PanelRegistration>();
const widgets = new Map<string, WidgetRegistration>();

//============================================
// UiRegistry implementation: map-backed registry for three UI types

class UiRegistryImpl implements UiRegistry {
	registerTab(config: TabRegistration): void {
		if (tabs.has(config.tabId)) {
			throw new Error(
				`Duplicate tab id: "${config.tabId}" already registered in UiRegistry`
			);
		}
		tabs.set(config.tabId, config);
	}

	registerPanel(config: PanelRegistration): void {
		if (panels.has(config.panelId)) {
			throw new Error(
				`Duplicate panel id: "${config.panelId}" already registered in UiRegistry`
			);
		}
		panels.set(config.panelId, config);
	}

	registerWidget(config: WidgetRegistration): void {
		if (widgets.has(config.widgetId)) {
			throw new Error(
				`Duplicate widget id: "${config.widgetId}" already registered in UiRegistry`
			);
		}
		widgets.set(config.widgetId, config);
	}

	getAllTabs(): readonly TabRegistration[] {
		return Array.from(tabs.values());
	}

	getAllPanels(): readonly PanelRegistration[] {
		return Array.from(panels.values());
	}

	getAllWidgets(): readonly WidgetRegistration[] {
		return Array.from(widgets.values());
	}

	clear(): void {
		tabs.clear();
		panels.clear();
		widgets.clear();
	}
}

//============================================
// Module-level singleton instance
const instance = new UiRegistryImpl();

//============================================
// Public exports
export function registerTab(config: TabRegistration): void {
	instance.registerTab(config);
}

export function registerPanel(config: PanelRegistration): void {
	instance.registerPanel(config);
}

export function registerWidget(config: WidgetRegistration): void {
	instance.registerWidget(config);
}

export function getAllTabs(): readonly TabRegistration[] {
	return instance.getAllTabs();
}

export function getAllPanels(): readonly PanelRegistration[] {
	return instance.getAllPanels();
}

export function getAllWidgets(): readonly WidgetRegistration[] {
	return instance.getAllWidgets();
}

export function clear(): void {
	instance.clear();
}
