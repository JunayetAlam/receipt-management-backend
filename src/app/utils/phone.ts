/**
 * Common country dial codes for fast lookup
 */
const COMMON_COUNTRY_CODES = [
  '+880', // Bangladesh
  '+971', // UAE
  '+966', // Saudi Arabia
  '+974', // Qatar
  '+968', // Oman
  '+965', // Kuwait
  '+91',  // India
  '+92',  // Pakistan
  '+60',  // Malaysia
  '+65',  // Singapore
  '+44',  // UK
  '+1',   // USA / Canada
  '+39',  // Italy
  '+49',  // Germany
  '+33',  // France
  '+61',  // Australia
];

export interface ParsedPhone {
  countryCode: string;
  phoneNumber: string;
}

/**
 * Normalizes and separates country code and national phone number.
 */
export const parsePhoneInput = (
  rawPhone: string,
  providedCountryCode?: string | null,
): ParsedPhone => {
  if (!rawPhone) {
    return {
      countryCode: providedCountryCode?.trim() || '+880',
      phoneNumber: '',
    };
  }

  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
  let countryCode = providedCountryCode?.trim() || '';

  // If phone starts with '+', extract country code
  if (cleaned.startsWith('+')) {
    for (const code of COMMON_COUNTRY_CODES) {
      if (cleaned.startsWith(code)) {
        countryCode = code;
        cleaned = cleaned.slice(code.length);
        break;
      }
    }
    if (!countryCode) {
      const match = cleaned.match(/^(\+\d{1,4})(\d+)$/);
      if (match) {
        countryCode = match[1];
        cleaned = match[2];
      }
    }
  } else if (cleaned.startsWith('880')) {
    countryCode = '+880';
    cleaned = cleaned.slice(3);
  }

  if (!countryCode) {
    countryCode = '+880';
  }

  if (!countryCode.startsWith('+')) {
    countryCode = `+${countryCode}`;
  }

  // If Bangladesh number has a leading 0, strip it for uniform storage
  if (countryCode === '+880' && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return {
    countryCode,
    phoneNumber: cleaned,
  };
};

/**
 * Returns possible database search variants for a phone number
 * to ensure legacy or alternative formats are cleanly matched.
 */
export const getPhoneLookupVariants = (
  countryCode: string,
  phoneNumber: string,
): string[] => {
  const cleaned = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
  const variants: string[] = [cleaned];

  if (countryCode === '+880') {
    if (cleaned.startsWith('0')) {
      variants.push(cleaned.slice(1));
    } else {
      variants.push(`0${cleaned}`);
    }
    variants.push(`+880${cleaned.startsWith('0') ? cleaned.slice(1) : cleaned}`);
    variants.push(`880${cleaned.startsWith('0') ? cleaned.slice(1) : cleaned}`);
  } else {
    variants.push(`${countryCode}${cleaned}`);
    variants.push(cleaned);
  }

  return Array.from(new Set(variants.filter(Boolean)));
};
