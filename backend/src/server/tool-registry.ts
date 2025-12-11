/**
 * Tool Registry
 * Centralized tool definitions and tool calling logic
 */

import { TOOL_NAMES } from '../config/constants.js';
import {
  searchProperties,
  searchPropertiesToolDefinition,
  calculatePropertySavings,
  calculateSavingsToolDefinition,
  getPropertyDetails,
  getPropertyDetailsToolDefinition,
  saveFavoriteProperty,
  saveFavoritePropertyToolDefinition,
  getFavoriteProperties,
  getFavoritePropertiesToolDefinition,
} from '../tools/properties.js';

// Removed LLM check - not needed for property-only app

/**
 * Get all tool definitions - Property tools only
 */
export function getToolDefinitions() {
  const tools = [
    searchPropertiesToolDefinition,
    calculateSavingsToolDefinition,
    getPropertyDetailsToolDefinition,
    saveFavoritePropertyToolDefinition,
    getFavoritePropertiesToolDefinition,
  ];

  console.log('🏠 Homebuyme property tools loaded - 5 tools enabled');

  return tools;
}

/**
 * Call a tool by name with arguments
 */
export async function callTool(name: string, args: any, userId?: number): Promise<any> {
  try {
    switch (name) {
      case TOOL_NAMES.SEARCH_PROPERTIES:
        return await searchProperties(args, userId);

      case TOOL_NAMES.CALCULATE_SAVINGS:
        return await calculatePropertySavings(args, userId);

      case TOOL_NAMES.GET_PROPERTY_DETAILS:
        return await getPropertyDetails(args, userId);

      case TOOL_NAMES.SAVE_FAVORITE_PROPERTY:
        if (!userId) throw new Error('Authentication required');
        return await saveFavoriteProperty(args, userId);

      case TOOL_NAMES.GET_FAVORITE_PROPERTIES:
        if (!userId) throw new Error('Authentication required');
        return await getFavoriteProperties(args, userId);

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `Unknown tool: ${name}`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`❌ Error calling tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}


