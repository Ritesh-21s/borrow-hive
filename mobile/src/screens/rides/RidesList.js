import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rideAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/common/SearchBar';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const FILTER_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Offers', value: 'offer' },
  { label: 'Requests', value: 'request' },
];

const RideCard = ({ ride, onPress }) => {
  const isRequest = ride.type === 'request';
  const seatsLeft = ride.seatsLeft !== undefined ? ride.seatsLeft : ride.availableSeats;
  const isFull = !isRequest && (ride.status === 'full' || seatsLeft === 0);
  const creator = ride.driverId || ride.ownerId || ride.requesterId;
  const passengers = ride.passengers || [];

  return (
    <TouchableOpacity style={[styles.card, isFull && styles.cardDim]} onPress={onPress} activeOpacity={0.85}>
      <Avatar uri={creator?.avatar?.url} name={creator?.name} size={42} style={styles.driverAvatar} />
      <View style={styles.cardBody}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isRequest ? '#F3E8FF' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: isRequest ? '#7E22CE' : '#B45309' },
              ]}
            >
              {isRequest ? 'REQUEST' : 'OFFER'}
            </Text>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullText}>FULL</Text>
            </View>
          )}
        </View>

        <Text style={styles.route}>{ride.from} → {ride.to}</Text>
        <Text style={styles.meta}>
          ⏱ {fmt(ride.departureTime || ride.startTime)}
          {!isRequest ? ` · ${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left` : ''}
        </Text>
        <Text style={styles.driver}>
          {creator?.name} · ★{creator?.rating?.toFixed(1) || '5.0'}
        </Text>

        {passengers.length > 0 && !isRequest && (
          <View style={styles.passengersRow}>
            <Text style={styles.passengersLabel}>👥 Confirmed: </Text>
            <Text style={styles.passengersNames} numberOfLines={1}>
              {passengers.map((p) => p.user?.name).filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.priceWrap}>
        {!isRequest ? (
          <Text style={styles.price}>
            {ride.pricePerSeat || ride.cost ? `₹${ride.pricePerSeat || ride.cost}` : 'Free'}
          </Text>
        ) : (
          <Text style={styles.requestSub}>Rider</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function RidesList({ navigation }) {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState('all');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const { user } = useAuth();

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (tabFilter && tabFilter !== 'all') params.type = tabFilter;
      const res = await rideAPI.getRides(params);
      setRides(res.data.data.rides || []);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Failed to load rides.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, tabFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
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

      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by destination" />

        {/* Tab Filter: All / Offers / Requests */}
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
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r._id}
          renderItem={({ item }) => (
            <RideCard ride={item} onPress={() => navigation.navigate('RideDetail', { rideId: item._id })} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="🚗"
              message="No rides available"
              subMessage="Offer a ride or request one from your community."
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

      {/* Two-Choice Ride Creation Modal */}
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
            <Text style={styles.modalTitle}>Rides in BorrowHive</Text>
            <Text style={styles.modalSubtitle}>Are you driving or looking for a seat?</Text>

            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setCreateModalVisible(false);
                navigation.navigate('CreateRide', { type: 'offer' });
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.choiceEmoji}>🚗</Text>
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceHeader}>Offer a Ride</Text>
                <Text style={styles.choiceDesc}>You have a vehicle and seats to share.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceCard}
              onPress={() => {
                setCreateModalVisible(false);
                navigation.navigate('CreateRide', { type: 'request' });
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.choiceEmoji}>🙋</Text>
              </View>
              <View style={styles.choiceTextWrap}>
                <Text style={styles.choiceHeader}>Request a Ride</Text>
                <Text style={styles.choiceDesc}>You need a ride and want a driver to pick you up.</Text>
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
  searchWrap: {
    padding: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F1EF',
    borderRadius: Radius.md,
    padding: 3,
    marginTop: Spacing.sm,
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
  list: { padding: Spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  cardDim: { opacity: 0.8 },
  driverAvatar: { flexShrink: 0 },
  cardBody: { flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  typeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  fullBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  fullText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#B91C1C',
  },
  route: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.ink, marginBottom: 2 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted, marginBottom: 2 },
  driver: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.accentDark },
  passengersRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  passengersLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: Colors.muted },
  passengersNames: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.ink, flex: 1 },
  priceWrap: { alignItems: 'flex-end', justifyContent: 'center' },
  price: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: Colors.ink },
  requestSub: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#7E22CE' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#2A1503', fontWeight: '300', marginTop: -2 },

  // Modal
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
  choiceEmoji: { fontSize: 20 },
  choiceTextWrap: { flex: 1 },
  choiceHeader: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.ink, marginBottom: 2 },
  choiceDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted, lineHeight: 15 },
  cancelBtn: { marginTop: Spacing.sm },
});
