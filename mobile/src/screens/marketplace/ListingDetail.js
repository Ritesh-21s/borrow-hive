import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, Alert,
} from 'react-native';
import { listingAPI, chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Chip from '../../components/common/Chip';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Radius } from '../../constants/theme';

const { width } = Dimensions.get('window');
const IMG_H = (width * 3) / 4;

const CONDITION_LABELS = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export default function ListingDetail({ navigation, route }) {
  const { listingId } = route.params;
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [closingLoading, setClosingLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await listingAPI.getListing(listingId);
        setListing(res.data.data.listing);
      } catch (err) {
        setError(err.userMessage || 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!listing) return null;

  const ownerIdStr = (listing.ownerId?._id || listing.ownerId)?.toString();
  const currentUserIdStr = (user?._id || user?.id)?.toString();
  const isOwner = !!(ownerIdStr && currentUserIdStr && ownerIdStr === currentUserIdStr);
  const isBuy = listing.type === 'buy';
  const isClosed = listing.status === 'closed' || listing.status === 'sold';

  const handleChat = async () => {
    setChatLoading(true);
    try {
      const res = await chatAPI.createConversation({
        participantId: listing.ownerId._id,
        contextType: 'listing',
        contextId: listing._id,
      });

      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: listing.ownerId.name,
        deal: {
          icon: isBuy ? '🔍' : '🏷️',
          title: listing.title,
          statusLabel: isBuy ? 'Buy Request' : 'Sell Request',
          status: listing.status,
          screen: 'ListingDetail',
          screenParams: { listingId: listing._id },
        },
      });
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Could not start conversation.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCloseListing = () => {
    const actionTitle = isBuy ? 'I Have Bought ✓' : 'Sold ✓';
    const confirmMessage = isBuy
      ? 'Are you sure you want to mark this request as bought? It will be closed and removed from active listings.'
      : 'Are you sure you want to mark this item as sold? It will be removed from active listings.';

    setConfirmConfig({
      icon: isBuy ? '🛍️' : '🏷️',
      title: actionTitle,
      message: confirmMessage,
      confirmText: actionTitle,
      destructive: false,
      loading: closingLoading,
      onConfirm: async () => {
        setClosingLoading(true);
        try {
          await listingAPI.updateListing(listingId, { status: 'closed' });
          setListing((prev) => ({ ...prev, status: 'closed' }));
          setConfirmConfig(null);

          Alert.alert(
            'Completed!',
            isBuy ? 'Request marked as bought.' : 'Listing marked as sold.',
            [
              {
                text: 'Leave a Review ⭐',
                onPress: () => {
                  navigation.navigate('LeaveReview', {
                    revieweeId: listing.ownerId?._id || listing.ownerId,
                    revieweeName: listing.ownerId?.name,
                    revieweeAvatar: listing.ownerId?.avatar?.url,
                    transactionType: 'sale',
                    transactionId: listing._id,
                    context: listing.title,
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
          Alert.alert('Error', err.userMessage || 'Failed to update listing.');
        } finally {
          setClosingLoading(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDelete = () => {
    setConfirmConfig({
      icon: '🗑️',
      title: 'Delete Listing',
      message: 'Are you sure you want to remove this listing? It will no longer be visible to others.',
      confirmText: 'Delete Listing',
      destructive: true,
      loading: deleting,
      onConfirm: async () => {
        setDeleting(true);
        try {
          await listingAPI.deleteListing(listingId);
          setConfirmConfig(null);
          Alert.alert('Removed', 'Your listing has been removed.');
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Could not delete listing.');
        } finally {
          setDeleting(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const images = listing.images?.length > 0
    ? listing.images
    : listing.imageUrl
    ? [{ url: listing.imageUrl }]
    : [{ url: null }];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Images */}
        {images[0]?.url ? (
          <View style={{ height: IMG_H }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
              scrollEventThrottle={16}
            >
              {images.map((img, i) => (
                <View key={i} style={{ width, height: IMG_H, backgroundColor: '#EDE9DF' }}>
                  <Image source={{ uri: img.url }} style={{ width, height: IMG_H }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageBanner}>
            <Text style={styles.noImageEmoji}>{isBuy ? '🔍' : '📦'}</Text>
            <Text style={styles.noImageText}>
              {isBuy ? 'Looking to buy this product' : 'No photo provided'}
            </Text>
          </View>
        )}

        {/* Info Block */}
        <View style={styles.info}>
          {/* Closed banner */}
          {isClosed && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedText}>
                {listing.status === 'sold' || !isBuy ? '✅ Marked as Sold / Closed' : '✅ Marked as Bought / Closed'}
              </Text>
            </View>
          )}

          <View style={styles.headerRow}>
            <View style={[styles.typeBadge, { backgroundColor: isBuy ? '#DBEAFE' : '#DCFCE7' }]}>
              <Text style={[styles.typeBadgeText, { color: isBuy ? '#1D4ED8' : '#15803D' }]}>
                {isBuy ? 'BUY REQUEST' : 'SELL REQUEST'}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{listing.title}</Text>

          <Text style={styles.price}>
            {isBuy
              ? listing.budget || listing.price ? `Budget: ₹${listing.budget || listing.price}` : 'Budget: Open to offers'
              : `₹${listing.price}`}
          </Text>

          {/* Chips */}
          <View style={styles.chips}>
            <Chip label={listing.category ? listing.category.toUpperCase() : 'OTHER'} />
            {!isBuy ? (
              <Chip label={CONDITION_LABELS[listing.condition] || listing.condition} />
            ) : (
              (listing.acceptedConditions || [listing.condition]).map((c) => (
                <Chip key={c} label={`Accepts: ${CONDITION_LABELS[c] || c}`} />
              ))
            )}
          </View>

          {listing.description ? (
            <Text style={styles.desc}>{listing.description}</Text>
          ) : null}

          {/* Creator Profile Row */}
          <TouchableOpacity
            style={styles.sellerRow}
            onPress={() => listing.ownerId?._id && navigation.navigate('UserProfile', { userId: listing.ownerId._id })}
            activeOpacity={0.8}
          >
            <Avatar uri={listing.ownerId?.avatar?.url} name={listing.ownerId?.name} size={38} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {listing.ownerId?.name} · ★{listing.ownerId?.rating?.toFixed(1) || '—'}
              </Text>
              <Text style={styles.sellerSub}>
                {isBuy ? 'Buyer' : 'Seller'} · {listing.ownerId?.reviewCount || 0} reviews
              </Text>
            </View>
            <View style={styles.sameCommunity}>
              <Text style={styles.sameCommunityText}>Community Verified</Text>
            </View>
          </TouchableOpacity>

          {/* Owner Actions */}
          {isOwner && !isClosed && (
            <View style={styles.ownerActions}>
              <Button
                title={
                  closingLoading
                    ? 'Updating…'
                    : isBuy
                    ? 'I have bought ✓'
                    : 'Sold ✓'
                }
                onPress={handleCloseListing}
                loading={closingLoading}
              />
              <Button
                title="Edit listing"
                variant="outline"
                onPress={() => navigation.navigate('EditListing', { listing, type: listing.type })}
              />
              <Button
                title={deleting ? 'Removing…' : 'Delete listing'}
                variant="outline"
                loading={deleting}
                onPress={handleDelete}
                style={styles.deleteBtn}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Non-Owner Floating CTA */}
      {!isOwner && !isClosed && (
        <View style={styles.cta}>
          <Button
            title={
              chatLoading
                ? 'Opening…'
                : isBuy
                ? 'I have this (Chat with buyer)'
                : 'Contact seller'
            }
            onPress={handleChat}
            loading={chatLoading}
            style={styles.ctaBtn}
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
  scroll: { paddingBottom: 120 },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  noImageBanner: {
    height: 160,
    backgroundColor: '#EDE9DF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noImageEmoji: { fontSize: 40 },
  noImageText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.muted },
  info: { padding: Spacing.lg },
  headerRow: { marginBottom: 6 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  typeBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
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
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: Colors.ink, marginBottom: 4 },
  price: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: Colors.accentDark, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  desc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#5B5F68', lineHeight: 20, marginBottom: Spacing.md },
  sellerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4, borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  sellerInfo: { flex: 1 },
  sellerName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  sellerSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  sameCommunity: { backgroundColor: Colors.successLight, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sameCommunityText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: Colors.success },
  ownerActions: { marginTop: Spacing.sm, gap: 10 },
  deleteBtn: { borderColor: '#E53E3E' },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: 28, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {},
});
