// dom_utils.ts - shared DOM element lookup helpers

//============================================
// Get DOM element by ID or throw error
export function getElement(id: string): HTMLElement {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`DOM element not found: ${id}`);
	}
	return el;
}

//============================================
// Optional element lookup - returns null if not found
export function findElement(id: string): HTMLElement | null {
	return document.getElementById(id);
}
