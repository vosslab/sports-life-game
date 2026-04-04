# Modular SVG portrait system

## Context

The sports-life-game is a text-only football career simulator with stat bars and
narrative text. There is no visual character representation. Adding modular SVG
portrait headshots gives the player and key NPCs (rivals, coaches, recruiters) a
visual identity -- portraits for player profile, feed events, and key NPC cards.

The system is built as a standalone module first, with no changes to existing game
code. Integration happens in a later phase by a frontend designer.

Scope is headshots only: face, hair, and a simple collar/neck base. No full body,
no arms, no poses, no detailed clothing system.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Art source | Avataaars (MIT) adapted | Professional parts, proven compatibility, replaceable over time |
| Extraction | AvataaarsJs vanilla repo | Single JS file with all SVG paths, no React dependency |
| Extraction tooling | Python script | Automates parsing AvataaarsJs into TypeScript module |
| Part storage | TypeScript module (`src/data/avatar_parts.ts`) | No async loading, works with existing `tsc` build |
| Data model | `AvatarConfig` type (standalone for now) | Will move onto `Player` interface during integration phase |
| Scope | Headshots only, player + key NPCs | Portraits for player profile, feed events, and key NPC cards |
| Integration | Standalone first, integrate later | Zero changes to existing game files in phase 1 |
| Coordinate system | `viewBox="0 0 280 280"` | Native Avataaars coordinates, no rescaling needed |

## Architecture

### New files (phase 1 only)

```
src/avatar.ts              -- portrait generation and rendering logic
src/data/avatar_parts.ts   -- extracted SVG path strings by category
tools/extract_avataaars.py -- Python script to extract parts from AvataaarsJs
avatar_test.html           -- standalone test page to preview portraits
```

No existing files are modified.

### AvatarConfig type

```typescript
export interface AvatarConfig {
  skinTone: string;         // key into skin tone palette
  hairColor: string;        // key into hair color palette
  facialHairColor?: string; // defaults to hairColor if omitted
  faceShape: string;        // base face geometry key
  hair: string;             // hair style key
  eyes: string;             // eye expression key
  eyebrows: string;         // eyebrow style key
  nose: string;             // nose key
  mouth: string;            // mouth expression key
  facialHair?: string;      // optional facial hair key
  accessory?: string;       // optional glasses/accessory key
}
```

No clothing fields. A simple neck/collar base is drawn by the renderer as a
static element, not a configurable part.

### Public API

```typescript
// Build a complete SVG string from a config
generatePortraitSVG(config: AvatarConfig): string

// Generate a deterministic config from a seed string (for NPCs)
// age affects facial hair probability (younger NPCs less likely)
randomAvatarConfig(seed: string, opts?: { age?: number }): AvatarConfig
```

Optional future addition (not in phase 1):

```typescript
// Render a portrait into a DOM element
renderPortrait(el: HTMLElement, config: AvatarConfig): void
```

### Part categories and starter counts

Curated from the full Avataaars library. Only headshot-relevant parts, filtering
out anything that does not fit a sports game context.

| Category | Starter count | Source |
| --- | --- | --- |
| Skin tones | 7 | Avataaars skin palette |
| Hair colors | 10 | Avataaars hair palette |
| Base face variants | 1-3 (if source supports clean variation) | Avataaars face/head base |
| Hair styles | 6-10 curated | Avataaars top/hair |
| Eyes | 6 curated | Avataaars eyes (skip dizzy, cry, hearts) |
| Eyebrows | 5 curated | Avataaars eyebrows |
| Noses | 1 (Avataaars default) | Avataaars nose |
| Mouths | 5 curated | Avataaars mouth (skip vomit, scream) |
| Facial hair | 2-4 | Avataaars facial hair |
| Accessories | 2-3 | Avataaars accessories (glasses) |

Total: ~40-50 curated parts. Enough for high combinatorial variety with headshots.

### Render pipeline

SVG assembly order (back to front layering):

1. Collar/neck base (static, skin-toned)
2. Face shape (skin-toned)
3. Ears (if separate from face)
4. Eyes
5. Eyebrows
6. Nose
7. Mouth
8. Facial hair (optional)
9. Hair (on top of face)
10. Accessories/glasses (optional)

The `generatePortraitSVG(config: AvatarConfig): string` function:

