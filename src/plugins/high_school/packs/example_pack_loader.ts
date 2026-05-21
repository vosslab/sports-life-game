// example_pack_loader.ts - Load example DataPack from JSON
//
// The example pack is a self-contained DataPack instance with embedded
// events, activities, and lifecycle hooks.
// Loaded at bootstrap time so register() can use it synchronously.

import type { DataPack } from '../../plugin_host.js';

let loadedPack: DataPack | null = null;

export async function fetchExamplePack(): Promise<DataPack> {
	const url = '/src/plugins/high_school/packs/example_pack.json';
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to load example pack from ${url}: ${response.status}`);
	}
	const pack = (await response.json()) as DataPack;
	return pack;
}

// Synchronous getter; pack is pre-loaded at plugin init time
export function loadExamplePack(): DataPack {
	if (!loadedPack) {
		throw new Error(
			'Example pack not yet loaded. Call preloadExamplePack() during bootstrap.'
		);
	}
	return loadedPack;
}

// Called during async bootstrap to pre-load the example pack
export async function preloadExamplePack(): Promise<void> {
	loadedPack = await fetchExamplePack();
}
