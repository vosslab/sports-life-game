// avatar.ts - modular SVG portrait headshot generator
// Assembles face portraits from extracted Avataaars parts
// v3: two-seed identity/presentation streams, compatible expression subpools,
//     aggressive age filtering, distinct archetype pools

import {
	SKIN_TONES, HAIR_COLORS,
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
// Archetype determines weighted generation for different character roles
export type Archetype = 'player' | 'rival' | 'coach' | 'recruiter' | 'scout' | 'generic';

//============================================
// Expression presets: coherent eye + eyebrow + mouth combinations
type ExpressionPreset = 'neutral' | 'confident' | 'stern' | 'friendly' | 'intense';

const EXPRESSION_PRESETS: Record<ExpressionPreset, { eyes: string; eyebrows: string; mouth: string }> = {
	neutral:   { eyes: 'default',   eyebrows: 'default',        mouth: 'default' },
	confident: { eyes: 'default',   eyebrows: 'defaultNatural', mouth: 'smile' },
	stern:     { eyes: 'squint',    eyebrows: 'flatNatural',    mouth: 'serious' },
	friendly:  { eyes: 'happy',     eyebrows: 'defaultNatural', mouth: 'smile' },
	intense:   { eyes: 'squint',    eyebrows: 'raisedExcited',  mouth: 'serious' },
};

//============================================
// Compatible alternates per expression preset
// When varying a feature, only pick from these subpools to maintain coherence
const EXPRESSION_COMPATIBLE: Record<ExpressionPreset, {
	eyes: string[];
	eyebrows: string[];
	mouth: string[];
}> = {
	neutral:   { eyes: ['default', 'side'],              eyebrows: ['default', 'defaultNatural'],       mouth: ['default', 'twinkle'] },
	confident: { eyes: ['default', 'side', 'wink'],      eyebrows: ['defaultNatural', 'default'],       mouth: ['smile', 'twinkle'] },
	stern:     { eyes: ['squint', 'default'],             eyebrows: ['flatNatural', 'default'],          mouth: ['serious', 'default'] },
	friendly:  { eyes: ['happy', 'default', 'wink'],      eyebrows: ['defaultNatural', 'default'],       mouth: ['smile', 'twinkle'] },
	intense:   { eyes: ['squint', 'surprised'],            eyebrows: ['raisedExcited', 'unibrowNatural'], mouth: ['serious', 'sad'] },
};

//============================================
// Weighted entry for probability-based selection
type WeightedEntry<T> = { value: T; weight: number };

//============================================
// Archetype expression weight tables
const ARCHETYPE_EXPRESSIONS: Record<Archetype, WeightedEntry<ExpressionPreset>[]> = {
	player: [
		{ value: 'confident', weight: 45 },
		{ value: 'friendly',  weight: 25 },
		{ value: 'neutral',   weight: 20 },
		{ value: 'intense',   weight: 10 },
	],
	rival: [
		{ value: 'intense',   weight: 50 },
		{ value: 'confident', weight: 25 },
		{ value: 'stern',     weight: 15 },
		{ value: 'neutral',   weight: 10 },
	],
	coach: [
		{ value: 'stern',     weight: 50 },
		{ value: 'neutral',   weight: 30 },
		{ value: 'confident', weight: 20 },
	],
	recruiter: [
		{ value: 'friendly',  weight: 35 },
		{ value: 'neutral',   weight: 35 },
		{ value: 'confident', weight: 25 },
		{ value: 'stern',     weight: 5 },
	],
	// Scout: same as recruiter (intentionally shared adult-professional profile)
	scout: [
		{ value: 'friendly',  weight: 35 },
		{ value: 'neutral',   weight: 35 },
		{ value: 'confident', weight: 25 },
		{ value: 'stern',     weight: 5 },
	],
	generic: [
		{ value: 'neutral',   weight: 20 },
		{ value: 'confident', weight: 20 },
		{ value: 'stern',     weight: 20 },
		{ value: 'friendly',  weight: 20 },
		{ value: 'intense',   weight: 20 },
	],
};

//============================================
// Hair style pool categories -- reduced overlap between pools
// Hair pools biased toward male-presenting styles (American football context)
// bob and bun excluded from most pools as they read feminine
const CONSERVATIVE_HAIR = ['shortFlat', 'shortWaved'];
const ATHLETIC_HAIR = ['shortCurly', 'frizzle', 'dreads01', 'shortFlat'];
const DISTINCTIVE_HAIR = ['bigHair', 'curly', 'shaggyMullet', 'dreads01', 'frizzle'];
const YOUTH_HAIR = ['frizzle', 'dreads01', 'curly', 'shaggyMullet', 'shortCurly'];
// Adult-safe: masculine-leaning styles across age range
const ADULT_SAFE_HAIR = ['shortFlat', 'shortWaved', 'shortCurly', 'frizzle', 'dreads01'];

// Hair family names for identity-stable pool selection
type HairFamily = 'conservative' | 'athletic' | 'distinctive' | 'youth' | 'adult_safe';

const HAIR_FAMILY_POOLS: Record<HairFamily, string[]> = {
	conservative: CONSERVATIVE_HAIR,
	athletic: ATHLETIC_HAIR,
	distinctive: DISTINCTIVE_HAIR,
	youth: YOUTH_HAIR,
	adult_safe: ADULT_SAFE_HAIR,
};

//============================================
// Archetype hair family weights
// Identity seed picks the family; variation seed picks the exact style
const ARCHETYPE_HAIR_FAMILIES: Record<Archetype, WeightedEntry<HairFamily>[]> = {
	player: [
		{ value: 'athletic',    weight: 50 },
		{ value: 'adult_safe',  weight: 30 },
		{ value: 'distinctive', weight: 20 },
	],
	rival: [
		{ value: 'distinctive', weight: 40 },
		{ value: 'adult_safe',  weight: 35 },
		{ value: 'athletic',    weight: 25 },
	],
	coach: [
		{ value: 'conservative', weight: 70 },
		{ value: 'adult_safe',   weight: 30 },
	],
	recruiter: [
		{ value: 'conservative', weight: 60 },
		{ value: 'adult_safe',   weight: 40 },
	],
	scout: [
		{ value: 'conservative', weight: 60 },
		{ value: 'adult_safe',   weight: 40 },
	],
	generic: [
		{ value: 'adult_safe',   weight: 40 },
		{ value: 'distinctive',  weight: 30 },
		{ value: 'athletic',     weight: 30 },
	],
};

//============================================
// Hair color rarity tiers
const COMMON_HAIR_COLORS = ['black', 'brown', 'brownDark', 'blonde', 'auburn'];
const UNCOMMON_HAIR_COLORS = ['blondeGolden', 'red', 'platinum'];

//============================================
// Archetype glasses probability
const ARCHETYPE_GLASSES_CHANCE: Record<Archetype, number> = {
	player: 0.05,
	rival: 0.05,
	coach: 0.30,
	recruiter: 0.35,
	scout: 0.40, // slightly higher than recruiter for differentiation
	generic: 0.15,
};

//============================================
// Shirt color palette for the collar/neckline
const SHIRT_COLORS = ['#1B2A4A', '#36454F', '#5C1A1B', '#2D4A2D', '#6B7B8D'];

//============================================
// Global counter for unique SVG ID prefixes
let SVG_ID_COUNTER = 0;

//============================================
// Seeded PRNG using mulberry32 algorithm
function mulberry32(seed: number): () => number {
	return function (): number {
		seed |= 0;
		seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

//============================================
// Hash a string to a 32-bit integer using DJB2
function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}

//============================================
// Pick from a weighted entries array using seeded RNG
// Weights are renormalized internally so they don't need to sum to any specific total
function pickWeighted<T>(entries: WeightedEntry<T>[], rand: () => number): T {
	let totalWeight = 0;
	for (const entry of entries) {
		totalWeight += entry.weight;
	}
	let roll = rand() * totalWeight;
	for (const entry of entries) {
		roll -= entry.weight;
		if (roll <= 0) {
			return entry.value;
		}
	}
	return entries[entries.length - 1].value;
}

//============================================
// Pick a random element from a string array using seeded RNG
function pickFromArray(arr: string[], rand: () => number): string {
	const idx = Math.floor(rand() * arr.length);
	return arr[idx];
}

//============================================
// Pick a random key from a Record using seeded RNG
function pickKey(record: Record<string, string>, rand: () => number): string {
	const keys = Object.keys(record);
	const idx = Math.floor(rand() * keys.length);
	return keys[idx];
}

//============================================
// Get the first key from a Record (fallback/default)
function defaultKey(record: Record<string, string>): string {
	return Object.keys(record)[0];
}

//============================================
// Look up part from registry with fallback to first key
function getPart(registry: Record<string, string>, key: string): string {
	if (key in registry) {
		return registry[key];
	}
	return registry[defaultKey(registry)];
}

//============================================
// Get skin tone hex from SKIN_TONES
function getSkinColor(skinTone: string): string {
	if (skinTone in SKIN_TONES) {
		return SKIN_TONES[skinTone];
	}
	return SKIN_TONES[defaultKey(SKIN_TONES)];
}

//============================================
// Get hair color hex from HAIR_COLORS
function getHairColor(hairColor: string): string {
	if (hairColor in HAIR_COLORS) {
		return HAIR_COLORS[hairColor];
	}
	return HAIR_COLORS[defaultKey(HAIR_COLORS)];
}

//============================================
// Replace all placeholder colors with actual hex values
function applyColors(svg: string, skinColor: string, hairColor: string): string {
	let result = svg;
	result = result.replace(/SKIN_PLACEHOLDER/g, skinColor);
	result = result.replace(/HAIR_PLACEHOLDER/g, hairColor);
	return result;
}

//============================================
// Prefix all IDs, url() references, and href="#..." in SVG
function prefixIds(svg: string, prefix: string): string {
	let result = svg;
	result = result.replace(/id="([^"]*)"/g, (_match: string, id: string) => {
		return `id="${prefix}_${id}"`;
	});
	result = result.replace(/url\(#([^)]*)\)/g, (_match: string, id: string) => {
		return `url(#${prefix}_${id})`;
	});
	result = result.replace(/href="#([^"]*)"/g, (_match: string, id: string) => {
		return `href="#${prefix}_${id}"`;
	});
	return result;
}

