// theme.ts - team color theming system

//============================================
// Team color palette interface
export interface TeamPalette {
	primary: string;      // main background color (hex)
	secondary: string;    // secondary/card background (hex)
	accent: string;       // highlights, buttons, stat bars (hex)
	text: string;         // main text color (hex)
	textSecondary: string; // dimmer text (hex)
}

//============================================
// Default theme palette (copied from styles.css :root)
const DEFAULT_PALETTE: TeamPalette = {
	primary: '#1a1a2e',
	secondary: '#16213e',
	accent: '#2196f3',
	text: '#e8e8e8',
	textSecondary: '#a0a0b0',
};

//============================================
// Real NFL team colors (approximate)
const NFL_TEAMS: Record<string, TeamPalette> = {
	// AFC East
	'Buffalo Bills': {
		primary: '#00338d',
		secondary: '#1a3d6e',
		accent: '#d41e3f',
		text: '#ffffff',
		textSecondary: '#b8c5d6',
	},
	'Miami Dolphins': {
		primary: '#008e97',
		secondary: '#0a5a66',
		accent: '#f58220',
		text: '#ffffff',
		textSecondary: '#a8d5db',
	},
	'New England Patriots': {
		primary: '#002244',
		secondary: '#1a3a4a',
		accent: '#bd3039',
		text: '#ffffff',
		textSecondary: '#8fa8b8',
	},
	'New York Jets': {
		primary: '#125740',
		secondary: '#0a3a2a',
		accent: '#ffffff',
		text: '#ffffff',
		textSecondary: '#a8d0c8',
	},

	// AFC Central
	'Baltimore Ravens': {
		primary: '#241773',
		secondary: '#1a0f52',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#b8a8d6',
	},
	'Pittsburgh Steelers': {
		primary: '#27251a',
		secondary: '#1a1810',
		accent: '#ffb612',
		text: '#ffffff',
		textSecondary: '#b8b0a0',
	},
	'Cleveland Browns': {
		primary: '#311d00',
		secondary: '#1a1000',
		accent: '#ff3c00',
		text: '#ffffff',
		textSecondary: '#c8a080',
	},
	'Cincinnati Bengals': {
		primary: '#fb4f14',
		secondary: '#8b2c00',
		accent: '#000000',
		text: '#ffffff',
		textSecondary: '#d8b088',
	},

	// AFC West
	'Denver Broncos': {
		primary: '#002244',
		secondary: '#1a3a4a',
		accent: '#fb4f14',
		text: '#ffffff',
		textSecondary: '#8fa8b8',
	},
	'Kansas City Chiefs': {
		primary: '#e31828',
		secondary: '#8b0f0f',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#d8a8a8',
	},
	'Las Vegas Raiders': {
		primary: '#000000',
		secondary: '#1a1a1a',
		accent: '#c0c0c0',
		text: '#c0c0c0',
		textSecondary: '#808080',
	},
	'Los Angeles Chargers': {
		primary: '#0080c6',
		secondary: '#004a7a',
		accent: '#ffc52f',
		text: '#ffffff',
		textSecondary: '#99c8e6',
	},

	// NFC East
	'Dallas Cowboys': {
		primary: '#001a4d',
		secondary: '#0d2d66',
		accent: '#b0b0b0',
		text: '#ffffff',
		textSecondary: '#8fa8c8',
	},
	'Philadelphia Eagles': {
		primary: '#004c52',
		secondary: '#002a2f',
		accent: '#8b0000',
		text: '#ffffff',
		textSecondary: '#a0d0d8',
	},
	'Washington Commanders': {
		primary: '#5a1a14',
		secondary: '#3a0f0a',
		accent: '#ffb81c',
		text: '#ffffff',
		textSecondary: '#d8a8a0',
	},
	'New York Giants': {
		primary: '#0b3a7d',
		secondary: '#061f4a',
		accent: '#a71930',
		text: '#ffffff',
		textSecondary: '#8fa8d8',
	},

	// NFC Central
	'Chicago Bears': {
		primary: '#0b162a',
		secondary: '#06090f',
		accent: '#ff6600',
		text: '#ffffff',
		textSecondary: '#8fa8c8',
	},
	'Detroit Lions': {
		primary: '#0076b6',
		secondary: '#004080',
		accent: '#b0b0b0',
		text: '#ffffff',
		textSecondary: '#99c8e6',
	},
	'Green Bay Packers': {
		primary: '#203731',
		secondary: '#0f1a18',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#a8d0c8',
	},
	'Minnesota Vikings': {
		primary: '#4f2683',
		secondary: '#2a1550',
		accent: '#ffc52f',
		text: '#ffffff',
		textSecondary: '#c8a8e0',
	},

	// NFC West
	'Arizona Cardinals': {
		primary: '#97233f',
		secondary: '#550f1f',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#d8a8b8',
	},
	'Los Angeles Rams': {
		primary: '#003594',
		secondary: '#001a52',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#8fa8d8',
	},
	'San Francisco 49ers': {
		primary: '#aa0000',
		secondary: '#660000',
		accent: '#ffd700',
		text: '#ffffff',
		textSecondary: '#d8a8a8',
	},
	'Seattle Seahawks': {
		primary: '#002244',
		secondary: '#001a33',
		accent: '#69be28',
		text: '#ffffff',
		textSecondary: '#8fa8c8',
	},
};

