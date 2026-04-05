// popup.ts - dedicated popup and modal UI system
//
// Owns all overlay/modal rendering via a single unified #game-modal.
// Two visual themes: narrative (gold title, left-aligned) for events,
// decision (bold, centered) for player choices.
// Phase modules import directly from this file.

import { getElement, findElement } from './dom_utils.js';
import type { ChoiceOption } from './ui.js';

//============================================
// UNIFIED MODAL (single DOM element, two visual themes)
//============================================

// Internal: show the unified modal with the given style class
function showModal(
	title: string,
	description: string,
	options: { text: string; primary?: boolean; action: () => void }[],
	styleClass: string,
	autoHideOnClick: boolean,
): void {
	const modal = getElement('game-modal');
	const card = modal.querySelector('.modal-card') as HTMLElement;
	const titleEl = getElement('modal-title');
	const descEl = getElement('modal-description');
	const optionsEl = getElement('modal-options');

	// Set content
	titleEl.textContent = title;
	descEl.textContent = description;

	// Apply style class (remove previous theme first)
	card.classList.remove('decision-style', 'narrative-style', 'activity-style');
	if (styleClass) {
		card.classList.add(styleClass);
	}

	// Clear and populate options
	optionsEl.innerHTML = '';
	for (const option of options) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		if (option.primary) {
			button.classList.add('primary');
		}
		button.textContent = option.text;
		button.addEventListener('click', () => {
			if (autoHideOnClick) {
				hideModal();
			}
			option.action();
		});
		optionsEl.appendChild(button);
	}

	// Show modal
	modal.classList.remove('hidden');
}

//============================================
// Hide the unified modal and clear style classes
function hideModal(): void {
	const modal = getElement('game-modal');
	const card = modal.querySelector('.modal-card') as HTMLElement;
	modal.classList.add('hidden');
	card.classList.remove('decision-style', 'narrative-style', 'activity-style');
}

//============================================
// CHOICE POPUP (BitLife-style modal for decisions)
//============================================

// Show a decision or event as a centered popup modal.
// If only one option is provided, renders it as the main bottom button
// instead of a popup (single actions like "Continue" don't need a modal).
// Title provides context (e.g. "Weekly Focus", "Offseason Decision").
// Description is optional explanatory text below the title.
// Style: 'decision' (default, centered bold) or 'narrative' (gold title, left-aligned).
export function waitForInteraction(
	title: string,
	options: ChoiceOption[],
	description?: string,
	style?: string,
): void {
	// Single option: render as the main bottom button, not a popup
	if (options.length === 1) {
		const opt = options[0];
		configureMainButtons({
			nextLabel: opt.text,
			nextAction: opt.action,
			ageUpVisible: false,
		});
		showMainActionBar();
		return;
	}

	// Pick CSS theme class based on style parameter
	let styleClass = 'decision-style';
	if (style === 'narrative') {
		styleClass = 'narrative-style';
	} else if (style === 'activity') {
		styleClass = 'activity-style';
	}
	showModal(title, description ?? '', options, styleClass, true);
}

//============================================
// Hide the modal (exported for callers that need explicit control)
export function hideInteractionPopup(): void {
	hideModal();
}

//============================================
// MAIN ACTION BAR (persistent Next Week / Age Up buttons)
//============================================

// Callbacks set by phase modules via configureMainButtons
let onNextWeekCallback: (() => void) | null = null;
let onAgeUpCallback: (() => void) | null = null;

//============================================
// Configure the persistent main buttons for the current phase.
// Labels and visibility adapt to phase context.
export function configureMainButtons(config: {
	nextLabel: string;
	nextAction: () => void;
	ageUpVisible: boolean;
	ageUpAction?: () => void;
}): void {
	// Clear inline choices panel to avoid double buttons
	const choicesPanel = findElement('choices-panel');
	if (choicesPanel) {
		choicesPanel.innerHTML = '';
	}

	const nextBtn = getElement('btn-next-week') as HTMLButtonElement;
	const ageBtn = getElement('btn-age-up') as HTMLButtonElement;

	// Set label and callback for the primary advance button
	nextBtn.textContent = config.nextLabel;
	onNextWeekCallback = config.nextAction;

	// Age Up button visibility
	if (config.ageUpVisible && config.ageUpAction) {
		ageBtn.style.display = '';
		onAgeUpCallback = config.ageUpAction;
	} else {
		ageBtn.style.display = 'none';
		onAgeUpCallback = null;
	}

	// Enable buttons
	nextBtn.disabled = false;
	ageBtn.disabled = false;
}

//============================================
// Disable main buttons (e.g. while a popup is open)
export function disableMainButtons(): void {
	const nextBtn = findElement('btn-next-week') as HTMLButtonElement | null;
	const ageBtn = findElement('btn-age-up') as HTMLButtonElement | null;
	if (nextBtn) {
		nextBtn.disabled = true;
	}
	if (ageBtn) {
		ageBtn.disabled = true;
	}
}

//============================================
// Enable main buttons (e.g. after popup closes)
export function enableMainButtons(): void {
	const nextBtn = findElement('btn-next-week') as HTMLButtonElement | null;
	const ageBtn = findElement('btn-age-up') as HTMLButtonElement | null;
	if (nextBtn) {
		nextBtn.disabled = false;
	}
	if (ageBtn) {
		ageBtn.disabled = false;
	}
}

//============================================
// Hide the main action bar entirely (e.g. during character creation)
export function hideMainActionBar(): void {
	const bar = findElement('main-action-bar');
	if (bar) {
		bar.style.display = 'none';
	}
}

//============================================
// Show the main action bar
export function showMainActionBar(): void {
	const bar = findElement('main-action-bar');
	if (bar) {
		bar.style.display = '';
	}
}

//============================================
// Initialize click handlers for the main action bar buttons.
// Called once at app startup.
export function initMainActionBar(): void {
	const nextBtn = getElement('btn-next-week') as HTMLButtonElement;
	const ageBtn = getElement('btn-age-up') as HTMLButtonElement;

	nextBtn.addEventListener('click', () => {
		if (onNextWeekCallback && !nextBtn.disabled) {
			onNextWeekCallback();
		}
	});

	ageBtn.addEventListener('click', () => {
		if (onAgeUpCallback && !ageBtn.disabled) {
			// Show confirmation popup before age-up
			waitForInteraction('Simulate Year', [
				{
					text: 'Simulate Year',
					primary: true,
					action: () => {
						if (onAgeUpCallback) {
							onAgeUpCallback();
						}
					},
				},
				{
					text: 'Cancel',
					action: () => {
						// Popup auto-closes via hideInteractionPopup
					},
				},
			], 'Simulate the rest of the year? All weekly decisions will be auto-resolved.');
		}
	});

	// Hide by default until a phase configures it
	hideMainActionBar();
}
