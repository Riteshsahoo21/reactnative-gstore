import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatRelativeTime,
  getNotificationTypeMeta,
  handleNotificationPress,
} from '../helpers/notificationService';
import { APP_FONT } from '../resources/data/Fonts';

const { width, height } = Dimensions.get('window');

const NotificationModal = ({ visible, onClose, navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const DEFAULT_ANNOUNCEMENTS = [
    {
      _id: 'ann-1',
      type: 'auction',
      title: 'Live Vault Auctions Active',
      message: 'Place real-time bids on rare whiskies and collector fine wine vintages.',
      createdAt: new Date().toISOString(),
      isRead: false,
      link: '/auction',
    },
    {
      _id: 'ann-2',
      type: 'event',
      title: 'Cellar Masterclasses & Tastings',
      message: 'Explore and reserve private sommelier tasting evenings and dinners.',
      createdAt: new Date().toISOString(),
      isRead: false,
      link: '/events',
    },
    {
      _id: 'ann-3',
      type: 'delivery',
      title: 'Nationwide Temperature-Controlled Delivery',
      message: 'Complimentary insured shipping on cellar orders over R1,500.',
      createdAt: new Date().toISOString(),
      isRead: true,
      link: '/shop',
    },
  ];

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchNotifications(15);
    const items = Array.isArray(data?.notifications) && data.notifications.length > 0
      ? data.notifications
      : DEFAULT_ANNOUNCEMENTS;
    setNotifications(items);
    setUnreadCount(typeof data?.unreadCount === 'number' && data.unreadCount > 0 ? data.unreadCount : (data?.notifications?.length ? 0 : 2));
    setLoading(false);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const onItemPress = (item) => {
    onClose();
    handleNotificationPress(navigation, item);
  };

  const onViewAllPress = () => {
    onClose();
    navigation.navigate('NotificationsScreen');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={['#1c1c1f', '#121214', '#0c0c0d']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Icon name="bell-ring" size={18} color="#d4af37" />
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllRead}
                    style={styles.readAllBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="check-all" size={14} color="#d4af37" />
                    <Text style={styles.readAllText}>Read all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={18} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content List */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#d4af37" />
                <Text style={styles.loadingText}>Fetching updates...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="bell-outline" size={28} color="#d4af37" />
                </View>
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptyDesc}>
                  Order updates, auction alerts, and exclusive events will appear here.
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications.slice(0, 10)}
                keyExtractor={(item, idx) => item._id || item.id || `modal-n-${idx}`}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                renderItem={({ item }) => {
                  const meta = getNotificationTypeMeta(item.type);
                  const isUnread = !item.isRead;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onItemPress(item)}
                      style={[
                        styles.itemRow,
                        isUnread && styles.itemRowUnread,
                      ]}
                    >
                      <View style={[styles.itemIconWrap, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
                        <Text style={styles.itemEmoji}>{meta.badgeEmoji}</Text>
                      </View>

                      <View style={styles.itemBody}>
                        <View style={styles.itemTopRow}>
                          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.itemMessage} numberOfLines={2}>
                          {item.message}
                        </Text>
                      </View>

                      {isUnread && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={onViewAllPress}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllText}>View All Activity</Text>
                <Icon name="arrow-right" size={14} color="#000000" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: Math.min(width - 32, 420),
    maxHeight: height * 0.75,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  gradient: {
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: APP_FONT,
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  badgeText: {
    color: '#f5c242',
    fontSize: 10,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readAllText: {
    fontSize: 11,
    color: '#d4af37',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 2,
  },
  list: {
    maxHeight: 380,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemRowUnread: {
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  itemEmoji: {
    fontSize: 16,
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    color: '#d4d4d8',
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  itemTitleUnread: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 10,
    color: '#71717a',
  },
  itemMessage: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 16,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d4af37',
    alignSelf: 'center',
    marginLeft: 8,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#a1a1aa',
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 17,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#d4af37',
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewAllText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default NotificationModal;
