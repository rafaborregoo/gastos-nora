import type { CSSProperties } from "react";

import type { ThemeMode, ThemeTokens } from "@/types/database";

const LIGHT_DEFAULT_THEME: ThemeTokens = {
  background: "42 60% 97%",
  foreground: "217 33% 12%",
  muted: "40 35% 93%",
  muted_foreground: "215 16% 42%",
  card: "0 0% 100%",
  card_foreground: "217 33% 12%",
  border: "30 24% 88%",
  ring: "160 63% 39%",
  primary: "160 63% 39%",
  primary_foreground: "155 48% 98%",
  secondary: "23 83% 56%",
  secondary_foreground: "33 100% 98%",
  accent: "198 84% 52%",
  accent_foreground: "205 100% 98%",
  success: "152 57% 42%",
  success_foreground: "144 60% 98%",
  warning: "39 91% 52%",
  warning_foreground: "40 100% 10%",
  danger: "3 76% 55%",
  danger_foreground: "0 0% 98%"
};

const DARK_DEFAULT_THEME: ThemeTokens = {
  background: "218 39% 10%",
  foreground: "38 67% 96%",
  muted: "217 24% 18%",
  muted_foreground: "214 17% 70%",
  card: "220 32% 12%",
  card_foreground: "38 67% 96%",
  border: "220 19% 22%",
  ring: "159 61% 48%",
  primary: "159 61% 48%",
  primary_foreground: "157 59% 10%",
  secondary: "18 84% 61%",
  secondary_foreground: "20 100% 8%",
  accent: "197 92% 56%",
  accent_foreground: "197 100% 10%",
  success: "150 55% 46%",
  success_foreground: "150 100% 8%",
  warning: "41 90% 58%",
  warning_foreground: "38 100% 10%",
  danger: "4 74% 58%",
  danger_foreground: "0 0% 98%"
};

export const THEME_TOKEN_KEYS = Object.keys(LIGHT_DEFAULT_THEME) as Array<keyof ThemeTokens>;

export function getDefaultThemeTokens(mode: ThemeMode) {
  return mode === "dark" ? DARK_DEFAULT_THEME : LIGHT_DEFAULT_THEME;
}

export function mergeThemeTokens(mode: ThemeMode, tokens?: Partial<ThemeTokens> | null): ThemeTokens {
  const defaults = getDefaultThemeTokens(mode);

  return THEME_TOKEN_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = tokens?.[key] ?? defaults[key];
      return accumulator;
    },
    { ...defaults } as ThemeTokens
  );
}

