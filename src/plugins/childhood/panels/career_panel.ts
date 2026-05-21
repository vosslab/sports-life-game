// career_panel.ts - Childhood career panel (minimal status only)
//
// Childhood has no team, no recruiting, no clutch moments.
// This panel is minimal and primarily shows life events and story progress.

import type { PanelRegistration } from '../../plugin_host.js';
import type { GameContext } from '../../../core/game_context.js';

//============================================
export const childhoodCareerPanel: PanelRegistration = {
	panelId: 'career_childhood',
	label: 'Life Events',
	availableInPhase: (phase) => phase === 'childhood',
	render: (_ctx: GameContext) => {
		// Childhood has no team, no recruiting, no clutch moments.
		// Story events are rendered in the main story log.
		// This panel is a no-op placeholder for consistency with other phases.
	},
};
