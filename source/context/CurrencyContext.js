import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../resources/data/Constants';

export const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Common currency symbols map (matches web version)
export const CURRENCY_SYMBOLS = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  CHF: 'CHF',
  AED: 'AED',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  BRL: 'R$',
  KRW: '₩',
  THB: '฿',
  NGN: '₦',
  KES: 'KSh',
  GHS: 'GH₵',
  CLP: '$',
  COP: '$',
  MXN: '$',
  ARS: '$',
  PHP: '₱',
  VND: '₫',
  IDR: 'Rp',
  MYR: 'RM',
  PLN: 'zł',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  CZK: 'Kč',
  HUF: 'Ft',
  ILS: '₪',
  TRY: '₺',
  RUB: '₽',
  SAR: '﷼',
  BWP: 'P',
  NAD: 'N$',
  MUR: '₨',
  EGP: 'E£',
};

// Friendly currency names
export const CURRENCY_NAMES = {
  ZAR: 'South African Rand',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  CHF: 'Swiss Franc',
  AED: 'UAE Dirham',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  NZD: 'New Zealand Dollar',
  BRL: 'Brazilian Real',
  KRW: 'South Korean Won',
  THB: 'Thai Baht',
  NGN: 'Nigerian Naira',
  KES: 'Kenyan Shilling',
  GHS: 'Ghanaian Cedi',
  CLP: 'Chilean Peso',
  COP: 'Colombian Peso',
  MXN: 'Mexican Peso',
  ARS: 'Argentine Peso',
  PHP: 'Philippine Peso',
  VND: 'Vietnamese Dong',
  IDR: 'Indonesian Rupiah',
  MYR: 'Malaysian Ringgit',
  PLN: 'Polish Zloty',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  ILS: 'Israeli Shekel',
  TRY: 'Turkish Lira',
  RUB: 'Russian Ruble',
  SAR: 'Saudi Riyal',
  BWP: 'Botswanan Pula',
  NAD: 'Namibian Dollar',
  MUR: 'Mauritian Rupee',
  EGP: 'Egyptian Pound',
};

// Currencies that conventionally do not use fractional/decimal subdivisions
export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX']);

// Mapping from currency to country for flags
export const CURRENCY_TO_COUNTRY = {
  ZAR: 'ZA', USD: 'US', EUR: 'EU', GBP: 'GB', INR: 'IN', AUD: 'AU', CAD: 'CA', JPY: 'JP',
  CNY: 'CN', CHF: 'CH', AED: 'AE', SGD: 'SG', HKD: 'HK', NZD: 'NZ', BRL: 'BR', KRW: 'KR',
  THB: 'TH', NGN: 'NG', KES: 'KE', GHS: 'GH', CLP: 'CL', COP: 'CO', MXN: 'MX', ARS: 'AR',
  PHP: 'PH', VND: 'VN', IDR: 'ID', MYR: 'MY', PLN: 'PL', SEK: 'SE', NOK: 'NO', DKK: 'DK',
  CZK: 'CZ', HUF: 'HU', ILS: 'IL', TRY: 'TR', RUB: 'RU', SAR: 'SA', BWP: 'BW', NAD: 'NA',
  MUR: 'MU', EGP: 'EG',
};

// Common country list with ISO-2 codes and names (matches web)
export const ALL_COUNTRIES = [
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'BW', name: 'Botswana', currency: 'BWP' },
  { code: 'NA', name: 'Namibia', currency: 'NAD' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'RU', name: 'Russia', currency: 'RUB' },
];

export const getCountryFlagUri = (code) => {
  if (!code) return 'https://flagcdn.com/w40/za.png';
  const clean = String(code).trim().toLowerCase();
  return `https://flagcdn.com/w40/${clean}.png`;
};

export const getCountryForCurrency = (currCode) => {
  if (!currCode) return 'ZA';
  const upper = String(currCode).trim().toUpperCase();
  return CURRENCY_TO_COUNTRY[upper] || upper.slice(0, 2);
};

export const getCurrencySymbol = (currCode) => {
  if (!currCode) return 'R';
  return CURRENCY_SYMBOLS[currCode] || currCode;
};

