// fetch_mock.ts - Mock fetch for tests that load JSON fixtures from disk
//
// Intercepts fetch() calls for HS activities and events JSON files,
// reading the actual JSON from disk instead of making HTTP requests.
// Used in Node.js test environment where fetch does not resolve URLs
// to filesystem paths.
//
// Usage:
//   import { setupFetchMock } from './fixtures/fetch_mock.js';
//   setupFetchMock();

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// Get repo root dynamically
function getRepoRoot(): string {
	const here = url.fileURLToPath(import.meta.url);
	return path.resolve(path.dirname(here), '../..');
}

// Map of URL to disk path
const FIXTURE_URLS: Record<string, string> = {
	'/src/plugins/childhood/activities.json': 'src/plugins/childhood/activities.json',
	'/src/plugins/childhood/events/childhood.json': 'src/plugins/childhood/events/childhood.json',
	'/src/plugins/high_school/activities.json': 'src/plugins/high_school/activities.json',
	'/src/plugins/high_school/events/high_school.json': 'src/plugins/high_school/events/high_school.json',
	'/src/plugins/high_school/packs/example_pack.json': 'src/plugins/high_school/packs/example_pack.json',
	'/src/plugins/college/activities.json': 'src/plugins/college/activities.json',
	'/src/plugins/college/events/college.json': 'src/plugins/college/events/college.json',
	'/src/plugins/nfl/activities.json': 'src/plugins/nfl/activities.json',
	'/src/plugins/nfl/events/nfl.json': 'src/plugins/nfl/events/nfl.json',
};

//============================================
export function setupFetchMock(): void {
	const originalFetch = globalThis.fetch;
	const repoRoot = getRepoRoot();

	globalThis.fetch = (async (url: string | URL) => {
		const urlString = typeof url === 'string' ? url : url.toString();

		const fixturePath = FIXTURE_URLS[urlString];
		if (!fixturePath) {
			throw new Error(`unexpected test fetch: ${urlString}`);
		}

		const diskPath = path.join(repoRoot, fixturePath);
		const body = fs.readFileSync(diskPath, 'utf-8');

		return new Response(body, { status: 200 });
	}) as typeof fetch;
}

// Optional: restore original fetch (most tests do not need this)
export function restoreFetch(): void {
	// Note: we do not preserve the original because globalThis.fetch
	// is set up fresh at Node startup. Only use this if other tests
	// depend on the original.
}
