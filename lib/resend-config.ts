// Resend Email Service Configuration

// Domains that are verified in Resend and can be used for sending
export const RESEND_VERIFIED_DOMAINS = [
  'thefortaiagency.com'  // Primary verified domain
];

// Check if an email address can be used with Resend
export function isResendVerifiedEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return RESEND_VERIFIED_DOMAINS.includes(domain);
}

// Get a Resend-compatible sender email
export function getResendSenderEmail(preferredEmail?: string): string {
  // If preferred email is verified, use it
  if (preferredEmail && isResendVerifiedEmail(preferredEmail)) {
    return preferredEmail;
  }
  
  // Otherwise use the default from environment
  const defaultEmail = process.env.RESEND_FROM_EMAIL || 'contact@thefortaiagency.com';
  
  // Verify the default is actually valid
  if (!isResendVerifiedEmail(defaultEmail)) {
    console.error('Default Resend email is not from a verified domain:', defaultEmail);
  }
  
  return defaultEmail;
}

// Format email for Resend (with name if provided)
export function formatResendEmail(email: string, name?: string): string {
  if (name) {
    // Resend format: "Name <email@domain.com>"
    return `${name} <${email}>`;
  }
  return email;
}

// Validate and prepare email for Resend
export function prepareEmailForResend(
  fromEmail: string,
  fromName?: string
): { from: string; replyTo?: string } {
  const verifiedEmail = getResendSenderEmail(fromEmail);
  
  // If the user wanted a different email but it's not verified,
  // use verified email for "from" and original for "reply-to"
  if (fromEmail !== verifiedEmail && fromEmail) {
    return {
      from: formatResendEmail(verifiedEmail, fromName),
      replyTo: fromEmail
    };
  }
  
  return {
    from: formatResendEmail(verifiedEmail, fromName)
  };
}