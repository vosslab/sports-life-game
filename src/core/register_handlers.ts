// register_handlers.ts - register all year-band handlers at app boot
//
// Call registerAllHandlers() once at app init before any year advancement.

import { registerHandler } from './year_registry.js';

// Childhood handlers
import { kidYearsHandler } from '../childhood/kid_years.js';
import { peeweeHandler } from '../childhood/peewee_years.js';
import { travelHandler } from '../childhood/travel_years.js';

// High school handlers
import { hsFroshSophHandler } from '../high_school/hs_frosh_soph.js';
import { hsVarsityHandler } from '../high_school/hs_varsity.js';

// College handlers
import { collegeEntryHandler } from '../college/college_entry.js';
import { collegeCoreHandler } from '../college/college_core.js';
import { collegeSeniorHandler } from '../college/college_senior.js';

// NFL handlers
import { nflRookieHandler } from '../nfl_handlers/nfl_rookie.js';
import { nflEarlyHandler } from '../nfl_handlers/nfl_early.js';
import { nflPeakHandler } from '../nfl_handlers/nfl_peak.js';
import { nflVeteranHandler } from '../nfl_handlers/nfl_veteran.js';
import { nflLateHandler } from '../nfl_handlers/nfl_late.js';

//============================================
export function registerAllHandlers(): void {
	// Ages 1-7: childhood (no football)
	registerHandler(kidYearsHandler);

	// Ages 8-10: peewee football
	registerHandler(peeweeHandler);

	// Ages 11-13: travel team
	registerHandler(travelHandler);

	// Ages 14-15: frosh/soph high school
	registerHandler(hsFroshSophHandler);

	// Ages 16-17: varsity high school
	registerHandler(hsVarsityHandler);

	// Ages 18: college freshman/redshirt
	registerHandler(collegeEntryHandler);

	// Ages 19-20: college sophomore/junior
	registerHandler(collegeCoreHandler);

	// Age 21: college senior
	registerHandler(collegeSeniorHandler);

	// Age 22: NFL rookie
	registerHandler(nflRookieHandler);

	// Ages 23-26: NFL early years
	registerHandler(nflEarlyHandler);

	// Ages 27-31: NFL peak years
	registerHandler(nflPeakHandler);

	// Ages 32-36: NFL veteran years
	registerHandler(nflVeteranHandler);

	// Ages 37-39: NFL twilight
	registerHandler(nflLateHandler);
}
