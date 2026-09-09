import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ENDPOINTS, getApiUrl } from '../api/endpoints';

let pollingInterval = null;
let lastUnreadCount = 0;
let cachedNotifications = [];

/**
 * Fetch notifications from the backend for the currently authenticated user
 */
export const fetchNotifications = async (limit = 30) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      lastUnreadCount = 0;
      cachedNotifications = [];
      DeviceEventEmitter.emit('notificationsUpdated', {
        notifications: [],
        unreadCount: 0,
      });
      return { notifications: [], unreadCount: 0 };
    }

    const response = await axios.get(getApiUrl(`${ENDPOINTS.NOTIFICATIONS.LIST}?limit=${limit}`), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 12000,
    });

    if (response?.data) {
      const notifications = Array.isArray(response.data.notifications)
        ? response.data.notifications
        : [];
      const unreadCount = typeof response.data.unreadCount === 'number'
        ? response.data.unreadCount
        : notifications.filter((n) => !n.isRead).length;

      lastUnreadCount = unreadCount;
      cachedNotifications = notifications;

      DeviceEventEmitter.emit('notificationsUpdated', {
        notifications,
        unreadCount,
      });

      return { notifications, unreadCount };
    }
  } catch (error) {
    // Silently capture during polling; return cached state
    console.warn('[NotificationService] Fetch error:', error?.message || error);
  }
  return { notifications: cachedNotifications, unreadCount: lastUnreadCount };
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (id) => {
  if (!id) return false;
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;

    // Optimistically update cached list
    cachedNotifications = cachedNotifications.map((n) =>
      (n._id === id || n.id === id ? { ...n, isRead: true } : n)
    );
    lastUnreadCount = Math.max(0, lastUnreadCount - 1);
    DeviceEventEmitter.emit('notificationsUpdated', {
      notifications: cachedNotifications,
      unreadCount: lastUnreadCount,
    });

    await axios.put(
      getApiUrl(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 5000,
      }
    );
    return true;
  } catch (err) {
    console.warn('[NotificationService] Mark read error:', err?.message || err);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;

    // Optimistic local update
    cachedNotifications = cachedNotifications.map((n) => ({ ...n, isRead: true }));
    lastUnreadCount = 0;
    DeviceEventEmitter.emit('notificationsUpdated', {
      notifications: cachedNotifications,
      unreadCount: 0,
    });

    await axios.put(
      getApiUrl(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 5000,
      }
    );
    return true;
  } catch (err) {
    console.warn('[NotificationService] Mark all read error:', err?.message || err);
    return false;
  }
};

/**
 * Delete a single notification
 */
export const deleteNotification = async (id) => {
  if (!id) return false;
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;

    const target = cachedNotifications.find((n) => n._id === id || n.id === id);
    const wasUnread = target && !target.isRead;

    cachedNotifications = cachedNotifications.filter((n) => n._id !== id && n.id !== id);
    if (wasUnread) {
      lastUnreadCount = Math.max(0, lastUnreadCount - 1);
    }

    DeviceEventEmitter.emit('notificationsUpdated', {
      notifications: cachedNotifications,
      unreadCount: lastUnreadCount,
    });

    await axios.delete(getApiUrl(ENDPOINTS.NOTIFICATIONS.DELETE(id)), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 5000,
    });
    return true;
  } catch (err) {
    console.warn('[NotificationService] Delete error:', err?.message || err);
    return false;
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return false;

    cachedNotifications = [];
    lastUnreadCount = 0;

    DeviceEventEmitter.emit('notificationsUpdated', {
      notifications: [],
      unreadCount: 0,
    });

    await axios.delete(getApiUrl(ENDPOINTS.NOTIFICATIONS.CLEAR_ALL), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 5000,
    });
    return true;
  } catch (err) {
    console.warn('[NotificationService] Clear all error:', err?.message || err);
    return false;
  }
};

/**
 * Start background polling timer
 */
export const startNotificationPolling = (intervalMs = 35000) => {
  stopNotificationPolling();
  fetchNotifications();
  pollingInterval = setInterval(() => {
    fetchNotifications();
  }, intervalMs);
};

/**
 * Stop background polling
 */
export const stopNotificationPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

/**
 * Format relative time strings (e.g. Just now, 5m ago, 2h ago, Yesterday)
 */
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Get category styling details (label, colors, emoji/icon) matching web luxury concept
 */
