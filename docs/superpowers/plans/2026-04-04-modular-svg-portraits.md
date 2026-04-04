# Modular SVG portrait system implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone modular SVG headshot portrait system that generates combinatorial face portraits from Avataaars-extracted parts, with deterministic NPC generation from seed strings.

**Architecture:** Python extraction script parses AvataaarsJs into a TypeScript parts module. A TypeScript avatar module assembles SVG portraits from those parts using layered composition with color replacement. A standalone test HTML page validates the system before any game integration.

**Tech Stack:** TypeScript (ES2020, tsc), Python 3.12 (extraction script), Avataaars SVG parts (MIT), vanilla browser JS (test page)

**Spec:** [docs/superpowers/specs/2026-04-04-modular-svg-avatar-design.md](../specs/2026-04-04-modular-svg-avatar-design.md)

---

## File structure

| File | Purpose |
| --- | --- |
| Create: `tools/extract_avataaars.py` | Python script to parse AvataaarsJs and output TypeScript parts module |
| Create: `src/data/avatar_parts.ts` | Generated TypeScript module with SVG path strings by category |
| Create: `src/avatar.ts` | Portrait generation: `AvatarConfig` type, `generatePortraitSVG()`, `randomAvatarConfig()` |
| Create: `avatar_test.html` | Standalone browser test page for previewing generated portraits |

No existing files are modified.

---

### Task 1: Download AvataaarsJs source

**Files:**
- Download: `tools/avataaars_source/avataaars.js` (from GitHub, not committed)

- [ ] **Step 1: Create tools directory and download source**

```bash
mkdir -p tools/avataaars_source
curl -o tools/avataaars_source/avataaars.js https://raw.githubusercontent.com/HB0N0/AvataaarsJs/main/avataaars.js
```

- [ ] **Step 2: Add tools/avataaars_source/ to .gitignore**

Append to `.gitignore` (create if needed):

```
tools/avataaars_source/
```

This is a source dependency for extraction, not a runtime file.

- [ ] **Step 3: Verify the download**

Check the file exists and contains expected structure:

```bash
wc -l tools/avataaars_source/avataaars.js
```

Expected: a file with content (several hundred lines). Grep for known structures:

```bash
grep -c "eyes" tools/avataaars_source/avataaars.js
```

Expected: multiple matches.

---

### Task 2: Write the Python extraction script

**Files:**
- Create: `tools/extract_avataaars.py`

The script reads the AvataaarsJs file, extracts SVG path data for each category,
applies a curated allowlist, replaces hardcoded fill colors with placeholder tokens,
and writes `src/data/avatar_parts.ts`.

**Important context for the implementer:**

The AvataaarsJs file (`avataaars.js`) organizes parts as JavaScript functions that
return SVG strings. The structure is:

```javascript
paths: {
  eyes: {
    default: () => `<path d="..." fill="#000" fill-opacity=".6"/>`,
    happy: () => `<path d="..." fill="#000" fill-opacity=".6"/>`,
    // ...
  },
  mouth: { /* similar */ },
  top: {
    bigHair: (hatColor, hairColor) => `<path d="..." fill="${hairColor}"/>`,
    // ...
  },
  // ...
}
```

Key details:
- Parts are arrow functions returning template literal SVG strings
- `top` (hair) functions take `(hatColor, hairColor)` parameters
- `skin` section has color hex values: `{ tanned: '#FD9841', pale: '#FFDBB4', ... }`
- `hair` colors section: `{ auburn: '#A55728', black: '#2C1B18', ... }`
- Assembly positions from `_createAvataaar()`:
  - Skin/face: `translate(40, 36)`
  - Mouth: `translate(86, 134)`
  - Nose: `translate(112, 122)`
  - Eyes: `translate(84, 90)`
  - Eyebrows: `translate(84, 82)`
  - Facial hair: `translate(56, 72)`
  - Accessories: `translate(69, 85)`
  - Clothing: `translate(8, 170)` (we only use a minimal collar stub)
- ViewBox: `0 0 280 280`

The extraction approach: use regex to find each category's entries in the JS source,
extract the SVG template literal content, and replace color variables with placeholder
tokens.

**Curated allowlists:**

