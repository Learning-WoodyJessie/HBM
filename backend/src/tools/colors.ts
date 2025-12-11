/**
 * Color Tools
 * Get color information, generate palettes, and manage color favorites
 */

import { z } from 'zod';
import { COLOR_WIDGET_URL } from '../utils/config.js';
import { query } from '../db/client.js';
import {
  parseColor,
  generateRandomColor,
  getComplementary,
  getAnalogous,
  getTriadic,
  getMonochromatic,
  getTetradic,
  getColorName,
  type ColorInfo,
} from '../utils/color-helpers.js';

// ============================================================================
// Get Color Info Tool
// ============================================================================

export const GetColorInfoSchema = z.object({
  color: z.string().min(1, 'Color value is required (HEX, RGB, or HSL)'),
});

export type GetColorInfoInput = z.infer<typeof GetColorInfoSchema>;

export async function getColorInfo(input: unknown, _userId?: number) {
  try {
    const validatedInput = GetColorInfoSchema.parse(input);
    const colorInfo = parseColor(validatedInput.color);
    const colorName = getColorName(colorInfo);

    const hasWidget = !!COLOR_WIDGET_URL;

    const textContent = hasWidget
      ? `${colorName} - ${colorInfo.hex}`
      : `Color: ${colorName}\nHEX: ${colorInfo.hex}\nRGB: rgb(${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b})\nHSL: hsl(${colorInfo.hsl.h}, ${colorInfo.hsl.s}%, ${colorInfo.hsl.l}%)`;

    const widgetMeta = hasWidget
      ? {
          'openai/outputTemplate': 'ui://widget/color-display',
          'openai/widgetAccessible': true,
          'openai/resultCanProduceWidget': true,
          'openai/toolInvocation/invoking': 'Getting color info...',
          'openai/toolInvocation/invoked': 'Color info retrieved',
        }
      : undefined;

    const structuredContent = {
      success: true,
      colors: [
        {
          ...colorInfo,
          name: colorName,
        },
      ],
      paletteType: 'single',
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in get_color_info:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get color info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const getColorInfoToolDefinition = {
  name: 'get_color_info',
  description: 'Get detailed information about a color including HEX, RGB, HSL values and color name',
  inputSchema: {
    type: 'object',
    properties: {
      color: {
        type: 'string',
        description: 'Color value in HEX (#RRGGBB), RGB (rgb(r,g,b)), or HSL (hsl(h,s%,l%)) format',
      },
    },
    required: ['color'],
  },
};

// ============================================================================
// Generate Palette Tool
// ============================================================================

export const GeneratePaletteSchema = z.object({
  baseColor: z.string().min(1, 'Base color is required'),
  type: z.enum([
    'complementary',
    'analogous',
    'triadic',
    'monochromatic',
    'tetradic',
  ]),
  count: z.number().int().min(3).max(10).optional(),
});

export type GeneratePaletteInput = z.infer<typeof GeneratePaletteSchema>;

export async function generatePalette(input: unknown, _userId?: number) {
  try {
    const validatedInput = GeneratePaletteSchema.parse(input);
    const baseColor = parseColor(validatedInput.baseColor);
    let colors: ColorInfo[];

    switch (validatedInput.type) {
      case 'complementary':
        colors = [baseColor, getComplementary(baseColor)];
        break;
      case 'analogous':
        colors = getAnalogous(baseColor);
        break;
      case 'triadic':
        colors = getTriadic(baseColor);
        break;
      case 'monochromatic':
        colors = getMonochromatic(baseColor, validatedInput.count || 5);
        break;
      case 'tetradic':
        colors = getTetradic(baseColor);
        break;
      default:
        throw new Error('Invalid palette type');
    }

    const hasWidget = !!COLOR_WIDGET_URL;

    const textContent = hasWidget
      ? `${validatedInput.type} palette with ${colors.length} colors`
      : `${validatedInput.type} color palette:\n${colors
          .map((c) => `${c.hex} - ${getColorName(c)}`)
          .join('\n')}`;

    const widgetMeta = hasWidget
      ? {
          'openai/outputTemplate': 'ui://widget/color-display',
          'openai/widgetAccessible': true,
          'openai/resultCanProduceWidget': true,
          'openai/toolInvocation/invoking': 'Generating palette...',
          'openai/toolInvocation/invoked': 'Palette generated',
        }
      : undefined;

    const structuredContent = {
      success: true,
      colors: colors.map((c) => ({
        ...c,
        name: getColorName(c),
      })),
      paletteType: validatedInput.type,
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in generate_palette:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to generate palette: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const generatePaletteToolDefinition = {
  name: 'generate_palette',
  description: 'Generate a color palette based on a base color and palette type',
  inputSchema: {
    type: 'object',
    properties: {
      baseColor: {
        type: 'string',
        description: 'Base color in HEX, RGB, or HSL format',
      },
      type: {
        type: 'string',
        enum: ['complementary', 'analogous', 'triadic', 'monochromatic', 'tetradic'],
        description: 'Type of palette to generate',
      },
      count: {
        type: 'number',
        description: 'Number of colors (for monochromatic palette only, 3-10)',
        minimum: 3,
        maximum: 10,
      },
    },
    required: ['baseColor', 'type'],
  },
};

// ============================================================================
// Random Colors Tool
// ============================================================================

export const RandomColorsSchema = z.object({
  count: z.number().int().min(1).max(10).default(5),
});

export type RandomColorsInput = z.infer<typeof RandomColorsSchema>;

export async function randomColors(input: unknown, _userId?: number) {
  try {
    const validatedInput = RandomColorsSchema.parse(input);
    const colors = Array.from({ length: validatedInput.count }, () =>
      generateRandomColor()
    );

    const hasWidget = !!COLOR_WIDGET_URL;

    const textContent = hasWidget
      ? `Generated ${colors.length} random colors`
      : `Random colors:\n${colors
          .map((c) => `${c.hex} - ${getColorName(c)}`)
          .join('\n')}`;

    const widgetMeta = hasWidget
      ? {
          'openai/outputTemplate': 'ui://widget/color-display',
          'openai/widgetAccessible': true,
          'openai/resultCanProduceWidget': true,
          'openai/toolInvocation/invoking': 'Generating random colors...',
          'openai/toolInvocation/invoked': 'Colors generated',
        }
      : undefined;

    const structuredContent = {
      success: true,
      colors: colors.map((c) => ({
        ...c,
        name: getColorName(c),
      })),
      paletteType: 'random',
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in random_colors:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to generate random colors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const randomColorsToolDefinition = {
  name: 'random_colors',
  description: 'Generate random colors',
  inputSchema: {
    type: 'object',
    properties: {
      count: {
        type: 'number',
        description: 'Number of random colors to generate (1-10)',
        minimum: 1,
        maximum: 10,
        default: 5,
      },
    },
  },
};

// ============================================================================
// Convert Color Tool
// ============================================================================

export const ConvertColorSchema = z.object({
  color: z.string().min(1, 'Color value is required'),
  to: z.enum(['hex', 'rgb', 'hsl', 'all']).default('all'),
});

export type ConvertColorInput = z.infer<typeof ConvertColorSchema>;

export async function convertColor(input: unknown, _userId?: number) {
  try {
    const validatedInput = ConvertColorSchema.parse(input);
    const colorInfo = parseColor(validatedInput.color);

    let textContent: string;
    switch (validatedInput.to) {
      case 'hex':
        textContent = `HEX: ${colorInfo.hex}`;
        break;
      case 'rgb':
        textContent = `RGB: rgb(${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b})`;
        break;
      case 'hsl':
        textContent = `HSL: hsl(${colorInfo.hsl.h}, ${colorInfo.hsl.s}%, ${colorInfo.hsl.l}%)`;
        break;
      default:
        textContent = `HEX: ${colorInfo.hex}\nRGB: rgb(${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b})\nHSL: hsl(${colorInfo.hsl.h}, ${colorInfo.hsl.s}%, ${colorInfo.hsl.l}%)`;
    }

    const structuredContent = {
      success: true,
      color: {
        ...colorInfo,
        name: getColorName(colorInfo),
      },
      format: validatedInput.to,
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      isError: false,
    };
  } catch (error) {
    console.error('Error in convert_color:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to convert color: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const convertColorToolDefinition = {
  name: 'convert_color',
  description: 'Convert a color between different formats (HEX, RGB, HSL)',
  inputSchema: {
    type: 'object',
    properties: {
      color: {
        type: 'string',
        description: 'Color value in any format (HEX, RGB, or HSL)',
      },
      to: {
        type: 'string',
        enum: ['hex', 'rgb', 'hsl', 'all'],
        description: 'Target format for conversion',
        default: 'all',
      },
    },
    required: ['color'],
  },
};

// ============================================================================
// Save Favorite Color Tool
// ============================================================================

export const SaveFavoriteColorSchema = z.object({
  color: z.string().min(1, 'Color value is required'),
  name: z.string().optional(),
});

export type SaveFavoriteColorInput = z.infer<typeof SaveFavoriteColorSchema>;

export async function saveFavoriteColor(input: unknown, userId?: number) {
  try {
    if (!userId) {
      throw new Error('User authentication required to save favorite colors');
    }

    const validatedInput = SaveFavoriteColorSchema.parse(input);
    const colorInfo = parseColor(validatedInput.color);
    const colorName = validatedInput.name || getColorName(colorInfo);

    // Insert into favorites table
    await query(
      `INSERT INTO favorite_colors (user_id, hex, rgb_r, rgb_g, rgb_b, hsl_h, hsl_s, hsl_l, name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id, hex) DO UPDATE SET name = $9, updated_at = NOW()`,
      [
        userId,
        colorInfo.hex,
        colorInfo.rgb.r,
        colorInfo.rgb.g,
        colorInfo.rgb.b,
        colorInfo.hsl.h,
        colorInfo.hsl.s,
        colorInfo.hsl.l,
        colorName,
      ]
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: `Saved ${colorName} (${colorInfo.hex}) to favorites`,
        },
      ],
      structuredContent: { success: true, color: colorInfo, name: colorName },
      isError: false,
    };
  } catch (error) {
    console.error('Error in save_favorite_color:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to save favorite color: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const saveFavoriteColorToolDefinition = {
  name: 'save_favorite_color',
  description: 'Save a color to your personal favorites',
  inputSchema: {
    type: 'object',
    properties: {
      color: {
        type: 'string',
        description: 'Color value in HEX, RGB, or HSL format',
      },
      name: {
        type: 'string',
        description: 'Optional custom name for the color',
      },
    },
    required: ['color'],
  },
};

// ============================================================================
// Get Favorites Tool
// ============================================================================

export const GetFavoritesSchema = z.object({});

export type GetFavoritesInput = z.infer<typeof GetFavoritesSchema>;

export async function getFavorites(_input: unknown, userId?: number) {
  try {
    if (!userId) {
      throw new Error('User authentication required to get favorite colors');
    }

    const result = await query<{
      hex: string;
      rgb_r: number;
      rgb_g: number;
      rgb_b: number;
      hsl_h: number;
      hsl_s: number;
      hsl_l: number;
      name: string;
      created_at: Date;
    }>(
      `SELECT hex, rgb_r, rgb_g, rgb_b, hsl_h, hsl_s, hsl_l, name, created_at
       FROM favorite_colors
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const colors = result.rows.map((row) => ({
      hex: row.hex,
      rgb: { r: row.rgb_r, g: row.rgb_g, b: row.rgb_b },
      hsl: { h: row.hsl_h, s: row.hsl_s, l: row.hsl_l },
      name: row.name,
    }));

    const hasWidget = !!COLOR_WIDGET_URL;

    const textContent =
      colors.length > 0
        ? hasWidget
          ? `Found ${colors.length} favorite colors`
          : `Your favorite colors:\n${colors.map((c) => `${c.hex} - ${c.name}`).join('\n')}`
        : 'No favorite colors saved yet';

    const widgetMeta =
      hasWidget && colors.length > 0
        ? {
            'openai/outputTemplate': 'ui://widget/color-display',
            'openai/widgetAccessible': true,
            'openai/resultCanProduceWidget': true,
            'openai/toolInvocation/invoking': 'Loading favorites...',
            'openai/toolInvocation/invoked': 'Favorites loaded',
          }
        : undefined;

    const structuredContent = {
      success: true,
      colors,
      paletteType: 'favorites',
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in get_favorites:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get favorites: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const getFavoritesToolDefinition = {
  name: 'get_favorites',
  description: 'Get your saved favorite colors',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};
