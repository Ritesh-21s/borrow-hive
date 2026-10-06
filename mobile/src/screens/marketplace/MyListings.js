import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listingAPI } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Shadow, Radius } from '../../constants/theme';

const STATUS_CHIP = {
  open:     { bg: '#DFF3EA', color: '#0E8A5F', label: 'Open' },
  active:   { bg: '#DFF3EA', color: '#0E8A5F', label: 'Open' },
  closed:   { bg: '#F1F1EF', color: '#8A8F98', label: 'Closed' },
  sold:     { bg: '#F1F1EF', color: '#8A8F98', label: 'Sold' },
  inactive: { bg: '#F1F1EF', color: '#8A8F98', label: 'Closed' },
};

const TYPE_LABEL = {
  sell: 'Sell Request',
  buy: 'Buy Request',
  sale: 'Sell Request',
  borrow: 'Borrow',
  both: 'Both',
};

export default function MyListings({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await listingAPI.getMyListings();
      setListings(res.data.data.listings || []);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Failed to load your listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCloseListing = (listing) => {
    const isBuy = listing.type === 'buy';
    const actionWord = isBuy ? 'Bought' : 'Sold';
    setConfirmConfig({
      icon: isBuy ? '🛍️' : '🏷️',
      title: isBuy ? 'Mark as Bought' : 'Mark as Sold',
      message: `Mark "${listing.title}" as ${actionWord.toLowerCase()}? It will be closed and removed from public listings.`,
      confirmText: `Mark as ${actionWord} ✓`,
      destructive: false,
      onConfirm: async () => {
        try {
          await listingAPI.updateListing(listing._id, { status: 'closed' });
          setListings((prev) =>
            prev.map((l) => (l._id === listing._id ? { ...l, status: 'closed' } : l))
          );
          setConfirmConfig(null);

          Alert.alert(
            'Completed!',
            `Listing marked as ${actionWord.toLowerCase()}.`,
            [
              {
                text: 'Leave a Review ⭐',
                onPress: () => {
                  navigation.navigate('LeaveReview', {
                    revieweeId: listing.ownerId,
                    transactionType: 'sale',
                    transactionId: listing._id,
                    context: listing.title,
                  });
                },
              },
              { text: 'Done' },
            ]
          );
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Could not update listing.');
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDelete = (listing) => {
    setConfirmConfig({
      icon: '🗑️',
      title: 'Delete Listing',
      message: `Delete "${listing.title}"? This cannot be undone.`,
      confirmText: 'Delete Listing',
      destructive: true,
      onConfirm: async () => {
        try {
          await listingAPI.deleteListing(listing._id);
          setListings((prev) => prev.filter((l) => l._id !== listing._id));
          setConfirmConfig(null);
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Could not delete listing.');
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <EmptyState icon="🛒" message="No listings yet" subMessage="Create a Sell or Buy request from Marketplace." />
        }
        renderItem={({ item }) => {
          const isOpen = item.status === 'open' || item.status === 'active';
          const chip = isOpen ? STATUS_CHIP.open : STATUS_CHIP.closed;
          const isBuy = item.type === 'buy';

          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('ListingDetail', { listingId: item._id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardMeta}>
                    {TYPE_LABEL[item.type] || item.type}
                    {isBuy
                      ? item.budget ? ` · Budget: ₹${item.budget}` : ' · Budget: Open'
                      : item.price > 0 ? ` · ₹${item.price}` : ' · Free'}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('EditListing', { listing: item, type: item.type })}
                  >
                    <Text style={styles.actionEdit}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCloseListing(item)}>
                    <Text style={styles.actionSold}>{isBuy ? 'I have bought' : 'Mark Sold'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.actionDelete}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {confirmConfig && (
        <ConfirmModal
          visible={!!confirmConfig}
          icon={confirmConfig.icon}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          destructive={confirmConfig.destructive}
          loading={confirmConfig.loading}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.ink, marginBottom: 2 },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: { paddingVertical: 4 },
  actionEdit: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.ink },
  actionSold: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.success },
  actionDelete: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#E53E3E' },
});