```python
ALLOWED_EYES = ['default', 'happy', 'squint', 'surprised', 'side', 'wink']
ALLOWED_EYEBROWS = ['default', 'defaultNatural', 'flatNatural', 'raisedExcited', 'unibrowNatural']
ALLOWED_MOUTHS = ['default', 'smile', 'serious', 'twinkle', 'sad']
ALLOWED_HAIR = ['bigHair', 'bob', 'bun', 'curly', 'dreads01', 'frizzle', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortWaved']
ALLOWED_FACIAL_HAIR = ['beardLight', 'beardMedium', 'moustacheFancy']
ALLOWED_ACCESSORIES = ['prescription01', 'prescription02', 'sunglasses']
```

- [ ] **Step 1: Write the extraction script**

Create `tools/extract_avataaars.py`. The script should:

1. Accept an optional file path argument (default: `tools/avataaars_source/avataaars.js`)
2. Read the JS file
3. Parse out SVG path data for each category using regex
4. Filter to only allowed parts per the allowlists above
5. Extract the `translate(x, y)` positions for each category from the assembly function
6. Extract skin color and hair color palettes
7. Replace any hardcoded skin hex values in SVG paths with `SKIN_PLACEHOLDER`
8. Replace any hardcoded hair hex values in SVG paths with `HAIR_PLACEHOLDER`
9. Write `src/data/avatar_parts.ts` with the following structure:

```typescript
// Auto-generated by tools/extract_avataaars.py -- do not edit manually
// Source: AvataaarsJs (MIT license, Pablo Stanley & Fang-Pen Lin)

//============================================
// Skin tone palette
export const SKIN_TONES: Record<string, string> = {
	tanned: '#FD9841',
	yellow: '#F9D562',
	pale: '#FFDBB4',
	light: '#EDB98A',
	brown: '#D08B5B',
	darkBrown: '#AE5D29',
	black: '#614335',
};

//============================================
// Hair color palette
export const HAIR_COLORS: Record<string, string> = {
	auburn: '#A55728',
	black: '#2C1B18',
	blonde: '#B58143',
	blondeGolden: '#D6B370',
	brown: '#724133',
	brownDark: '#4A312C',
	red: '#C93305',
	silverGray: '#E8E1E1',
	platinum: '#ECDCBF',
	pastelPink: '#F59797',
};

//============================================
// Layer positions (translate x, y within viewBox 0 0 280 280)
export const LAYER_POSITIONS: Record<string, [number, number]> = {
	skin: [40, 36],
	clothing: [8, 170],
	mouth: [86, 134],
	nose: [112, 122],
	eyes: [84, 90],
	eyebrows: [84, 82],
	top: [0, 0],
	facialHair: [56, 72],
	accessories: [69, 85],
};

//============================================
// SVG part paths by category
// Each value is a raw SVG string (paths, groups) to be wrapped in a <g> with translate

export const FACE_SHAPES: Record<string, string> = {
	default: `<path d="..." fill="SKIN_PLACEHOLDER"/>`,
};

export const EYES: Record<string, string> = {
	default: `<path d="..." fill="#000" fill-opacity=".6"/>`,
	happy: `<path d="..." fill="#000" fill-opacity=".6"/>`,
	// ... curated set
};

export const EYEBROWS: Record<string, string> = {
	default: `<path d="..." fill="#000" fill-opacity=".6"/>`,
	// ... curated set
};

export const NOSES: Record<string, string> = {
	default: `<path d="..." fill="#000" fill-opacity=".16"/>`,
};

export const MOUTHS: Record<string, string> = {
	default: `<path d="..." fill="..."/>`,
	smile: `<path d="..." fill="..."/>`,
	// ... curated set
};

export const HAIR_STYLES: Record<string, string> = {
	bigHair: `<path d="..." fill="HAIR_PLACEHOLDER"/>`,
	bob: `<path d="..." fill="HAIR_PLACEHOLDER"/>`,
	// ... curated set
};

export const FACIAL_HAIR: Record<string, string> = {
	beardLight: `<path d="..." fill="HAIR_PLACEHOLDER"/>`,
	// ... curated set
};

export const ACCESSORIES: Record<string, string> = {
	prescription01: `<path d="..."/>`,
	// ... curated set
};
```

The script must handle:
- Template literals with `${hairColor}` replaced by `HAIR_PLACEHOLDER`
- Template literals with `${hatColor}` replaced by `HAT_PLACEHOLDER` (or ignored for headshots)
- Hardcoded skin hex values (from the skin palette) replaced with `SKIN_PLACEHOLDER`
- SVG strings that may span multiple lines
- Arrow function syntax: `name: (params) => \`...\`` or `name: () => \`...\``

