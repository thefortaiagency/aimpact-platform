import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import { organizations } from '@/lib/db/schema-communications';
import { googleBusinessData } from '@/lib/db/schema-crm-enhanced';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
  price_level?: number;
}

export class GoogleBusinessEnrichmentService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Places API key not configured');
    }
  }

  /**
   * Search for a business by name and location
   */
  async searchBusiness(businessName: string, location?: string): Promise<GooglePlaceResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      // First, search for the place
      const searchQuery = location ? `${businessName} ${location}` : businessName;
      const searchUrl = `${this.baseUrl}/findplacefromtext/json`;
      const searchParams = new URLSearchParams({
        input: searchQuery,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address,geometry',
        key: this.apiKey,
      });

      const searchResponse = await fetch(`${searchUrl}?${searchParams}`);
      const searchData = await searchResponse.json();

      if (searchData.status !== 'OK' || !searchData.candidates?.length) {
        console.log('No results found for:', searchQuery);
        return null;
      }

      const placeId = searchData.candidates[0].place_id;

      // Get detailed information about the place
      const detailsUrl = `${this.baseUrl}/details/json`;
      const detailsParams = new URLSearchParams({
        place_id: placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'formatted_phone_number',
          'website',
          'rating',
          'user_ratings_total',
          'opening_hours',
          'reviews',
          'photos',
          'types',
          'price_level',
          'url'
        ].join(','),
        key: this.apiKey,
      });

      const detailsResponse = await fetch(`${detailsUrl}?${detailsParams}`);
      const detailsData = await detailsResponse.json();

      if (detailsData.status !== 'OK') {
        console.error('Error fetching place details:', detailsData.status);
        return null;
      }

      return detailsData.result;
    } catch (error) {
      console.error('Error searching Google Business:', error);
      return null;
    }
  }

  /**
   * Parse operating hours into a structured format
   */
  private parseOperatingHours(openingHours?: any): Record<string, any> {
    if (!openingHours?.periods) return {};

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours: Record<string, any> = {};

    openingHours.periods.forEach((period: any) => {
      const day = daysOfWeek[period.open.day];
      hours[day] = {
        open: this.formatTime(period.open.time),
        close: period.close ? this.formatTime(period.close.time) : '24:00',
        is24Hours: !period.close,
      };
    });

    return hours;
  }

  /**
   * Format time from HHMM to HH:MM
   */
  private formatTime(time: string): string {
    if (!time || time.length !== 4) return time;
    return `${time.slice(0, 2)}:${time.slice(2)}`;
  }

  /**
   * Get photo URLs from photo references
   */
  private getPhotoUrls(photos?: any[]): Array<{ url: string; caption?: string }> {
    if (!photos || !this.apiKey) return [];

    return photos.slice(0, 5).map(photo => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${this.apiKey}`,
      caption: undefined,
    }));
  }

  /**
   * Enrich an organization with Google Business data
   */
  async enrichOrganization(organizationId: string): Promise<boolean> {
    try {
      // Get organization details
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org) {
        console.error('Organization not found:', organizationId);
        return false;
      }

      // Search for the business on Google
      const googleData = await this.searchBusiness(org.name, org.address || undefined);

      if (!googleData) {
        console.log('No Google Business data found for:', org.name);
        return false;
      }

      // Check if we already have data for this organization
      const [existing] = await db
        .select()
        .from(googleBusinessData)
        .where(eq(googleBusinessData.organizationId, organizationId))
        .limit(1);

      const enrichedData = {
        organizationId,
        googlePlaceId: googleData.place_id,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${googleData.place_id}`,
        businessName: googleData.name,
        businessTypes: googleData.types || [],
        formattedAddress: googleData.formatted_address,
        coordinates: googleData.geometry?.location ? {
          lat: googleData.geometry.location.lat,
          lng: googleData.geometry.location.lng,
        } : null,
        phoneNumber: googleData.formatted_phone_number,
        website: googleData.website,
        operatingHours: this.parseOperatingHours(googleData.opening_hours),
        rating: googleData.rating,
        totalReviews: googleData.user_ratings_total,
        recentReviews: googleData.reviews?.slice(0, 5).map((review: any) => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: new Date(review.time * 1000).toISOString(),
        })) || [],
        photos: this.getPhotoUrls(googleData.photos),
        priceLevel: googleData.price_level,
        attributes: {}, // Would need additional API calls to get attributes
        popularTimes: {}, // Would need additional API calls to get popular times
        lastSyncedAt: new Date().toISOString(),
        syncStatus: 'success',
        syncErrors: [],
      };

      if (existing) {
        // Update existing record
        await db
          .update(googleBusinessData)
          .set(enrichedData)
          .where(eq(googleBusinessData.organizationId, organizationId));
      } else {
        // Insert new record
        await db
          .insert(googleBusinessData)
          .values(enrichedData);
      }

      // Also update some organization fields if they're missing
      const updates: any = {};
      if (!org.phone && googleData.formatted_phone_number) {
        updates.phone = googleData.formatted_phone_number;
      }
      if (!org.website && googleData.website) {
        updates.website = googleData.website;
      }
      if (!org.address && googleData.formatted_address) {
        updates.address = googleData.formatted_address;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(organizations)
          .set(updates)
          .where(eq(organizations.id, organizationId));
      }

      console.log('Successfully enriched organization with Google Business data:', org.name);
      return true;
    } catch (error) {
      console.error('Error enriching organization:', error);
      return false;
    }
  }

  /**
   * Batch enrich multiple organizations
   */
  async batchEnrichOrganizations(organizationIds: string[]): Promise<void> {
    console.log(`Starting batch enrichment for ${organizationIds.length} organizations`);
    
    for (const orgId of organizationIds) {
      try {
        await this.enrichOrganization(orgId);
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enrich organization ${orgId}:`, error);
      }
    }
    
    console.log('Batch enrichment completed');
  }

  /**
   * Auto-discover and enrich organizations without Google data
   */
  async autoDiscoverAndEnrich(): Promise<void> {
    try {
      // Find organizations without Google Business data
      const orgsWithoutData = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .leftJoin(googleBusinessData, eq(organizations.id, googleBusinessData.organizationId))
        .where(eq(googleBusinessData.id, null))
        .limit(10); // Process 10 at a time to avoid rate limiting

      if (orgsWithoutData.length === 0) {
        console.log('All organizations already have Google Business data');
        return;
      }

      console.log(`Found ${orgsWithoutData.length} organizations without Google Business data`);
      
      const orgIds = orgsWithoutData.map(org => org.id);
      await this.batchEnrichOrganizations(orgIds);
    } catch (error) {
      console.error('Error in auto-discover and enrich:', error);
    }
  }
}

// Export a singleton instance
export const googleBusinessEnrichment = new GoogleBusinessEnrichmentService();