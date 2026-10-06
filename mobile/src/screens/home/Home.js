import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { listingAPI, favorAPI } from '../../api';
import Card from '../../components/common/Card';
import SearchBar from '../../components/common/SearchBar';
import Avatar from '../../components/common/Avatar';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing } from '../../constants/theme';

const QUICK_ACTIONS = [
  { id: 'market', icon: '🏪', label: 'Buy / Sell', screen: 'Marketplace' },
  { id: 'borrow', icon: '📦', label: 'Borrow', screen: 'BorrowList' },
  { id: 'rides', icon: '🚗', label: 'Rides', screen: 'Rides' },
  { id: 'favors', icon: '🤝', label: 'Favors', screen: 'FavorsList' },
];

export default function Home({ navigation }) {
  const { user, community } = useAuth();
  const { unreadCount } = useNotifications();
  const [listings, setListings] = useState([]);
  const [favors, setFavors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [lRes, fRes] = await Promise.all([
        listingAPI.getListings({ limit: 5 }),
        favorAPI.getFavors({ limit: 5, status: 'open' }),
      ]);
      setListings(lRes.data.data.listings || []);
      setFavors(fRes.data.data.favors || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearch = () => {
    navigation.navigate('Marketplace', { initialSearch: search });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      {/* Top bar */}
      <View style={styles.topbar}>
        <LogoLockup size={22} />
        <View style={styles.topbarRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Avatar uri={user?.avatar?.url} name={user?.name} size={32} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>{greeting()}, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.communityTag}>{community?.name}</Text>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search BorrowHive"
          style={styles.search}
        />

        {/* Quick action tiles */}
        <View style={styles.tilesGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.tile}
              onPress={() => navigation.navigate(action.screen, action.params)}
              activeOpacity={0.8}
            >
              <View style={styles.tileIcon}>
                <Text style={styles.tileEmoji}>{action.icon}</Text>
              </View>
              <Text style={styles.tileLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nearby listings */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Nearby listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Marketplace')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        {listings.length === 0 ? (
          <Text style={styles.empty}>No listings yet in your community.</Text>
        ) : (
          listings.map((item) => (
            <Card
              key={item._id}
              image={item.images?.[0]?.url || item.imageUrl}
              title={item.title}
              subtitle={`★${item.ownerId?.rating?.toFixed(1) || '—'} · ${item.ownerId?.name || 'Seller'}`}
              price={item.type !== 'buy' ? item.price : undefined}
              budget={item.type === 'buy' ? item.budget || item.price : undefined}
              badge={item.type === 'buy' ? 'BUY' : 'SELL'}
              avatarUrl={item.ownerId?.avatar?.url}
              avatarName={item.ownerId?.name}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item._id })}
            />
          ))
        )}

        {/* Open favors */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Open favors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FavorsList')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        {favors.length === 0 ? (
          <Text style={styles.empty}>No open favors right now.</Text>
        ) : (
          favors.map((favor) => (
            <Card
              key={favor._id}
              title={favor.title}
              subtitle={`${favor.location ? favor.location + ' · ' : ''}Posted ${formatRelative(favor.createdAt)}`}
              badge="FAVOR"
              avatarUrl={favor.requesterId?.avatar?.url}
              avatarName={favor.requesterId?.name}
              onPress={() => navigation.navigate('FavorDetail', { favorId: favor._id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRelative(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bellBtn: { position: 'relative' },
  bellIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -5, right: -7,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#fff' },
  avatarBtn: {},
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 24 },
  greeting: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink, marginBottom: 2 },
  communityTag: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.muted, marginBottom: Spacing.lg },
  search: { marginBottom: Spacing.lg },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  tile: {
    width: '47%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: Spacing.md, gap: 8,
  },
  tileIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tileEmoji: { fontSize: 16 },
  tileLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.sm, marginTop: Spacing.xs },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.ink, textTransform: 'uppercase', letterSpacing: 0.3 },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accentDark },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
});
