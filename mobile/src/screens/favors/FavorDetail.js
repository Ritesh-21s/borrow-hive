import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { favorAPI, chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Radius } from '../../constants/theme';
import SuccessModal from '../../components/common/SuccessModal';

export default function FavorDetail({ navigation, route }) {
  const { favorId, create, edit } = route.params || {};
  const { user } = useAuth();
  const [favor, setFavor] = useState(null);
  const [loading, setLoading] = useState(!create);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!!edit);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Form fields for create / edit
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!create && favorId) {
      favorAPI
        .getFavor(favorId)
        .then((res) => {
          const f = res.data.data.favor;
          setFavor(f);
          setTitle(f.title || '');
          setDescription(f.description || '');
          setLocation(f.location || '');
          setDeadline(f.deadline ? new Date(f.deadline).toISOString().slice(0, 16) : '');
        })
        .catch((err) => setError(err.userMessage || 'Failed to load favor.'))
        .finally(() => setLoading(false));
    }
  }, [favorId, create]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter what you need.');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      };

      if (isEditing && favorId) {
        await favorAPI.updateFavor(favorId, payload);
        Alert.alert('Updated', 'Favor updated successfully.');
        setIsEditing(false);
        const res = await favorAPI.getFavor(favorId);
        setFavor(res.data.data.favor);
      } else {
        await favorAPI.createFavor(payload);
        setShowSuccess(true);
      }
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Failed to save favor.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper taps "I can help" -> opens chat without changing status
  const handleCanHelp = async () => {
    setChatLoading(true);
    try {
      const posterId = favor.requesterId?._id || favor.posterId?._id;
      const posterName = favor.requesterId?.name || favor.posterId?.name;

      const res = await chatAPI.createConversation({
        participantId: posterId,
        contextType: 'favor',
        contextId: favor._id,
      });

      const isMePoster = posterId?.toString() === user?._id?.toString();
      const isAlreadyClosed = favor.status === 'closed' || favor.status === 'completed' || favor.status === 'cancelled';

      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: posterName,
        deal: {
          icon: '🤝',
          title: favor.title,
          statusLabel: 'Favor Request',
          status: favor.status,
          type: 'favor',
          screen: 'FavorDetail',
          screenParams: { favorId: favor._id },
          partnerId: isMePoster ? undefined : posterId,
          canAction: isMePoster,
          isClosed: isAlreadyClosed,
        },
      });
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Could not start chat.');
    } finally {
      setChatLoading(false);
    }
  };

  // Poster taps "Favor done" -> sets status to closed, removes from list, triggers review
  const handleFavorDone = () => {
    setConfirmConfig({
      icon: '🤝',
      title: 'Favor Done?',
      message: 'Are you sure you want to mark this favor as completed? It will be closed and removed from open requests.',
      confirmText: 'Favor Done ✓',
      destructive: false,
      loading: actionLoading,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await favorAPI.complete(favorId);
          setFavor((prev) => ({ ...prev, status: 'closed' }));
          setConfirmConfig(null);

          Alert.alert(
            'Favor Completed!',
            'Your favor has been closed.',
            [
              {
                text: 'Leave a Review ⭐',
                onPress: () => {
                  navigation.navigate('LeaveReview', {
                    revieweeId: favor.helperId?._id || favor.requesterId?._id,
                    revieweeName: favor.helperId?.name || favor.requesterId?.name,
                    revieweeAvatar: favor.helperId?.avatar?.url,
                    transactionType: 'favor',
                    transactionId: favor._id,
                    context: favor.title,
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
          Alert.alert('Error', err.userMessage || 'Failed to complete favor.');
        } finally {
          setActionLoading(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDelete = () => {
    setConfirmConfig({
      icon: '🗑️',
      title: 'Delete Favor',
      message: 'Are you sure you want to delete this favor request?',
      confirmText: 'Delete Favor',
      destructive: true,
      loading: actionLoading,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await favorAPI.deleteFavor(favorId);
          setConfirmConfig(null);
          Alert.alert('Deleted', 'Favor has been closed and removed.');
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Failed to delete favor.');
        } finally {
          setActionLoading(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  // Create or Edit mode form
  if (create || isEditing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{isEditing ? 'Edit Favor' : 'Raise a Favor'}</Text>
          <Text style={styles.subheading}>
            Ask peers in your campus community for a quick hand or errand.
          </Text>

          <Input
            label="What do you need? *"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Need a screwdriver for 30 min, printer page printout"
            autoCapitalize="sentences"
          />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Any additional details…"
            multiline
            numberOfLines={3}
          />
          <Input
            label="Location (text)"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Block C, room 204 or North Cafeteria"
          />
          <Input
            label="Deadline (optional, YYYY-MM-DDTHH:mm)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="2026-10-06T18:00"
          />

          <Button
            title={isEditing ? 'Save Changes' : 'Post Favor'}
            onPress={handleSave}
            loading={saveLoading}
            style={styles.mt}
          />

          {isEditing && (
            <Button
              title="Cancel Editing"
              variant="outline"
              onPress={() => setIsEditing(false)}
              style={styles.mt}
            />
          )}
        </ScrollView>

        <SuccessModal
          visible={showSuccess}
          icon="🤝"
          title="Favor Posted!"
          message="Your request has been posted to your community board. Members nearby can now tap 'I can help' to chat with you."
          details={[
            { label: 'Title', value: title },
            ...(location ? [{ label: 'Location', value: location }] : []),
            ...(deadline ? [{ label: 'Deadline', value: deadline }] : []),
          ]}
          primaryBtnText="View Favors"
          onPrimaryPress={() => {
            setShowSuccess(false);
            navigation.goBack();
          }}
          secondaryBtnText="Back"
          onSecondaryPress={() => {
            setShowSuccess(false);
            navigation.goBack();
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!favor) return null;

  const poster = favor.requesterId || favor.posterId;
  const isPoster = poster?._id?.toString() === user?._id?.toString();
  const isClosed = favor.status === 'closed' || favor.status === 'completed' || favor.status === 'cancelled';
  const canHelp = !isPoster && favor.status === 'open';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {isClosed && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>✅ Favor Done / Closed</Text>
          </View>
        )}

        <Text style={styles.heading}>{favor.title}</Text>
        <Text style={styles.meta}>
          {favor.location ? `📍 ${favor.location}` : ''}
          {favor.deadline
            ? ` · deadline: ${new Date(favor.deadline).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
        </Text>

        {favor.description ? <Text style={styles.desc}>{favor.description}</Text> : null}

        {/* Poster Avatar and Name */}
        <TouchableOpacity
          style={styles.requesterRow}
          onPress={() => poster?._id && navigation.navigate('UserProfile', { userId: poster._id })}
          activeOpacity={0.8}
        >
          <Avatar uri={poster?.avatar?.url} name={poster?.name} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={styles.requesterName}>{poster?.name} · ★{poster?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.requesterSub}>Community Member</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: isClosed ? '#F1F1EF' : '#FBEAD1' }]}>
            <Text style={[styles.chipText, { color: isClosed ? Colors.muted : Colors.accentDark }]}>
              {isClosed ? 'closed' : 'open'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        {canHelp && (
          <Button
            title={chatLoading ? 'Opening…' : 'I can help (Chat with poster)'}
            onPress={handleCanHelp}
            loading={chatLoading}
            style={styles.mt}
          />
        )}

        {isPoster && !isClosed && (
          <View style={styles.ownerActions}>
            <Button
              title={actionLoading ? 'Updating…' : 'Favor done ✓'}
              onPress={handleFavorDone}
              loading={actionLoading}
            />
            <Button
              title="Edit favor"
              variant="outline"
              onPress={() => setIsEditing(true)}
            />
            <Button
              title="Delete favor"
              variant="outline"
              onPress={handleDelete}
              style={styles.deleteBtn}
            />
          </View>
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: Colors.ink, lineHeight: 28, marginBottom: 6 },
  subheading: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginBottom: Spacing.lg, lineHeight: 18 },
  meta: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.muted, marginBottom: Spacing.md },
  desc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.ink, lineHeight: 20, marginBottom: Spacing.lg },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  requesterName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  requesterSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  chip: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  closedBanner: {
    backgroundColor: '#F1F1EF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closedText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.muted },
  ownerActions: { marginTop: Spacing.md, gap: 10 },
  deleteBtn: { borderColor: '#E53E3E' },
  mt: { marginTop: Spacing.md },
});
