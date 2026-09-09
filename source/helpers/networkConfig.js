import { Platform, NativeModules, AppState } from 'react-native';
import axios from 'axios';

// Extract the host IP where Metro bundled the JavaScript from
const getMetroHost = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/:\/\/([^:/]+)/);
      if (match && match[1]) {
        const host = match[1];
        if (host !== '127.0.0.1' && host !== 'localhost') {
          return host;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const metroHost = getMetroHost();

// Ordered list of candidate backend URLs (deployed production API is always primary)
export const getCandidateBases = () => {
  const list = [];

  // Primary: Always deployed production Grand Store API first
  list.push('https://api.grandstoreglobal.com/api');

  if (activeApiBase && activeApiBase !== 'https://api.grandstoreglobal.com/api') {
    list.push(activeApiBase);
  }

  // Fallback local candidates for development testing only
  if (__DEV__) {
    list.push('http://127.0.0.1:5000/api');
    list.push('http://localhost:5000/api');

    if (metroHost) {
      list.push(`http://${metroHost}:5000/api`);
    }

    list.push('http://192.168.1.102:5000/api');
    list.push('http://192.168.1.9:5000/api');

    if (Platform.OS === 'android') {
      list.push('http://10.0.2.2:5000/api');
    }
  }

  return [...new Set(list.filter(Boolean))];
};

// Default active API base is ALWAYS the deployed production endpoint
let activeApiBase = 'https://api.grandstoreglobal.com/api';
let isProbing = false;

export const getActiveApiBase = () => activeApiBase;

export const getActiveServerHost = () => {
  return activeApiBase.replace(/\/api\/?$/, '');
};

export const setActiveApiBase = (newBase) => {
  if (!newBase || typeof newBase !== 'string') return;
  // In production / release builds, never switch to localhost or 127.0.0.1
  if (!__DEV__ && (newBase.includes('localhost') || newBase.includes('127.0.0.1') || newBase.includes('10.0.2.2'))) {
    return;
  }
  const clean = newBase.replace(/\/+$/, '');
  const formatted = clean.endsWith('/api') ? clean : `${clean}/api`;
  if (activeApiBase !== formatted) {
    activeApiBase = formatted;
    console.log('[NetworkConfig] Active API Base set to:', activeApiBase);
  }
};

// Check if a URL belongs to the backend server
const isBackendUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  // Never intercept external third-party services
  if (
    url.startsWith('https://res.cloudinary.com') ||
    url.startsWith('https://maps.googleapis.com') ||
    url.startsWith('https://ik.imagekit.io') ||
    url.startsWith('https://sandbox.payfast.co.za') ||
    url.startsWith('https://www.payfast.co.za') ||
    url.startsWith('https://storelocator.postnet.co.za') ||
    url.startsWith('https://www.googleapis.com') ||
    url.startsWith('https://identitytoolkit.googleapis.com') ||
    url.startsWith('https://securetoken.google.com')
  ) {
    return false;
  }
  return (
    url.includes('api.grandstoreglobal.com') ||
    url.includes(':5000') ||
    url.startsWith('/api') ||
    url.startsWith('/') ||
    getCandidateBases().some((b) => url.startsWith(b))
  );
};

// Replace candidate base inside a URL with target base
const replaceBaseInUrl = (url, targetBase) => {
  if (!url || typeof url !== 'string') return url;
  for (const cand of getCandidateBases()) {
    if (url.startsWith(cand)) {
      return url.replace(cand, targetBase);
    }
    const candHost = cand.replace(/\/api$/, '');
    const targetHost = targetBase.replace(/\/api$/, '');
    if (url.startsWith(candHost)) {
      return url.replace(candHost, targetHost);
    }
  }
  if (url.startsWith('/api')) {
    return `${targetBase.replace(/\/api$/, '')}${url}`;
  }
  if (url.startsWith('/')) {
    return `${targetBase}${url}`;
  }
  return url;
};

// Lightweight background probe to find the working candidate
export const probeBackend = async () => {
  if (isProbing) return activeApiBase;
  isProbing = true;

  const candidates = getCandidateBases();
  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await (global._rawFetch || fetch)(`${base}/health`, {
        method: 'GET',
        signal: controller.signal,
        _skipRewrite: true,
      });
      clearTimeout(timeoutId);

      if (res && res.status >= 200 && res.status < 500) {
        setActiveApiBase(base);
        isProbing = false;
        return base;
      }
    } catch (e) {
      // Try next candidate
    }
  }

  isProbing = false;
  return activeApiBase;
};

