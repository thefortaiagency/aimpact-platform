// Twilio Phone Number Configuration
export interface PhoneNumber {
  number: string;
  formatted: string;
  location: string;
  label: string;
  primary?: boolean;
  department?: string;
}

export const TWILIO_PHONE_NUMBERS: PhoneNumber[] = [
  {
    number: '+12602647730',
    formatted: '(260) 264-7730',
    location: 'Fort Wayne, IN',
    label: 'Main Line',
    primary: true,
    department: 'general'
  },
  {
    number: '+12604527615',
    formatted: '(260) 452-7615',
    location: 'Fort Wayne, IN',
    label: 'Secondary',
    primary: false,
    department: 'general'
  },
  {
    number: '+12609605474',
    formatted: '(260) 960-5474',
    location: 'Roanoke, IN',
    label: 'Support Line',
    department: 'support'
  },
  {
    number: '+12602647259',
    formatted: '(260) 264-7259',
    location: 'Fort Wayne, IN',
    label: 'Sales Line',
    department: 'sales'
  },
  {
    number: '+12602649265',
    formatted: '(260) 264-9265',
    location: 'Fort Wayne, IN',
    label: 'Direct Line',
    department: 'direct'
  }
];

// Get all phone numbers from environment
export function getPhoneNumbers(): PhoneNumber[] {
  const envNumbers = process.env.TWILIO_PHONE_NUMBERS?.split(',') || [];
  
  // If we have environment numbers, use those with our configuration
  if (envNumbers.length > 0) {
    return TWILIO_PHONE_NUMBERS.filter(phone => 
      envNumbers.includes(phone.number)
    );
  }
  
  // Fallback to primary number only
  const primaryNumber = process.env.TWILIO_PHONE_NUMBER;
  if (primaryNumber) {
    const configuredNumber = TWILIO_PHONE_NUMBERS.find(p => p.number === primaryNumber);
    if (configuredNumber) {
      return [configuredNumber];
    }
    
    // Create a default entry if not in our config
    return [{
      number: primaryNumber,
      formatted: formatPhoneNumber(primaryNumber),
      location: 'Unknown',
      label: 'Primary',
      primary: true,
      department: 'general'
    }];
  }
  
  return TWILIO_PHONE_NUMBERS;
}

// Get primary phone number
export function getPrimaryPhoneNumber(): PhoneNumber | undefined {
  return getPhoneNumbers().find(p => p.primary) || getPhoneNumbers()[0];
}

// Get phone number by department
export function getPhoneNumberByDepartment(department: string): PhoneNumber | undefined {
  return getPhoneNumbers().find(p => p.department === department);
}

// Format phone number for display
export function formatPhoneNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number;
}

// Get phone number for specific use case
export function getPhoneNumberForUseCase(useCase: 'support' | 'sales' | 'general' | 'direct'): string {
  const phone = getPhoneNumberByDepartment(useCase);
  return phone?.number || getPrimaryPhoneNumber()?.number || process.env.TWILIO_PHONE_NUMBER || '';
}

// Check if a number belongs to our organization
export function isOurPhoneNumber(number: string): boolean {
  const cleaned = number.replace(/\D/g, '');
  return getPhoneNumbers().some(phone => {
    const phoneClean = phone.number.replace(/\D/g, '');
    return phoneClean === cleaned || phoneClean === '1' + cleaned || '1' + phoneClean === cleaned;
  });
}