//============================================
// Wrap SVG content in a positioned group
function wrapLayer(svg: string, x: number, y: number): string {
	return `<g transform="translate(${x}, ${y})">${svg}</g>`;
}

//============================================
// Generate a portrait SVG from AvatarConfig
export function generatePortraitSVG(config: AvatarConfig): string {
	SVG_ID_COUNTER++;
	const idPrefix = `av${SVG_ID_COUNTER}`;

	const skinColor = getSkinColor(config.skinTone);
	const hairColor = getHairColor(config.hairColor);
	const facialHairColor = getHairColor(config.facialHairColor || config.hairColor);

	// Derive shirt color deterministically from stable identity fields
	const shirtIdx = (hashString(config.skinTone + config.hair) % SHIRT_COLORS.length);
	const shirtColor = SHIRT_COLORS[shirtIdx];

	// Fetch SVG parts
	const faceSvg = getPart(FACE_SHAPES, config.faceShape);
	const eyesSvg = getPart(EYES, config.eyes);
	const eyebrowsSvg = getPart(EYEBROWS, config.eyebrows);
	const noseSvg = getPart(NOSES, config.nose);
	const mouthSvg = getPart(MOUTHS, config.mouth);
	const hairSvg = getPart(HAIR_STYLES, config.hair);
	const facialHairSvg = config.facialHair ? getPart(FACIAL_HAIR, config.facialHair) : null;
	const accessorySvg = config.accessory ? getPart(ACCESSORIES, config.accessory) : null;

	// Apply colors
	const faceWithColor = applyColors(faceSvg, skinColor, hairColor);
	const hairWithColor = applyColors(hairSvg, skinColor, hairColor);
	const facialHairWithColor = facialHairSvg ? applyColors(facialHairSvg, skinColor, facialHairColor) : null;

	// Prefix IDs for multi-portrait collision safety
	const facePrefixed = prefixIds(faceWithColor, idPrefix);
	const eyesPrefixed = prefixIds(eyesSvg, idPrefix);
	const eyebrowsPrefixed = prefixIds(eyebrowsSvg, idPrefix);
	const nosePrefixed = prefixIds(noseSvg, idPrefix);
	const mouthPrefixed = prefixIds(mouthSvg, idPrefix);
	const hairPrefixed = prefixIds(hairWithColor, idPrefix);
	const facialHairPrefixed = facialHairWithColor ? prefixIds(facialHairWithColor, idPrefix) : null;
	const accessoryPrefixed = accessorySvg ? prefixIds(accessorySvg, idPrefix) : null;

	// Build layers back to front
	let layers = '';

	// Face shape first (includes skin-toned body silhouette)
	layers += wrapLayer(facePrefixed, 40, 36);

	// NFL jersey: wide shoulder pads, round crew neck
	// Jersey body with shoulder pad bulk
	const jersey = `<path d="M44,239 Q44,214 80,204 L120,199 L140,197 L160,199 L200,204 Q236,214 236,239 L236,280 L44,280 Z" fill="${shirtColor}"/>`;
	// Shoulder seam lines
	const leftSeam = `<line x1="78" y1="211" x2="112" y2="203" stroke="#000" stroke-opacity="0.12" stroke-width="1.5"/>`;
	const rightSeam = `<line x1="202" y1="211" x2="168" y2="203" stroke="#000" stroke-opacity="0.12" stroke-width="1.5"/>`;
	// Round crew neck cutout (skin shows through)
	const neckCutout = `<ellipse cx="140" cy="201" rx="22" ry="10" fill="${skinColor}"/>`;
	// Collar rim: thin arc along the top edge of the neckline
	const collarRim = `<path d="M118,201 Q140,189 162,201" fill="none" stroke="#000" stroke-opacity="0.15" stroke-width="2"/>`;
	layers += jersey;
	layers += leftSeam;
	layers += rightSeam;
	layers += neckCutout;
	layers += collarRim;

	// Eyes
	layers += wrapLayer(eyesPrefixed, 84, 90);
	// Eyebrows
	layers += wrapLayer(eyebrowsPrefixed, 84, 82);
	// Nose
	layers += wrapLayer(nosePrefixed, 112, 122);
	// Mouth
	layers += wrapLayer(mouthPrefixed, 86, 134);
	// Facial hair (optional)
	if (facialHairPrefixed) {
		layers += wrapLayer(facialHairPrefixed, 56, 72);
	}
	// Hair
	layers += wrapLayer(hairPrefixed, 7, 0);
	// Accessories (optional)
	if (accessoryPrefixed) {
		layers += wrapLayer(accessoryPrefixed, 69, 85);
	}

	const svg = `<svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">${layers}</svg>`;
	return svg;
}

