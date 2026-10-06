import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { listingAPI, reviewAPI } from '../../api';
import { LoadingState } from '../../components/common/States';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing, Shadow } from '../../constants/theme';
import Avatar from '../../components/common/Avatar';

const StatTile = ({ value, label }) => (
  <View style={styles.statTile}>
    <Text style={styles.statN}>{value}</Text>
    <Text style={styles.statL}>{label}</Text>
  </View>
);

export default function Profile({ navigation }) {
  const { user, community, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [lRes, rRes, prRes] = await Promise.all([
        listingAPI.getMyListings(),
        reviewAPI.getUserReviews(user._id),
        reviewAPI.getPendingReviews(),
      ]);
      setListings(lRes.data.data.listings || []);
      setReviews(rRes.data.data.reviews || []);
      setPendingReviews(prRes.data.data.pending || []);
    } catch (_) {} finally { setLoading(false); }
  }, [user._id]);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = user?.stats || {};

  const renderStars = (rating) => {
    const r = Math.round(rating || 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topbar}>
        <LogoLockup size={22} />
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <View style={styles.bellWrap}>
            <Text style={styles.bell}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & name */}
        <View style={styles.profileHead}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
          >
            {user?.avatar?.url ? (
              <Image source={{ uri: user.avatar.url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditIcon}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.community}>{community?.name}</Text>
          {user?.bio ? <Text style={styles.bioText}>{user.bio}</Text> : null}
          <Text style={styles.stars}>
            {renderStars(user?.rating)}{' '}
            <Text style={styles.ratingLabel}>{user?.rating?.toFixed(1) || '—'} ({user?.reviewCount || 0} reviews)</Text>
          </Text>
        </View>

        {/* ─── Pending Reviews Banner ─── */}
        {pendingReviews.length > 0 && (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => navigation.navigate('LeaveReview', {
              revieweeId: pendingReviews[0].revieweeId,
              revieweeName: pendingReviews[0].revieweeName,
              revieweeAvatar: pendingReviews[0].revieweeAvatar,
              transactionType: pendingReviews[0].type,
              transactionId: pendingReviews[0].transactionId,
              context: pendingReviews[0].context,
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.pendingBannerIcon}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingBannerTitle}>
                {pendingReviews.length} review{pendingReviews.length > 1 ? 's' : ''} pending
              </Text>
              <Text style={styles.pendingBannerSub}>
                Rate {pendingReviews[0].revieweeName}{pendingReviews.length > 1 ? ` and ${pendingReviews.length - 1} more` : ''}
              </Text>
            </View>
            <Text style={styles.pendingBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Stats grid */}
        <View style={styles.statGrid}>
          <StatTile value={stats.sold || 0} label="Sold" />
          <StatTile value={stats.borrowed || 0} label="Borrowed" />
          <StatTile value={stats.rides || 0} label="Rides" />
          <StatTile value={stats.favors || 0} label="Favors" />
        </View>

        {/* Links */}
        <View style={styles.linksCard}>
          {[
            { label: 'My listings', onPress: () => navigation.navigate('MyListings') },
            { label: 'Borrow history', onPress: () => navigation.navigate('BorrowDashboard') },
            { label: 'Transaction history', onPress: () => navigation.navigate('BorrowDashboard') },
            { label: 'Reviews', onPress: () => navigation.navigate('Reviews', { userId: user._id }) },
            { label: 'Edit profile', onPress: () => navigation.navigate('EditProfile') },
          ].map(({ label, onPress }) => (
            <TouchableOpacity key={label} style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
              <Text style={styles.linkLabel}>{label}</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent reviews */}
        {reviews.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent reviews</Text>
            {reviews.slice(0, 3).map((rev) => (
              <View key={rev._id} style={styles.reviewCard}>
                <Avatar uri={rev.reviewerId?.avatar?.url} name={rev.reviewerId?.name} size={34} />
                <View style={styles.reviewBody}>
                  <Text style={styles.reviewName}>{rev.reviewerId?.name}</Text>
                  <Text style={styles.reviewStars}>{renderStars(rev.rating)}</Text>
                  {rev.comment ? <Text style={styles.reviewComment}>"{rev.comment}"</Text> : null}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  bellWrap: { position: 'relative' },
  bell: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -5, right: -7,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#fff' },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  profileHead: { alignItems: 'center', marginBottom: Spacing.lg },
  avatarWrap: { width: 76, height: 76, borderRadius: 38, position: 'relative', marginBottom: Spacing.sm },
  avatarImg: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#EAEAE6' },
  avatarPlaceholder: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, color: '#2A1503' },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  avatarEditIcon: { fontSize: 11, color: Colors.ink },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink },
  community: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginTop: 2 },
  bioText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#5B5F68', textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
  stars: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.accent, marginTop: 4 },
  ratingLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  statTile: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, alignItems: 'center', ...Shadow.card },
  statN: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: Colors.ink },
  statL: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', marginTop: 2 },
  linksCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginBottom: Spacing.lg, ...Shadow.card },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  linkLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  linkArrow: { color: Colors.muted, fontSize: 14 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.ink, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: Spacing.sm },
  reviewCard: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
  reviewAvatar: { width: 34, height: 34, borderRadius: 99, backgroundColor: '#E4E0D4' },
  reviewBody: { flex: 1 },
  reviewName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  reviewStars: { color: Colors.accent, fontSize: 12, marginVertical: 2 },
  reviewComment: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5B5F68', fontStyle: 'italic' },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent,
    borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadow.card,
  },
  pendingBannerIcon: { fontSize: 22 },
  pendingBannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.accentDark },
  pendingBannerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.accentDark, marginTop: 2 },
  pendingBannerArrow: { fontSize: 20, color: Colors.accentDark, marginLeft: Spacing.sm },
  logoutBtn: { marginTop: Spacing.xl, alignItems: 'center', padding: Spacing.md },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#DC2626' },
});