export const getCurrencyForCountryCode = (countryCode) => {
  if (!countryCode) return 'ZAR';
  const code = String(countryCode).trim().toUpperCase();
  const matched = ALL_COUNTRIES.find((c) => c.code === code);
  if (matched?.currency) return matched.currency;
  const euroCountries = new Set([
    'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'PT', 'AT', 'IE', 'FI', 'GR', 'CY',
    'EE', 'LV', 'LT', 'LU', 'MT', 'SK', 'SI', 'MC', 'VA', 'SM', 'ME', 'HR', 'AX'
  ]);
  if (euroCountries.has(code)) return 'EUR';
  return code === 'ZA' ? 'ZAR' : 'USD';
};

// Fallback rates if network is offline on first launch
const DEFAULT_RATES = {
  USD: 1,
  ZAR: 18.5,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  AUD: 1.52,
  CAD: 1.36,
  AED: 3.67,
  CHF: 0.90,
  SGD: 1.35,
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('ZAR');
  const [countryCode, setCountryCode] = useState('ZA');
  const [countryName, setCountryName] = useState('South Africa');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  // Initialize from storage or backend
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 1. Read stored preferences and manual flags
        const [savedCountry, savedCurrency, isManualCountry, isManualCurrency] = await Promise.all([
          AsyncStorage.getItem('userCountry'),
          AsyncStorage.getItem('userCurrency'),
          AsyncStorage.getItem('userCountryManual'),
          AsyncStorage.getItem('userCurrencyManual'),
        ]);

        if (savedCountry && isMounted) {
          try {
            const parsed = JSON.parse(savedCountry);
            if (parsed.country_code) setCountryCode(parsed.country_code);
            if (parsed.country_name) setCountryName(parsed.country_name);
          } catch (e) {}
        }

        if (savedCurrency && isMounted) {
          setCurrency(savedCurrency);
        }

        // 2. Fetch live exchange rates from backend
        try {
          const res = await axios.get(`${API_BASE}/config/currency-rates`, { timeout: 8000 });
          if (res.data && res.data.rates && isMounted) {
            setRates(res.data.rates);
          }
        } catch (ratesErr) {
          console.log('[Currency] Could not fetch live rates, using cached/default rates:', ratesErr?.message);
        }

        // 3. Automated Geo-IP detection if not manually locked
        const needsCountryDetect = isManualCountry !== 'true';
        const needsCurrencyDetect = isManualCurrency !== 'true';

        if (needsCountryDetect || needsCurrencyDetect) {
          let detectedCode = null;
          let detectedName = null;
          let detectedCurr = null;

          // Tier A: First-party backend endpoint (unblocked by ad-blockers, uses Cloudflare edge header in prod)
          try {
            const geoRes = await axios.get(`${API_BASE}/config/geo-lookup`, { timeout: 4000 });
            if (geoRes.data && geoRes.data.success && geoRes.data.country_code) {
              detectedCode = geoRes.data.country_code;
              detectedName = geoRes.data.country_name;
              detectedCurr = geoRes.data.currency;
            }
          } catch (apiErr) {
            // Backend unreachable, proceed to fallback
          }

          // Tier B: Secondary fallback via external IP services
          if (!detectedCode) {
            try {
              const extRes = await axios.get('https://api.country.is', { timeout: 3500 });
              if (extRes.data && extRes.data.country) {
                detectedCode = extRes.data.country.toUpperCase();
              }
            } catch {
              try {
                const ipwhoRes = await axios.get('https://ipwho.is/', { timeout: 3500 });
                if (ipwhoRes.data && ipwhoRes.data.success && ipwhoRes.data.country_code) {
                  detectedCode = ipwhoRes.data.country_code.toUpperCase();
                  detectedName = ipwhoRes.data.country;
                }
              } catch {}
            }
          }

          if (detectedCode && isMounted) {
            const matched = ALL_COUNTRIES.find((c) => c.code === detectedCode);
            const finalName = detectedName || matched?.name || detectedCode;
            const finalCurr = detectedCurr || matched?.currency || getCurrencyForCountryCode(detectedCode);

            if (needsCountryDetect) {
              setCountryCode(detectedCode);
              setCountryName(finalName);
              await AsyncStorage.setItem(
                'userCountry',
                JSON.stringify({ country_code: detectedCode, country_name: finalName })
              );
            }

            if (needsCurrencyDetect && finalCurr) {
              setCurrency(finalCurr);
              await AsyncStorage.setItem('userCurrency', finalCurr);
            }
          }
        }
      } catch (err) {
        console.warn('[Currency] Initialization notice:', err?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const changeCurrency = useCallback(async (newCurrency) => {
    const code = String(newCurrency || '').trim().toUpperCase();
    if (!code) return;
    setCurrency(code);
    await AsyncStorage.setItem('userCurrency', code);
    await AsyncStorage.setItem('userCurrencyManual', 'true');
  }, []);

  const changeCountry = useCallback(async (newCountryCode, newCountryName) => {
    const code = String(newCountryCode || '').trim().toUpperCase();
    const matched = ALL_COUNTRIES.find((c) => c.code === code);
    const name = newCountryName || matched?.name || code;
    setCountryCode(code);
    setCountryName(name);

    await AsyncStorage.setItem(
      'userCountry',
      JSON.stringify({ country_code: code, country_name: name })
    );
    await AsyncStorage.setItem('userCountryManual', 'true');

    // Auto-pair currency if user hasn't explicitly locked a custom currency
    const isManualCurr = await AsyncStorage.getItem('userCurrencyManual');
    if (isManualCurr !== 'true') {
      const autoCurr = matched?.currency || getCurrencyForCountryCode(code);
      if (autoCurr) {
        setCurrency(autoCurr);
        await AsyncStorage.setItem('userCurrency', autoCurr);
      }
    }
  }, []);

  // Convert an amount in ZAR to the active currency and format with symbol
  const formatPrice = useCallback(
    (amountInZar, targetCurr = currency) => {
      if (amountInZar === null || amountInZar === undefined || amountInZar === '') {
        return `${CURRENCY_SYMBOLS[targetCurr] || targetCurr} 0`;
      }

      const numericStr = String(amountInZar).replace(/[^0-9.-]/g, '');
      const num = parseFloat(numericStr);
      if (isNaN(num)) return `${CURRENCY_SYMBOLS[targetCurr] || targetCurr} 0`;

      const curr = targetCurr || currency || 'ZAR';
      const symbol = CURRENCY_SYMBOLS[curr] || curr;
      const isZeroDec = ZERO_DECIMAL_CURRENCIES.has(curr);

      // Base currency ZAR (no conversion needed)
      if (curr === 'ZAR' || !rates || !rates['ZAR'] || !rates[curr]) {
        const formatted = num.toLocaleString('en-US', {
          minimumFractionDigits: num % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });
        return `${symbol} ${formatted}`;
      }

      // Convert: ZAR -> USD -> Target Currency
      const rateZarToUsd = 1 / rates['ZAR'];
      const amountInUsd = num * rateZarToUsd;
      const converted = amountInUsd * rates[curr];

      const formatted = converted.toLocaleString('en-US', {
        minimumFractionDigits: isZeroDec ? 0 : 2,
        maximumFractionDigits: isZeroDec ? 0 : 2,
      });

      return `${symbol} ${formatted}`;
    },
    [currency, rates]
  );

  // Return numeric converted value
  const convertPrice = useCallback(
    (amountInZar, targetCurr = currency) => {
      if (!amountInZar && amountInZar !== 0) return 0;
      const numericStr = String(amountInZar).replace(/[^0-9.-]/g, '');
      const num = parseFloat(numericStr);
      if (isNaN(num)) return 0;

      const curr = targetCurr || currency || 'ZAR';
      if (curr === 'ZAR' || !rates || !rates['ZAR'] || !rates[curr]) {
        return num;
      }

      const rateZarToUsd = 1 / rates['ZAR'];
      const amountInUsd = num * rateZarToUsd;
      return amountInUsd * rates[curr];
    },
    [currency, rates]
  );

  const availableCurrencies = useMemo(() => {
    const set = new Set(['ZAR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'AUD', 'CAD', 'SGD', 'CHF', 'JPY']);
    if (rates) {
      Object.keys(rates).forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }, [rates]);

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

  const value = {
    currency,
    currencySymbol,
    countryCode,
    countryName,
    currencyFlagCountry: CURRENCY_TO_COUNTRY[currency] || countryCode || 'ZA',
    currencyToCountry: CURRENCY_TO_COUNTRY,
    rates,
    loading,
    countries: ALL_COUNTRIES,
    availableCurrencies,
    changeCurrency,
    changeCountry,
    formatPrice,
    convertPrice,
    getCountryFlagUri,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};
