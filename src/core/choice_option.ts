// choice_option.ts - shared interactive choice contract.
//
// Lives in core because both the simulation tree (year handlers, weekly
// engine) and the UI/render layer must agree on the shape of a player
// choice. The simulation produces choices; the UI binds them to buttons.
// Keeping this type out of `src/ui/` keeps the simulation tree free of any
// UI-module imports.

export interface ChoiceOption {
	text: string;
	description?: string;
	primary?: boolean;
	action: () => void;
}