Use tabs for indentation in the generated TypeScript to match project style.

- [ ] **Step 2: Run the extraction script**

```bash
python3 tools/extract_avataaars.py
```

Expected: `src/data/avatar_parts.ts` is created with populated part data.

- [ ] **Step 3: Verify the generated file compiles**

```bash
npx tsc --noEmit src/data/avatar_parts.ts
```

Expected: no type errors. If there are errors, fix the extraction script and re-run.

- [ ] **Step 4: Spot-check the output**

Read `src/data/avatar_parts.ts` and verify:
- `SKIN_TONES` has 7 entries
- `HAIR_COLORS` has 10 entries
- `EYES` has 6 entries (the allowed set)
- `MOUTHS` has 5 entries
- `HAIR_STYLES` has at least 6 entries
- SVG paths contain `SKIN_PLACEHOLDER` and `HAIR_PLACEHOLDER` where colors should be
- No raw `${hairColor}` or `${hatColor}` template variables remain

- [ ] **Step 5: Commit**

```bash
git add tools/extract_avataaars.py src/data/avatar_parts.ts .gitignore
git commit -m "feat: add avatar extraction script and generated parts module"
```

---

### Task 3: Write the avatar TypeScript module

**Files:**
- Create: `src/avatar.ts`

This module exports the `AvatarConfig` interface, `generatePortraitSVG()`, and
`randomAvatarConfig()`. It imports from `src/data/avatar_parts.ts`.

- [ ] **Step 1: Create src/avatar.ts with the AvatarConfig type and seeded PRNG**

```typescript
// avatar.ts - modular SVG portrait headshot generator
// Assembles face portraits from extracted Avataaars parts

import {
	SKIN_TONES, HAIR_COLORS, LAYER_POSITIONS,
	FACE_SHAPES, EYES, EYEBROWS, NOSES, MOUTHS,
	HAIR_STYLES, FACIAL_HAIR, ACCESSORIES,
} from './data/avatar_parts.js';

//============================================
// Portrait configuration -- each field is a key into the corresponding parts registry
export interface AvatarConfig {
	skinTone: string;
	hairColor: string;
	facialHairColor?: string;
	faceShape: string;
	hair: string;
	eyes: string;
	eyebrows: string;
	nose: string;
	mouth: string;
	facialHair?: string;
	accessory?: string;
}

//============================================
// Simple seeded PRNG (mulberry32)
// Deterministic random from a 32-bit seed
function mulberry32(seed: number): () => number {
	return function(): number {
		seed |= 0;
		seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

//============================================
// Hash a string to a 32-bit integer for seeding
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0;
	}
	return hash;
}

//============================================
// Pick a random key from a Record using a seeded random function
function pickKey(record: Record<string, string>, rand: () => number): string {
	const keys = Object.keys(record);
	const index = Math.floor(rand() * keys.length);
	return keys[index];
}

//============================================
// Get a safe default key for a category (first key in the record)
function defaultKey(record: Record<string, string>): string {
	const keys = Object.keys(record);
	if (keys.length === 0) {
		return 'default';
	}
	return keys[0];
}
```

- [ ] **Step 2: Add the generatePortraitSVG function**

Append to `src/avatar.ts`:

```typescript
//============================================
// Monotonically increasing counter for unique SVG ID prefixes
let renderCounter = 0;

//============================================
// Rewrite internal SVG IDs with a unique prefix to avoid collisions
// when multiple portraits render on the same page
function prefixIds(svg: string, prefix: string): string {
	// Replace id="..." and url(#...) and href="#..." references
	let result = svg;
	// Find all id="value" occurrences and rewrite them
	const idPattern = /id="([^"]+)"/g;
	const ids: string[] = [];
	let match = idPattern.exec(svg);
	while (match !== null) {
		ids.push(match[1]);
		match = idPattern.exec(svg);
	}
	// Replace each found ID and its references
	for (const id of ids) {
		const prefixed = prefix + id;
		result = result.replace(new RegExp(`id="${id}"`, 'g'), `id="${prefixed}"`);
		result = result.replace(new RegExp(`url\\(#${id}\\)`, 'g'), `url(#${prefixed})`);
		result = result.replace(new RegExp(`href="#${id}"`, 'g'), `href="#${prefixed}"`);
	}
	return result;
}

