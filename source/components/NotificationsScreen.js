import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  formatRelativeTime,
  getNotificationTypeMeta,
  handleNotificationPress,
} from '../helpers/notificationService';
import { APP_FONT } from '../resources/data/Fonts';

const { width } = Dimensions.get('window');

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'auction', label: 'Auctions' },
  { key: 'order', label: 'Orders' },
  { key: 'event', label: 'Events' },
];

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);

    const data = await fetchNotifications(50);
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);

    if (isPull) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to remove all notifications from your activity history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
          },
        },
      ]
    );
  };

  const handleDeleteItem = (id) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
          },
        },
      ]
    );
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    if (activeFilter === 'auction') {
      return notifications.filter((n) => n.type === 'auction' || (n.title && n.title.toLowerCase().includes('auction')));
    }
    if (activeFilter === 'order') {
      return notifications.filter((n) => n.type === 'order' || n.type === 'delivery');
    }
    if (activeFilter === 'event') {
      return notifications.filter((n) => n.type === 'event');
    }
    return notifications;
  }, [notifications, activeFilter]);

  const renderNotificationCard = ({ item }) => {
    const meta = getNotificationTypeMeta(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          handleNotificationPress(navigation, item);
          setNotifications((prev) =>
            prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        }}
        style={[
          styles.card,
          isUnread && styles.unreadCard,
        ]}
      >
        <LinearGradient
          colors={
            isUnread
              ? ['rgba(212, 175, 55, 0.08)', 'rgba(24, 22, 16, 0.95)', '#11100e']
              : ['rgba(255, 255, 255, 0.03)', '#141416', '#0f0f10']
          }
          style={styles.cardGradient}
        >
          {/* Top Row: Type Badge + Time + Delete */}
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
              <Text style={styles.badgeEmoji}>{meta.badgeEmoji}</Text>
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>

            <View style={styles.headerRight}>
              <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item._id || item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
              >
                <Icon name="close" size={15} color="#8a8a8e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title & Body */}
          <View style={styles.bodyWrap}>
            <View style={styles.titleRow}>
              {isUnread && <View style={styles.unreadDot} />}
              <Text style={[styles.titleText, isUnread && styles.unreadTitleText]} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.messageText} numberOfLines={3}>
              {item.message}
            </Text>
          </View>

          {/* Action Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.actionRow}>
              <Text style={styles.actionText}>View details</Text>
              <Icon name="chevron-right" size={16} color="#d4af37" />
            </View>
            {isUnread && (
              <TouchableOpacity
                onPress={() => {
                  markNotificationAsRead(item._id || item.id);
                  setNotifications((prev) =>
                    prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
                  );
                  setUnreadCount((c) => Math.max(0, c - 1));
                }}
                style={styles.markReadBtn}
              >
                <Icon name="check" size={12} color="#e1bd70" />
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Icon name="bell-outline" size={38} color="#d4af37" />
        </View>
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyDesc}>
          {activeFilter === 'unread'
            ? "You're all caught up! No unread messages."
            : 'Updates on your luxury orders, vault auctions, and private wine tastings will appear here.'}
        </Text>
        {activeFilter !== 'all' && (
          <TouchableOpacity
            style={styles.resetFilterBtn}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={styles.resetFilterText}>Show All Notifications</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0b" />

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" size={22} color="#f5c242" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={styles.readAllButton}
              activeOpacity={0.7}
            >
              <Icon name="check-all" size={16} color="#d4af37" />
              <Text style={styles.readAllText}>Read all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {item.label}
                  {item.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Notification List */}
      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.loaderText}>Loading your alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item, index) => item._id || item.id || `notif-${index}`}
          renderItem={renderNotificationCard}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#d4af37"
              colors={['#d4af37']}
            />
          }
          ListFooterComponent={
            notifications.length > 0 ? (
              <View style={styles.listFooter}>
                <TouchableOpacity
                  onPress={handleClearAll}
                  style={styles.clearAllBtn}
                  activeOpacity={0.8}
                >
                  <Icon name="trash-can-outline" size={14} color="#a1a1aa" />
                  <Text style={styles.clearAllText}>Clear all notifications</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
    backgroundColor: '#0d0d0f',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: APP_FONT,
    letterSpacing: 0.3,
  },
  headerUnreadBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  headerUnreadText: {
    color: '#f5c242',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  readAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  readAllText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '600',
  },
  filtersWrapper: {
    paddingVertical: 10,
    backgroundColor: '#0d0d0f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#d4af37',
    borderColor: '#f5c242',
  },
  filterChipText: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  unreadCard: {
    borderColor: 'rgba(212, 175, 55, 0.4)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 2,
  },
  bodyWrap: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d4af37',
    marginRight: 6,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  titleText: {
    fontSize: 14,
    color: '#e4e4e7',
    fontWeight: '600',
    flex: 1,
  },
  unreadTitleText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  messageText: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '600',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  markReadText: {
    fontSize: 11,
    color: '#e1bd70',
    fontWeight: '600',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loaderText: {
    marginTop: 12,
    color: '#a1a1aa',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: APP_FONT,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetFilterText: {
    color: '#d4af37',
    fontSize: 12,
    fontWeight: '600',
  },
  listFooter: {
    alignItems: 'center',
    paddingTop: 16,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  clearAllText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
});

export default NotificationsScreen;
