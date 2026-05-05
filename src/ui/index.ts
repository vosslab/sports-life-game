// ui/index.ts - Barrel re-export of all ui widgets and popup functions
//
// This file allows existing code using `import * as ui from './ui.js'`
// or `import { fn } from './ui.js'` to work without changes after the
// split of ui.ts into focused widget modules.

// Re-export popup functions for backward compatibility
export {
	waitForInteraction,
	hideInteractionPopup,
	configureMainButtons,
	disableMainButtons,
	enableMainButtons,
	hideMainActionBar,
	showMainActionBar,
	initMainActionBar,
} from '../popup.js';

// Re-export choice options type and choice widget functions
export type { ChoiceOption } from './choice_widget.js';
export {
	showChoices,
	clearChoices,
	showWeeklyFocusChoices,
	showGameResult,
} from './choice_widget.js';

// Re-export header widget functions
export {
	updateHeader,
	updateLifeStatus,
} from './header_widget.js';

// Re-export stats widget functions
export {
	updateStatBar,
	updateAllStats,
	updateStatsTab,
	updateMiniStatStrip,
} from './stats_widget.js';

// Re-export story widget functions
export {
	clearStory,
	addHeadline,
	addText,
	addResult,
	addStatChange,
	showRecentChange,
} from './story_widget.js';

// Re-export team widget functions
export {
	updateTeamTab,
} from './team_widget.js';

// Re-export activities widget functions
export {
	renderActivitiesTab,
} from './activities_widget.js';

// Re-export career widget functions
export {
	updateCareerTab,
	updateSeasonCareer,
} from './career_widget.js';

// Re-export week card widget functions
export {
	updateWeekCard,
	hideWeekCard,
	updateThisWeekPanel,
} from './week_card_widget.js';

// Re-export sidebar widget functions
export {
	updateSidebar,
	showMilestoneCard,
} from './sidebar_widget.js';

// Re-export format helpers
export {
	formatStatKey,
	formatStatLine,
} from './format_helpers.js';
