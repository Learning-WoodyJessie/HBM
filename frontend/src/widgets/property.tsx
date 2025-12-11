import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import cssContent from '../styles.css?inline';
import { FaHeart, FaRegHeart, FaMapMarkerAlt, FaExternalLinkAlt, FaHome, FaDollarSign } from 'react-icons/fa';
import {
  useOpenAiGlobal,
  ButtonSpinner,
  LoadingSpinner,
  callTool,
} from './shared/index.js';

// Types
interface PropertyAddress {
  property_address: string;
  city: string;
  county: string;
  state: string;
  zip?: string;
}

interface Savings {
  listPrice: number;
  hbmPrice: number;
  priceDifference: number;
  buyerAgentFee: number;
  totalSavings: number;
}

interface Property {
  id: string;
  property_address_display_name: string;
  property_address: PropertyAddress;
  property_price: number;
  property_price_with_hbm: number;
  property_type: string;
  property_model?: string;
  status: string;
  property_image?: string;
  partner_alias: string;
  partner_site_alias: string;
  partner_site_property_website: string;
  savings: Savings;
  vibe: string;
  supportsOffers: boolean;
  notes?: string;
}

interface ToolOutput {
  success: boolean;
  properties: Property[];
  pagination?: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  expansionMessage?: string;
}

// Hooks
function useToolOutput(): ToolOutput | null {
  return useOpenAiGlobal('toolOutput');
}

function useTheme() {
  return useOpenAiGlobal('theme');
}

// Helper functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function titleCase(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function createMapUrl(address: string, city: string, state: string): string {
  const query = encodeURIComponent(`${address}, ${city}, ${state}`);
  return `https://www.google.com/maps/place/${query}`;
}

function createStreetViewUrl(address: string, city: string, state: string): string {
  const query = encodeURIComponent(`${address}, ${city}, ${state}`);
  return `https://www.google.com/maps/place/${query}/@?api=1&map_action=pano`;
}

function createNearbySearchUrl(
  type: string,
  address: string,
  city: string,
  state: string
): string {
  const query = encodeURIComponent(`${type} near ${address}, ${city}, ${state}`);
  return `https://www.google.com/maps/search/${query}`;
}

// Components
interface PropertyCardProps {
  property: Property;
}

