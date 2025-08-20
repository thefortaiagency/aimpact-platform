import { db } from '@/lib/db/drizzle';
import { 
  organizations, 
  contacts, 
  phoneNumbers, 
  emailAddresses,
  communications 
} from '@/lib/db/schema-communications';
import { eq, or, and, sql, desc } from 'drizzle-orm';
import { parsePhoneNumber, type E164Number } from 'libphonenumber-js';

export interface MatchResult {
  organizationId: string | null;
  contactId: string | null;
  isNewContact: boolean;
  isNewOrganization: boolean;
  matchType: 'email' | 'phone' | 'domain' | 'none';
  confidence: 'high' | 'medium' | 'low';
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  name?: string;
  domain?: string;
}

export class ClientMatcher {
  /**
   * Main method to match a communication to a client
   */
  async matchCommunication(info: ContactInfo): Promise<MatchResult> {
    // Try email match first (highest confidence)
    if (info.email) {
      const emailMatch = await this.matchByEmail(info.email);
      if (emailMatch.contactId) {
        return emailMatch;
      }
    }

    // Try phone match
    if (info.phone) {
      const phoneMatch = await this.matchByPhone(info.phone);
      if (phoneMatch.contactId) {
        return phoneMatch;
      }
    }

    // Try domain match for organization
    if (info.email && !info.phone) {
      const domainMatch = await this.matchByDomain(info.email);
      if (domainMatch.organizationId) {
        // Create new contact within the organization
        const newContact = await this.createContact({
          ...info,
          organizationId: domainMatch.organizationId
        });
        return {
          ...domainMatch,
          contactId: newContact.id,
          isNewContact: true,
          matchType: 'domain',
          confidence: 'medium'
        };
      }
    }

    // No match found - create new organization and contact
    const result = await this.createNewClientAndContact(info);
    return result;
  }

  /**
   * Match by exact email address
   */
  private async matchByEmail(email: string): Promise<MatchResult> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // First check the emailAddresses tracking table
    const emailRecord = await db
      .select()
      .from(emailAddresses)
      .where(eq(emailAddresses.emailAddress, normalizedEmail))
      .limit(1);