let interceptorsInitialized = false;

// Setup global Axios interceptors and global fetch wrapper
export const initNetworkResilience = () => {
  if (interceptorsInitialized) return;
  interceptorsInitialized = true;

  // Preserve raw original fetch before wrapping
  if (typeof global.fetch === 'function' && !global._rawFetch) {
    global._rawFetch = global.fetch;
  }

  // 1. Axios Request Interceptor: Route backend requests to active working base
  axios.interceptors.request.use((config) => {
    if (config._skipRewrite) {
      return config;
    }
    if (config.url && isBackendUrl(config.url)) {
      config.url = replaceBaseInUrl(config.url, activeApiBase);
    }
    return config;
  });

  // 2. Axios Response Interceptor: Fallback to other candidates on connection failure
  axios.interceptors.response.use(
    (response) => {
      if (response?.config?.url && isBackendUrl(response.config.url)) {
        for (const cand of getCandidateBases()) {
          if (response.config.url.startsWith(cand)) {
            setActiveApiBase(cand);
            break;
          }
        }
      }
      return response;
    },
    async (error) => {
      const originalConfig = error.config;

      // Only retry if no response was received (network failure / connection refused / timeout)
      if (
        !originalConfig ||
        originalConfig._retryFailed ||
        originalConfig._skipRewrite ||
        error.response ||
        !isBackendUrl(originalConfig.url)
      ) {
        return Promise.reject(error);
      }

      originalConfig._triedCandidates = originalConfig._triedCandidates || [];
      originalConfig._triedCandidates.push(activeApiBase);

      const remainingCandidates = getCandidateBases().filter(
        (c) => !originalConfig._triedCandidates.includes(c)
      );

      for (const candidate of remainingCandidates) {
        originalConfig._triedCandidates.push(candidate);
        try {
          const newUrl = replaceBaseInUrl(originalConfig.url, candidate);
          const newConfig = {
            ...originalConfig,
            url: newUrl,
            _skipRewrite: true, // Prevent request interceptor from overriding candidate
            timeout: Math.max(originalConfig.timeout || 8000, 6000),
          };

          const res = await axios(newConfig);
          if (res) {
            setActiveApiBase(candidate);
            return res;
          }
        } catch (retryErr) {
          if (retryErr.response) {
            setActiveApiBase(candidate);
            return Promise.reject(retryErr);
          }
        }
      }

      originalConfig._retryFailed = true;
      return Promise.reject(error);
    }
  );

  // 3. Global Fetch wrapper for screens using window/global fetch
  if (typeof global.fetch === 'function') {
    const rawFetch = global._rawFetch || global.fetch;

    global.fetch = async (input, init) => {
      if (init?._skipRewrite) {
        return rawFetch(input, init);
      }

      const isStringUrl = typeof input === 'string';
      if (!isStringUrl || !isBackendUrl(input)) {
        return rawFetch(input, init);
      }

      const initialUrl = replaceBaseInUrl(input, activeApiBase);
      try {
        const response = await rawFetch(initialUrl, init);
        return response;
      } catch (err) {
        const candidates = getCandidateBases().filter((c) => c !== activeApiBase);
        for (const candidate of candidates) {
          try {
            const nextUrl = replaceBaseInUrl(input, candidate);
            const res = await rawFetch(nextUrl, init);
            if (res) {
              setActiveApiBase(candidate);
              return res;
            }
          } catch (retryErr) {
            // continue trying
          }
        }
        throw err;
      }
    };
  }

  // 4. AppState listener: auto-reconnect whenever app comes to foreground
  try {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        probeBackend();
      }
    });
  } catch (e) {}

  // 5. Periodic background heartbeat every 15s to keep activeApiBase fresh
  setInterval(() => {
    probeBackend();
  }, 15000);

  // Launch initial background probe
  probeBackend();
};