//============================================
// Age band resolution
type AgeBand = 'teen' | 'young_adult' | 'middle_aged' | 'senior';

function getAgeBand(age: number): AgeBand {
	if (age < 22) {
		return 'teen';
	}
	if (age <= 35) {
		return 'young_adult';
	}
	if (age <= 50) {
		return 'middle_aged';
	}
	return 'senior';
}

//============================================
// Adjust expression weights by age band
// Returns new weights array (does not mutate original)
function adjustExpressionWeightsByAge(
	baseWeights: WeightedEntry<ExpressionPreset>[],
	ageBand: AgeBand
): WeightedEntry<ExpressionPreset>[] {
	// Copy the weights so we can modify
	const adjusted: WeightedEntry<ExpressionPreset>[] = baseWeights.map(
		(e) => ({ value: e.value, weight: e.weight })
	);

	if (ageBand === 'teen') {
		// Suppress stern and intense for teens
		for (const entry of adjusted) {
			if (entry.value === 'stern') {
				entry.weight = Math.floor(entry.weight * 0.2);
			}
			if (entry.value === 'intense') {
				entry.weight = Math.floor(entry.weight * 0.5);
			}
			// Boost friendly for teens
			if (entry.value === 'friendly') {
				entry.weight = Math.floor(entry.weight * 1.5);
			}
		}
	} else if (ageBand === 'senior') {
		// Suppress friendly, boost stern and neutral for seniors
		for (const entry of adjusted) {
			if (entry.value === 'friendly') {
				entry.weight = Math.floor(entry.weight * 0.3);
			}
			if (entry.value === 'stern') {
				entry.weight = Math.floor(entry.weight * 1.4);
			}
			if (entry.value === 'neutral') {
				entry.weight = Math.floor(entry.weight * 1.3);
			}
		}
	}

	// Filter out entries with zero weight
	const filtered = adjusted.filter((e) => e.weight > 0);
	// Ensure at least one entry survives
	if (filtered.length === 0) {
		return [{ value: 'neutral', weight: 1 }];
	}
	return filtered;
}

