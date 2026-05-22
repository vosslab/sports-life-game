// dev_jump_ui.ts - Life Jump button and picker overlay
//
// Life Jump: lets the player skip ahead to a chosen phase + age. Visible as a small
// fixed bottom-right button that opens a phase/age picker overlay. Overlay contains
// 5 phase buttons, numeric age input, optional team field, and Apply/Cancel.
// No UI framework dependencies; inline CSS only.
// Overlay is dismissible by Escape key or Cancel button.

import type { DevJumpParams } from './dev_jump.js';

//============================================
// UI state

let isOverlayOpen = false;
let onApply: ((params: DevJumpParams) => void) | null = null;

//============================================
// createOverlayElement: build the DOM overlay

function createOverlayElement(): HTMLElement {
	const overlay = document.createElement('div');
	overlay.id = 'life-jump-overlay';
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	`;

	const modal = document.createElement('div');
	modal.style.cssText = `
		background-color: #f0f0f0;
		border: 2px solid #333;
		border-radius: 8px;
		padding: 20px;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		font-family: Arial, sans-serif;
	`;

	// Title
	const title = document.createElement('h2');
	title.textContent = 'Life Jump';
	title.style.cssText = `
		margin: 0 0 15px 0;
		font-size: 18px;
		color: #333;
	`;
	modal.appendChild(title);

	// Phase buttons
	const phaseLabel = document.createElement('label');
	phaseLabel.textContent = 'Phase:';
	phaseLabel.style.cssText = `
		display: block;
		font-weight: bold;
		margin-bottom: 8px;
		color: #333;
	`;
	modal.appendChild(phaseLabel);

	const phaseButtonsContainer = document.createElement('div');
	phaseButtonsContainer.style.cssText = `
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 15px;
	`;

	const phases: Array<DevJumpParams['phase']> = [
		'childhood',
		'high_school',
		'college',
		'nfl',
		'legacy',
	];
	let selectedPhase: DevJumpParams['phase'] = 'nfl';

	phases.forEach((phase) => {
		const btn = document.createElement('button');
		btn.textContent = phase.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		btn.style.cssText = `
			padding: 8px 12px;
			font-size: 12px;
			border: 1px solid #999;
			background-color: #fff;
			color: #333;
			cursor: pointer;
			border-radius: 4px;
			transition: all 0.2s;
		`;
		btn.addEventListener('click', () => {
			document.querySelectorAll('#life-jump-overlay button[data-phase]').forEach((b) => {
				(b as HTMLButtonElement).style.backgroundColor = '#fff';
				(b as HTMLButtonElement).style.color = '#333';
			});
			selectedPhase = phase;
			btn.style.backgroundColor = '#007bff';
			btn.style.color = '#fff';
		});
		btn.setAttribute('data-phase', phase);
		phaseButtonsContainer.appendChild(btn);
	});

	// Set default phase to NFL (selected)
	const nflBtn = phaseButtonsContainer.querySelector('button[data-phase="nfl"]');
	if (nflBtn) {
		(nflBtn as HTMLButtonElement).style.backgroundColor = '#007bff';
		(nflBtn as HTMLButtonElement).style.color = '#fff';
	}

	modal.appendChild(phaseButtonsContainer);

	// Age input
	const ageLabel = document.createElement('label');
	ageLabel.textContent = 'Age:';
	ageLabel.style.cssText = `
		display: block;
		font-weight: bold;
		margin-bottom: 5px;
		color: #333;
	`;
	modal.appendChild(ageLabel);

	const ageInput = document.createElement('input');
	ageInput.type = 'number';
	ageInput.value = '24';
	ageInput.min = '0';
	ageInput.max = '50';
	ageInput.style.cssText = `
		width: 100%;
		padding: 8px;
		font-size: 14px;
		border: 1px solid #999;
		border-radius: 4px;
		box-sizing: border-box;
		margin-bottom: 15px;
	`;
	modal.appendChild(ageInput);

	// Team input
	const teamLabel = document.createElement('label');
	teamLabel.textContent = 'Team (optional, NFL only):';
	teamLabel.style.cssText = `
		display: block;
		font-weight: bold;
		margin-bottom: 5px;
		color: #333;
	`;
	modal.appendChild(teamLabel);

	const teamInput = document.createElement('input');
	teamInput.type = 'text';
	teamInput.placeholder = 'e.g., KC';
	teamInput.style.cssText = `
		width: 100%;
		padding: 8px;
		font-size: 14px;
		border: 1px solid #999;
		border-radius: 4px;
		box-sizing: border-box;
		margin-bottom: 15px;
	`;
	modal.appendChild(teamInput);

	// Button container
	const buttonContainer = document.createElement('div');
	buttonContainer.style.cssText = `
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	`;

	// Apply button
	const applyBtn = document.createElement('button');
	applyBtn.textContent = 'Apply';
	applyBtn.style.cssText = `
		padding: 8px 16px;
		font-size: 14px;
		border: 1px solid #007bff;
		background-color: #007bff;
		color: #fff;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s;
	`;
	applyBtn.addEventListener('click', () => {
		const age = parseInt(ageInput.value, 10);
		if (isNaN(age) || age < 0) {
			alert('Please enter a valid age');
			return;
		}
		const params: DevJumpParams = {
			phase: selectedPhase,
			age,
		};
		if (teamInput.value.trim()) {
			params.team = teamInput.value.trim().toUpperCase();
		}
		closeOverlay();
		if (onApply) {
			onApply(params);
		}
	});
	buttonContainer.appendChild(applyBtn);

	// Cancel button
	const cancelBtn = document.createElement('button');
	cancelBtn.textContent = 'Cancel';
	cancelBtn.style.cssText = `
		padding: 8px 16px;
		font-size: 14px;
		border: 1px solid #999;
		background-color: #fff;
		color: #333;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s;
	`;
	cancelBtn.addEventListener('click', () => {
		closeOverlay();
	});
	buttonContainer.appendChild(cancelBtn);

	modal.appendChild(buttonContainer);
	overlay.appendChild(modal);

	// Escape key closes overlay
	overlay.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			closeOverlay();
		}
	});

	// Clicking outside modal closes overlay
	overlay.addEventListener('click', (event: MouseEvent) => {
		if (event.target === overlay) {
			closeOverlay();
		}
	});

	return overlay;
}

//============================================
// closeOverlay: remove overlay from DOM

function closeOverlay(): void {
	const overlay = document.getElementById('life-jump-overlay');
	if (overlay) {
		overlay.remove();
	}
	isOverlayOpen = false;
}

//============================================
// openOverlay: add overlay to DOM and focus

function openOverlay(): void {
	if (isOverlayOpen) return;

	isOverlayOpen = true;
	const overlay = createOverlayElement();
	document.body.appendChild(overlay);

	// Focus the age input for convenience
	const ageInput = overlay.querySelector('input[type="number"]') as HTMLInputElement;
	if (ageInput) {
		ageInput.focus();
		ageInput.select();
	}
}

//============================================
// initDevJumpButton: append fixed-position trigger button

export function initDevJumpButton(
	_host: unknown,
	onApplyCallback: (params: DevJumpParams) => void
): void {
	onApply = onApplyCallback;

	// Create small fixed-position trigger button in bottom-right corner
	const btn = document.createElement('button');
	btn.id = 'life-jump-trigger';
	btn.textContent = 'Life Jump';
	btn.style.cssText =
		'position: fixed; bottom: 8px; right: 8px; z-index: 9999; padding: 4px 8px; font-size: 11px; background: #333; color: #ccc; border: 1px solid #555; border-radius: 3px; cursor: pointer; opacity: 0.6;';

	// Hover effect: full opacity on enter, dim on leave
	btn.addEventListener('mouseenter', () => {
		btn.style.opacity = '1.0';
	});
	btn.addEventListener('mouseleave', () => {
		btn.style.opacity = '0.6';
	});

	// Click opens the overlay
	btn.addEventListener('click', () => {
		openOverlay();
	});

	document.body.appendChild(btn);
}
