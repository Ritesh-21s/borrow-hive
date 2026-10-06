import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { borrowPostAPI } from '../../api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Chip from '../../components/common/Chip';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { uploadImageToCloudinary } from '../../utils/imageUpload';
import SuccessModal from '../../components/common/SuccessModal';

const CATEGORIES = ['electronics', 'books', 'tools', 'sports', 'kitchen', 'furniture', 'clothing', 'other'];

export default function RaiseBorrowRequest({ navigation, route }) {
  const existingPost = route.params?.post;
  const isEdit = !!existingPost;

  const [title, setTitle] = useState(existingPost?.title || '');
  const [category, setCategory] = useState(existingPost?.category || 'tools');
  const [imageUrl, setImageUrl] = useState(existingPost?.imageUrl || '');
  const [neededFrom, setNeededFrom] = useState(
    existingPost?.neededFrom ? new Date(existingPost.neededFrom).toISOString().slice(0, 16) : ''
  );
  const [neededUntil, setNeededUntil] = useState(
    existingPost?.neededUntil ? new Date(existingPost.neededUntil).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState(existingPost?.notes || '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setUploading(true);
      try {
        const uploaded = await uploadImageToCloudinary(result.assets[0].uri);
        setImageUrl(uploaded.url);
      } catch (err) {
        Alert.alert('Upload failed', err.message || 'Could not upload image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Item name is required';
    if (!neededFrom) e.neededFrom = 'Needed from date/time is required (YYYY-MM-DDTHH:mm)';
    if (!neededUntil) e.neededUntil = 'Needed until date/time is required (YYYY-MM-DDTHH:mm)';
    if (neededFrom && neededUntil && new Date(neededFrom) >= new Date(neededUntil)) {
      e.neededUntil = 'Needed until must be after needed from time';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        imageUrl,
        neededFrom: new Date(neededFrom).toISOString(),
        neededUntil: new Date(neededUntil).toISOString(),
        notes: notes.trim(),
      };

      if (isEdit) {
        await borrowPostAPI.updateBorrowPost(existingPost._id, payload);
      } else {
        await borrowPostAPI.createBorrowPost(payload);
      }
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Failed to submit borrow request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{isEdit ? 'Edit Borrow Request' : 'Raise a Borrow Request'}</Text>
        <Text style={styles.subheading}>
          Ask your campus community for an item you need to borrow temporarily.
        </Text>

        {/* Item Image (Optional) */}
        <Text style={styles.label}>Reference Image (Optional)</Text>
        <View style={styles.photoContainer}>
          {imageUrl ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: imageUrl }} style={styles.photoImg} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => setImageUrl('')}>
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoAdd} onPress={pickImage} disabled={uploading}>
              <Text style={styles.photoAddEmoji}>📷</Text>
              <Text style={styles.photoAddText}>{uploading ? 'Uploading…' : 'Add photo of item'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Input
          label="Item Name / What do you need? *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Scientific calculator, Power drill, HDMI adapter"
          autoCapitalize="sentences"
          error={errors.title}
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c.charAt(0).toUpperCase() + c.slice(1)}
              active={category === c}
              onPress={() => setCategory(c)}
              style={styles.chipItem}
            />
          ))}
        </View>

        {/* Time duration */}
        <Input
          label="Needed From (YYYY-MM-DDTHH:mm) *"
          value={neededFrom}
          onChangeText={setNeededFrom}
          placeholder="2026-10-06T10:00"
          error={errors.neededFrom}
        />

        <Input
          label="Needed Until / Return by (YYYY-MM-DDTHH:mm) *"
          value={neededUntil}
          onChangeText={setNeededUntil}
          placeholder="2026-10-06T18:00"
          error={errors.neededUntil}
        />

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Where you can meet, course requirement, or specific brand/port details…"
          multiline
          numberOfLines={3}
        />

        <Button
          title={isEdit ? 'Save Changes' : 'Raise Borrow Request'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        icon="📦"
        title={isEdit ? 'Request Updated!' : 'Borrow Request Raised!'}
        message="Your request has been published. Peers who own this item can tap 'I have this' to chat with you."
        details={[
          { label: 'Item', value: title },
          { label: 'Category', value: category },
          { label: 'Needed Until', value: neededUntil },
        ]}
        primaryBtnText="View Requests"
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

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  heading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.muted,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  photoContainer: {
    marginBottom: Spacing.md,
  },
  photoWrap: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 3, right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  photoAdd: {
    width: 140,
    height: 70,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: 4,
  },
  photoAddEmoji: { fontSize: 20 },
  photoAddText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.muted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  chipItem: { marginBottom: 4 },
  submitBtn: { marginTop: Spacing.md },
});
