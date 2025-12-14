import axios from 'axios';

export interface BarcodeLookupResult {
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  image?: string;
  price?: number; // Estimated price if available
  source: 'openfoodfacts' | 'upcitemdb' | 'barcodelookup';
}

/**
 * Lookup product information from external barcode databases
 * Tries multiple free APIs in order of preference
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
  if (!barcode || barcode.trim().length < 8) {
    return null;
  }

  const cleanBarcode = barcode.trim();

  // Try Open Food Facts first (free, open source, good for food products)
  try {
    const offResult = await lookupOpenFoodFacts(cleanBarcode);
    if (offResult) {
      return offResult;
    }
  } catch (error) {
    console.log('[Barcode Lookup] Open Food Facts failed:', error);
  }

  // Try UPCitemdb (free, good coverage)
  try {
    const upcResult = await lookupUPCitemdb(cleanBarcode);
    if (upcResult) {
      return upcResult;
    }
  } catch (error) {
    console.log('[Barcode Lookup] UPCitemdb failed:', error);
  }

  // Try Barcode Lookup API (free tier available)
  try {
    const blResult = await lookupBarcodeLookup(cleanBarcode);
    if (blResult) {
      return blResult;
    }
  } catch (error) {
    console.log('[Barcode Lookup] Barcode Lookup API failed:', error);
  }

  return null;
}

/**
 * Lookup product from Open Food Facts API
 * Free, open source, good for food products
 */
async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { timeout: 5000 }
    );

    if (response.data?.status === 1 && response.data?.product) {
      const product = response.data.product;
      
      return {
        name: product.product_name || product.product_name_en || product.abbreviated_product_name || 'Unknown Product',
        description: product.generic_name || product.product_name || undefined,
        brand: product.brands || product.brand || undefined,
        category: product.categories || product.categories_tags?.[0] || undefined,
        image: product.image_url || product.image_front_url || undefined,
        source: 'openfoodfacts',
      };
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error('[Open Food Facts] Lookup error:', error.message);
    }
  }
  return null;
}

/**
 * Lookup product from UPCitemdb API
 * Free API with good coverage
 */
async function lookupUPCitemdb(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    const response = await axios.get(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { timeout: 5000 }
    );

    if (response.data?.code === 'OK' && response.data?.items?.length > 0) {
      const item = response.data.items[0];
      
      return {
        name: item.title || item.description || 'Unknown Product',
        description: item.description || undefined,
        brand: item.brand || undefined,
        category: item.category || undefined,
        image: item.images?.[0] || undefined,
        price: item.lowest_recorded_price ? item.lowest_recorded_price / 100 : undefined,
        source: 'upcitemdb',
      };
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error('[UPCitemdb] Lookup error:', error.message);
    }
  }
  return null;
}

/**
 * Lookup product from Barcode Lookup API
 * Free tier available, requires API key for production (optional)
 */
async function lookupBarcodeLookup(barcode: string): Promise<BarcodeLookupResult | null> {
  try {
    // Using the free public endpoint (no API key required, but rate limited)
    const response = await axios.get(
      `https://api.barcodelookup.com/v3/products?barcode=${barcode}`,
      {
        headers: {
          // Note: For production, you'd want to add an API key here
          // 'Authorization': `Bearer YOUR_API_KEY`
        },
        timeout: 5000,
      }
    );

    if (response.data?.products?.length > 0) {
      const product = response.data.products[0];
      
      return {
        name: product.product_name || product.title || 'Unknown Product',
        description: product.description || undefined,
        brand: product.brand || undefined,
        category: product.category || undefined,
        image: product.images?.[0] || undefined,
        price: product.stores?.[0]?.price ? parseFloat(product.stores[0].price) : undefined,
        source: 'barcodelookup',
      };
    }
  } catch (error: any) {
    // This API requires authentication for most requests, so failures are expected
    if (error.response?.status !== 401 && error.response?.status !== 404) {
      console.error('[Barcode Lookup API] Lookup error:', error.message);
    }
  }
  return null;
}