//============================================
// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) {
		return { r: 0, g: 0, b: 0 };
	}
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

//============================================
// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	// Normalize to 0-1 range
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

//============================================
// Get relative luminance from hex color
export function getRelativeLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);

	// Convert to sRGB (0-1 range)
	const rs = r / 255;
	const gs = g / 255;
	const bs = b / 255;

	// Apply gamma correction
	const rLinear = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
	const gLinear = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
	const bLinear = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

	// WCAG luminance formula
	const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
	return luminance;
}

//============================================
// Calculate WCAG contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
	const l1 = getRelativeLuminance(color1);
	const l2 = getRelativeLuminance(color2);

	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	return (lighter + 0.05) / (darker + 0.05);
}

//============================================
// Convert HSL to hex color
export function hslToHex(h: number, s: number, l: number): string {
	// Normalize inputs to 0-1 range
	const hNorm = h / 360;
	const sNorm = s / 100;
	const lNorm = l / 100;

	let r: number, g: number, b: number;

	if (sNorm === 0) {
		// Achromatic (gray)
		r = g = b = lNorm;
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
		const p = 2 * lNorm - q;
		r = hue2rgb(p, q, hNorm + 1 / 3);
		g = hue2rgb(p, q, hNorm);
		b = hue2rgb(p, q, hNorm - 1 / 3);
	}

	const toHex = (x: number) => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return '#' + toHex(r) + toHex(g) + toHex(b);
}

//============================================
// Generate a random team palette with WCAG AA compliance
export function generateTeamPalette(): TeamPalette {
	// Pick a random hue (0-360)
	const hue = Math.random() * 360;

	// Primary background: dark version (10-20% lightness)
	const primaryLight = 10 + Math.random() * 10;
	const primary = hslToHex(hue, 30, primaryLight);

	// Secondary background: slightly lighter (15-25% lightness)
	const secondaryLight = 15 + Math.random() * 10;
	const secondary = hslToHex(hue, 25, secondaryLight);

	// Accent: vivid saturated version (40-60% lightness, 60-90% saturation)
	const accentSat = 60 + Math.random() * 30;
	const accentLight = 40 + Math.random() * 20;
	const accent = hslToHex(hue, accentSat, accentLight);

	// Text: light color (85-95% lightness)
	const textLight = 85 + Math.random() * 10;
	const text = hslToHex(hue, 10, textLight);

	// TextSecondary: dimmer version (55-70% lightness)
	const textSecLight = 55 + Math.random() * 15;
	const textSecondary = hslToHex(hue, 15, textSecLight);

	// Validate contrast ratio (primary bg to text needs 4.5:1 for WCAG AA)
	const contrastRatio = getContrastRatio(primary, text);

	if (contrastRatio < 4.5) {
		// Force text to white if contrast is too low
		const palette: TeamPalette = {
			primary,
			secondary,
			accent,
			text: '#ffffff',
			textSecondary: '#d0d0d0',
		};
		return palette;
	}

	return {
		primary,
		secondary,
		accent,
		text,
		textSecondary,
	};
}

