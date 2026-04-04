# Portrait generator v2: archetypes and weighted generation

## Context

The SVG portrait rendering pipeline works well. Silhouettes read cleanly, parts
layer correctly, and the headshot-only scope is right for this game. The problem
is generation quality: `randomAvatarConfig()` picks from all categories with flat
uniform weights, producing portraits that feel arbitrary, age-inconsistent, and
visually repetitive. Faces look naked because the collar is skin-toned.

This spec redesigns the generator around archetypes, expression presets, age bands,
rarity tiers, and compatibility rules. Only `src/avatar.ts` changes. The
`AvatarConfig` interface and `generatePortraitSVG()` function are unchanged.

## Scope

- Rework `randomAvatarConfig()` in `src/avatar.ts`
- Add supporting types and data tables in `src/avatar.ts`
- Replace skin-toned neck rect with a colored shirt collar in `generatePortraitSVG()`
- Update `avatar_test.html` with archetype and age controls
- No new files. No changes to existing game files.

## Updated API

```typescript
type Archetype = 'player' | 'rival' | 'coach' | 'recruiter' | 'scout' | 'generic';

randomAvatarConfig(seed: string, opts?: {
  archetype?: Archetype;
  age?: number;
}): AvatarConfig
```

- `archetype` defaults to `'generic'` if omitted
- `age` defaults to adult (30) if omitted
- All weighted choices are resolved through the seeded PRNG, so the same seed
  and opts always produce the same result

## Expression presets

Eyes, eyebrows, and mouth are chosen as a coherent set instead of independently.

| Preset | Eyes | Eyebrows | Mouth |
| --- | --- | --- | --- |
| neutral | default | default | default |
| confident | default | defaultNatural | smile |
| stern | squint | flatNatural | serious |
| friendly | happy | defaultNatural | smile |
| intense | squint | raisedExcited | serious |

These are intended default mappings, subject to visual tuning after test-page
review. If any preset references a part key that does not exist in the extracted
library, fall back to the neutral preset.

## Archetype weight tables

Each archetype defines weighted probabilities for expression presets, hair style
bias, facial hair probability, glasses probability, and hair color weights.

### player

Age-sensitive -- a 15-year-old player and a 29-year-old player should not come
from the same weights. The player archetype combines with age bands to produce
significantly different results across teen, college, and NFL ages.

- Expressions: confident (40%), neutral (30%), friendly (20%), intense (10%)
- Hair: full range, athletic styles slightly favored
- Facial hair: governed by age band (see below)
- Glasses: 5% (athletes rarely wear glasses)
- Hair color: full palette minus gray (gray only if age 36+)

### rival

- Expressions: intense (40%), confident (30%), stern (20%), neutral (10%)
- Hair: full range, distinctive styles slightly favored
- Facial hair: moderate, governed by age band
- Glasses: 5%
- Hair color: allows slightly more flair (uncommon colors boosted to 30%)

### coach

- Expressions: stern (40%), neutral (30%), confident (20%), friendly (10%)
- Hair: conservative styles strongly favored (shortFlat, shortWaved, shortCurly)
- Facial hair: common (50% base, boosted by age)
- Glasses: 30%
- Hair color: heavily conservative (common 80%, uncommon 15%, rare 5%).
  No pink. Gray boosted for age 40+.

### recruiter and scout

Internally map to the same adult-professional weight table. Both names remain
in the type for caller clarity.

- Expressions: friendly (35%), neutral (35%), confident (25%), stern (5%)
- Hair: conservative styles favored
- Facial hair: moderate, governed by age band
- Glasses: 35%
- Hair color: conservative. No pink. Gray boosted for age 45+.

### generic

- Expressions: uniform across all presets
- Hair: full range, uniform
- Facial hair: governed by age band only
- Glasses: 15%
- Hair color: full palette with standard rarity tiers

## Age bands

| Band | Age range | Facial hair | Gray/white hair | Youth styles | Conservative styles |
| --- | --- | --- | --- | --- | --- |
| teen | under 22 | 0% | 0% | boosted | normal |
| young adult | 22-35 | 20% base | 0% | normal | normal |
| middle aged | 36-50 | 45% base | 15% chance | suppressed | boosted |
| senior | 50+ | 55% base | 60% chance | strongly suppressed | strongly boosted |

Facial hair base probability is further modified by archetype (e.g., coach adds
+15%, player subtracts -10%).

Age bands interact with archetype: a teen player gets almost no facial hair and
youth-coded hair, while a senior coach gets gray hair, facial hair, and stern
expressions.

## Hair color rarity tiers

| Tier | Colors | Base weight |
| --- | --- | --- |
| common | black, brown, brownDark, blonde, auburn | 70% |
| uncommon | blondeGolden, red, platinum | 25% |
| rare | pastelPink, silverGray | 5% |

Archetype and age modify these weights:
- Coach/recruiter/scout: common 80%, uncommon 15%, rare 5%. Pink excluded.
- Rival: common 60%, uncommon 30%, rare 10%.
- Gray/white (silverGray): weight boosted by age band for 36+. Excluded for under 36.
- Pink (pastelPink): only allowed for generic archetype.

## Compatibility rules

Hard rules applied after all picks are made:

- Gray/white hair only for age 36+ (unless archetype explicitly overrides)
- Pink hair only for generic archetype
- Sunglasses excluded when raisedExcited eyebrows are picked (visual clip)
- If an accessory is removed by compatibility cleanup, do not reroll. Just omit it.
- If an expression preset references a missing part key, fall back to neutral preset.

## Colored shirt collar

Replace the current skin-toned `<rect>` in `generatePortraitSVG()` with a simple
crew-neck shirt silhouette in a dark neutral color.

Shirt color palette (5 colors):

```
navy: '#1B2A4A'
charcoal: '#36454F'
maroon: '#5C1A1B'
forest: '#2D4A2D'
gray: '#6B7B8D'
```

The generator picks a shirt color from this palette using the seeded PRNG. The
shirt color is not stored in `AvatarConfig` -- it is derived deterministically
from the seed, same as all other picks.

The collar shape should be a simple V-neck or crew-neck silhouette that reads as
clothing, not skin. A few SVG paths forming a shoulder+neckline shape, filled with
the chosen color.

## Generator flow

1. Resolve seed, archetype (default: generic), and age (default: 30)
2. Resolve age band from age
3. Pick expression preset from archetype-weighted table using seeded PRNG
4. Resolve expression to eyes + eyebrows + mouth keys (fallback to neutral if missing)
5. Pick hair style from archetype + age filtered pool
6. Pick skin tone uniformly
7. Pick hair color from age + rarity + archetype filtered pool
8. Pick facial hair from age + archetype probability
9. Pick accessory from archetype probability
10. Pick shirt color from neutral palette
11. Apply compatibility cleanup and fallback defaults
12. Return AvatarConfig

## Test page updates

Add to `avatar_test.html`:

- Archetype dropdown (player, rival, coach, recruiter, scout, generic)
- Age number input
- Fixed seed text input

So you can inspect:
- Same seed, different archetype
- Same seed, different age
- Same archetype, many seeds

The grid should regenerate when any control changes.

## Verification

- Same seed + same opts always produces the same portrait
- Coach portraits look distinctly older/sterner than teen player portraits
- Rival portraits have stronger expressions than generic NPCs
- No portraits look naked (shirt collar visible on all)
- Pink hair never appears on coaches/recruiters/scouts
- Gray hair never appears on characters under 36
- Expression presets produce coherent face combinations
- TypeScript compiles with `npm run build`
