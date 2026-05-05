// choice_widget.ts - Choice buttons and decision displays
//
// Exports ChoiceOption interface and functions to show/clear choice buttons,
// weekly focus selections, and game results.

import { getElement, findElement } from '../dom_utils.js';
import { addHeadline, addText, addResult } from './story_widget.js';
import { waitForInteraction as _waitForInteraction } from '../popup.js';

//============================================
// Type definitions for choice options
export interface ChoiceOption {
	text: string;
	description?: string;
	primary?: boolean;
	action: () => void;
}

//============================================
// Show choice buttons
export function showChoices(options: ChoiceOption[]): void {
	// Hide main action bar when showing inline choices to avoid double buttons
	const actionBar = findElement('main-action-bar');
	if (actionBar) {
		actionBar.style.display = 'none';
	}

	const panel = getElement('choices-panel');
	panel.innerHTML = '';

	for (const option of options) {
		const button = document.createElement('button');
		button.className = 'choice-button';
		if (option.primary) {
			button.classList.add('primary');
		}

		const label = document.createElement('span');
		label.className = 'choice-button-label';
		label.textContent = option.text;
		button.appendChild(label);

		if (option.description) {
			const description = document.createElement('span');
			description.className = 'choice-button-description';
			description.textContent = option.description;
			button.appendChild(description);
		}

		button.addEventListener('click', () => option.action());
		panel.appendChild(button);
	}
}

//============================================
// Clear all choice buttons
export function clearChoices(): void {
	const panel = getElement('choices-panel');
	panel.innerHTML = '';
}

//============================================
// Display weekly focus options as choice buttons
export function showWeeklyFocusChoices(
	onChoice: (focus: string) => void,
): void {
	const focusOptions: ChoiceOption[] = [
		{
			text: 'Train (+2-4 TEC)',
			action: () => onChoice('train'),
		},
		{
			text: 'Film Study (+2-3 IQ)',
			action: () => onChoice('film_study'),
		},
		{
			text: 'Recovery (+3-5 HP)',
			action: () => onChoice('recovery'),
		},
		{
			text: 'Social (+2-4 POP)',
			action: () => onChoice('social'),
		},
		{
			text: 'Teamwork (+2-3 leadership)',
			action: () => onChoice('teamwork'),
		},
	];

	_waitForInteraction('Weekly Focus', focusOptions);
}

//============================================
// Display game day result with player line, team result, and story
export function showGameResult(
	playerLine: string,
	teamResult: string,
	storyText: string,
): void {
	addHeadline('Game Day');
	addText(storyText);
	addResult(playerLine);
	addResult(teamResult);
}
