// popup.ts - dedicated popup and modal UI system
//
// Owns all overlay/modal rendering: choice popups, event modals,
// and the persistent main action bar (Next Week / Age Up).
// Phase modules import directly from this file.

import { getElement, findElement } from './dom_utils.js';
import type { ChoiceOption } from './ui.js';

//============================================
// CHOICE POPUP (BitLife-style modal for decisions)
//============================================

// Show a decision as a centered popup modal.
// If only one option is provided, renders it as the main bottom button
// instead of a popup (single actions like "Continue" don't need a modal).
// Title provides context (e.g. "Weekly Focus", "Offseason Decision").
// Description is optional explanatory text below the title.
export function waitForInteraction(
	title: string,
	options: ChoiceOption[],
	description?: string,
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

	const modal = getElement('choice-popup');
	const titleEl = getElement('choice-popup-title');
	const descEl = getElement('choice-popup-description');
	const optionsEl = getElement('choice-popup-options');

	// Set content
	titleEl.textContent = title;
	descEl.textContent = description ?? '';

	// Clear and populate choices
	optionsEl.innerHTML = '';
	for (const option of options) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		if (option.primary) {
			button.classList.add('primary');
		}
		button.textContent = option.text;
		button.addEventListener('click', () => {
			// Hide popup before running the action
			hideInteractionPopup();
			option.action();
		});
		optionsEl.appendChild(button);
	}

	// Show popup
	modal.classList.remove('hidden');
}

//============================================
// Hide choice popup
export function hideInteractionPopup(): void {
	const modal = getElement('choice-popup');
	modal.classList.add('hidden');
}

//============================================
// EVENT MODAL (narrative events with choices)
//============================================

// Show event modal with title, description, and choices
export function showEventModal(
	title: string,
	description: string,
	choices: { text: string; action: () => void }[],
): void {
	const modal = getElement('event-modal');
	const titleEl = getElement('event-title');
	const descEl = getElement('event-description');
	const choicesEl = getElement('event-choices');

	// Set content
	titleEl.textContent = title;
	descEl.textContent = description;

	// Clear and populate choices
	choicesEl.innerHTML = '';
	for (const choice of choices) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		button.textContent = choice.text;
		button.addEventListener('click', choice.action);
		choicesEl.appendChild(button);
	}

	// Show modal
	modal.classList.remove('hidden');
}

//============================================
// Hide event modal
export function hideEventModal(): void {
	const modal = getElement('event-modal');
	modal.classList.add('hidden');
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