//============================================
// Get hair style pool for an age band, possibly overriding the identity family
function getAgeFilteredHairPool(family: HairFamily, ageBand: AgeBand): string[] {
	const basePool = HAIR_FAMILY_POOLS[family];

	if (ageBand === 'teen') {
		// Teens: use youth pool regardless of family identity
		// but keep the family as a secondary influence
		const youthSet = new Set(YOUTH_HAIR);
		const fromFamily = basePool.filter((h) => youthSet.has(h));
		// If family has youth overlap, use that; otherwise use full youth pool
		if (fromFamily.length >= 2) {
			return fromFamily;
		}
		return YOUTH_HAIR;
	}

	if (ageBand === 'middle_aged') {
		// Exclude youth-coded styles
		const youthOnly = new Set(['bigHair', 'shaggyMullet']);
		const filtered = basePool.filter((h) => !youthOnly.has(h));
		if (filtered.length >= 1) {
			return filtered;
		}
		return CONSERVATIVE_HAIR;
	}

	if (ageBand === 'senior') {
		// 80-90% conservative, but allow some family influence
		// Merge conservative with a few adult-safe styles from the family
		const conservativeSet = new Set(CONSERVATIVE_HAIR);
		const adultSafe = basePool.filter(
			(h) => !new Set(['bigHair', 'shaggyMullet', 'curly']).has(h)
		);
		// Combine conservative + filtered family styles (deduped)
		const combined = [...CONSERVATIVE_HAIR];
		for (const h of adultSafe) {
			if (!conservativeSet.has(h)) {
				combined.push(h);
			}
		}
		return combined;
	}

	// young_adult: use base pool as-is
	return basePool;
}

