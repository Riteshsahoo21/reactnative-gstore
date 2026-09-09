import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchNotifications,
  startNotificationPolling,
  stopNotificationPolling,
} from '../helpers/notificationService';
import NotificationModal from './NotificationModal';
import { NOTIFICATION_ICON } from '../resources/data/Images';

const NotificationBell = React.memo(({ navigation, size = 22, style = {}, directNavigate = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fetch
    fetchNotifications();
    startNotificationPolling(35000);

    const subUpdate = DeviceEventEmitter.addListener('notificationsUpdated', ({ unreadCount: count }) => {
      setUnreadCount(typeof count === 'number' ? count : 0);

      // Pulse animation if there are unread notifications
      if (count > 0) {
        Animated.sequence([
          Animated.timing(badgeScale, {
            toValue: 1.35,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(badgeScale, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    const subLogin = DeviceEventEmitter.addListener('userLoggedIn', () => {
      fetchNotifications();
    });

    const subLogout = DeviceEventEmitter.addListener('userLoggedOut', () => {
      setUnreadCount(0);
    });

    return () => {
      stopNotificationPolling();
      subUpdate.remove();
      subLogin.remove();
      subLogout.remove();
    };
  }, []);

  const handlePress = () => {
    if (directNavigate) {
      navigation.navigate('NotificationsScreen');
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={() => navigation.navigate('NotificationsScreen')}
        activeOpacity={0.75}
        style={[styles.bellTouch, style]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image
          source={NOTIFICATION_ICON}
          style={[styles.bellIconImage, { tintColor: unreadCount > 0 ? '#f5c242' : '#ffffff' }]}
        />

        {unreadCount > 0 && (
          <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }] }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
      />
    </>
  );
});

const styles = StyleSheet.create({
  bellTouch: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIconImage: {
    width: 21,
    height: 21,
    resizeMode: 'contain',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#c9a35b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.2,
    borderColor: '#0a0a0b',
    shadowColor: '#c9a35b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default NotificationBell;
