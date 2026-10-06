import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reviewAPI } from '../../api';
import { LoadingState, EmptyState } from '../../components/common/States';
import { Colors, Spacing, Shadow } from '../../constants/theme';
import Avatar from '../../components/common/Avatar';

const renderStars = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));

const TRANS_LABELS = { borrow: 'Borrow', sale: 'Sale', ride: 'Ride', favor: 'Favor' };

export default function Reviews({ route }) {
  const { userId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewAPI.getUserReviews(userId)
      .then(res => setReviews(res.data.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="⭐" message="No reviews yet." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Avatar uri={item.reviewerId?.avatar?.url} name={item.reviewerId?.name} size={36} />
            <View style={styles.body}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.reviewerId?.name}</Text>
                <View style={styles.transChip}>
                  <Text style={styles.transText}>{TRANS_LABELS[item.transactionType] || item.transactionType}</Text>
                </View>
              </View>
              <Text style={styles.stars}>{renderStars(item.rating)}</Text>
              {item.comment ? <Text style={styles.comment}>"{item.comment}"</Text> : null}
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  card: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
  avatar: { width: 36, height: 36, borderRadius: 99, backgroundColor: '#E4E0D4' },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  transChip: { backgroundColor: '#F1F1EF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  transText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: Colors.muted },
  stars: { color: Colors.accent, fontSize: 13, marginVertical: 3 },
  comment: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5B5F68', fontStyle: 'italic', lineHeight: 18 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.muted, marginTop: 4 },
});