//============================================
// Pick hair color with age-based gray forcing and archetype rarity rules
function pickHairColor(
	archetype: Archetype,
	ageBand: AgeBand,
	rand: () => number
): string {
	// Forced gray check for older characters (before any tier selection)
	if (ageBand === 'senior' && rand() < 0.60) {
		return 'silverGray';
	}
	if (ageBand === 'middle_aged' && rand() < 0.25) {
		return 'silverGray';
	}

	// Tier weights by archetype
	let commonWeight = 70;
	let uncommonWeight = 25;
	let rareWeight = 5;

	if (archetype === 'coach' || archetype === 'recruiter' || archetype === 'scout') {
		commonWeight = 80;
		uncommonWeight = 15;
		rareWeight = 5;
	} else if (archetype === 'rival') {
		commonWeight = 60;
		uncommonWeight = 30;
		rareWeight = 10;
	}

	// Build rare pool based on exclusions
	const availableRare: string[] = [];
	// Pink only for generic
	if (archetype === 'generic') {
		availableRare.push('pastelPink');
	}
	// Gray for middle_aged+ (didn't get forced above, but still possible via rare tier)
	if (ageBand === 'middle_aged' || ageBand === 'senior') {
		availableRare.push('silverGray');
	}

	// If no rare options, redistribute to common
	if (availableRare.length === 0) {
		commonWeight += rareWeight;
		rareWeight = 0;
	}

	// Pick tier
	const tierEntries: WeightedEntry<string>[] = [];
	tierEntries.push({ value: 'common', weight: commonWeight });
	tierEntries.push({ value: 'uncommon', weight: uncommonWeight });
	if (rareWeight > 0) {
		tierEntries.push({ value: 'rare', weight: rareWeight });
	}
	const tier = pickWeighted(tierEntries, rand);

	if (tier === 'common') {
		return pickFromArray(COMMON_HAIR_COLORS, rand);
	}
	if (tier === 'uncommon') {
		return pickFromArray(UNCOMMON_HAIR_COLORS, rand);
	}
	return pickFromArray(availableRare, rand);
}