//============================================
// Get NFL team palette by name, fall back to random generation
export function generateNFLPalette(teamName: string): TeamPalette {
	const palette = NFL_TEAMS[teamName];

	if (palette) {
		// Create a copy to avoid mutating the shared constant
		const result = { ...palette };

		// Validate contrast on real team colors
		const contrastRatio = getContrastRatio(result.primary, result.text);
		if (contrastRatio < 4.5) {
			// Adjust text to white if contrast fails
			result.text = '#ffffff';
			result.textSecondary = '#d0d0d0';
		}
		return result;
	}

	// Unknown team: generate a random palette
	return generateTeamPalette();
}

//============================================
// Apply palette to CSS custom properties
export function applyPalette(palette: TeamPalette): void {
	const root = document.documentElement.style;

	root.setProperty('--bg-primary', palette.primary);
	root.setProperty('--bg-secondary', palette.secondary);

	// bg-card: slightly adjusted secondary
	const cardLum = getRelativeLuminance(palette.secondary);
	const cardLight = cardLum < 0.1 ? 25 : 20;
	const bgCard = hslToHex(0, 0, cardLight);
	root.setProperty('--bg-card', bgCard);

	// Button background: blend of secondary and accent
	const { r: r2, g: g2, b: b2 } = hexToRgb(palette.secondary);
	const { r: ra, g: ga, b: ba } = hexToRgb(palette.accent);
	const buttonBg = '#' +
		Math.round((r2 * 0.7 + ra * 0.3)).toString(16).padStart(2, '0') +
		Math.round((g2 * 0.7 + ga * 0.3)).toString(16).padStart(2, '0') +
		Math.round((b2 * 0.7 + ba * 0.3)).toString(16).padStart(2, '0');
	root.setProperty('--button-bg', buttonBg);

	// Button hover state: lighter version of button background
	const { r: rbh, g: gbh, b: bbh } = hexToRgb(buttonBg);
	const buttonHover = hslToHex(0, 0, Math.round(getRelativeLuminance(buttonBg) * 100 + 15));
	root.setProperty('--button-hover', buttonHover);

	// Bar background: between primary and secondary
	const { r: r1, g: g1, b: b1 } = hexToRgb(palette.primary);
	const barBg = '#' +
		Math.round((r1 * 0.6 + r2 * 0.4)).toString(16).padStart(2, '0') +
		Math.round((g1 * 0.6 + g2 * 0.4)).toString(16).padStart(2, '0') +
		Math.round((b1 * 0.6 + b2 * 0.4)).toString(16).padStart(2, '0');
	root.setProperty('--bar-bg', barBg);

	// Accent colors: extract hue and saturation from palette accent
	root.setProperty('--accent-blue', palette.accent);

	// Accent gold: lighter version of accent with same hue and saturation
	const accentRgb = hexToRgb(palette.accent);
	const accentHsl = rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b);
	const accentLighter = hslToHex(accentHsl.h, accentHsl.s, 70);
	root.setProperty('--accent-gold', accentLighter);

	// Button colors
	root.setProperty('--button-big', palette.accent);

	// Lighter hover state for big button with same hue and saturation as accent
	const buttonBigHover = hslToHex(accentHsl.h, accentHsl.s, 60);
	root.setProperty('--button-big-hover', buttonBigHover);

	// Stat bar colors (keep defaults, team palette doesn't override these)
	root.setProperty('--accent-green', '#4caf50');
	root.setProperty('--accent-yellow', '#ffc107');
	root.setProperty('--accent-red', '#f44336');

	// Text colors
	root.setProperty('--text-primary', palette.text);
	root.setProperty('--text-secondary', palette.textSecondary);
}

//============================================
// Reset theme to default dark theme
export function resetToDefault(): void {
	applyPalette(DEFAULT_PALETTE);
}
