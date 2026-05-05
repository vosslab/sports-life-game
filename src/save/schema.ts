// schema.ts - save schema version constants for sports-life-game.
//
// The current refactor intentionally drops all pre-v1 saves. Loaders must
// accept only CURRENT_SCHEMA_VERSION and reset everything else. No migrators
// are implemented; long-term compatibility begins at v1.

//============================================
// The schema version this build writes and the only version it accepts on
// load. Bump only when a new migrator is also added in src/save/.
export const CURRENT_SCHEMA_VERSION: number = 1;

//============================================
// localStorage key. Centralized here so the loader, writer, and reset path
// stay in sync.
export const SAVE_KEY: string = 'gridiron_life_save';

//============================================
// Wire-shape stored in localStorage. The payload itself is the live Player
// object; schemaVersion is added at write time and validated on load.
export interface SaveEnvelope {
	schemaVersion: number;
	[key: string]: unknown;
}
