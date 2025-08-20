// Andy's Business Hub Permissions
export const ANDY_AUTHORIZED_EMAILS = [
  'andy@example.com',
  'admin@example.com' // Admins can also access
];

export function isAuthorizedForAndyHub(email: string | null | undefined): boolean {
  if (!email) return false;
  return ANDY_AUTHORIZED_EMAILS.includes(email.toLowerCase());
}