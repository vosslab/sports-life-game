// story_widget.ts - Story log and narrative display
//
// Exports functions to manage the story log: clear, add headlines, text,
// results, stat changes, and track recent changes in the sidebar.

import { getElement, findElement } from '../dom_utils.js';

//============================================
// Clear story log
export function clearStory(): void {
	const storyLog = getElement('story-log');
	storyLog.innerHTML = '';
}

//============================================
// Add headline to story log
export function addHeadline(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-headline';
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

//============================================
// Add regular text to story log
export function addText(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.textContent = text;
	storyLog.appendChild(p);
	autoScroll();
}

//============================================
// Add result text with blue left border
export function addResult(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-result';
	p.textContent = text;
	// Append into current collapsible section if one exists
	const sections = storyLog.querySelectorAll('.story-section');
	const lastSection = sections.length > 0 ? sections[sections.length - 1] : null;
	if (lastSection && !lastSection.classList.contains('collapsed')) {
		lastSection.appendChild(p);
	} else {
		storyLog.appendChild(p);
	}
	autoScroll();
}

//============================================
// Add stat change text (italic, small)
export function addStatChange(text: string): void {
	const storyLog = getElement('story-log');
	const p = document.createElement('p');
	p.className = 'story-stat-change';
	p.textContent = text;
	// Append into current collapsible section if one exists
	const sections = storyLog.querySelectorAll('.story-section');
	const lastSection = sections.length > 0 ? sections[sections.length - 1] : null;
	if (lastSection && !lastSection.classList.contains('collapsed')) {
		lastSection.appendChild(p);
	} else {
		storyLog.appendChild(p);
	}
	autoScroll();
}

//============================================
// Show recent stat change text in sidebar
export function showRecentChange(text: string): void {
	const el = document.getElementById('sidebar-recent-change');
	if (!el) {
		return;
	}
	if (text) {
		el.textContent = text;
		el.classList.remove('hidden');
	} else {
		el.classList.add('hidden');
	}
}

//============================================
// Auto-scroll story log to bottom
function autoScroll(): void {
	const storyPanel = getElement('story-panel');
	storyPanel.scrollTop = storyPanel.scrollHeight;
}
