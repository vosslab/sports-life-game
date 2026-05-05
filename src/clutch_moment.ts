// clutch_moment.ts - re-export shim for the modular `src/clutch/` engine.
//
// As of M4 the legacy 1,958-line clutch_moment.ts has been decomposed into
// focused modules under `src/clutch/`. This shim keeps the existing
// `from '../clutch_moment.js'` import in `src/weekly/weekly_engine.ts`
// working without rewriting the import. New code should import from
// `src/clutch/index.js` directly.

export type {
	ClutchGameContext,
	ClutchRisk,
	ClutchChoice,
	MomentumTag,
	ClutchSituation,
	ClutchResult,
	ClutchMoment,
} from './clutch/index.js';
export { buildClutchMoment, resolveClutchMoment } from './clutch/index.js';