type RgbColor = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(value: string): RgbColor | null {
  const normalized = value.replace("#", "").trim();
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : normalized;

  if (!/^[\da-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

function rgbToHex(color: RgbColor) {
  const channelToHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${channelToHex(color.r)}${channelToHex(color.g)}${channelToHex(color.b)}`;
}

function rgbToHsl(color: RgbColor) {
  const red = color.r / 255;
  const green = color.g / 255;
  const blue = color.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return {
      h: 0,
      s: 0,
      l: Math.round(lightness * 100)
    };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  switch (max) {
    case red:
      hue = ((green - blue) / delta) % 6;
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) {
    hue += 360;
  }

  return {
    h: hue,
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

function hslToRgbComponents(hue: number, saturation: number, lightness: number): RgbColor {
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const intermediate = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = normalizedLightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue >= 0 && hue < 60) {
    red = chroma;
    green = intermediate;
  } else if (hue < 120) {
    red = intermediate;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = intermediate;
  } else if (hue < 240) {
    green = intermediate;
    blue = chroma;
  } else if (hue < 300) {
    red = intermediate;
    blue = chroma;
  } else {
    red = chroma;
    blue = intermediate;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255)
  };
}

function hslStringToRgb(value: string): RgbColor | null {
  const trimmed = value.trim();
  const rawMatch = trimmed.match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  const wrappedMatch = trimmed.match(/^hsl\(\s*(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%\s*\)$/i);
  const match = rawMatch ?? wrappedMatch;

  if (!match) {
    return null;
  }

  const hue = clamp(Number(match[1]), 0, 360);
  const saturation = clamp(Number(match[2]), 0, 100);
  const lightness = clamp(Number(match[3]), 0, 100);
  return hslToRgbComponents(hue, saturation, lightness);
}

function rgbToHslToken(color: RgbColor) {
  const hsl = rgbToHsl(color);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function normalizeHex(value: string) {
  const rgb = hexToRgb(value);
  return rgb ? rgbToHex(rgb).toLowerCase() : null;
}

export function normalizeThemeToken(value: string) {
  const normalizedHex = normalizeHex(value);
  if (normalizedHex) {
    return rgbToHslToken(hexToRgb(normalizedHex)!);
  }

  const rgbFromHsl = hslStringToRgb(value);
  if (rgbFromHsl) {
    return rgbToHslToken(rgbFromHsl);
  }

  return null;
}

export function themeTokenToHex(value: string) {
  const rgb = hslStringToRgb(value);
  if (!rgb) {
    return "#000000";
  }

  return rgbToHex(rgb);
}

function getRelativeLuminance(color: RgbColor) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function getContrastRatio(left: RgbColor, right: RgbColor) {
  const luminanceA = getRelativeLuminance(left);
  const luminanceB = getRelativeLuminance(right);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function pickReadableForeground(backgroundHex: string) {
  const background = hexToRgb(backgroundHex);
  if (!background) {
    return "#ffffff";
  }

  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 10, g: 10, b: 10 };
  return getContrastRatio(background, white) >= getContrastRatio(background, black) ? "#ffffff" : "#0a0a0a";
}

function shiftLightness(hex: string, delta: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  const hsl = rgbToHsl(rgb);
  const next = clamp(hsl.l + delta, 0, 100);
  return rgbToHex(hslToRgbComponents(hsl.h, hsl.s, next));
}

export function buildThemeTokensFromControls(params: {
  mode: ThemeMode;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  border: string;
}): ThemeTokens {
  const primary = normalizeHex(params.primary) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).primary);
  const secondary = normalizeHex(params.secondary) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).secondary);
  const accent = normalizeHex(params.accent) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).accent);
  const background = normalizeHex(params.background) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).background);
  const foreground = normalizeHex(params.foreground) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).foreground);
  const border = normalizeHex(params.border) ?? themeTokenToHex(getDefaultThemeTokens(params.mode).border);
  const card = params.mode === "dark" ? shiftLightness(background, 4) : shiftLightness(background, 2);
  const muted = params.mode === "dark" ? shiftLightness(background, 8) : shiftLightness(background, -4);

  return {
    background: normalizeThemeToken(background)!,
    foreground: normalizeThemeToken(foreground)!,
    muted: normalizeThemeToken(muted)!,
    muted_foreground: normalizeThemeToken(params.mode === "dark" ? shiftLightness(foreground, -28) : shiftLightness(foreground, 28))!,
    card: normalizeThemeToken(card)!,
    card_foreground: normalizeThemeToken(foreground)!,
    border: normalizeThemeToken(border)!,
    ring: normalizeThemeToken(primary)!,
    primary: normalizeThemeToken(primary)!,
    primary_foreground: normalizeThemeToken(pickReadableForeground(primary))!,
    secondary: normalizeThemeToken(secondary)!,
    secondary_foreground: normalizeThemeToken(pickReadableForeground(secondary))!,
    accent: normalizeThemeToken(accent)!,
    accent_foreground: normalizeThemeToken(pickReadableForeground(accent))!,
    success: normalizeThemeToken(primary)!,
    success_foreground: normalizeThemeToken(pickReadableForeground(primary))!,
    warning: normalizeThemeToken("#f4a11a")!,
    warning_foreground: normalizeThemeToken("#201200")!,
    danger: normalizeThemeToken("#dc4e41")!,
    danger_foreground: normalizeThemeToken("#ffffff")!
  };
}

export function validateThemeTokens(tokens: Partial<Record<keyof ThemeTokens, string>>) {
  const normalized = {} as ThemeTokens;

  for (const key of THEME_TOKEN_KEYS) {
    const value = tokens[key];

    if (!value) {
      return null;
    }

    const normalizedValue = normalizeThemeToken(value);
    if (!normalizedValue) {
      return null;
    }

    normalized[key] = normalizedValue;
  }

  const contrastPairs: Array<[keyof ThemeTokens, keyof ThemeTokens]> = [
    ["background", "foreground"],
    ["card", "card_foreground"],
    ["primary", "primary_foreground"],
    ["secondary", "secondary_foreground"],
    ["accent", "accent_foreground"]
  ];

  for (const [backgroundKey, foregroundKey] of contrastPairs) {
    const background = hslStringToRgb(normalized[backgroundKey]);
    const foreground = hslStringToRgb(normalized[foregroundKey]);

    if (!background || !foreground || getContrastRatio(background, foreground) < 3) {
      return null;
    }
  }

  return normalized;
}

export function getThemeCssVariables(tokens: ThemeTokens) {
  return THEME_TOKEN_KEYS.reduce(
    (accumulator, key) => {
      accumulator[`--${key.replaceAll("_", "-")}`] = tokens[key];
      return accumulator;
    },
    {} as Record<string, string>
  );
}

export function themeVariablesToStyle(tokens: ThemeTokens) {
  return getThemeCssVariables(tokens) as CSSProperties;
}

