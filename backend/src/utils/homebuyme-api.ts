/**
 * Homebuyme API utility functions
 * Handles API calls to Homebuyme property listings
 */

const HOMEBUYME_API_BASE = 'https://offer.homebuyme.com';
const HOMEBUYME_API_KEY = process.env.HOMEBUYME_API_KEY || 'c361b19a8eb21483d4dc91f22e3e802960d556bfb29d6f5fb23cf6bcd399c0b6';

export interface PropertyAddress {
  property_address: string;
  city: string;
  county: string;
  state: string;
  zip?: string;
}

export interface Property {
  id: string;
  partner_alias: string;
  partner_site_alias: string;
  partner_site_property_website: string;
  property_address_display_name: string;
  property_address: PropertyAddress;
  property_price: number;
  property_price_with_hbm: number;
  property_type: string;
  property_model?: string;
  status: string;
  property_image?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
}

export interface PropertySearchResponse {
  count: number;
  filters: {
    state: string;
  };
  last_updated: string;
  pagination: {
    has_next: boolean;
    has_prev: boolean;
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
  properties: Property[];
}

/**
 * Fetch properties by state
 */
export async function getStateProperties(
  state: string,
  page: number = 1,
  perPage: number = 100
): Promise<PropertySearchResponse> {
  const url = new URL(`${HOMEBUYME_API_BASE}/api/public/state_properties`);
  url.searchParams.set('state', state.toUpperCase());
  url.searchParams.set('page', page.toString());
  url.searchParams.set('ppp', perPage.toString());

  console.log('[Homebuyme API] Fetching properties:', { state, page, perPage });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${HOMEBUYME_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Homebuyme API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as PropertySearchResponse;
  console.log('[Homebuyme API] Received', data.count, 'properties');
  
  return data;
}

/**
 * Calculate savings for a property
 */
export function calculateSavings(property: Property) {
  const listPrice = property.property_price;
  const hbmPrice = property.property_price_with_hbm;
  const priceDifference = listPrice - hbmPrice;
  
  // Typical buyer-agent commission is 3%
  const buyerAgentFee = listPrice * 0.03;
  
  // Total savings = price difference + avoided agent fee
  const totalSavings = priceDifference + buyerAgentFee;
  
  return {
    listPrice,
    hbmPrice,
    priceDifference,
    buyerAgentFee,
    totalSavings,
  };
}

/**
 * Format price with commas
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Title case a string
 */
export function titleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate neighborhood vibe description
 */
export function generateNeighborhoodVibe(property: Property): string {
  const vibes = [
    '🌿 Quiet, walkable area near parks and cafés.',
    '🌆 Vibrant downtown spot close to restaurants and tech hubs.',
    '🏞 Family-friendly neighborhood with green spaces and bike paths.',
    '🌳 Peaceful residential area with local charm.',
    '🏙 Urban living with easy access to shopping and dining.',
    '🌅 Scenic location with nearby trails and outdoor activities.',
  ];
  
  // Simple hash based on property ID to get consistent vibe
  const hash = property.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return vibes[hash % vibes.length];
}

/**
 * Check if state supports full offers
 */
export function supportsFullOffers(state: string): boolean {
  const supportedStates = ['WA', 'CA'];
  return supportedStates.includes(state.toUpperCase());
}

/**
 * Get expansion message for unsupported states
 */
export function getExpansionMessage(state: string): string {
  if (supportsFullOffers(state)) {
    return '';
  }
  
  return `📍 We're expanding soon! For now, Homebuyme offers full service in WA & CA.

🔗 [Learn How Homebuyme Works](https://homebuyme.com/about/)
💼 [View Plans & Pricing](https://homebuyme.com/pricing/?utm_source_hbm=gpt-expansion-info)
🏡 [Browse Featured Homes](https://homebuyme.com/browse-featured-homes/)`;
}

/**
 * Construct the offer URL for a property
 * Format: https://offer.homebuyme.com/partners/{partner_alias}/{partner_site_alias}?property_id={property_id}
 */
export function getOfferUrl(property: Property): string {
  // First try to use the partner_site_property_website if it exists
  if (property.partner_site_property_website) {
    // Check if it already has the property_id parameter
    if (property.partner_site_property_website.includes('property_id=')) {
      return property.partner_site_property_website;
    }
    // Add property_id parameter if missing
    const separator = property.partner_site_property_website.includes('?') ? '&' : '?';
    return `${property.partner_site_property_website}${separator}property_id=${property.id}`;
  }
  
  // Fallback: construct the offer URL from components
  return `${HOMEBUYME_API_BASE}/partners/${property.partner_alias}/${property.partner_site_alias}?property_id=${property.id}`;
}