    if (emailRecord.length > 0 && emailRecord[0].contactId) {
      // Get the contact and organization
      const contact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, emailRecord[0].contactId))
        .limit(1);

      if (contact.length > 0) {
        return {
          organizationId: contact[0].organizationId,
          contactId: contact[0].id,
          isNewContact: false,
          isNewOrganization: false,
          matchType: 'email',
          confidence: 'high'
        };
      }
    }

    // Fallback: check contacts table directly
    const contact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, normalizedEmail))
      .limit(1);

    if (contact.length > 0) {
      // Update emailAddresses tracking table
      await this.upsertEmailAddress(normalizedEmail, contact[0].organizationId, contact[0].id);
      
      return {
        organizationId: contact[0].organizationId,
        contactId: contact[0].id,
        isNewContact: false,
        isNewOrganization: false,
        matchType: 'email',
        confidence: 'high'
      };
    }

    return {
      organizationId: null,
      contactId: null,
      isNewContact: false,
      isNewOrganization: false,
      matchType: 'none',
      confidence: 'low'
    };
  }

  /**
   * Match by phone number (with normalization)
   */
  private async matchByPhone(phone: string): Promise<MatchResult> {
    let normalizedPhone: string;
    
    try {
      const parsed = parsePhoneNumber(phone, 'US');
      normalizedPhone = parsed?.number as string || phone;
    } catch {
      // If parsing fails, just clean the number
      normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = `+1${normalizedPhone}`;
      }
    }

    // Check phoneNumbers tracking table
    const phoneRecord = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.phoneNumber, normalizedPhone))
      .limit(1);

    if (phoneRecord.length > 0 && phoneRecord[0].contactId) {
      const contact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, phoneRecord[0].contactId))
        .limit(1);

      if (contact.length > 0) {
        return {
          organizationId: contact[0].organizationId,
          contactId: contact[0].id,
          isNewContact: false,
          isNewOrganization: false,
          matchType: 'phone',
          confidence: 'high'
        };
      }
    }

    // Fallback: check contacts table
    const contact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, normalizedPhone))
      .limit(1);

    if (contact.length > 0) {
      // Update phoneNumbers tracking table
      await this.upsertPhoneNumber(normalizedPhone, contact[0].organizationId, contact[0].id);
      
      return {
        organizationId: contact[0].organizationId,
        contactId: contact[0].id,
        isNewContact: false,
        isNewOrganization: false,
        matchType: 'phone',
        confidence: 'high'
      };
    }

    return {
      organizationId: null,
      contactId: null,
      isNewContact: false,
      isNewOrganization: false,
      matchType: 'none',
      confidence: 'low'
    };
  }

  /**
   * Match by email domain to find organization
   */
  private async matchByDomain(email: string): Promise<MatchResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || this.isPersonalEmailDomain(domain)) {
      return {
        organizationId: null,
        contactId: null,
        isNewContact: false,
        isNewOrganization: false,
        matchType: 'none',
        confidence: 'low'
      };
    }

    // Check if any organization has this domain
    const org = await db
      .select()
      .from(organizations)
      .where(sql`LOWER(${organizations.domain}) = ${domain}`)
      .limit(1);

    if (org.length > 0) {
      return {
        organizationId: org[0].id,
        contactId: null,
        isNewContact: false,
        isNewOrganization: false,
        matchType: 'domain',
        confidence: 'medium'
      };
    }

    // Check if any existing contact has this domain
    const contactWithDomain = await db
      .select()
      .from(contacts)
      .where(sql`LOWER(${contacts.email}) LIKE ${`%@${domain}`}`)
      .limit(1);

    if (contactWithDomain.length > 0) {
      return {
        organizationId: contactWithDomain[0].organizationId,
        contactId: null,
        isNewContact: false,
        isNewOrganization: false,
        matchType: 'domain',
        confidence: 'medium'
      };
    }

    return {
      organizationId: null,
      contactId: null,
      isNewContact: false,
      isNewOrganization: false,
      matchType: 'none',
      confidence: 'low'
    };
  }

  /**
   * Create new organization and contact
   */
  private async createNewClientAndContact(info: ContactInfo): Promise<MatchResult> {
    // Determine organization name and type
    const orgInfo = this.inferOrganizationInfo(info);
    
    // Create organization
    const newOrg = await db.insert(organizations).values({
      name: orgInfo.name,
      domain: orgInfo.domain || undefined,
      industry: orgInfo.type === 'business' ? 'Unknown' : undefined,
      isActive: true
    }).returning();

    // Create contact
    const newContact = await this.createContact({
      ...info,
      organizationId: newOrg[0].id
    });

    return {
      organizationId: newOrg[0].id,
      contactId: newContact.id,
      isNewContact: true,
      isNewOrganization: true,
      matchType: 'none',
      confidence: 'low'
    };
  }

  /**
   * Create a new contact
   */
  private async createContact(info: ContactInfo & { organizationId: string }) {
    const contactName = info.name || this.inferNameFromEmail(info.email) || 'Unknown Contact';
    
    // Split name into first and last
    const nameParts = contactName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const newContact = await db.insert(contacts).values({
      organizationId: info.organizationId,
      firstName,
      lastName,
      email: info.email?.toLowerCase().trim(),
      phone: info.phone,
      isActive: true
    }).returning();

    // Update tracking tables
    if (info.email) {
      await this.upsertEmailAddress(info.email, info.organizationId, newContact[0].id);
    }
    if (info.phone) {
      await this.upsertPhoneNumber(info.phone, info.organizationId, newContact[0].id);
    }

    return newContact[0];
  }

  /**
   * Upsert email address to tracking table
   */
  private async upsertEmailAddress(email: string, organizationId: string, contactId: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    await db.insert(emailAddresses)
      .values({
        emailAddress: normalizedEmail,
        domain: normalizedEmail.split('@')[1] || '',
        organizationId,
        contactId
      })
      .onConflictDoUpdate({
        target: emailAddresses.emailAddress,
        set: {
          organizationId,
          contactId,
          updatedAt: sql`now()`
        }
      });
  }

  /**
   * Upsert phone number to tracking table
   */
  private async upsertPhoneNumber(phone: string, organizationId: string, contactId: string) {
    let normalizedPhone = phone;
    
    try {
      const parsed = parsePhoneNumber(phone, 'US');
      normalizedPhone = parsed?.number as string || phone;
    } catch {
      normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = `+1${normalizedPhone}`;
      }
    }

    await db.insert(phoneNumbers)
      .values({
        phoneNumber: normalizedPhone,
        organizationId,
        contactId
      })
      .onConflictDoUpdate({
        target: phoneNumbers.phoneNumber,
        set: {
          organizationId,
          contactId,
          updatedAt: sql`now()`
        }
      });
  }

  /**
   * Infer organization info from contact info
   */
  private inferOrganizationInfo(info: ContactInfo) {
    let name = 'Unknown Organization';
    let domain = '';
    let type: 'business' | 'individual' = 'individual';

    if (info.email) {
      domain = info.email.split('@')[1]?.toLowerCase() || '';
      
      if (!this.isPersonalEmailDomain(domain)) {
        // Business email - use domain as org name
        name = this.domainToOrgName(domain);
        type = 'business';
      } else if (info.name) {
        // Personal email with name - use name as org
        name = `${info.name} (Personal)`;
      }
    } else if (info.name) {
      name = `${info.name} (Personal)`;
    }

    return { name, domain, type };
  }

  /**
   * Convert domain to organization name
   */
  private domainToOrgName(domain: string): string {
    // Remove common TLDs and clean up
    const name = domain
      .replace(/\.(com|org|net|edu|gov|io|co|us|uk|ca)(\.|$).*/, '')
      .replace(/[.-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return name || domain;
  }

  /**
   * Infer name from email address
   */
  private inferNameFromEmail(email?: string): string | null {
    if (!email) return null;
    
    const localPart = email.split('@')[0];
    
    // Try to extract name from common patterns
    const patterns = [
      /^([a-z]+)\.([a-z]+)$/i, // firstname.lastname
      /^([a-z]+)_([a-z]+)$/i,  // firstname_lastname
      /^([a-z]+)([A-Z][a-z]+)$/ // firstnameLastname
    ];

    for (const pattern of patterns) {
      const match = localPart.match(pattern);
      if (match) {
        return `${match[1].charAt(0).toUpperCase() + match[1].slice(1)} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`;
      }
    }

    // Just capitalize the local part
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  /**
   * Check if domain is a personal email provider
   */
  private isPersonalEmailDomain(domain: string): boolean {
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'me.com', 'mac.com', 'live.com',
      'msn.com', 'mail.com', 'protonmail.com', 'ymail.com',
      'rocketmail.com', 'att.net', 'sbcglobal.net', 'verizon.net',
      'comcast.net', 'earthlink.net', 'qq.com', '163.com'
    ];
    
    return personalDomains.includes(domain.toLowerCase());
  }

  /**
   * Get recent communications for a contact to help with matching
   */
  async getRecentCommunications(contactId: string, limit: number = 10) {
    return await db
      .select()
      .from(communications)
      .where(eq(communications.contactId, contactId))
      .orderBy(desc(communications.timestamp))
      .limit(limit);
  }
}

// Export singleton instance
export const clientMatcher = new ClientMatcher();