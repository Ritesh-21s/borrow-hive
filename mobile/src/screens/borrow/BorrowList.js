import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borrowPostAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../../components/common/SearchBar';
import Chip from '../../components/common/Chip';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/States';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

const CATEGORIES = ['All', 'Electronics', 'Books', 'Tools', 'Sports', 'Kitchen', 'Other'];

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BorrowList({ navigation }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'All') params.category = category.toLowerCase();

      const res = await borrowPostAPI.getBorrowPosts(params);
      setPosts(res.data.data.posts || []);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Failed to load borrow requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category]);

  useEffect(() => {
    setLoading(true);
    loadPosts();
  }, [loadPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const renderItem = ({ item }) => (
    <Card
      image={item.imageUrl}
      title={item.title}
      subtitle={`Needed by: ${fmtDate(item.neededUntil)} · ${item.requesterId?.name || 'User'}`}
      badge="BORROW"
      avatarUrl={item.requesterId?.avatar?.url}
      avatarName={item.requesterId?.name}
      onPress={() => navigation.navigate('BorrowPostDetail', { postId: item._id })}
    />
  );

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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search borrow requests" />
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              message="No open borrow requests"
              subMessage="Need something for class or home? Tap '+' to raise a borrow request."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RaiseBorrowRequest')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
});
