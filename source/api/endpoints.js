/**
 * The Grand Store - Unified API & Endpoint Configuration
 * Base URL: https://api.grandstoreglobal.com
 * API Root: https://api.grandstoreglobal.com/api
 */

// Primary Base URL
export const BASE_URL = 'https://api.grandstoreglobal.com';

// API Base URL (Standard REST root)
export const API_BASE = `${BASE_URL}/api`;

// Server Base URL (for static files, sockets, root redirects)
export const SERVER_BASE = BASE_URL;

// Image CDN / Delivery Base URLs
export const IMAGEKIT_BASE_URL = 'https://ik.imagekit.io/thegrandstore/images/products/';
export const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/';

/**
 * Construct an absolute API URL for any endpoint path
 * @param {string} endpoint - e.g. '/products' or 'products/123'
 * @returns {string} - e.g. 'https://api.grandstoreglobal.com/api/products'
 */
export const getApiUrl = (endpoint = '') => {
  if (!endpoint) return API_BASE;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

/**
 * Construct an absolute server host URL (without /api)
 * @param {string} path - e.g. '/uploads/receipt.pdf'
 * @returns {string} - e.g. 'https://api.grandstoreglobal.com/uploads/receipt.pdf'
 */
export const getServerUrl = (path = '') => {
  if (!path) return BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

/**
 * Build URL with query parameters
 * @param {string} endpoint 
 * @param {object} params 
 * @returns {string}
 */
export const buildUrl = (endpoint, params = {}) => {
  const base = getApiUrl(endpoint);
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, val);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
};

/**
 * Complete API Endpoints Registry
 */
export const ENDPOINTS = {
  // ==========================================
  // AUTH & USER IDENTITY
  // ==========================================
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    CUSTOMER_LOGOUT: '/auth/logout', // Alias for backwards-compat
    GOOGLE: '/auth/google',
    GOOGLE_LOGIN: '/auth/google', // Primary Google Sign-in endpoint
    APPLE: '/auth/apple',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    MAGIC_LINK: '/auth/magic-link',
    VERIFY_MAGIC_LINK: '/auth/verify-magic-link',
    CONVERT_GUEST: '/auth/convert-guest',
    FORGOT_PASSWORD: '/auth/forgotpassword',
    RESET_PASSWORD: (token) => `/auth/resetpassword/${token}`,
    VERIFY_EMAIL: '/auth/verify-email',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile',
    BANKING: '/auth/banking',
    UPDATE_BANKING: '/auth/banking',
    REFERRALS: '/auth/referrals',
    CALENDAR_ACTIVITIES: '/auth/calendar-activities',
    CHANGE_PASSWORD: '/auth/profile', // Profile update handles password
  },

  // ==========================================
  // PRODUCTS & CATALOG
  // ==========================================
  PRODUCTS: {
    LIST: '/products',
    DETAILS: (id) => `/products/${id}`,
    BY_CATEGORY: (cat) => `/products?category=${encodeURIComponent(cat)}`,
    PRODUCTS_BY_WINE_CAT: '/productsByWineCat',
    CATEGORIES: '/categories',
    ATTRIBUTES: '/attributes',
    SHOP: '/shop',
    SPECIAL_OFFERS: '/special-offers',
  },

  // ==========================================
  // CART & WISHLIST
  // ==========================================
  CART: {
    SHOW: '/cart/show',
    ADD: '/cart/addToCart',
    REMOVE: '/cart/removeFromCart',
    UPDATE: '/cart/updateCart',
    CLEAR: '/cart/clearCart',
  },
  WISHLIST: {
    GET: '/customer/wishlist',
    ADD: '/customer/wishlist/add',
    REMOVE: '/customer/wishlist/remove',
    COUNT: '/customer/wishlist/count',
  },

  // ==========================================
  // ORDERS, CHECKOUT & PAYMENTS
  // ==========================================
  ORDERS: {
    CREATE: '/orders',
    MY_ORDERS: '/orders/myorders',
    DETAILS: (id) => `/orders/${id}`,
    PAY: (id) => `/orders/${id}/pay`,
    UPLOAD_POP: (id) => `/orders/${id}/bank-transfer/upload`,
    CANCEL: (id) => `/orders/${id}/cancel`,
    TRACK: (id) => `/orders/${id}/track`,
  },
  CHECKOUT: {
    QUOTE: '/checkout/quote',
    CALCULATE: '/checkout/calculate',
    PAYFAST_PAY: '/payfast/pay',
    PAYFAST_NOTIFY: '/payfast/notify',
  },
  COUPONS: {
    VALIDATE: '/coupons/validate',
    APPLY: '/coupons/apply',
    VENDOR_COUPONS: '/coupons/vendor',
  },
  POSTNET: {
    LOCATOR: '/postnet/locator',
    LOCATIONS: '/postnet/locator', // Alias
    SEARCH: '/postnet/locator',
  },

  // ==========================================
  // LIVE AUCTIONS & RARE LOTS
  // ==========================================
  AUCTIONS: {
    LIST: '/auction',
    ALL_AUCTIONS: '/auctions',
    LOT_DETAILS: (id) => `/auction/${id}`,
    LIVE_STATUS: '/auction/live-status',
    PLACE_BID: (lotId) => `/auction/${lotId}/bid`,
    WATCHLIST_TOGGLE: (lotId) => `/auction/${lotId}/watchlist`,
    BIDDER_STATUS: '/auction/bidder/status',
    BIDDER_VERIFY: '/auction/bidder/verify',
    BIDDER_DEPOSIT: '/auction/bidder/deposit',
    USER_DASHBOARD: '/auction/user/dashboard',
    MY_BIDS: '/auction/user/dashboard',
    WON_LOTS: '/auction/user/won-lots',
    PAY: (lotId) => `/auction/${lotId}/pay`,
    CHECKOUT: '/auction/checkout',
  },

  // ==========================================
  // EVENTS, TASTINGS & VIP PASSES
  // ==========================================
  EVENTS: {
    LIST: '/events',
    DETAILS: (id) => `/events/${id}`,
    BOOK: (id) => `/events/${id}/book`,
    MY_TICKETS: '/events/bookings/my-tickets',
    MY_PASSES: '/events/bookings/my-tickets', // Alias
    TICKETS: '/events/tickets',
    CALENDAR: '/events/calendar',
    UPLOAD_POP: (bookingId) => `/events/bookings/${bookingId}/bank-transfer/upload`,
  },

  // ==========================================
  // LOYALTY & SUPER COINS
  // ==========================================
  SUPER_COINS: {
    WALLET: '/super-coins/wallet',
    SETTINGS: '/super-coins/settings',
    HISTORY: '/super-coins/history',
    REDEEM: '/super-coins/redeem',
  },

  // ==========================================
  // SOCIAL PROOF & REVIEWS
  // ==========================================
  REVIEWS: {
    LIST: '/social-proof/reviews',
    PRODUCT_REVIEWS: (productId) => `/social-proof/reviews/product/${encodeURIComponent(productId)}`,
    SUBMIT: '/social-proof/reviews',
  },
  TESTIMONIALS: {
    LIST: '/testimonials',
  },

  // ==========================================
  // PLATFORM SETTINGS & UTILITIES
  // ==========================================
  SETTINGS: {
    PUBLIC: '/settings/public',
  },
  CHATBOT: {
    MESSAGE: '/chatbot',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
  },
  ENQUIRIES: {
    TRADE: '/trade-enquiries',
    CIGAR: '/cigar-enquiries',
    NEWSLETTER: '/newsletter/subscribe',
    HOST_APPLICATION: '/host-applications',
  },
  HEALTH: '/health',
};

export default {
  BASE_URL,
  API_BASE,
  SERVER_BASE,
  IMAGEKIT_BASE_URL,
  CLOUDINARY_BASE_URL,
  getApiUrl,
  getServerUrl,
  buildUrl,
  ENDPOINTS,
};