function PropertyCard({ property }: PropertyCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const theme = useTheme();
  const isDark = theme === 'dark';

  const handleSaveFavorite = useCallback(async () => {
    setIsSaving(true);
    try {
      await callTool('save_favorite_property', {
        propertyId: property.id,
        state: property.property_address.state,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save favorite:', err);
    } finally {
      setIsSaving(false);
    }
  }, [property]);

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden ${
        isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } hover:shadow-xl transition-shadow`}
    >
      {/* Property Image */}
      {property.property_image && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={property.property_image}
            alt={property.property_address_display_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Favorite Button Overlay */}
          <button
            onClick={handleSaveFavorite}
            disabled={isSaving || isSaved}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
            title={isSaved ? 'Saved to favorites!' : 'Save to favorites'}
          >
            {isSaving ? (
              <ButtonSpinner />
            ) : isSaved ? (
              <FaHeart className="text-red-500" />
            ) : (
              <FaRegHeart className="text-gray-700" />
            )}
          </button>
        </div>
      )}

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="text-xl font-bold mb-2 flex items-start gap-2">
          <FaHome className="mt-1 flex-shrink-0" />
          <span>
            {property.property_address_display_name}
            <br />
            <span className="text-sm font-normal opacity-75">
              {property.property_address.city}, {property.property_address.state}
            </span>
          </span>
        </h3>

        {/* Status and Type */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              property.status.toLowerCase() === 'available'
                ? 'bg-green-100 text-green-800'
                : property.status.toLowerCase() === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {capitalize(property.status)}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs ${
              isDark ? 'bg-gray-700' : 'bg-gray-100'
            }`}
          >
            {titleCase(property.property_type)}
            {property.property_model && ` (${titleCase(property.property_model)})`}
          </span>
        </div>

        {/* Pricing */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm opacity-75">List Price:</span>
            <span className="font-semibold">
              {formatPrice(property.property_price)}
            </span>
          </div>
          <div className="flex justify-between items-center text-green-600 dark:text-green-400">
            <span className="text-sm font-semibold">✨ Homebuyme Price:</span>
            <span className="font-bold">
              {formatPrice(property.property_price_with_hbm)}
            </span>
          </div>
          <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
            <span className="text-sm font-semibold">🎯 Savings:</span>
            <span className="font-bold">
              ≈{formatPrice(property.savings.priceDifference)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-75">Est. Buyer-Agent Fee You Avoid:</span>
            <span className="text-sm font-semibold">
              ≈{formatPrice(property.savings.buyerAgentFee)}
            </span>
          </div>
          <div
            className={`flex justify-between items-center pt-2 border-t ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            <span className="text-sm font-bold">💡 Total Potential Savings:</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              ≈{formatPrice(property.savings.totalSavings)}
            </span>
          </div>
        </div>

        {/* Neighborhood Vibe */}
        <div
          className={`p-3 rounded mb-4 text-sm ${
            isDark ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <strong>Life Nearby:</strong> {property.vibe}
        </div>

        {/* Map Links */}
        <div className="space-y-1 mb-4 text-sm">
          <div className="font-semibold mb-2 flex items-center gap-2">
            <FaMapMarkerAlt /> Explore Around:
          </div>
          <div className="grid grid-cols-2 gap-1 ml-5">
            <a
              href={createMapUrl(
                property.property_address.property_address,
                property.property_address.city,
                property.property_address.state
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              🗺 Open Map
            </a>
            <a
              href={createStreetViewUrl(
                property.property_address.property_address,
                property.property_address.city,
                property.property_address.state
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              👁 Street View
            </a>
            <a
              href={createNearbySearchUrl(
                'schools',
                property.property_address.property_address,
                property.property_address.city,
                property.property_address.state
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              🎓 Nearby Schools
            </a>
            <a
              href={createNearbySearchUrl(
                'parks',
                property.property_address.property_address,
                property.property_address.city,
                property.property_address.state
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              🌳 Parks & Trails
            </a>
            <a
              href={createNearbySearchUrl(
                'restaurants',
                property.property_address.property_address,
                property.property_address.city,
                property.property_address.state
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline col-span-2"
            >
              🍽 Restaurants & Cafes
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Start Offer Button - Primary CTA (only for supported states) */}
          {property.supportsOffers && (
            <a
              href={`https://offer.homebuyme.com/partners/${property.partner_alias}/${property.partner_site_alias}?property_id=${property.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 text-white text-center rounded-lg font-bold transition-colors flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            >
              <FaDollarSign />
              🚀 Start Your Offer Now
              <FaExternalLinkAlt className="text-sm" />
            </a>
          )}

          {/* View Details Button - Secondary Action */}
          <a
            href={property.partner_site_property_website}
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full py-3 px-4 text-white text-center rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              property.supportsOffers
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
            }`}
          >
            <FaExternalLinkAlt />
            View Property Details
          </a>

          {/* Advisory Mode Notice */}
          {!property.supportsOffers && (
            <div className="text-xs text-center opacity-75 space-y-1">
              <p>
                📍 <em>Offer creation not yet supported in {property.property_address.state}</em>
              </p>
              <p className="text-purple-600 dark:text-purple-400 font-semibold">
                Full service available in WA & CA
              </p>
            </div>
          )}
        </div>

        {/* User Notes */}
        {property.notes && (
          <div
            className={`mt-4 p-2 rounded text-sm ${
              isDark ? 'bg-gray-700' : 'bg-blue-50'
            }`}
          >
            <strong>Your Notes:</strong> {property.notes}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyListing() {
  const toolOutput = useToolOutput();
  const theme = useTheme();
  const isDark = theme === 'dark';

  if (!toolOutput || !toolOutput.properties) {
    return (
      <div
        className={`p-8 text-center ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}
      >
        <LoadingSpinner />
        <p className="mt-4">Loading properties...</p>
      </div>
    );
  }

  const { properties, expansionMessage, pagination } = toolOutput;

  if (properties.length === 0) {
    return (
      <div
        className={`p-8 text-center ${
          isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        <p className="text-xl mb-4">No properties found</p>
        {expansionMessage && (
          <div
            className={`mt-4 p-4 rounded ${
              isDark ? 'bg-gray-800' : 'bg-blue-50'
            }`}
            dangerouslySetInnerHTML={{ __html: expansionMessage.replace(/\n/g, '<br />') }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-6 ${
        isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Expansion Message */}
      {expansionMessage && (
        <div
          className={`mb-6 p-4 rounded ${
            isDark ? 'bg-gray-800' : 'bg-blue-50'
          }`}
          dangerouslySetInnerHTML={{ __html: expansionMessage.replace(/\n/g, '<br />') }}
        />
      )}

      {/* Header */}
      <h2 className="text-2xl font-bold mb-6">
        {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Found
      </h2>

      {/* Property Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Pagination Info */}
      {pagination && (
        <div
          className={`mt-6 text-center text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <p>
            Showing {Math.min((pagination.page - 1) * pagination.per_page + 1, pagination.total_items)} -{' '}
            {Math.min(pagination.page * pagination.per_page, pagination.total_items)} of{' '}
            {pagination.total_items} properties
          </p>
          {pagination.has_next && (
            <p className="mt-2">Say "see more" to load more properties</p>
          )}
        </div>
      )}
    </div>
  );
}

// Widget root component
function PropertyWidget() {
  return (
    <StrictMode>
      <style>{cssContent}</style>
      <PropertyListing />
    </StrictMode>
  );
}

// Mount the widget
const rootElement = document.getElementById('property-widget-root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<PropertyWidget />);
} else {
  console.error('Property widget root element not found');
}

