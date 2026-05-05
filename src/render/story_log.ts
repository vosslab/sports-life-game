// Story log DOM helpers
// Module-level state for tracking collapsible story sections

let currentStorySection: HTMLElement | null = null;
let currentWeekSection: HTMLElement | null = null;
let currentWeekHeader: HTMLElement | null = null;

//============================================
// Story log helpers (thin DOM wrappers)

export function addStoryHeadline(text: string): void {
	const storyLog = document.getElementById('story-log');
	if (!storyLog) return;

	const isAgeHeadline = /^Age \d+/.test(text);
	const isWeekHeadline = /^Week \d+/.test(text);

	if (isAgeHeadline) {
		if (currentWeekSection && currentWeekHeader) {
			currentWeekSection.classList.add('collapsed');
			currentWeekHeader.classList.add('collapsed');
		}
		currentWeekSection = null;
		currentWeekHeader = null;

		const header = document.createElement('div');
		header.className = 'story-headline-toggle';
		const carrot = document.createElement('span');
		carrot.className = 'story-carrot';
		carrot.textContent = 'v ';
		header.appendChild(carrot);
		const label = document.createElement('span');
		label.className = 'story-headline';
		label.textContent = text;
		header.appendChild(label);
		storyLog.appendChild(header);

		const section = document.createElement('div');
		section.className = 'story-section';
		storyLog.appendChild(section);
		currentStorySection = section;

		header.addEventListener('click', () => {
			section.classList.toggle('collapsed');
			header.classList.toggle('collapsed');
		});
	} else if (isWeekHeadline && currentStorySection) {
		if (currentWeekSection && currentWeekHeader) {
			currentWeekSection.classList.add('collapsed');
			currentWeekHeader.classList.add('collapsed');
		}

		const header = document.createElement('div');
		header.className = 'story-headline-toggle';
		const carrot = document.createElement('span');
		carrot.className = 'story-carrot';
		carrot.textContent = 'v ';
		header.appendChild(carrot);
		const label = document.createElement('span');
		label.className = 'story-headline';
		label.textContent = text;
		header.appendChild(label);
		currentStorySection.appendChild(header);

		const section = document.createElement('div');
		section.className = 'story-section';
		currentStorySection.appendChild(section);
		currentWeekSection = section;
		currentWeekHeader = header;

		header.addEventListener('click', () => {
			section.classList.toggle('collapsed');
			header.classList.toggle('collapsed');
		});
	} else {
		const p = document.createElement('p');
		p.className = 'story-headline';
		p.textContent = text;
		const target = currentWeekSection || currentStorySection;
		if (target) {
			target.appendChild(p);
		} else {
			storyLog.appendChild(p);
		}
	}

	const panel = document.getElementById('story-panel');
	if (panel) {
		requestAnimationFrame(() => {
			panel.scrollTop = panel.scrollHeight;
		});
	}
}

export function addStoryText(text: string): void {
	const storyLog = document.getElementById('story-log');
	if (!storyLog) return;

	const p = document.createElement('p');
	p.textContent = text;
	const target = currentWeekSection || currentStorySection;
	if (target) {
		target.appendChild(p);
	} else {
		storyLog.appendChild(p);
	}

	const panel = document.getElementById('story-panel');
	if (panel) {
		requestAnimationFrame(() => {
			panel.scrollTop = panel.scrollHeight;
		});
	}
}

export function clearStory(): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog && storyLog.children.length > 0) {
		const divider = document.createElement('hr');
		divider.className = 'story-divider';
		storyLog.appendChild(divider);
		const panel = document.getElementById('story-panel');
		if (panel) {
			requestAnimationFrame(() => {
				panel.scrollTop = panel.scrollHeight;
			});
		}
	}
}

export function hardClearStory(): void {
	const storyLog = document.getElementById('story-log');
	if (storyLog) {
		storyLog.innerHTML = '';
	}
	currentStorySection = null;
	currentWeekSection = null;
	currentWeekHeader = null;
}
