import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationAPI } from '../../api';
import { LoadingState, EmptyState } from '../../components/common/States';
import { Colors, Spacing } from '../../constants/theme';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_ICONS = {
  borrow_accepted: '📦', borrow_rejected: '📦', borrow_request_received: '📦', borrow_request_sent: '📦',
  return_reminder: '⏰', item_overdue: '⚠️',
  ride_accepted: '🚗', ride_rejected: '🚗', ride_request_received: '🚗', ride_booked: '🚗', ride_published: '🚗',
  favor_accepted: '🤝', favor_completed: '✅', favor_posted: '🤝',
  listing_published: '🏪',
  new_message: '💬', review_received: '⭐',
};

const formatRelative = (d) => {
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  if (diff < 10080) return `${Math.floor(diff / 1440)} days ago`;
  return new Date(d).toLocaleDateString('en-IN');
};

/**
 * Map notification type + data to a screen navigation target.
 * Returns { screen, params } or null if no deep link applies.
 */
const resolveDeepLink = (notification) => {
  const { type, data = {} } = notification;
  switch (type) {
    case 'borrow_request_received':
    case 'borrow_accepted':
    case 'borrow_rejected':
    case 'return_reminder':
      if (data.borrowRequestId) return { screen: 'BorrowRequestDetail', params: { requestId: data.borrowRequestId } };
      break;
    case 'ride_request_received':
    case 'ride_accepted':
    case 'ride_rejected':
    case 'ride_booked':
    case 'ride_published':
      if (data.rideId) return { screen: 'RideDetail', params: { rideId: data.rideId } };
      break;
    case 'favor_accepted':
    case 'favor_completed':
    case 'favor_posted':
      if (data.favorId) return { screen: 'FavorDetail', params: { favorId: data.favorId } };
      break;
    case 'listing_published':
      if (data.listingId) return { screen: 'ListingDetail', params: { listingId: data.listingId } };
      break;
    case 'new_message':
      if (data.conversationId) return { screen: 'Conversation', params: { conversationId: data.conversationId, title: data.senderName || 'Chat' } };
      break;
    case 'review_received':
      // If the notification includes context to leave a review
      if (data.revieweeId && data.transactionType && (data.borrowRequestId || data.rideRequestId || data.favorId || data.rideId)) {
        return {
          screen: 'LeaveReview',
          params: {
            revieweeId: data.revieweeId,
            revieweeName: data.revieweeName || '',
            revieweeAvatar: data.revieweeAvatar || null,
            transactionType: data.transactionType,
            transactionId: data.borrowRequestId || data.rideRequestId || data.favorId || data.rideId,
            context: data.context || '',
          },
        };
      }
      // Otherwise navigate to user reviews
      if (data.reviewerId) return { screen: 'UserProfile', params: { userId: data.reviewerId } };
      break;
    default:
      break;
  }
  return null;
};

export default function Notifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { setUnreadCount } = useNotifications();

  const load = useCallback(async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data.data.notifications || []);
      // Opening this screen means user has seen them — optimistically reset
      setUnreadCount(0);
    } catch (_) {}
    finally { setLoading(false); }
  }, [setUnreadCount]);

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const handleTap = async (item) => {
    // Mark individual notification as read optimistically
    setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, read: true } : n));

    const link = resolveDeepLink(item);
    if (link) {
      navigation.navigate(link.screen, link.params);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, item.read ? styles.rowRead : styles.rowUnread]}
      onPress={() => handleTap(item)}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.title, item.read && styles.titleRead]}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        <TouchableOpacity onPress={markAll}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? <LoadingState /> : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyState icon="🔔" message="No notifications yet" />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18, color: Colors.ink },
  markAll: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.accentDark },
  list: { padding: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: 10, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  rowUnread: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  rowRead: { opacity: 0.5 },
  iconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { fontSize: 18 },
  rowBody: { flex: 1 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink, marginBottom: 2 },
  titleRead: { fontFamily: 'Inter_400Regular' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, lineHeight: 17 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.muted, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 4, flexShrink: 0 },
});
