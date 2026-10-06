import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { userAPI, reviewAPI } from '../../api';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Shadow } from '../../constants/theme';
import Avatar from '../../components/common/Avatar';

const renderStars = (r) => '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0));

export default function UserProfile({ navigation, route }) {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([userAPI.getUser(userId), reviewAPI.getUserReviews(userId)])
      .then(([uRes, rRes]) => {
        setUser(uRes.data.data.user);
        setReviews(rRes.data.data.reviews || []);
      })
      .catch(err => setError(err.userMessage || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {user?.avatar?.url ? (
            <Image source={{ uri: user.avatar.url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.stars}>{renderStars(user?.rating)} <Text style={styles.ratingTxt}>{user?.rating?.toFixed(1) || '—'} ({user?.reviewCount || 0} reviews)</Text></Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.slice(0, 5).map(rev => (
          <View key={rev._id} style={styles.reviewCard}>
            <Avatar uri={rev.reviewerId?.avatar?.url} name={rev.reviewerId?.name} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={styles.revName}>{rev.reviewerId?.name}</Text>
              <Text style={{ color: Colors.accent, fontSize: 12 }}>{renderStars(rev.rating)}</Text>
              {rev.comment ? <Text style={styles.revComment}>"{rev.comment}"</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  head: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  avatarImg: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EAEAE6', marginBottom: Spacing.sm },
  avatarInitial: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, color: '#2A1503' },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink },
  stars: { color: Colors.accent, fontSize: 14, marginTop: 4 },
  ratingTxt: { color: Colors.muted, fontSize: 11 },
  bio: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginTop: 8, textAlign: 'center', maxWidth: 280 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.ink, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: Spacing.sm },
  reviewCard: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
  revAvatar: { width: 34, height: 34, borderRadius: 99, backgroundColor: '#E4E0D4' },
  revName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  revComment: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5B5F68', fontStyle: 'italic', marginTop: 3 },
});