- Looks up each part key in the parts registry
- Applies color fills via string replacement (skin tone, hair color)
- If `facialHairColor` is omitted, uses `hairColor` as default
- Concatenates SVG groups in layer order
- Wraps in `<svg viewBox="0 0 280 280">` container
- Returns a complete SVG string
- Each rendered portrait gets a unique per-render prefix, and any internal SVG
  IDs are rewritten with that prefix during assembly to avoid collisions when
  multiple portraits render on the same page

### Deterministic NPC generation

`randomAvatarConfig(seed: string, opts?: { age?: number }): AvatarConfig` uses a
seeded PRNG:

- Hash the seed string (e.g., "Coach Williams" or "rival_marcus_jones") to a number
- Use that number to deterministically pick parts from each category
- Same seed + same opts always produces the same face
- Optional `age` parameter affects weighted selection:
  - Age < 20: no facial hair
  - Age 20-30: low facial hair probability
  - Age > 30: normal facial hair probability
  - If age is omitted, treat as adult (normal probability)
- No other complex rules in phase 1

### Fallback behavior

- If a part key is missing from the registry, use a safe default for that category
- If a category has no parts at all, use a built-in default asset
- Generation must never emit invalid SVG because one part is absent
- Every required field in `AvatarConfig` has a corresponding default part
- Optional fields (`facialHair`, `accessory`, `facialHairColor`) are simply
  omitted from the SVG when not set

### Compatibility rules

- Accessories (glasses) may clip with some hair or eyebrow combinations
- The generator may omit accessories if a generated combination clips badly
- In phase 1, keep this simple: no complex constraint system, just allow the
  implementer to skip accessories for known-bad combinations
- Custom parts added later should be tested against the existing part set
  using the test page grid view

### Color system

Colors are applied by replacing placeholder fill values in the SVG path strings:

- `SKIN_PLACEHOLDER` replaced with actual skin hex color
- `HAIR_PLACEHOLDER` replaced with actual hair hex color

Skin tone palette (7 values from Avataaars):

```
#FFDBB4, #EDB98A, #D08B5B, #AE5D29, #614335, #FD9841, #F8D25C
```

Hair color palette (10 values):

```
#A55728, #2C1B18, #B58143, #D6B370, #724133, #4A312C, #C93305,
#E8E1E1, #ECDCBF, #F59797
```

### Python extraction script

`tools/extract_avataaars.py`:

1. Accepts a file path argument: `python3 tools/extract_avataaars.py /path/to/avataaars.js`
2. Falls back to `./avataaars.js` in the current directory if no argument given
3. Parses the SVG path data for each part category
4. Applies a curated allowlist (skip unwanted parts like dizzy eyes, vomit mouth)
5. Replaces hardcoded fill colors with placeholder tokens for recoloring
6. Writes `src/data/avatar_parts.ts` with typed exports

The script is run once (or re-run when updating parts). It is a development tool,
not a runtime dependency. It does not require `source_me.sh` -- plain `python3` is
sufficient since it has no pip dependencies beyond the standard library.

### Test page

`avatar_test.html`:

- Standalone HTML page, not part of the game
- Imports compiled `dist/avatar.js` and `dist/data/avatar_parts.js`
- Shows a grid of randomly generated headshot portraits
- Has a "randomize" button to generate new faces
- Has dropdowns to manually pick parts (part picker/editor)
- Entering the same seed twice produces the same portrait (repeatability check)
- Useful for validating part compatibility and color combinations

## Intended UI usage (phase 2, for frontend designer)

These are not built in phase 1, but inform the system design:

- Small circular portrait in player header (48-64px)
- Larger portrait on profile screen (~128px)
- Talking head portrait next to event cards in the story feed
- NPC portraits on rival/coach/recruiter event cards
- Not every event needs a portrait -- only recurring/key NPC events

## Integration plan (phase 2, not in scope now)

When the portrait system is validated:

1. Add `avatarConfig: AvatarConfig` to `Player` interface in `player.ts`
2. Generate avatar config during `createPlayer()` in `player.ts`
3. Add `avatarConfig` to save/load serialization in `save.ts`
4. Frontend designer places portrait rendering in UI
5. Generate NPC portraits for rivals, coaches, and recruiters using seeded generation

## Verification

- `avatar_test.html` opens in browser and shows generated portraits
- Randomize button produces visually distinct faces
- Same seed string always produces the same face
- Parts layer correctly (no z-order glitches)
- Skin tone and hair color fill correctly across all parts
- TypeScript compiles with `npm run build` (no type errors)
- Python extraction script runs with `python3 tools/extract_avataaars.py /path/to/avataaars.js`
- Multiple portraits can render on the same page without SVG ID collisions
