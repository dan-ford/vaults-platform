/**
 * WCAG 2.2 Contrast Ratio Utilities
 *
 * Standards:
 * - AA Normal text: 4.5:1
 * - AA Large text: 3:1
 * - AAA Normal text: 7:1
 * - AAA Large text: 4.5:1
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to relative luminance
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAG_AA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAG_AAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get contrast rating for a given ratio
 */
export function getContrastRating(ratio: number): {
  level: 'fail' | 'aa-large' | 'aa' | 'aaa';
  label: string;
  description: string;
} {
  if (ratio >= 7) {
    return {
      level: 'aaa',
      label: 'AAA',
      description: 'Excellent contrast - exceeds all standards',
    };
  } else if (ratio >= 4.5) {
    return {
      level: 'aa',
      label: 'AA',
      description: 'Good contrast - meets WCAG AA for all text',
    };
  } else if (ratio >= 3) {
    return {
      level: 'aa-large',
      label: 'AA Large',
      description: 'Acceptable for large text only (18pt+ or 14pt+ bold)',
    };
  } else {
    return {
      level: 'fail',
      label: 'Fail',
      description: 'Poor contrast - does not meet accessibility standards',
    };
  }
}

/**
 * Suggest accessible alternatives for a given color
 * Returns lighter and darker versions that meet WCAG AA
 */
export function suggestAccessibleAlternatives(
  brandColor: string,
  backgroundColor: string = '#ffffff'
): { lighter: string; darker: string } | null {
  const rgb = hexToRgb(brandColor);
  if (!rgb) return null;

  // Try darkening the color
  let darker = brandColor;
  for (let factor = 0.9; factor > 0.1; factor -= 0.05) {
    const darkerRgb = {
      r: Math.round(rgb.r * factor),
      g: Math.round(rgb.g * factor),
      b: Math.round(rgb.b * factor),
    };
    const darkerHex = `#${darkerRgb.r.toString(16).padStart(2, '0')}${darkerRgb.g
      .toString(16)
      .padStart(2, '0')}${darkerRgb.b.toString(16).padStart(2, '0')}`;

    const ratio = getContrastRatio(darkerHex, backgroundColor);
    if (ratio >= 4.5) {
      darker = darkerHex;
      break;
    }
  }

  // Try lightening the color
  let lighter = brandColor;
  for (let factor = 1.1; factor < 2.5; factor += 0.05) {
    const lighterRgb = {
      r: Math.min(255, Math.round(rgb.r * factor)),
      g: Math.min(255, Math.round(rgb.g * factor)),
      b: Math.min(255, Math.round(rgb.b * factor)),
    };
    const lighterHex = `#${lighterRgb.r.toString(16).padStart(2, '0')}${lighterRgb.g
      .toString(16)
      .padStart(2, '0')}${lighterRgb.b.toString(16).padStart(2, '0')}`;

    const ratio = getContrastRatio(lighterHex, backgroundColor);
    if (ratio >= 4.5) {
      lighter = lighterHex;
      break;
    }
  }

  return { lighter, darker };
}
