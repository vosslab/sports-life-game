// nfl/tabs.ts - NFL phase tabs registration

import type { PluginHost, TabRegistration } from '../plugin_host.js';
import type { GameContext } from '../../core/game_context.js';

//============================================
export function registerNflTabs(host: PluginHost): void {
	const tabs: TabRegistration[] = [
		{
			tabId: 'nfl_life',
			label: 'Life',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_life');
			},
		},
		{
			tabId: 'nfl_stats',
			label: 'Stats',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_stats');
			},
		},
		{
			tabId: 'nfl_activities',
			label: 'Activities',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_activities');
			},
		},
		{
			tabId: 'nfl_team',
			label: 'Team',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_team');
			},
		},
		{
			tabId: 'nfl_career',
			label: 'Career',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_career');
			},
		},
		{
			tabId: 'nfl_social',
			label: 'Social',
			availableInPhase: (phase) => phase === 'nfl',
			render: (ctx: GameContext) => {
				throw new Error('tab render not yet implemented for nfl_social');
			},
		},
	];

	for (const tab of tabs) {
		host.ui.registerTab(tab);
	}
}