//============================================
// Apply color fills to an SVG part string
function applyColors(svg: string, skinColor: string, hairColor: string): string {
	let result = svg;
	result = result.replace(/SKIN_PLACEHOLDER/g, skinColor);
	result = result.replace(/HAIR_PLACEHOLDER/g, hairColor);
	return result;
}

//============================================
// Look up a part from a registry with fallback to default
function getPart(registry: Record<string, string>, key: string): string {
	if (key in registry) {
		return registry[key];
	}
	// Fallback: use first available part
	const keys = Object.keys(registry);
	if (keys.length === 0) {
		return '';
	}
	return registry[keys[0]];
}

//============================================
// Wrap an SVG snippet in a positioned group
function wrapLayer(svg: string, category: string): string {
	if (!svg) {
		return '';
	}
	const pos = LAYER_POSITIONS[category];
	if (!pos) {
		return `<g>${svg}</g>`;
	}
	return `<g transform="translate(${pos[0]}, ${pos[1]})">${svg}</g>`;
}

//============================================
// Build a complete SVG portrait string from a config
export function generatePortraitSVG(config: AvatarConfig): string {
	renderCounter++;
	const prefix = `av${renderCounter}_`;

	// Resolve colors
	const skinColor = SKIN_TONES[config.skinTone] || SKIN_TONES[defaultKey(SKIN_TONES)];
	const hairColor = HAIR_COLORS[config.hairColor] || HAIR_COLORS[defaultKey(HAIR_COLORS)];
	const facialHairColor = config.facialHairColor
		? (HAIR_COLORS[config.facialHairColor] || hairColor)
		: hairColor;

	// Build layers back to front
	let layers = '';

	// Static collar/neck base (simple skin-toned shape)
	const collarSvg = `<rect x="80" y="232" width="120" height="48" rx="8" fill="${skinColor}"/>`;
	layers += `<g>${collarSvg}</g>`;

	// Face shape
	const faceSvg = applyColors(getPart(FACE_SHAPES, config.faceShape), skinColor, hairColor);
	layers += wrapLayer(faceSvg, 'skin');

	// Eyes
	const eyesSvg = getPart(EYES, config.eyes);
	layers += wrapLayer(eyesSvg, 'eyes');

	// Eyebrows
	const browsSvg = getPart(EYEBROWS, config.eyebrows);
	layers += wrapLayer(browsSvg, 'eyebrows');

	// Nose
	const noseSvg = getPart(NOSES, config.nose);
	layers += wrapLayer(noseSvg, 'nose');

	// Mouth
	const mouthSvg = getPart(MOUTHS, config.mouth);
	layers += wrapLayer(mouthSvg, 'mouth');

	// Facial hair (optional)
	if (config.facialHair) {
		let fhSvg = getPart(FACIAL_HAIR, config.facialHair);
		fhSvg = fhSvg.replace(/HAIR_PLACEHOLDER/g, facialHairColor);
		layers += wrapLayer(fhSvg, 'facialHair');
	}

	// Hair
	let hairSvg = applyColors(getPart(HAIR_STYLES, config.hair), skinColor, hairColor);
	layers += wrapLayer(hairSvg, 'top');

	// Accessories (optional)
	if (config.accessory) {
		const accSvg = getPart(ACCESSORIES, config.accessory);
		layers += wrapLayer(accSvg, 'accessories');
	}

	// Prefix all internal SVG IDs for collision safety
	layers = prefixIds(layers, prefix);

	// Wrap in SVG container
	const svg = `<svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">${layers}</svg>`;
	return svg;
}
```

- [ ] **Step 3: Add the randomAvatarConfig function**

Append to `src/avatar.ts`:

```typescript
//============================================
// Generate a deterministic avatar config from a seed string
// Same seed + same opts always produces the same portrait
export function randomAvatarConfig(seed: string, opts?: { age?: number }): AvatarConfig {
	const rand = mulberry32(hashString(seed));
	const age = opts?.age;

	// Determine facial hair based on age
	let facialHair: string | undefined = undefined;
	if (age === undefined || age > 30) {
		// Normal probability: ~40% chance of facial hair
		if (rand() < 0.4) {
			facialHair = pickKey(FACIAL_HAIR, rand);
		}
	} else if (age >= 20) {
		// Low probability: ~15% chance
		if (rand() < 0.15) {
			facialHair = pickKey(FACIAL_HAIR, rand);
		}
	}
	// Age < 20: no facial hair (skip)

	// Determine accessory (~20% chance)
	let accessory: string | undefined = undefined;
	if (rand() < 0.2) {
		accessory = pickKey(ACCESSORIES, rand);
	}

	const config: AvatarConfig = {
		skinTone: pickKey(SKIN_TONES, rand),
		hairColor: pickKey(HAIR_COLORS, rand),
		faceShape: pickKey(FACE_SHAPES, rand),
		hair: pickKey(HAIR_STYLES, rand),
		eyes: pickKey(EYES, rand),
		eyebrows: pickKey(EYEBROWS, rand),
		nose: pickKey(NOSES, rand),
		mouth: pickKey(MOUTHS, rand),
		facialHair: facialHair,
		accessory: accessory,
	};
	return config;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors. `dist/avatar.js` and `dist/data/avatar_parts.js` are generated.

- [ ] **Step 5: Commit**

```bash
git add src/avatar.ts
git commit -m "feat: add portrait generation module with seeded PRNG"
```

---

### Task 4: Write the test page

**Files:**
- Create: `avatar_test.html`

Standalone HTML page that imports the compiled avatar module and shows a grid of
generated portraits with controls.

- [ ] **Step 1: Create avatar_test.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portrait System Test</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    padding: 20px;
  }
  h1 { text-align: center; margin-bottom: 20px; font-size: 1.4em; }
  .controls {
    display: flex; gap: 10px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 20px;
  }
  .controls button {
    background: #16213e; color: #e0e0e0; border: 1px solid #444;
    padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9em;
  }
  .controls button:hover { background: #1a1a4e; }
  .controls input {
    background: #16213e; color: #e0e0e0; border: 1px solid #444;
    padding: 8px 12px; border-radius: 4px; font-size: 0.9em; width: 200px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px; max-width: 900px; margin: 0 auto;
  }
  .portrait-card {
    background: #16213e; border-radius: 8px; padding: 12px;
    text-align: center;
  }
  .portrait-card svg { width: 120px; height: 120px; }
  .portrait-card .label {
    font-size: 0.75em; color: #888; margin-top: 6px;
    word-break: break-all;
  }
  .seed-test {
    max-width: 900px; margin: 20px auto; padding: 16px;
    background: #16213e; border-radius: 8px;
  }
  .seed-test h2 { font-size: 1.1em; margin-bottom: 10px; }
  .seed-row { display: flex; gap: 20px; align-items: center; justify-content: center; }
  .seed-row .portrait-card { background: #1a1a2e; }
</style>
</head>
<body>

<h1>SVG Portrait System Test</h1>

<div class="controls">
  <button id="btn-randomize">Randomize All</button>
  <input type="text" id="seed-input" placeholder="Enter seed for repeatability">
  <button id="btn-seed">Generate from Seed</button>
</div>

<div class="seed-test" id="seed-test" style="display:none">
  <h2>Seed Repeatability Check</h2>
  <div class="seed-row" id="seed-row"></div>
</div>

<div class="grid" id="grid"></div>

<script type="module">
import { generatePortraitSVG, randomAvatarConfig } from './dist/avatar.js';

const grid = document.getElementById('grid');
const seedTest = document.getElementById('seed-test');
const seedRow = document.getElementById('seed-row');
const seedInput = document.getElementById('seed-input');

// Generate a grid of random portraits
function fillGrid(count) {
  grid.innerHTML = '';
  const seeds = [
    'Coach Williams', 'rival_marcus_jones', 'QB_Tom_age22',
    'recruiter_sarah', 'LB_Mike_age30', 'WR_James_age19',
    'coach_old_veteran', 'draft_scout_01', 'teammate_kyle',
    'rival_defense_captain', 'agent_smith', 'fan_favorite',
  ];
  for (let i = 0; i < count; i++) {
    const seed = (i < seeds.length) ? seeds[i] : 'random_' + i + '_' + Date.now();
    const age = 18 + Math.floor(Math.random() * 40);
    const config = randomAvatarConfig(seed, { age: age });
    const svg = generatePortraitSVG(config);
    const card = document.createElement('div');
    card.className = 'portrait-card';
    card.innerHTML = svg + '<div class="label">' + seed + ' (age ' + age + ')</div>';
    grid.appendChild(card);
  }
}

// Seed repeatability test: generate same seed twice, show side by side
function testSeed(seed) {
  seedTest.style.display = 'block';
  seedRow.innerHTML = '';
  // Generate twice with same seed
  for (let i = 0; i < 2; i++) {
    const config = randomAvatarConfig(seed, { age: 25 });
    const svg = generatePortraitSVG(config);
    const card = document.createElement('div');
    card.className = 'portrait-card';
    card.innerHTML = svg + '<div class="label">Render ' + (i + 1) + ': "' + seed + '"</div>';
    seedRow.appendChild(card);
  }
}

document.getElementById('btn-randomize').addEventListener('click', () => fillGrid(12));
document.getElementById('btn-seed').addEventListener('click', () => {
  const seed = seedInput.value.trim();
  if (seed) {
    testSeed(seed);
  }
});

// Initial render
fillGrid(12);
</script>

</body>
</html>
```

- [ ] **Step 2: Build and test in browser**

```bash
npm run build
```

Then open `avatar_test.html` in a browser (via a local HTTP server since it uses ES modules):

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/avatar_test.html` in browser.

Expected:
- Grid of 12 portrait headshots displays
- Each portrait shows face, hair, eyes, mouth, etc. layered correctly
- "Randomize All" button regenerates the grid
- Entering a seed and clicking "Generate from Seed" shows two identical portraits side by side

- [ ] **Step 3: Verify multiple-portrait SVG ID collisions**

With 12 portraits on the page, open browser dev tools and check:
- No console errors about duplicate SVG IDs
- Each portrait's internal IDs are prefixed uniquely (e.g., `av1_`, `av2_`, etc.)

- [ ] **Step 4: Commit**

```bash
git add avatar_test.html
git commit -m "feat: add portrait system test page with grid and seed check"
```

---

### Task 5: Validate and polish

**Files:**
- Modify: `src/avatar.ts` (if needed)
- Modify: `tools/extract_avataaars.py` (if needed)
- Modify: `src/data/avatar_parts.ts` (regenerated if script changes)

- [ ] **Step 1: Visual review of all part combinations**

Open `avatar_test.html` and click "Randomize All" at least 10 times. Check for:
- Parts layering correctly (hair on top of face, not behind)
- Skin tone fills applying to face and collar
- Hair color fills applying to hair and facial hair
- No blank/missing parts (fallback working)
- No SVG rendering errors in browser console
- Portraits look reasonable at small sizes (resize browser window)

- [ ] **Step 2: Fix any extraction or rendering issues**

If parts are misaligned, colors are wrong, or layers are in the wrong order:
1. Fix the extraction script or avatar module as needed
2. Re-run extraction: `python3 tools/extract_avataaars.py`
3. Rebuild: `npm run build`
4. Refresh browser and recheck

- [ ] **Step 3: TypeScript strict compile check**

```bash
npm run build
```

Expected: zero errors, zero warnings.

- [ ] **Step 4: Update docs/CHANGELOG.md**

Add entry under today's date:

```markdown
### Additions and New Features

- Added modular SVG portrait headshot system (`src/avatar.ts`)
  - `AvatarConfig` interface for portrait configuration (face shape, hair, eyes, etc.)
  - `generatePortraitSVG(config)` assembles layered SVG from parts with color replacement
  - `randomAvatarConfig(seed, opts)` generates deterministic portraits from seed strings
  - Per-render SVG ID prefixing prevents collisions when multiple portraits on same page
  - Fallback to default parts when a key is missing from the registry
- Added extracted Avataaars SVG parts in `src/data/avatar_parts.ts`
  - 7 skin tones, 10 hair colors, ~40-50 curated headshot parts
  - Python extraction script at `tools/extract_avataaars.py` for regenerating parts
- Added standalone test page `avatar_test.html` for previewing portraits
  - Grid view with 12 random portraits
  - Seed repeatability verification (same seed = same face)
  - Part picker for manual testing
```

- [ ] **Step 5: Commit**

```bash
git add src/avatar.ts tools/extract_avataaars.py src/data/avatar_parts.ts avatar_test.html docs/CHANGELOG.md
git commit -m "feat: complete modular SVG portrait system (standalone, no game integration)"
```

---

## Summary

| Task | What it produces | Dependencies |
| --- | --- | --- |
| 1 | AvataaarsJs source downloaded | None |
| 2 | Extraction script + generated parts module | Task 1 |
| 3 | Avatar TypeScript module (types, generator, PRNG) | Task 2 |
| 4 | Test HTML page | Task 3 |
| 5 | Validation, polish, changelog | Task 4 |

Total: 5 tasks, linear dependency chain. No existing game files are modified.
