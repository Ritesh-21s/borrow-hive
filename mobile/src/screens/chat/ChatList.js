import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  StatusBar, Modal, TextInput, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../../components/common/Avatar';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing } from '../../constants/theme';

const formatTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};


export default function ChatList({ navigation }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New conversation modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalSearchFocused, setModalSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [startingConvo, setStartingConvo] = useState(null); // userId being opened

  const load = useCallback(async () => {
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data.data.conversations || []);
    } catch (_) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Search users debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userAPI.searchUsers(searchQuery.trim());
        setSearchResults(res.data.data.users || []);
      } catch (_) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setModalVisible(true);
  };

  const handleStartConversation = async (otherUser) => {
    setStartingConvo(otherUser._id);
    try {
      const res = await chatAPI.createConversation({ participantId: otherUser._id });
      setModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      await load();
      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: otherUser.name,
      });
    } catch (_) {} finally {
      setStartingConvo(null);
    }
  };

  const filtered = conversations.filter(c => {
    const other = c.participants?.find(p => p._id !== user?._id);
    return !search || other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const renderConvo = ({ item }) => {
    const other = item.participants?.find(p => p._id !== user?._id);
    const unread = item.unreadCounts?.[user?._id] || 0;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Conversation', { conversationId: item._id, title: other?.name || 'Chat' })}
        activeOpacity={0.8}
      >
        <Avatar uri={other?.avatar?.url} name={other?.name} size={44} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.name}>{other?.name || 'Unknown'}</Text>
            <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
        </View>
        {unread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* ─── Top bar ─── */}
      <View style={styles.topbar}>
        <LogoLockup size={22} />
        <View style={styles.topRight}>
          {/* Notification bell with badge */}
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn} activeOpacity={0.7}>
            <Text style={styles.composeIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Compose / New conversation */}
          <TouchableOpacity style={styles.composeBtn} onPress={handleOpenModal} activeOpacity={0.7}>
            <Text style={styles.composeIcon}>✏️</Text>
          </TouchableOpacity>
          {/* User avatar → Profile */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <Avatar uri={user?.avatar?.url} name={user?.name} size={32} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search existing convos ─── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations…"
            placeholderTextColor={Colors.muted}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c._id}
          renderItem={renderConvo}
          contentContainerStyle={filtered.length === 0 ? styles.emptyWrap : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>Tap the ✏️ button to start chatting with someone in your community.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenModal} activeOpacity={0.8}>
                <Text style={styles.emptyBtnText}>Start a conversation</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ─── New Conversation Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>New Message</Text>
          <Text style={styles.modalSub}>Search for someone in your community</Text>

          {/* Search input */}
          <View style={[styles.modalSearchBar, modalSearchFocused && styles.modalSearchBarFocused]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.modalSearchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name…"
              placeholderTextColor={Colors.muted}
              autoFocus
              onFocus={() => setModalSearchFocused(true)}
              onBlur={() => setModalSearchFocused(false)}
              {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
            />
            {searching && <ActivityIndicator size="small" color={Colors.accent} />}
            {searchQuery.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(u) => u._id}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleStartConversation(item)}
                  activeOpacity={0.75}
                >
                  <Avatar uri={item.avatar?.url} name={item.name} size={42} />
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultMeta}>
                      ★ {item.rating?.toFixed(1) || '5.0'} · {item.reviewCount || 0} reviews
                    </Text>
                  </View>
                  {startingConvo === item._id ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Text style={styles.resultArrow}>→</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.trim().length > 0 && !searching ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No members found matching "{searchQuery}"</Text>
            </View>
          ) : searchQuery.trim().length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>Type a name to search your community members</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  composeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  composeIcon: { fontSize: 16 },

  // Search bar
  searchWrap: {
    padding: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  searchBarFocused: {
    borderColor: Colors.accent,
    backgroundColor: '#FFFEF9',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13,
    color: Colors.ink, padding: 0,
  },
  clearBtn: { fontSize: 12, color: Colors.muted, paddingHorizontal: 4 },

  // List
  list: { paddingBottom: 24 },
  emptyWrap: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.ink },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  lastMsg: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginTop: 2 },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#fff' },

  // Empty state
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.ink, marginBottom: 6 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
  },
  emptyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#2A1503' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.lg, paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink, marginBottom: 2 },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  modalSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  modalSearchBarFocused: {
    borderColor: Colors.accent,
    backgroundColor: '#FFFEF9',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSearchInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13,
    color: Colors.ink, padding: 0,
  },
  resultsList: { maxHeight: 400 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  resultBody: { flex: 1 },
  resultName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.ink },
  resultMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted, marginTop: 1 },
  resultArrow: { fontSize: 18, color: Colors.muted },
  noResults: { paddingVertical: Spacing.lg, alignItems: 'center' },
  noResultsText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, textAlign: 'center' },
  bellBtn: { position: 'relative' },
  notifBadge: {
    position: 'absolute', top: -5, right: -7,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#fff' },
});
