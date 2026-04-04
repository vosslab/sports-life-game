# Portrait system

Modular SVG headshot generator for player and NPC portraits. Produces
cartoon-style face portraits from composable parts extracted from the
Avataaars library (MIT license).

## Quick start

```typescript
import { generatePortraitSVG, randomAvatarConfig } from './avatar.js';

// Generate a deterministic portrait from a seed string
const config = randomAvatarConfig('Coach Williams', { archetype: 'coach', age: 55 });
const svg = generatePortraitSVG(config);

// Insert into the DOM
document.getElementById('portrait').innerHTML = svg;
```

The same seed + archetype + age band always produces the same portrait.

## API

### `randomAvatarConfig(seed, opts?)`

Generate a deterministic `AvatarConfig` from a seed string.

```typescript
randomAvatarConfig(
  seed: string,
  opts?: { archetype?: Archetype; age?: number }
): AvatarConfig
```

| Parameter | Default | Description |
| --- | --- | --- |
| `seed` | (required) | Any string. Same seed = same base identity. |
| `opts.archetype` | `'generic'` | Character role. Controls expression, hair, and accessory weights. |
| `opts.age` | `30` | Character age. Controls hair color, facial hair, and style filtering. |

### `generatePortraitSVG(config)`

Render an `AvatarConfig` into a complete SVG string.

```typescript
generatePortraitSVG(config: AvatarConfig): string
```

Returns a self-contained `<svg viewBox="0 0 280 280">` string. Safe to insert
via `innerHTML`. Each call generates a unique SVG ID prefix (`av1_`, `av2_`, ...)
so multiple portraits can coexist on the same page without ID collisions.

## Archetypes

| Archetype | Expression bias | Hair bias | Glasses | Facial hair mod |
| --- | --- | --- | --- | --- |
| `player` | confident, friendly | athletic | 5% | -10% |
| `rival` | intense, confident | distinctive | 5% | +0% |
| `coach` | stern, neutral | conservative | 30% | +15% |
| `recruiter` | friendly, neutral | conservative | 35% | +0% |
| `scout` | friendly, neutral | conservative | 40% | +0% |
| `generic` | uniform | full range | 15% | +0% |

Recruiter and scout intentionally share the same profile except glasses chance.

## Age bands

| Band | Age range | Facial hair | Gray hair | Hair styles |
| --- | --- | --- | --- | --- |
| teen | under 22 | 0% | never | youth-coded |
| young adult | 22-35 | 35% base | never | full range |
| middle aged | 36-50 | 65% base | 25% chance | youth styles suppressed |
| senior | 50+ | 80% base | 60% chance | conservative dominant |

All characters are male-biased (American football context). Facial hair base
rates are higher than a general-population generator.

## Two-seed identity system

The generator uses two PRNG streams to separate stable identity from
age/role-dependent presentation:

- **Identity seed** = `hash(seed)` -- picks skin tone, face shape, hair family,
  nose, base expression tendency, and base hair color. These stay the same
  regardless of archetype or age.
- **Variation seed** = `hash(seed + archetype + ageBand)` -- picks exact hair
  style within the family, expression feature swaps, facial hair, accessories,
  and gray hair override.

This means the same seed at age 16 and age 60 shares skin tone, face, and
base hair color but differs in hair style, facial hair, expression details,
and potentially gray hair.

## AvatarConfig

The config object stores keys into the parts registry. All fields except
`facialHair`, `accessory`, and `facialHairColor` are required.

```typescript
interface AvatarConfig {
  skinTone: string;         // key into SKIN_TONES (7 options)
  hairColor: string;        // key into HAIR_COLORS (10 options)
  facialHairColor?: string; // defaults to hairColor if omitted
  faceShape: string;        // key into FACE_SHAPES (1 option currently)
  hair: string;             // key into HAIR_STYLES (10 options)
  eyes: string;             // key into EYES (6 options)
  eyebrows: string;         // key into EYEBROWS (5 options)
  nose: string;             // key into NOSES (1 option currently)
  mouth: string;            // key into MOUTHS (5 options)
  facialHair?: string;      // key into FACIAL_HAIR (2 options)
  accessory?: string;       // key into ACCESSORIES (3 options, glasses)
}
```

You can construct an `AvatarConfig` manually instead of using
`randomAvatarConfig()` if you need full control.

## Expression presets

The generator picks a coherent expression (eyes + eyebrows + mouth) as a set,
then optionally varies individual features within compatible subpools.

| Preset | Eyes | Eyebrows | Mouth |
| --- | --- | --- | --- |
| neutral | default | default | default |
| confident | default | defaultNatural | smile |
| stern | squint | flatNatural | serious |
| friendly | happy | defaultNatural | smile |
| intense | squint | raisedExcited | serious |

Each preset has compatible alternates so swapped features still look coherent
(e.g., stern eyes can vary to default but not to happy).

## Rendering details

Portraits render at `viewBox="0 0 280 280"` using the native Avataaars
coordinate system. Layers are assembled back to front:

1. Face shape (skin-toned, includes body silhouette)
2. NFL jersey collar (shoulder pads, crew neck cutout)
3. Eyes
4. Eyebrows
5. Nose
6. Mouth
7. Facial hair (optional)
8. Hair
9. Accessories/glasses (optional)

The jersey collar color is derived deterministically from the config and drawn
from a 5-color neutral palette (navy, charcoal, maroon, forest, gray).

## Files

| File | Purpose |
| --- | --- |
| [src/avatar.ts](../src/avatar.ts) | Generator and renderer |
| [src/data/avatar_parts.ts](../src/data/avatar_parts.ts) | Extracted SVG part strings |
| [tools/extract_avataaars.py](../tools/extract_avataaars.py) | Part extraction script |
| [avatar_test.html](../avatar_test.html) | Standalone test page |

## Test page

Open `avatar_test.html` via a local HTTP server (ES modules require one):

```bash
python3 -m http.server 8080
# then open http://localhost:8080/avatar_test.html
```

The test page provides:
- Randomize grid with archetype and age controls
- Seed repeatability check (same seed twice = identical portraits)
- Archetype comparison (same seed across all 6 roles)
- Age progression (same seed from age 16 to 60)

## Regenerating parts

If you update the AvataaarsJs source or change the allowlists:

```bash
python3 tools/extract_avataaars.py tools/avataaars_source/avataaars.js
npm run build
```

The extraction script reads the JS source, applies curated allowlists (skipping
parts like dizzy eyes or vomit mouth), replaces color variables with
placeholders (`SKIN_PLACEHOLDER`, `HAIR_PLACEHOLDER`), and writes
`src/data/avatar_parts.ts`.

## Game integration (not yet implemented)

When ready to integrate into the game:

1. Add `avatarConfig: AvatarConfig` to the `Player` interface in `player.ts`
2. Generate config during `createPlayer()` using `randomAvatarConfig()`
3. Add to save/load serialization in `save.ts`
4. Render portraits in the UI for player profile, NPC event cards, and feed
5. Generate NPC portraits with seeded generation (rival name as seed, etc.)

## Art credits

SVG parts adapted from [Avataaars](https://avataaars.com/) by Pablo Stanley,
licensed under MIT. Original React implementation by Fang-Pen Lin. Parts
extracted from the vanilla JS port
[AvataaarsJs](https://github.com/HB0N0/AvataaarsJs).
