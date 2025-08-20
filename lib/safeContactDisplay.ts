// lib/safeContactDisplay.ts
// Production-ready contact display utilities based on GPT-5 recommendations

export interface SafeContact {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  number?: string | null; // For backward compatibility
}

export interface SafeDisplayResult {
  displayName: string;
  initials: string;
  primaryHandle: string;
  avatarFallback: string;
  isEmpty: boolean;
}

/**
 * Safely derive display information from a contact that may be null/undefined
 * Handles all edge cases and provides consistent fallbacks
 */
export function safeContactDisplay(
  contact: SafeContact | null | undefined, 
  fallbackHandle?: string | null
): SafeDisplayResult {
  // Handle completely null/undefined contact
  if (!contact) {
    const handle = fallbackHandle?.trim() || '';
    const displayName = handle || 'Unknown Contact';
    return {
      displayName,
      initials: handle ? handle[0]?.toUpperCase() || '?' : '?',
      primaryHandle: handle,
      avatarFallback: displayName,
      isEmpty: !handle
    };
  }

  // Derive display name with priority fallbacks
  const displayName = 
    contact.name?.trim() ||
    [contact.firstName?.trim(), contact.lastName?.trim()].filter(Boolean).join(' ') ||
    contact.company?.trim() ||
    contact.email?.trim() ||
    contact.phone?.trim() ||
    contact.number?.trim() ||
    fallbackHandle?.trim() ||
    'Unknown Contact';

  // Generate initials safely
  const initials = (() => {
    if (!displayName || displayName === 'Unknown Contact') return '?';
    const words = displayName.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0][0]?.toUpperCase() || '?';
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  })();

  // Primary handle for contact operations
  const primaryHandle = 
    contact.phone?.trim() || 
    contact.number?.trim() || 
    contact.email?.trim() || 
    fallbackHandle?.trim() || 
    '';

  return {
    displayName,
    initials,
    primaryHandle,
    avatarFallback: displayName,
    isEmpty: false
  };
}

/**
 * Safe array filtering for contact lists
 * Filters out null/undefined items and validates contact structure
 */
export function safeContactFilter<T extends SafeContact>(
  contacts: (T | null | undefined)[]
): T[] {
  return contacts.filter((contact): contact is T => {
    return contact != null && (
      contact.id != null || 
      contact.name != null || 
      contact.email != null || 
      contact.phone != null ||
      contact.number != null
    );
  });
}

/**
 * Safe contact search with normalized matching
 */
export function safeContactSearch(
  contacts: SafeContact[],
  searchQuery: string | null | undefined
): SafeContact[] {
  if (!searchQuery?.trim()) return contacts;
  
  const query = searchQuery.toLowerCase().trim();
  
  return contacts.filter(contact => {
    if (!contact) return false;
    
    const searchableText = [
      contact.name,
      contact.firstName,
      contact.lastName,
      contact.company,
      contact.email,
      contact.phone,
      contact.number
    ]
      .filter(Boolean)
      .map(text => text?.toLowerCase().trim())
      .join(' ');

    return searchableText.includes(query);
  });
}

/**
 * Convert legacy contact format to safe format
 * Handles existing database records that may have inconsistent structure
 */
export function normalizeLegacyContact(legacyContact: any): SafeContact | null {
  if (!legacyContact || typeof legacyContact !== 'object') return null;

  return {
    id: legacyContact.id || undefined,
    name: legacyContact.name || undefined,
    firstName: legacyContact.firstName || legacyContact.first_name || undefined,
    lastName: legacyContact.lastName || legacyContact.last_name || undefined,
    email: legacyContact.email || undefined,
    phone: legacyContact.phone || legacyContact.phoneNumber || undefined,
    company: legacyContact.company || legacyContact.organization || undefined,
    number: legacyContact.number || undefined
  };
}