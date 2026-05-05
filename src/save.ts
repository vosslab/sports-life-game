// save.ts - re-export shim. Canonical implementation now lives in src/save/.
//
// All callers can keep importing from './save.js'; new code should import
// from './save/index.js' (or a deeper module like './save/validate.js')
// directly. This shim will be removed once the codebase has been swept.

export { saveGame, loadGame, deleteSave, hasSave } from './save/index.js';
