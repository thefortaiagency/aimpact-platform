// lib/contactUtils.ts

export type Contact = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  emails?: string[];
  phones?: string[];
  company?: string;
  title?: string;
  handles?: { type?: 'email' | 'phone' | string; value: string }[];
};

export type DisplayField = { key: string; label: string; value: string };

const stripScheme = (s: string) => s.replace(/^\s*(mailto:|tel:|sms:)/i, '').trim();
const lc = (s: string) => s.trim().toLowerCase();
const isEmailLike = (s: string) => /@/.test(s);
const isPhoneLike = (s: string) => /\d/.test(s) && stripScheme(s).replace(/[^\d]/g, '').length >= 7;

export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const e = stripScheme(input).replace(/\s+/g, '');
  if (!isEmailLike(e)) return null;
  return e.toLowerCase();
}

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = stripScheme(input);
  const hasPlus = /^\s*\+/.test(raw);
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  return hasPlus ? `+${digits}` : digits;
}

export function displayFields(contact: Contact): DisplayField[] {
  const fullName =
    contact.name?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    '';
  const email =
    contact.emails?.find(Boolean)?.trim() ||
    contact.handles?.find(h => h.value && (h.type === 'email' || isEmailLike(h.value)))?.value?.trim() ||
    '';
  const phone =
    contact.phones?.find(Boolean)?.trim() ||
    contact.handles?.find(h => h.value && (h.type === 'phone' || isPhoneLike(h.value)))?.value?.trim() ||
    '';
  const fields: DisplayField[] = [];
  if (fullName) fields.push({ key: 'name', label: 'Name', value: fullName });
  if (email) fields.push({ key: 'email', label: 'Email', value: email });
  if (phone) fields.push({ key: 'phone', label: 'Phone', value: phone });
  if (contact.company) fields.push({ key: 'company', label: 'Company', value: contact.company });
  if (contact.title) fields.push({ key: 'title', label: 'Title', value: contact.title });
  return fields;
}

export function findContactByHandle(handle: string, contacts: Contact[]): Contact | undefined {
  const raw = stripScheme(handle);
  const nEmail = normalizeEmail(raw);
  const nPhone = normalizePhone(raw);
  const lowered = lc(raw);

  for (const c of contacts) {
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const otherSet = new Set<string>();

    c.emails?.forEach(e => {
      const n = normalizeEmail(e);
      if (n) emailSet.add(n);
    });
    c.phones?.forEach(p => {
      const n = normalizePhone(p);
      if (n) phoneSet.add(n);
    });
    c.handles?.forEach(h => {
      const v = h?.value;
      if (!v) return;
      if (h.type === 'email' || isEmailLike(v)) {
        const n = normalizeEmail(v);
        if (n) emailSet.add(n);
      } else if (h.type === 'phone' || isPhoneLike(v)) {
        const n = normalizePhone(v);
        if (n) phoneSet.add(n);
      } else {
        otherSet.add(lc(v));
      }
    });

    if ((nEmail && emailSet.has(nEmail)) || (nPhone && phoneSet.has(nPhone)) || otherSet.has(lowered)) {
      return c;
    }
  }
  return undefined;
}