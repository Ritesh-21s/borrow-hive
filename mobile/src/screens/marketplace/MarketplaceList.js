import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listingAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/common/SearchBar';
import Chip from '../../components/common/Chip';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const CATEGORIES = ['All', 'Electronics', 'Books', 'Clothing', 'Furniture', 'Tools', 'Other'];
const FILTER_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Sell', value: 'sell' },
  { label: 'Buy', value: 'buy' },
];

export default function MarketplaceList({ navigation, route }) {
  const initialSearch = route.params?.initialSearch || '';
  const initialFilter = route.params?.filter || 'all';
  const { user } = useAuth();

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('All');
  const [tabFilter, setTabFilter] = useState(initialFilter);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchListings = useCallback(async (p = 1, reset = false) => {
    try {
      if (p === 1) setLoading(true);
      const params = { page: p, limit: 15 };
      if (search) params.search = search;
      if (category !== 'All') params.category = category.toLowerCase();
      if (tabFilter && tabFilter !== 'all') params.type = tabFilter;

      const res = await listingAPI.getListings(params);
      const data = res.data.data;
      setListings(prev => reset ? data.listings : [...prev, ...data.listings]);
      setHasMore(data.page < data.pages);
      setPage(p);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }, [search, category, tabFilter]);

  useEffect(() => {
    fetchListings(1, true);
  }, [search, category, tabFilter]);

  const loadMore = () => {
    if (hasMore && !loading) fetchListings(page + 1);
  };

  const renderItem = ({ item }) => {
    const isBuy = item.type === 'buy';
    const typeLabel = isBuy ? 'Buy Request' : 'Sell Request';
    const typeBadge = isBuy ? 'BUY' : 'SELL';

    return (
      <Card
        image={item.images?.[0]?.url || item.imageUrl}
        title={item.title}
        subtitle={`${typeLabel} · ${item.ownerId?.name || 'User'} (★${item.ownerId?.rating?.toFixed(1) || '—'})`}
        price={!isBuy ? item.price : undefined}
        budget={isBuy ? item.budget || item.price : undefined}
        badge={typeBadge}
        avatarUrl={item.ownerId?.avatar?.url}
        avatarName={item.ownerId?.name}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item._id })}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topbar}>
        <LogoLockup size={22} />
        <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
          <Avatar uri={user?.avatar?.url} name={user?.name} size={32} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search marketplace" />
        {/* Filter Tabs: All / Sell / Buy */}
        <View style={styles.tabRow}>
          {FILTER_TABS.map((t) => {
            const isActive = tabFilter === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setTabFilter(t.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Categories */}
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </View>

      {loading && page === 1 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="🛍️"
              message="No listings found"
              subMessage="Try switching tabs or creating a new request."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Two-Choice Creation Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCreateModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>What would you like to create?</Text>
            <Text style={styles.modalSubtitle}>Choose whether you have an item or need one.</Text>

            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setCreateModalVisible(false);
                navigation.navigate('CreateListing', { type: 'sell' });
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.choiceEmoji}>🏷️</Text>
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceHeader}>Sell Request</Text>
                <Text style={styles.choiceDesc}>I have a product and want to sell it to someone.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setCreateModalVisible(false);
                navigation.navigate('CreateListing', { type: 'buy' });
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.choiceEmoji}>🔍</Text>
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceHeader}>Buy Request</Text>
                <Text style={styles.choiceDesc}>I do not have the product and want to buy it.</Text>
              </View>
            </TouchableOpacity>

            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setCreateModalVisible(false)}
              style={styles.cancelBtn}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatarBtn: {},
  header: {
    padding: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F1EF',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.surface,
    ...Shadow.card,
  },
  filterTabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.muted,
  },
  filterTabTextActive: {
    color: Colors.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#2A1503', fontWeight: '300', marginTop: -2 },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    ...Shadow.card,
  },
  modalTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: Colors.ink,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.muted,
    marginBottom: Spacing.lg,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  choiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceEmoji: {
    fontSize: 20,
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 2,
  },
  choiceDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.muted,
    lineHeight: 15,
  },
  cancelBtn: {
    marginTop: Spacing.sm,
  },
});
