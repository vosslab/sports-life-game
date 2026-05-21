// tabs.ts - College tabs registration

import type { PluginHost, TabRegistration } from '../plugin_host.js';
import type { GameContext } from '../../core/game_context.js';

//============================================
export function registerCollegeTabs(host: PluginHost): void {
	const tabs: TabRegistration[] = [
		{
			tabId: 'col_life',
			label: 'Life',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_life');
			},
		},
		{
			tabId: 'col_stats',
			label: 'Stats',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_stats');
			},
		},
		{
			tabId: 'col_activities',
			label: 'Activities',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_activities');
			},
		},
		{
			tabId: 'col_team',
			label: 'Team',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_team');
			},
		},
		{
			tabId: 'col_career',
			label: 'Career',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_career');
			},
		},
		{
			tabId: 'col_social',
			label: 'Social',
			availableInPhase: (phase) => phase === 'college',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for col_social');
			},
		},
	];

	for (const tab of tabs) {
		host.ui.registerTab(tab);
	}
}
