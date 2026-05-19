# Disconnected Features Archive

This directory contains code that was implemented but never wired into the live engine. Each file represents a designed feature with working code that awaits integration.

## Reactivation

To restore a feature to the active codebase, use `git mv` to move the file back to its original location in `src/`:

```bash
git mv archive/disconnected_features/<path> src/<path>
```

Then restore any necessary imports and integration points that reference the feature.

## Directory structure

Files are organized here to mirror their original `src/` structure:

- `scout_report.ts` - NFL draft scout reports for college players
- `render/render_state.ts` - Pull-model render layer over GameViewState
- `simulator/engine/clock.ts` - Game clock runoffs, quarter transitions, and time tracking
- `simulator/engine/clutch_checkpoint.ts` - Bridge between game engine and clutch moment system
- `simulator/season/rankings.ts` - Weekly rankings data and computation
- `simulator/season/sim_non_player_games.ts` - Non-player game simulator using play-by-play engine
- `simulator/season/weekly_narrative.ts` - Weekly narrative generator for league-wide events

See `docs/TODO.md` and `docs/ROADMAP.md` for reactivation candidates and planned work.
