// API response validation to prevent runtime errors
export function validateContactsResponse(data: any): any[] {
  // Log the raw response for debugging
  console.log('[API Validation] Raw contacts response:', data);
  
  // Handle various response formats
  if (!data) {
    console.warn('[API Validation] No data received');
    return [];
  }
  
  // If it's already an array
  if (Array.isArray(data)) {
    return data.filter(item => {
      if (!item) {
        console.warn('[API Validation] Null item in contacts array');
        return false;
      }
      return true;
    });
  }
  
  // If it's wrapped in a 'contacts' property
  if (data.contacts && Array.isArray(data.contacts)) {
    return validateContactsResponse(data.contacts);
  }
  
  // If it's wrapped in a 'data' property
  if (data.data && Array.isArray(data.data)) {
    return validateContactsResponse(data.data);
  }
  
  // If it's a single contact, wrap in array
  if (typeof data === 'object' && !Array.isArray(data)) {
    console.warn('[API Validation] Single contact object received, wrapping in array');
    return [data];
  }
  
  console.error('[API Validation] Unexpected response format:', typeof data, data);
  return [];
}

// Validate individual contact objects
export function validateContact(contact: any): boolean {
  if (!contact || typeof contact !== 'object') {
    console.error('[API Validation] Invalid contact:', contact);
    return false;
  }
  
  // Check for required fields (adjust based on your schema)
  const hasRequiredFields = 
    (contact.id !== undefined) ||
    (contact.email !== undefined) ||
    (contact.phone !== undefined) ||
    (contact.name !== undefined);
    
  if (!hasRequiredFields) {
    console.error('[API Validation] Contact missing required fields:', contact);
    return false;
  }
  
  return true;
}