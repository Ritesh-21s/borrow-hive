import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borrowAPI } from '../../api';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { LoadingState, EmptyState } from '../../components/common/States';

const STATUS_STYLES = {
  PENDING:   { bg: '#FBEAD1', color: '#B4460D' },
  ACCEPTED:  { bg: '#DFF3EA', color: '#0E8A5F' },
  REJECTED:  { bg: '#F1F1EF', color: '#8A8F98' },
  BORROWED:  { bg: '#DFF3EA', color: '#0E8A5F' },
  RETURNED:  { bg: '#F1F1EF', color: '#8A8F98' },
  OVERDUE:   { bg: '#FEE2E2', color: '#DC2626' },
  CANCELLED: { bg: '#F1F1EF', color: '#8A8F98' },
};

const StatusChip = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.chipText, { color: s.color }]}>{status}</Text>
    </View>
  );
};

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BorrowDashboard({ navigation }) {
  const [tab, setTab] = useState('borrower'); // 'borrower' | 'owner'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await borrowAPI.getMyRequests(tab);
      setRequests(res.data.data.requests || []);
    } catch (_) {} finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [tab]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => {
    const listing = item.listingId;
    const other = tab === 'borrower' ? item.ownerId : item.borrowerId;
    const canReview = item.status === 'RETURNED';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BorrowRequestDetail', { requestId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{listing?.title} ({other?.name})</Text>
          <Text style={styles.cardSub}>
            {formatDate(item.startTime)} → {formatDate(item.endTime)}
          </Text>
          {canReview && (
            <Text style={styles.reviewPrompt}>Leave a review →</Text>
          )}
        </View>
        <StatusChip status={item.status} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Segmented control */}
      <View style={styles.segmented}>
        {[['borrower', 'Borrowing'], ['owner', 'Lending']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.seg, tab === val && styles.segActive]} onPress={() => setTab(val)}>
            <Text style={[styles.segText, tab === val && styles.segTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <LoadingState /> : (
        <FlatList
          data={requests}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyState icon="📦" message={`No ${tab === 'borrower' ? 'borrowing' : 'lending'} history.`} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  segmented: {
    flexDirection: 'row', backgroundColor: Colors.bg, margin: Spacing.lg, marginBottom: 0,
    borderRadius: Radius.btn, borderWidth: 1, borderColor: Colors.border, padding: 3,
  },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  segActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  segText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.muted },
  segTextActive: { color: Colors.ink },
  list: { padding: Spacing.lg },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink, marginBottom: 2 },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  reviewPrompt: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.accentDark, marginTop: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
});
