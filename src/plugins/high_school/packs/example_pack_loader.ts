// example_pack_loader.ts - Load example DataPack from JSON
//
// The example pack is a self-contained DataPack instance with embedded
// events, activities, and lifecycle hooks. Imported at bundle time by
// esbuild (resolveJsonModule), so the data is available synchronously.

import type { DataPack } from '../../plugin_host.js';
import packData from './example_pack.json';

// Cast through unknown: inferred JSON literal types are too narrow for DataPack.
const examplePack = packData as unknown as DataPack;

// Synchronous getter; data is resolved at import time
export function loadExamplePack(): DataPack {
	return examplePack;
}
