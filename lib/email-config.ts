// Email Configuration and Domain Management

export interface EmailDomain {
  domain: string;
  type: 'personal' | 'shared' | 'system';
  allowedUsers?: string[]; // Email prefixes allowed to use this domain
  requiresAuth?: boolean;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
  };
}

export interface EmailAlias {
  email: string;
  name: string;
  domain: string;
  isDefault?: boolean;
  isShared?: boolean;
  allowedUsers?: string[];
}

// Configured email domains for the platform
// Note: These must be verified in Resend for sending
export const EMAIL_DOMAINS: EmailDomain[] = [
  {
    domain: 'thefortaiagency.com',
    type: 'system',
    allowedUsers: ['contact', 'noreply', 'support', 'aoberlin'],
  },
  {
    domain: 'thefortaiagency.ai',
    type: 'personal',
    allowedUsers: ['aoberlin', 'team', 'support'],
  },
  {
    domain: 'aimpactnexus.ai',
    type: 'personal',
    allowedUsers: ['aoberlin', 'support'],
  }
];

// Shared email addresses that multiple users can send from
export const SHARED_EMAILS: EmailAlias[] = [
  {
    email: 'contact@thefortaiagency.com',
    name: 'Contact Team',
    domain: 'thefortaiagency.com',
    isShared: true,
    allowedUsers: ['aoberlin'], // Who can use this shared email
  },
  {
    email: 'support@thefortaiagency.com',
    name: 'Support Team',
    domain: 'thefortaiagency.com',
    isShared: true,
    allowedUsers: ['aoberlin', 'team'],
  }
];

// User-specific email configurations
export const USER_EMAIL_CONFIGS: Record<string, EmailAlias[]> = {
  'aoberlin': [
    {
      email: 'aoberlin@thefortaiagency.com',
      name: 'Andy Oberlin',
      domain: 'thefortaiagency.com',
      isDefault: true,
    },
    {
      email: 'aoberlin@thefortaiagency.ai',
      name: 'Andy Oberlin',
      domain: 'thefortaiagency.ai',
    },
    {
      email: 'aoberlin@aimpactnexus.ai',
      name: 'Andy Oberlin - AImpact Nexus',
      domain: 'aimpactnexus.ai',
    },
  ],
};

// Validate if a user can send from a specific email address
export function canUserSendFrom(userEmail: string, fromEmail: string): boolean {
  const username = userEmail.split('@')[0].toLowerCase();
  const fromUsername = fromEmail.split('@')[0].toLowerCase();
  const fromDomain = fromEmail.split('@')[1]?.toLowerCase();

  // User can always send from their own email
  if (userEmail.toLowerCase() === fromEmail.toLowerCase()) {
    return true;
  }

  // Check user-specific configurations
  const userConfig = USER_EMAIL_CONFIGS[username];
  if (userConfig?.some(alias => alias.email.toLowerCase() === fromEmail.toLowerCase())) {
    return true;
  }

  // Check shared emails
  const sharedEmail = SHARED_EMAILS.find(
    e => e.email.toLowerCase() === fromEmail.toLowerCase()
  );
  if (sharedEmail) {
    return !sharedEmail.allowedUsers || 
           sharedEmail.allowedUsers.includes(username);
  }

  // Check domain-level permissions
  const domain = EMAIL_DOMAINS.find(d => d.domain === fromDomain);
  if (domain) {
    if (domain.type === 'shared') {
      return true;
    }
    if (domain.allowedUsers?.includes(fromUsername)) {
      return true;
    }
  }

  return false;
}

// Get all email aliases available to a user
export function getUserEmailAliases(userEmail: string): EmailAlias[] {
  const username = userEmail.split('@')[0].toLowerCase();
  const aliases: EmailAlias[] = [];

  // Add the user's own email
  aliases.push({
    email: userEmail,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    domain: userEmail.split('@')[1],
  });

  // Add user-specific configurations
  const userConfig = USER_EMAIL_CONFIGS[username];
  if (userConfig) {
    aliases.push(...userConfig);
  }

  // Add shared emails the user has access to
  SHARED_EMAILS.forEach(sharedEmail => {
    if (!sharedEmail.allowedUsers || sharedEmail.allowedUsers.includes(username)) {
      aliases.push(sharedEmail);
    }
  });

  // Remove duplicates
  const uniqueEmails = new Set<string>();
  return aliases.filter(alias => {
    const key = alias.email.toLowerCase();
    if (uniqueEmails.has(key)) {
      return false;
    }
    uniqueEmails.add(key);
    return true;
  });
}

// Get default sender email for a user
export function getDefaultSenderEmail(userEmail: string): string {
  const aliases = getUserEmailAliases(userEmail);
  const defaultAlias = aliases.find(a => a.isDefault);
  return defaultAlias?.email || userEmail;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Format display name for email
export function formatEmailDisplay(email: string, name?: string): string {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}