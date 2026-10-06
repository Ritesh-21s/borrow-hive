import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
  Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { chatAPI, borrowPostAPI, favorAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { uploadImageToCloudinary } from '../../utils/imageUpload';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function Conversation({ navigation, route }) {
  const { conversationId, title, deal } = route.params;
  const { user } = useAuth();
  const { joinConversation, sendMessage: socketSend, sendImageMessage: socketSendImage, on, off } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDeal, setCurrentDeal] = useState(deal || null);
  const [dealActionLoading, setDealActionLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // local uri before upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxUri, setLightboxUri] = useState(null); // full-screen viewer
  const [inputFocused, setInputFocused] = useState(false);
  const flatRef = useRef(null);

  // Set header title
  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  // Load message history
  useEffect(() => {
    chatAPI.getMessages(conversationId)
      .then(res => setMessages(res.data.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    joinConversation(conversationId);

    // Listen for real-time messages
    const unsubMsg = on('new_message', ({ message, conversationId: cId }) => {
      if (cId !== conversationId) return;

      setMessages(prev => {
        const senderId = message.senderId?._id ?? message.senderId;
        // If this message was sent by me, replace the optimistic placeholder
        // (which starts with 'local-') instead of appending a duplicate.
        if (senderId === user?._id) {
          const optimisticIdx = prev.findIndex(m => m._id?.toString().startsWith('local-'));
          if (optimisticIdx !== -1) {
            const next = [...prev];
            next[optimisticIdx] = message;
            return next;
          }
          // No optimistic placeholder found — still deduplicate by _id
          if (prev.some(m => m._id === message._id)) return prev;
        }
        // Message from the other person — just append (dedup by _id)
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      flatRef.current?.scrollToEnd({ animated: true });
    });

    const unsubTyping = on('typing', ({ name, isTyping }) => {
      setTypingUser(isTyping ? name : null);
    });

    return () => {
      unsubMsg?.();
      unsubTyping?.();
    };
  }, [conversationId]);

  // Pick image from gallery
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImagePreview(result.assets[0].uri);
    }
  };

  // Clear selected image preview
  const handleClearImage = () => setImagePreview(null);

  // Send text message
  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !imagePreview) || sending) return;

    setSending(true);

    // If there's an image, delegate to handleSendImage (which also handles optional caption text)
    if (imagePreview) {
      await handleSendImage(trimmed);
      return;
    }

    setText('');
    try {
      // Optimistic local add
      const optimistic = {
        _id: `local-${Date.now()}`,
        senderId: { _id: user._id, name: user.name },
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
      flatRef.current?.scrollToEnd({ animated: true });

      // Send via socket + REST
      socketSend(conversationId, trimmed);
      await chatAPI.sendMessage(conversationId, trimmed);
    } catch (_) {}
    finally { setSending(false); }
  };

  // Upload image to Cloudinary then send
  const handleSendImage = async (caption = '') => {
    if (!imagePreview) return;
    setUploadingImage(true);
    const localUri = imagePreview;
    setImagePreview(null);
    setText('');

    try {
      // Optimistic local bubble with local URI
      const optimistic = {
        _id: `local-img-${Date.now()}`,
        senderId: { _id: user._id, name: user.name },
        text: caption,
        image: { url: localUri },
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, optimistic]);
      flatRef.current?.scrollToEnd({ animated: true });

      // Upload to Cloudinary
      const uploaded = await uploadImageToCloudinary(localUri);

      // Send via socket + REST
      socketSendImage(conversationId, { url: uploaded.url, publicId: uploaded.publicId }, caption);
      await chatAPI.sendImageMessage(conversationId, { url: uploaded.url, publicId: uploaded.publicId }, caption);
    } catch (err) {
      Alert.alert('Photo upload failed', err.message || "Couldn't upload your photo. Please try again.");
    } finally {
      setUploadingImage(false);
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId?._id === user?._id || item.senderId === user?._id;
    const hasImage = item.image?.url;
    const hasText = item.text && item.text.trim().length > 0;

    return (
      <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, hasImage && styles.bubbleImage]}>
          {hasImage && (
            <TouchableOpacity onPress={() => setLightboxUri(item.image.url)} activeOpacity={0.9}>
              <Image
                source={{ uri: item.image.url }}
                style={styles.chatImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          {hasText && (
            <Text style={[
              styles.bubbleText,
              isMe && styles.bubbleTextMe,
              hasImage && styles.captionText,
            ]}>
              {item.text}
            </Text>
          )}
        </View>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const handleDealAction = () => {
    if (!currentDeal) return;
    const isBorrow = currentDeal.type === 'borrow' || currentDeal.screen === 'BorrowPostDetail';
    const isFavor = currentDeal.type === 'favor' || currentDeal.screen === 'FavorDetail';
    const actionLabel = isBorrow ? 'Fulfilled' : isFavor ? 'Favor Done' : 'Complete';

    Alert.alert(
      actionLabel,
      `Are you sure you want to mark "${currentDeal.title}" as ${isBorrow ? 'fulfilled' : 'done'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm ✓',
          onPress: async () => {
            setDealActionLoading(true);
            try {
              if (isBorrow && currentDeal.screenParams?.postId) {
                await borrowPostAPI.fulfillBorrowPost(currentDeal.screenParams.postId);
              } else if (isFavor && currentDeal.screenParams?.favorId) {
                await favorAPI.complete(currentDeal.screenParams.favorId);
              }
              setCurrentDeal((prev) => ({
                ...prev,
                status: 'completed',
                statusLabel: 'Completed ✅',
                isClosed: true,
              }));
              Alert.alert('Completed!', 'Would you like to rate your peer?', [
                {
                  text: 'Leave Review ⭐',
                  onPress: () => {
                    navigation.navigate('LeaveReview', {
                      revieweeId: currentDeal.partnerId,
                      revieweeName: title,
                      transactionType: isBorrow ? 'borrow' : isFavor ? 'favor' : 'sale',
                      transactionId: currentDeal.screenParams?.postId || currentDeal.screenParams?.favorId || currentDeal.screenParams?.listingId,
                      context: currentDeal.title,
                    });
                  },
                },
                { text: 'Done' },
              ]);
            } catch (err) {
              Alert.alert('Error', err.userMessage || 'Failed to complete.');
            } finally {
              setDealActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Pinned deal status banner */}
      {currentDeal && (
        <View style={[styles.dealBanner, currentDeal.status === 'completed' && styles.dealBannerDone]}>
          <TouchableOpacity
            style={styles.dealBannerMain}
            onPress={() => currentDeal.screen && navigation.navigate(currentDeal.screen, currentDeal.screenParams || {})}
            activeOpacity={currentDeal.screen ? 0.8 : 1}
          >
            <Text style={styles.dealBannerIcon}>{currentDeal.icon || '💬'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dealBannerTitle} numberOfLines={1}>{currentDeal.title}</Text>
              <Text style={styles.dealBannerStatus}>{currentDeal.statusLabel}</Text>
            </View>
            {currentDeal.screen && <Text style={styles.dealBannerArrow}>›</Text>}
          </TouchableOpacity>

          {/* In-chat action button (Fulfilled or Favor done) */}
          {currentDeal.canAction && !currentDeal.isClosed && (
            <TouchableOpacity
              style={styles.dealActionBtn}
              onPress={handleDealAction}
              disabled={dealActionLoading}
            >
              <Text style={styles.dealActionBtnText}>
                {dealActionLoading
                  ? '…'
                  : currentDeal.type === 'borrow' || currentDeal.screen === 'BorrowPostDetail'
                  ? 'Fulfilled ✓'
                  : 'Favor done ✓'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {typingUser && (
        <Text style={styles.typing}>{typingUser} is typing…</Text>
      )}

      {/* Image preview strip */}
      {imagePreview && (
        <View style={styles.previewBar}>
          <Image source={{ uri: imagePreview }} style={styles.previewThumb} resizeMode="cover" />
          <Text style={styles.previewLabel}>Image ready to send</Text>
          <TouchableOpacity onPress={handleClearImage} style={styles.previewClose}>
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        {/* Image picker button */}
        <TouchableOpacity
          style={[styles.iconBtn, uploadingImage && styles.iconBtnDisabled]}
          onPress={handlePickImage}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={styles.iconBtnText}>📷</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, inputFocused && styles.textInputFocused]}
          value={text}
          onChangeText={setText}
          placeholder={imagePreview ? 'Add a caption…' : 'Type a message…'}
          placeholderTextColor={Colors.muted}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() && !imagePreview || sending) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={(!text.trim() && !imagePreview) || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#2A1503" />
          ) : (
            <Text style={styles.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Lightbox modal for full-screen image view */}
      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <Pressable style={styles.lightboxBg} onPress={() => setLightboxUri(null)}>
          <Image
            source={{ uri: lightboxUri }}
            style={styles.lightboxImg}
            resizeMode="contain"
          />
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  list: { padding: Spacing.lg, paddingBottom: Spacing.sm },

  // Bubbles
  bubbleWrap: { marginBottom: Spacing.sm + 2, alignItems: 'flex-start' },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', padding: Spacing.sm + 2, borderRadius: 16 },
  bubbleImage: { padding: 4, borderRadius: 14, overflow: 'hidden' },
  bubbleThem: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: Colors.ink, borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink, lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  captionText: { marginTop: 4, paddingHorizontal: 4, paddingBottom: 4 },
  bubbleTime: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.muted, marginTop: 3 },
  bubbleTimeMe: { alignSelf: 'flex-end' },
  chatImage: { width: 210, height: 160, borderRadius: 10 },

  // Typing
  typing: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted,
    paddingHorizontal: Spacing.lg, paddingBottom: 4, fontStyle: 'italic',
  },

  // Image preview bar
  previewBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  previewThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.border },
  previewLabel: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted },
  previewClose: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  previewCloseText: { fontSize: 12, color: Colors.ink, fontWeight: '700' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.4 },
  iconBtnText: { fontSize: 20 },
  textInput: {
    flex: 1, backgroundColor: Colors.bg,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink, maxHeight: 100,
  },
  textInputFocused: {
    borderColor: Colors.accent,
    backgroundColor: '#FFFEF9',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { fontSize: 18, color: '#2A1503', fontWeight: '700' },

  // Lightbox
  lightboxBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  lightboxImg: { width: '94%', height: '80%' },
  lightboxClose: {
    position: 'absolute', top: 52, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Deal banner
  dealBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.accentLight, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  dealBannerMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  dealBannerDone: { backgroundColor: '#DFF3EA', borderBottomColor: '#C6EAD8' },
  dealBannerIcon: { fontSize: 20 },
  dealBannerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.ink },
  dealBannerStatus: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted, marginTop: 1 },
  dealBannerArrow: { fontSize: 18, color: Colors.muted, paddingHorizontal: 4 },
  dealActionBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  dealActionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#2A1503',
  },
});
