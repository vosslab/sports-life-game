# Roadmap

Planned work, priorities, and what is intentionally not started.

## Current version (v1)

Complete career arc from birth to legacy is playable:
- Childhood (0-9), youth football (10-13)
- High school (14-17) with weekly loop, events, playoffs
- College (18-21) with weekly loop
- NFL (22-35+) with season-by-season events
- Retirement and legacy

## Near-term priorities

### Phase 1: Realism and immersion
- Real NCAA conferences and schedules (FBS/FCS CSV data)
- Conference standings visible after each week
- Full season schedule view
- Team-based color theming (implemented, needs wiring)
- Better status bar per career level
- Coach personality affects stat growth rates

### Phase 2: Academic system
- GPA tracking (0.0-4.0)
- Academic eligibility checks
- Junior college path for low GPA
- Classroom events affecting football career

### Phase 3: Relationship and social
- Relationship tracking (parents, coach, rivals, teammates)
- Relationship events and consequences
- Social media moments
- Driver's license milestone

### Phase 4: NFL depth
- NFL weekly loop (upgrade from season-by-season)
- Real contract negotiations with dollar amounts
- Free agency system
- Pro Bowl and Super Bowl simulation
- Hall of Fame tracking with realistic criteria

### Phase 5: Build pipeline (deferred until M6/M7 complete)

Long-term build model is `tsc` for safety + `esbuild` for shipping. Current
repo uses `tsc` multi-file emit only; `export_single_file.sh` is intentionally
absent until this phase lands.

```
source code in src/
        |
        | 1. tsc --noEmit checks types
        v
type-safe project
        |
        | 2. esbuild bundles browser entry
        v
dist/main.js (self-contained)
```

| Tool    | Role                                  |
| ------- | ------------------------------------- |
| tsc     | Typechecking and correctness          |
| esbuild | Fast browser bundling and deployment  |

Sequence (do not start until M6/M7 are done):

1. Keep `src/`.
2. Add `tsc --noEmit` as the typecheck step (replace emit-mode `tsc`).
3. Add `esbuild` for bundled output (`src/main.ts` -> `dist/main.js`).
4. Make `dist/` self-contained (copy `index.html`, inline or copy CSS,
   `dist/.nojekyll`).
5. Add `export_single_file.sh` (portable single-HTML build to `dist-single/`).
6. Update GitHub Pages docs and scripts (`build_github_pages.sh`,
   `run_web_server.sh`) to serve `dist/` instead of repo root.

## Intentionally not started

- Multiplayer or online features
- Graphics or sprite-based visuals
- Sound effects or music
- App store packaging (staying as web app)
- Multiple sport support (football only for now)
