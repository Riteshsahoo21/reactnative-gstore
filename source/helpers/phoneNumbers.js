import countries from './phoneCountries.json';

export const PHONE_COUNTRIES = countries;
export const DEFAULT_PHONE_COUNTRY = 'ZA';

const PRIMARY_MAP = {
  '+1': 'US',
  '+44': 'GB',
  '+7': 'RU',
  '+61': 'AU',
  '+358': 'FI',
  '+262': 'RE',
  '+590': 'GP',
};

// Pre-sort dial codes by length descending for greedy prefix matching
const sortedDialCodes = [...countries].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

export function findCountry(ref) {
  if (!ref) return null;
  const upper = String(ref).trim().toUpperCase();
  const lower = String(ref).trim().toLowerCase();
  return (
    countries.find(c => c.country === upper) ||
    countries.find(c => c.name.toLowerCase() === lower) ||
    null
  );
}

// Separate saved international numbers from the code shown in the selector.
export const splitPhoneNumber = (
  value = '',
  defaultCountry = DEFAULT_PHONE_COUNTRY,
) => {
  const def =
    findCountry(defaultCountry) ||
    countries.find(c => c.country === DEFAULT_PHONE_COUNTRY);
  const raw = String(value || '').trim();
  if (!raw) return {phoneCountry: def.country, phone: ''};

  const norm = raw.replace(/^00/, '+');
  if (norm.startsWith('+')) {
    const matches = sortedDialCodes.filter(c => norm.startsWith(c.dialCode));
    if (matches.length > 0) {
      const maxLen = matches[0].dialCode.length;
      const candidates = matches.filter(c => c.dialCode.length === maxLen);
      const primary = PRIMARY_MAP[matches[0].dialCode];
      const match =
        candidates.find(c => c.country === def.country) ||
        (primary && candidates.find(c => c.country === primary)) ||
        candidates[0];
      const rest = norm.slice(match.dialCode.length).replace(/^0+/, '');
      return {phoneCountry: match.country, phone: rest};
    }
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return {phoneCountry: def.country, phone: digits.replace(/^0/, '')};
  }
  return {phoneCountry: def.country, phone: digits || raw};
};

export const getCheckoutPhone = (phone, phoneCountry) => {
  if (!phoneCountry || typeof phone !== 'string') return null;
  const countryObj = findCountry(phoneCountry);
  if (!countryObj) return null;

  const raw = phone.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return null;

  const dialCodeDigits = countryObj.dialCode.replace(/\D/g, '');
  let national = digits;
  if (
    national.startsWith(dialCodeDigits) &&
    national.length > dialCodeDigits.length + 5
  ) {
    national = national.slice(dialCodeDigits.length);
  }
  national = national.replace(/^0+/, '');
  if (national.length < 5 || national.length > 14) return null;

  const fullNumber = countryObj.dialCode + national;
  return {
    phone: fullNumber,
    phoneNumber: fullNumber,
    phoneCountry: countryObj.country,
    phoneCountryCode: countryObj.dialCode,
  };
};
