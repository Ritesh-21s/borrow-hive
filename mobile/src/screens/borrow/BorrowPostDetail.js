import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert,
} from 'react-native';
import { borrowPostAPI, chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Chip from '../../components/common/Chip';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Radius } from '../../constants/theme';

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BorrowPostDetail({ navigation, route }) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await borrowPostAPI.getBorrowPost(postId);
        setPost(res.data.data.post);
      } catch (err) {
        setError(err.userMessage || 'Failed to load request.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!post) return null;

  const requesterIdStr = (post.requesterId?._id || post.requesterId)?.toString();
  const currentUserIdStr = (user?._id || user?.id)?.toString();
  const isRequester = !!(requesterIdStr && currentUserIdStr && requesterIdStr === currentUserIdStr);
  const isClosed = post.status === 'closed';

  const handleChat = async () => {
    setChatLoading(true);
    try {
      const res = await chatAPI.createConversation({
        participantId: post.requesterId._id,
        contextType: 'borrow_post',
        contextId: post._id,
      });

      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: post.requesterId.name,
        deal: {
          icon: '📦',
          title: post.title,
          statusLabel: 'Borrow Request',
          status: post.status,
          type: 'borrow',
          screen: 'BorrowPostDetail',
          screenParams: { postId: post._id },
          partnerId: isRequester ? undefined : post.requesterId._id,
          canAction: isRequester,
          isClosed,
        },
      });
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Could not start conversation.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleFulfill = () => {
    setConfirmConfig({
      icon: '📦',
      title: 'Mark as Fulfilled?',
      message: 'Are you sure you want to mark this borrow request as fulfilled? It will be closed and removed from open requests.',
      confirmText: 'Fulfilled ✓',
      destructive: false,
      loading: fulfilling,
      onConfirm: async () => {
        setFulfilling(true);
        try {
          await borrowPostAPI.fulfillBorrowPost(postId);
          setPost((prev) => ({ ...prev, status: 'closed' }));
          setConfirmConfig(null);

          Alert.alert(
            'Request Fulfilled!',
            'Your request has been closed.',
            [
              {
                text: 'Leave a Review ⭐',
                onPress: () => {
                  navigation.navigate('LeaveReview', {
                    revieweeId: post.requesterId?._id || post.requesterId,
                    revieweeName: post.requesterId?.name,
                    revieweeAvatar: post.requesterId?.avatar?.url,
                    transactionType: 'borrow',
                    transactionId: post._id,
                    context: post.title,
                  });
                },
              },
              {
                text: 'Done',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Failed to update request.');
        } finally {
          setFulfilling(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDelete = () => {
    setConfirmConfig({
      icon: '🗑️',
      title: 'Delete Request',
      message: 'Are you sure you want to delete this borrow request?',
      confirmText: 'Delete Request',
      destructive: true,
      loading: deleting,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await borrowPostAPI.deleteBorrowPost(postId);
          setConfirmConfig(null);
          Alert.alert('Removed', 'Your request has been closed.');
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Could not delete request.');
        } finally {
          setDeleting(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Photo or placeholder */}
        {post.imageUrl ? (
          <Image source={{ uri: post.imageUrl }} style={styles.headerImage} resizeMode="cover" />
        ) : (
          <View style={styles.noImageBanner}>
            <Text style={styles.noImageEmoji}>📦</Text>
            <Text style={styles.noImageText}>Borrow Request</Text>
          </View>
        )}

        <View style={styles.content}>
          {isClosed && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedText}>✅ Fulfilled and Closed</Text>
            </View>
          )}

          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>BORROW REQUEST</Text>
          </View>

          <Text style={styles.title}>{post.title}</Text>

          {/* Time Frame */}
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Needed Timeframe:</Text>
            <Text style={styles.timeValue}>From: {fmtDate(post.neededFrom)}</Text>
            <Text style={styles.timeValue}>Until: {fmtDate(post.neededUntil)}</Text>
          </View>

          <View style={styles.chips}>
            <Chip label={post.category ? post.category.toUpperCase() : 'OTHER'} />
          </View>

          {post.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Requester Notes</Text>
              <Text style={styles.notesText}>{post.notes}</Text>
            </View>
          ) : null}

          {/* Requester Row with Avatar */}
          <TouchableOpacity
            style={styles.requesterRow}
            onPress={() => post.requesterId?._id && navigation.navigate('UserProfile', { userId: post.requesterId._id })}
            activeOpacity={0.8}
          >
            <Avatar uri={post.requesterId?.avatar?.url} name={post.requesterId?.name} size={40} />
            <View style={styles.requesterInfo}>
              <Text style={styles.requesterName}>
                {post.requesterId?.name} · ★{post.requesterId?.rating?.toFixed(1) || '—'}
              </Text>
              <Text style={styles.requesterSub}>
                Requester · {post.requesterId?.reviewCount || 0} reviews
              </Text>
            </View>
            <View style={styles.sameCommunity}>
              <Text style={styles.sameCommunityText}>Community Verified</Text>
            </View>
          </TouchableOpacity>

          {/* Requester Actions */}
          {isRequester && !isClosed && (
            <View style={styles.ownerActions}>
              <Button
                title={fulfilling ? 'Updating…' : 'Fulfilled ✓'}
                onPress={handleFulfill}
                loading={fulfilling}
              />
              <Button
                title="Edit request"
                variant="outline"
                onPress={() => navigation.navigate('RaiseBorrowRequest', { post })}
              />
              <Button
                title={deleting ? 'Removing…' : 'Delete request'}
                variant="outline"
                loading={deleting}
                onPress={handleDelete}
                style={styles.deleteBtn}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Helper Action */}
      {!isRequester && !isClosed && (
        <View style={styles.cta}>
          <Button
            title={chatLoading ? 'Opening…' : 'I have this (Chat with requester)'}
            onPress={handleChat}
            loading={chatLoading}
          />
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingBottom: 110 },
  headerImage: { width: '100%', height: 220, backgroundColor: '#EDE9DF' },
  noImageBanner: {
    height: 160,
    backgroundColor: '#EDE9DF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noImageEmoji: { fontSize: 44 },
  noImageText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted },
  content: { padding: Spacing.lg },
  closedBanner: {
    backgroundColor: '#F1F1EF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closedText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.muted,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  timeBox: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  timeLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.ink, marginBottom: 4 },
  timeValue: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.ink, marginBottom: 2 },
  chips: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  notesBox: {
    backgroundColor: '#FAF9F5',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  notesLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.muted, marginBottom: 4 },
  notesText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink, lineHeight: 18 },
  requesterRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4, borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  requesterInfo: { flex: 1 },
  requesterName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  requesterSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  sameCommunity: { backgroundColor: Colors.successLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sameCommunityText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: Colors.success },
  ownerActions: { marginTop: Spacing.sm, gap: 10 },
  deleteBtn: { borderColor: '#E53E3E' },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: 28, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
