/**
 * Homebuyme Property Tools
 * Search properties, calculate savings, and manage favorites
 */

import { z } from 'zod';
import { PROPERTY_WIDGET_URL } from '../utils/config.js';
import { query } from '../db/client.js';
import {
  getStateProperties,
  calculateSavings,
  formatPrice,
  capitalize,
  titleCase,
  generateNeighborhoodVibe,
  supportsFullOffers,
  getExpansionMessage,
  type Property,
} from '../utils/homebuyme-api.js';

// ============================================================================
// Search Properties Tool
// ============================================================================

export const SearchPropertiesSchema = z.object({
  state: z.string().length(2, 'State must be 2-letter code (e.g., WA, CA)'),
  city: z.string().optional(),
  maxPrice: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().min(1).max(100).default(20),
});

export type SearchPropertiesInput = z.infer<typeof SearchPropertiesSchema>;

export async function searchProperties(input: unknown, _userId?: number) {
  try {
    const validatedInput = SearchPropertiesSchema.parse(input);
    
    const response = await getStateProperties(
      validatedInput.state,
      validatedInput.page,
      validatedInput.perPage
    );

    // Filter by city if provided
    let properties = response.properties;
    if (validatedInput.city) {
      properties = properties.filter(
        (p) => p.property_address.city.toLowerCase() === validatedInput.city!.toLowerCase()
      );
    }

    // Filter by price range
    if (validatedInput.minPrice) {
      properties = properties.filter((p) => p.property_price >= validatedInput.minPrice!);
    }
    if (validatedInput.maxPrice) {
      properties = properties.filter((p) => p.property_price <= validatedInput.maxPrice!);
    }

    const hasWidget = !!PROPERTY_WIDGET_URL;
    const expansionMsg = getExpansionMessage(validatedInput.state);

    const textContent = hasWidget
      ? `Found ${properties.length} properties in ${validatedInput.state}${validatedInput.city ? ` (${validatedInput.city})` : ''}`
      : `${expansionMsg}\n\nFound ${properties.length} properties:\n${properties
          .slice(0, 5)
          .map(
            (p) =>
              `${p.property_address_display_name}, ${p.property_address.city} - ${formatPrice(p.property_price_with_hbm)}`
          )
          .join('\n')}`;

    const widgetMeta = hasWidget && properties.length > 0
      ? {
          'openai/outputTemplate': 'ui://widget/property-display',
          'openai/widgetAccessible': true,
          'openai/resultCanProduceWidget': true,
          'openai/toolInvocation/invoking': 'Searching properties...',
          'openai/toolInvocation/invoked': 'Properties loaded',
        }
      : undefined;

    const structuredContent = {
      success: true,
      properties: properties.map((p) => ({
        ...p,
        savings: calculateSavings(p),
        vibe: generateNeighborhoodVibe(p),
        supportsOffers: supportsFullOffers(validatedInput.state),
      })),
      pagination: response.pagination,
      expansionMessage: expansionMsg,
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in search_properties:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to search properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const searchPropertiesToolDefinition = {
  name: 'search_properties',
  description: 'Search Homebuyme properties by state, with optional filters for city and price range. Returns properties with savings calculations.',
  inputSchema: {
    type: 'object',
    properties: {
      state: {
        type: 'string',
        description: 'Two-letter state code (e.g., WA, CA)',
      },
      city: {
        type: 'string',
        description: 'Optional: Filter by city name',
      },
      minPrice: {
        type: 'number',
        description: 'Optional: Minimum price filter',
      },
      maxPrice: {
        type: 'number',
        description: 'Optional: Maximum price filter',
      },
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
        default: 1,
      },
      perPage: {
        type: 'number',
        description: 'Results per page (default: 20, max: 100)',
        default: 20,
        minimum: 1,
        maximum: 100,
      },
    },
    required: ['state'],
  },
  // Add widget metadata to tool definition (required for OpenAI Apps SDK)
  ...(PROPERTY_WIDGET_URL && {
    _meta: {
      'openai/outputTemplate': 'ui://widget/property-display',
      'openai/widgetAccessible': true,
      'openai/resultCanProduceWidget': true,
      'openai/toolInvocation/invoking': 'Searching properties...',
      'openai/toolInvocation/invoked': 'Properties loaded',
    },
  }),
};

// ============================================================================
// Calculate Savings Tool
// ============================================================================

export const CalculateSavingsSchema = z.object({
  price: z.number().positive(),
});

export type CalculateSavingsInput = z.infer<typeof CalculateSavingsSchema>;

export async function calculatePropertySavings(input: unknown, _userId?: number) {
  try {
    const validatedInput = CalculateSavingsSchema.parse(input);
    
    // Mock property for calculation
    const mockProperty = {
      property_price: validatedInput.price,
      property_price_with_hbm: validatedInput.price * 0.98, // 2% Homebuyme advantage
    } as Property;

    const savings = calculateSavings(mockProperty);

    const textContent = `💸 On a ${formatPrice(validatedInput.price)} home, you could save roughly ${formatPrice(savings.totalSavings)}.

• ${formatPrice(savings.buyerAgentFee)} from avoiding 3% buyer-agent fees
• ${formatPrice(savings.priceDifference)} from Homebuyme price advantage

🎯 Want to see listings where these savings apply?`;

    const structuredContent = {
      success: true,
      price: validatedInput.price,
      savings,
      formattedSavings: {
        total: formatPrice(savings.totalSavings),
        agentFee: formatPrice(savings.buyerAgentFee),
        priceDifference: formatPrice(savings.priceDifference),
      },
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      isError: false,
    };
  } catch (error) {
    console.error('Error in calculate_savings:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to calculate savings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const calculateSavingsToolDefinition = {
  name: 'calculate_savings',
  description: 'Calculate potential savings with Homebuyme on a home purchase. Shows savings from avoiding buyer-agent fees and Homebuyme price advantage.',
  inputSchema: {
    type: 'object',
    properties: {
      price: {
        type: 'number',
        description: 'Home price to calculate savings for',
      },
    },
    required: ['price'],
  },
};

// ============================================================================
// Get Property Details Tool
// ============================================================================

export const GetPropertyDetailsSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  state: z.string().length(2, 'State must be 2-letter code'),
});

export type GetPropertyDetailsInput = z.infer<typeof GetPropertyDetailsSchema>;

export async function getPropertyDetails(input: unknown, _userId?: number) {
  try {
    const validatedInput = GetPropertyDetailsSchema.parse(input);
    
    // Fetch all properties from state and find the specific one
    const response = await getStateProperties(validatedInput.state, 1, 100);
    const property = response.properties.find((p) => p.id === validatedInput.propertyId);

    if (!property) {
      throw new Error('Property not found');
    }

    const savings = calculateSavings(property);
    const vibe = generateNeighborhoodVibe(property);
    const supportsOffers = supportsFullOffers(validatedInput.state);

    const hasWidget = !!PROPERTY_WIDGET_URL;

    const textContent = hasWidget
      ? `${property.property_address_display_name}, ${property.property_address.city}`
      : `🏡 ${property.property_address_display_name}
${property.property_address.city}, ${property.property_address.state}

🏷 ${capitalize(property.status)} • ${titleCase(property.property_type)}
💰 List Price: ${formatPrice(property.property_price)}
✨ Homebuyme Price: ${formatPrice(property.property_price_with_hbm)}
🎯 Total Savings: ${formatPrice(savings.totalSavings)}

${vibe}

🔗 View Details: ${property.partner_site_property_website}`;

    const widgetMeta = hasWidget
      ? {
          'openai/outputTemplate': 'ui://widget/property-display',
          'openai/widgetAccessible': true,
          'openai/resultCanProduceWidget': true,
          'openai/toolInvocation/invoking': 'Loading property details...',
          'openai/toolInvocation/invoked': 'Property details loaded',
        }
      : undefined;

    const structuredContent = {
      success: true,
      properties: [
        {
          ...property,
          savings,
          vibe,
          supportsOffers,
        },
      ],
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in get_property_details:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get property details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const getPropertyDetailsToolDefinition = {
  name: 'get_property_details',
  description: 'Get detailed information about a specific Homebuyme property including savings breakdown and neighborhood info.',
  inputSchema: {
    type: 'object',
    properties: {
      propertyId: {
        type: 'string',
        description: 'Property ID from search results',
      },
      state: {
        type: 'string',
        description: 'Two-letter state code where the property is located',
      },
    },
    required: ['propertyId', 'state'],
  },
  // Add widget metadata to tool definition (required for OpenAI Apps SDK)
  ...(PROPERTY_WIDGET_URL && {
    _meta: {
      'openai/outputTemplate': 'ui://widget/property-display',
      'openai/widgetAccessible': true,
      'openai/resultCanProduceWidget': true,
      'openai/toolInvocation/invoking': 'Loading property details...',
      'openai/toolInvocation/invoked': 'Property details loaded',
    },
  }),
};

// ============================================================================
// Save Favorite Property Tool
// ============================================================================

export const SaveFavoritePropertySchema = z.object({
  propertyId: z.string().min(1),
  state: z.string().length(2),
  notes: z.string().optional(),
});

export type SaveFavoritePropertyInput = z.infer<typeof SaveFavoritePropertySchema>;

export async function saveFavoriteProperty(input: unknown, userId?: number) {
  try {
    if (!userId) {
      throw new Error('User authentication required to save favorite properties');
    }

    const validatedInput = SaveFavoritePropertySchema.parse(input);
    
    // Fetch property details
    const response = await getStateProperties(validatedInput.state, 1, 100);
    const property = response.properties.find((p) => p.id === validatedInput.propertyId);

    if (!property) {
      throw new Error('Property not found');
    }

    // Insert into favorites table
    await query(
      `INSERT INTO favorite_properties (
        user_id, property_id, address, city, state, price, hbm_price, 
        property_type, status, image_url, notes, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id, property_id) DO UPDATE SET 
        notes = $11, updated_at = NOW()`,
      [
        userId,
        property.id,
        property.property_address_display_name,
        property.property_address.city,
        property.property_address.state,
        property.property_price,
        property.property_price_with_hbm,
        property.property_type,
        property.status,
        property.property_image || null,
        validatedInput.notes || null,
      ]
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: `✅ Saved ${property.property_address_display_name} to your favorites!`,
        },
      ],
      structuredContent: {
        success: true,
        property: {
          id: property.id,
          address: property.property_address_display_name,
          city: property.property_address.city,
        },
      },
      isError: false,
    };
  } catch (error) {
    console.error('Error in save_favorite_property:', error);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to save favorite: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      structuredContent: { success: false },
      isError: true,
    };
  }
}

export const saveFavoritePropertyToolDefinition = {
  name: 'save_favorite_property',
  description: 'Save a property to your personal favorites list with optional notes.',
  inputSchema: {
    type: 'object',
    properties: {
      propertyId: {
        type: 'string',
        description: 'Property ID from search results',
      },
      state: {
        type: 'string',
        description: 'Two-letter state code',
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the property',
      },
    },
    required: ['propertyId', 'state'],
  },
};

// ============================================================================
// Get Favorite Properties Tool
// ============================================================================

export const GetFavoritePropertiesSchema = z.object({});

export type GetFavoritePropertiesInput = z.infer<typeof GetFavoritePropertiesSchema>;

export async function getFavoriteProperties(_input: unknown, userId?: number) {
  try {
    if (!userId) {
      throw new Error('User authentication required to get favorite properties');
    }

    const result = await query<{
      property_id: string;
      address: string;
      city: string;
      state: string;
      price: number;
      hbm_price: number;
      property_type: string;
      status: string;
      image_url: string | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT property_id, address, city, state, price, hbm_price, 
              property_type, status, image_url, notes, created_at
       FROM favorite_properties
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const properties = result.rows.map((row) => ({
      id: row.property_id,
      property_address_display_name: row.address,
      property_address: {
        property_address: row.address,
        city: row.city,
        state: row.state,
        county: '',
      },
      property_price: row.price,
      property_price_with_hbm: row.hbm_price,
      property_type: row.property_type,
      status: row.status,
      property_image: row.image_url || undefined,
      partner_site_property_website: '',
      savings: calculateSavings({
        property_price: row.price,
        property_price_with_hbm: row.hbm_price,
      } as Property),
      notes: row.notes,
    }));

    const hasWidget = !!PROPERTY_WIDGET_URL;

    const textContent =
      properties.length > 0
        ? hasWidget
          ? `Found ${properties.length} favorite properties`
          : `Your favorite properties:\n${properties.map((p) => `${p.property_address_display_name}, ${p.property_address.city}`).join('\n')}`
        : 'No favorite properties saved yet';

    const widgetMeta =
      hasWidget && properties.length > 0
        ? {
            'openai/outputTemplate': 'ui://widget/property-display',
            'openai/widgetAccessible': true,
            'openai/resultCanProduceWidget': true,
            'openai/toolInvocation/invoking': 'Loading favorites...',
            'openai/toolInvocation/invoked': 'Favorites loaded',
          }
        : undefined;

    const structuredContent = {
      success: true,
      properties,
    };

    return {
      content: [{ type: 'text' as const, text: textContent }],
      structuredContent,
      _meta: widgetMeta,
      isError: false,
    };
  } catch (error) {
    console.error('Error in get_favorite_properties:', error);
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

export const getFavoritePropertiesToolDefinition = {
  name: 'get_favorite_properties',
  description: 'Get your saved favorite properties',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  // Add widget metadata to tool definition (required for OpenAI Apps SDK)
  ...(PROPERTY_WIDGET_URL && {
    _meta: {
      'openai/outputTemplate': 'ui://widget/property-display',
      'openai/widgetAccessible': true,
      'openai/resultCanProduceWidget': true,
      'openai/toolInvocation/invoking': 'Loading favorites...',
      'openai/toolInvocation/invoked': 'Favorites loaded',
    },
  }),
};