//============================================
// Get facial hair probability based on age + archetype
function getFacialHairChance(ageBand: AgeBand, archetype: Archetype): number {
	// Base chance by age band (stronger than v2)
	let base = 0;
	if (ageBand === 'teen') {
		return 0;
	}
	// Higher base rates since all characters are male (American football)
	if (ageBand === 'young_adult') {
		base = 0.35;
	} else if (ageBand === 'middle_aged') {
		base = 0.65;
	} else {
		// senior
		base = 0.80;
	}

	// Archetype modifier
	if (archetype === 'coach') {
		base += 0.15;
	} else if (archetype === 'player') {
		base -= 0.10;
	}

	// Clamp to 0-1
	return Math.max(0, Math.min(1, base));
}

//============================================
// Get glasses probability, boosted for older professional archetypes
function getGlassesChance(archetype: Archetype, ageBand: AgeBand): number {
	let base = ARCHETYPE_GLASSES_CHANCE[archetype];
	// Older professionals get more glasses
	if (ageBand === 'senior' && (archetype === 'coach' || archetype === 'recruiter' || archetype === 'scout')) {
		base += 0.15;
	} else if (ageBand === 'middle_aged' && (archetype === 'coach' || archetype === 'recruiter' || archetype === 'scout')) {
		base += 0.08;
	}
	return Math.min(1, base);
}

//============================================
// Validate expression preset keys exist; fallback to neutral if missing
function resolveExpression(preset: ExpressionPreset): { eyes: string; eyebrows: string; mouth: string } {
	const expr = EXPRESSION_PRESETS[preset];
	const eyesOk = expr.eyes in EYES;
	const browsOk = expr.eyebrows in EYEBROWS;
	const mouthOk = expr.mouth in MOUTHS;
	if (eyesOk && browsOk && mouthOk) {
		return expr;
	}
	return EXPRESSION_PRESETS['neutral'];
}

