// SamuelYAN-inspired color palettes
export const COLOR_PALETTES = {
  grey: ['#070A0D', '#171F26', '#4A5259', '#7B848C', '#AEB7BF'],
  pinkPurpleCyan: ['#D94389', '#4D578C', '#3791A6', '#3DF2D1', '#F28080'],
  warmOrange: ['#F28D35', '#D96A29', '#A66641', '#D9B0A7', '#F2DAD8'],
  purpleBlue: ['#F2A7D8', '#473959', '#655A8C', '#9F8FD9', '#5979D9'],
  tealGreen: ['#025951', '#012623', '#21BF92', '#73D9BC', '#0D0D0D'],
  lake: ['#025159', '#3E848C', '#7AB8BF', '#C4EEF2', '#A67458'],
  grass: ['#10454F', '#506266', '#818274', '#A3AB78', '#BDE038'],
  pinkBlue: ['#D96690', '#F28DB2', '#F2C9E0', '#89C2D9', '#88E8F2'],
} as const;

export type PaletteName = keyof typeof COLOR_PALETTES;

// Get all palettes as a flat array for random selection
export const ALL_PALETTE_COLORS = Object.values(COLOR_PALETTES).flat();

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 128, g: 128, b: 128 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGB to HSL
function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to RGB
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Find the closest palette color to a given color
function findClosestPaletteColor(hex: string): string {
  const rgb = hexToRgb(hex);
  let minDistance = Infinity;
  let closest = ALL_PALETTE_COLORS[0];

  for (const paletteColor of ALL_PALETTE_COLORS) {
    const paletteRgb = hexToRgb(paletteColor);
    const distance = Math.sqrt(
      Math.pow(rgb.r - paletteRgb.r, 2) +
        Math.pow(rgb.g - paletteRgb.g, 2) +
        Math.pow(rgb.b - paletteRgb.b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = paletteColor;
    }
  }

  return closest;
}

/**
 * Harmonize a trail color with SamuelYAN palette style
 * - Increases saturation
 * - Adjusts lightness to palette range
 * - Blends slightly toward nearest palette color
 */
export function harmonizeColor(originalHex: string, blendAmount = 0.3): string {
  const originalRgb = hexToRgb(originalHex);
  const originalHsl = rgbToHsl(originalRgb.r, originalRgb.g, originalRgb.b);

  // Find closest palette color
  const closestPalette = findClosestPaletteColor(originalHex);
  const paletteRgb = hexToRgb(closestPalette);
  const paletteHsl = rgbToHsl(paletteRgb.r, paletteRgb.g, paletteRgb.b);

  // Boost saturation (SamuelYAN colors are vibrant)
  let newS = originalHsl.s * 1.3;
  newS = Math.min(100, Math.max(20, newS));

  // Adjust lightness to be in the 30-70 range (not too dark or bright)
  let newL = originalHsl.l;
  if (newL < 25) newL = 25 + (newL / 25) * 10;
  if (newL > 75) newL = 75 - ((newL - 75) / 25) * 10;

  // Blend hue slightly toward palette color
  let newH = originalHsl.h + (paletteHsl.h - originalHsl.h) * blendAmount * 0.5;
  if (newH < 0) newH += 360;
  if (newH >= 360) newH -= 360;

  const newRgb = hslToRgb(newH, newS, newL);

  // Final blend with palette color
  const finalR = newRgb.r + (paletteRgb.r - newRgb.r) * blendAmount;
  const finalG = newRgb.g + (paletteRgb.g - newRgb.g) * blendAmount;
  const finalB = newRgb.b + (paletteRgb.b - newRgb.b) * blendAmount;

  return rgbToHex(finalR, finalG, finalB);
}

/**
 * Get a random color from a random palette
 */
export function getRandomPaletteColor(seed?: number): string {
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  const index = Math.floor(random() * ALL_PALETTE_COLORS.length);
  return ALL_PALETTE_COLORS[index];
}

/**
 * Get a consistent palette based on a seed
 */
export function getPaletteFromSeed(seed: number): string[] {
  const paletteNames = Object.keys(COLOR_PALETTES) as PaletteName[];
  const index = Math.abs(Math.floor(seed)) % paletteNames.length;
  return [...COLOR_PALETTES[paletteNames[index]]];
}

// Simple seeded random function
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s * 9999) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Convert hex color to Three.js compatible number
 */
export function hexToThreeColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
