import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { favorAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/common/SearchBar';
import Avatar from '../../components/common/Avatar';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing, Shadow } from '../../constants/theme';

const STATUS_STYLES = {
  open:      { bg: '#FBEAD1', color: '#B4460D' },
  accepted:  { bg: '#DFF3EA', color: '#0E8A5F' },
  completed: { bg: '#F1F1EF', color: '#8A8F98' },
  cancelled: { bg: '#F1F1EF', color: '#8A8F98' },
};

const FavorCard = ({ favor, onPress }) => {
  const s = STATUS_STYLES[favor.status] || STATUS_STYLES.open;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Avatar uri={favor.requesterId?.avatar?.url} name={favor.requesterId?.name} size={36} style={styles.cardAvatar} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{favor.title}</Text>
        <Text style={styles.cardSub}>
          {favor.requesterId?.name}{favor.location ? ` · ${favor.location}` : ''} · {formatRelative(favor.createdAt)}
        </Text>
      </View>
      <View style={[styles.chip, { backgroundColor: s.bg }]}>
        <Text style={[styles.chipText, { color: s.color }]}>{favor.status}</Text>
      </View>
    </TouchableOpacity>
  );
};

function formatRelative(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}

export default function FavorsList({ navigation }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [favors, setFavors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = { status: statusFilter || undefined };
      if (search) params.search = search;
      const res = await favorAPI.getFavors(params);
      setFavors(res.data.data.favors || []);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Failed to load favors.');
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { setLoading(true); load(); }, [search, statusFilter]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const FILTERS = [
    { label: 'Open', value: 'open' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Completed', value: 'completed' },
    { label: 'All', value: '' },
  ];

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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search favors nearby" />
        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : (
        <FlatList
          data={favors}
          keyExtractor={(f) => f._id}
          renderItem={({ item }) => (
            <FavorCard favor={item} onPress={() => navigation.navigate('FavorDetail', { favorId: item._id })} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyState icon="🤝" message="No favors found" subMessage="Post one to ask your community for help." />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FavorDetail', { create: true })} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatarBtn: {},
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAEAE6' },
  avatarInitial: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#2A1503' },

  searchWrap: { padding: Spacing.lg, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  filterText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  filterTextActive: { color: '#fff' },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm, ...Shadow.card },
  cardAvatar: { flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink, marginBottom: 2 },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  chip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  fabIcon: { fontSize: 28, color: '#2A1503', fontWeight: '300', marginTop: -2 },
});