export const getNotificationTypeMeta = (type) => {
  switch (type) {
    case 'order':
      return {
        label: 'Order Update',
        color: '#10b981', // Emerald
        bgColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        iconName: 'package-variant-closed',
        badgeEmoji: '🛍️',
      };
    case 'delivery':
      return {
        label: 'Dispatch & Courier',
        color: '#38bdf8', // Sky blue
        bgColor: 'rgba(56, 189, 248, 0.12)',
        borderColor: 'rgba(56, 189, 248, 0.35)',
        iconName: 'truck-delivery',
        badgeEmoji: '🚚',
      };
    case 'auction':
      return {
        label: 'Vault Auction',
        color: '#f59e0b', // Amber gold
        bgColor: 'rgba(245, 158, 11, 0.14)',
        borderColor: 'rgba(245, 158, 11, 0.45)',
        iconName: 'gavel',
        badgeEmoji: '🏆',
      };
    case 'event':
      return {
        label: 'Tasting Event',
        color: '#f43f5e', // Rose
        bgColor: 'rgba(244, 63, 94, 0.12)',
        borderColor: 'rgba(244, 63, 94, 0.35)',
        iconName: 'calendar-star',
        badgeEmoji: '🎟️',
      };
    case 'maintenance_fee':
    case 'payout':
      return {
        label: 'Payment & Account',
        color: '#e1bd70', // Luxury gold
        bgColor: 'rgba(225, 189, 112, 0.12)',
        borderColor: 'rgba(225, 189, 112, 0.4)',
        iconName: 'credit-card-outline',
        badgeEmoji: '💳',
      };
    case 'birthday':
      return {
        label: 'VIP Reward',
        color: '#ec4899', // Pink
        bgColor: 'rgba(236, 72, 153, 0.12)',
        borderColor: 'rgba(236, 72, 153, 0.35)',
        iconName: 'gift-outline',
        badgeEmoji: '🎁',
      };
    default:
      return {
        label: 'Notice',
        color: '#d4af37', // Champagne Gold
        bgColor: 'rgba(212, 175, 55, 0.12)',
        borderColor: 'rgba(212, 175, 55, 0.35)',
        iconName: 'information-outline',
        badgeEmoji: '✨',
      };
  }
};

/**
 * Smart deep-link routing for notifications
 */
export const handleNotificationPress = (navigation, notification, onHandled) => {
  if (!notification || !navigation) return;

  // Mark as read in background
  if (!notification.isRead) {
    markNotificationAsRead(notification._id || notification.id);
  }

  if (typeof onHandled === 'function') {
    onHandled();
  }

  const { type, title, message, link, metadata } = notification;
  const combinedText = `${title || ''} ${message || ''}`.toLowerCase();

  // 1. Auction notifications
  if (type === 'auction' || combinedText.includes('auction') || combinedText.includes('bid')) {
    const lotId = metadata?.lotId || (link && link.split('/').pop());
    const isWon = combinedText.includes('won') || combinedText.includes('winner') || combinedText.includes('hammer');

    if (lotId) {
      navigation.navigate('AuctionLotDetails', {
        lotId,
        celebrate: isWon,
      });
      return;
    }

    if (isWon) {
      navigation.navigate('CustomerDashboard', { initialTab: 'bids' });
      return;
    }

    navigation.navigate('AuctionsHub');
    return;
  }

  // 2. Order & Delivery notifications
  if (type === 'order' || type === 'delivery' || combinedText.includes('order') || combinedText.includes('shipment')) {
    const orderId = metadata?.orderId || metadata?.id || (link && link.split('/').pop());
    if (orderId && typeof orderId === 'string' && orderId.length > 5) {
      navigation.navigate('OrderDetails', { orderId });
      return;
    }
    navigation.navigate('MyOrders');
    return;
  }

  // 3. Event notifications
  if (type === 'event' || combinedText.includes('event') || combinedText.includes('ticket')) {
    const eventId = metadata?.eventId || (link && link.split('/').pop());
    if (eventId) {
      navigation.navigate('EventDetails', { eventId });
      return;
    }
    navigation.navigate('EventsHub');
    return;
  }

  // 4. Maintenance / Vendor / Financials
  if (type === 'maintenance_fee' || type === 'payout' || combinedText.includes('payout')) {
    navigation.navigate('CustomerDashboard');
    return;
  }

  // 5. Fallback URL / Path parsing
  if (link && typeof link === 'string') {
    if (link.includes('auction')) {
      navigation.navigate('AuctionsHub');
      return;
    }
    if (link.includes('event')) {
      navigation.navigate('EventsHub');
      return;
    }
    if (link.includes('order')) {
      navigation.navigate('MyOrders');
      return;
    }
    if (link.includes('shop') || link.includes('product')) {
      navigation.navigate('Shop');
      return;
    }
  }

  // Default fallback
  navigation.navigate('CustomerDashboard');
};

export default {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  startNotificationPolling,
  stopNotificationPolling,
  formatRelativeTime,
  getNotificationTypeMeta,
  handleNotificationPress,
};