//============================================
// Generate a deterministic avatar config from seed string
// Uses two PRNG streams: identity (stable) and variation (changes with archetype/age)
export function randomAvatarConfig(
	seed: string,
	opts?: { archetype?: Archetype; age?: number }
): AvatarConfig {
	// Resolve inputs
	const archetype = opts?.archetype || 'generic';
	const age = opts?.age || 30;
	const ageBand = getAgeBand(age);

	// Two seeded streams: identity stays stable, variation changes with role/age
	const identityRand = mulberry32(hashString(seed));
	const variationRand = mulberry32(hashString(seed + '|' + archetype + '|' + ageBand));

	// === IDENTITY PICKS (stable across age/archetype) ===

	// Skin tone: uniform, stable
	const skinTone = pickKey(SKIN_TONES, identityRand);

	// Face base: stable
	const faceShape = pickKey(FACE_SHAPES, identityRand);

	// Broad hair family: stable identity picks which pool
	const hairFamily = pickWeighted(ARCHETYPE_HAIR_FAMILIES[archetype], identityRand);

	// Nose: stable
	const nose = pickKey(NOSES, identityRand);

	// === SEMI-STABLE PICKS (identity-seeded for continuity, age can nudge) ===

	// Expression preset: identity seed picks the base tendency so the same
	// person keeps a similar expression across age bands
	const baseExprWeights = ARCHETYPE_EXPRESSIONS[archetype];
	const adjustedExprWeights = adjustExpressionWeightsByAge(baseExprWeights, ageBand);
	const expressionPreset = pickWeighted(adjustedExprWeights, identityRand);
	const baseExpression = resolveExpression(expressionPreset);

	// Base hair color: identity seed picks a stable natural color,
	// then age band can override to gray for older characters
	const baseHairColor = pickHairColor(archetype, 'young_adult', identityRand);

	// === VARIATION PICKS (change with archetype and age band) ===

	// Vary expression features within compatible subpools
	let eyes = baseExpression.eyes;
	let eyebrows = baseExpression.eyebrows;
	let mouth = baseExpression.mouth;

	const compatPool = EXPRESSION_COMPATIBLE[expressionPreset];
	if (variationRand() < 0.30) {
		eyes = pickFromArray(compatPool.eyes, variationRand);
	}
	if (variationRand() < 0.25) {
		eyebrows = pickFromArray(compatPool.eyebrows, variationRand);
	}
	if (variationRand() < 0.20) {
		mouth = pickFromArray(compatPool.mouth, variationRand);
	}

	// Hair style: age-filtered version of the identity hair family
	const ageFilteredPool = getAgeFilteredHairPool(hairFamily, ageBand);
	const hair = pickFromArray(ageFilteredPool, variationRand);

	// Hair color: start from identity base, age can force gray
	let hairColor = baseHairColor;
	if (ageBand === 'senior' && variationRand() < 0.60) {
		hairColor = 'silverGray';
	} else if (ageBand === 'middle_aged' && variationRand() < 0.25) {
		hairColor = 'silverGray';
	}

	// Facial hair: age + archetype probability
	let facialHair: string | undefined = undefined;
	const facialHairChance = getFacialHairChance(ageBand, archetype);
	if (facialHairChance > 0 && variationRand() < facialHairChance) {
		facialHair = pickKey(FACIAL_HAIR, variationRand);
	}

	// Accessories: archetype probability, boosted for older professionals
	let accessory: string | undefined = undefined;
	const glassesChance = getGlassesChance(archetype, ageBand);
	if (variationRand() < glassesChance) {
		accessory = pickKey(ACCESSORIES, variationRand);
	}

	// === COMPATIBILITY CLEANUP ===

	// Sunglasses clip with raisedExcited eyebrows -- remove, don't reroll
	if (accessory === 'sunglasses' && eyebrows === 'raisedExcited') {
		accessory = undefined;
	}

	const config: AvatarConfig = {
		skinTone: skinTone,
		hairColor: hairColor,
		faceShape: faceShape,
		hair: hair,
		eyes: eyes,
		eyebrows: eyebrows,
		nose: nose,
		mouth: mouth,
		facialHair: facialHair,
		accessory: accessory,
	};
	return config;
}
