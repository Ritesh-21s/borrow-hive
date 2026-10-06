import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { uploadImageToCloudinary } from '../../utils/imageUpload';

export default function EditProfile({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || { url: '', publicId: '' });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow photo library access to change your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploading(true);
        try {
          const uploaded = await uploadImageToCloudinary(result.assets[0].uri);
          setAvatar(uploaded);
        } catch (err) {
          // Friendly message — raw error logged inside uploadImageToCloudinary
          Alert.alert('Photo upload failed', err.message || "Couldn't upload your photo. Please try again.");
        } finally {
          setUploading(false);
        }
      }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      await userAPI.updateMe({ name, bio, avatar });
      await refreshUser();
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={pickAvatar}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {avatar?.url ? (
              <Image source={{ uri: avatar.url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {name ? name.charAt(0).toUpperCase() : '👤'}
                </Text>
              </View>
            )}

            {uploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={pickAvatar} disabled={uploading}>
            <Text style={styles.changePhotoText}>
              {uploading ? 'Uploading picture…' : 'Change Profile Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />

        <Input
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell your community a bit about yourself…"
          multiline
          numberOfLines={3}
        />

        <Button
          title={loading ? 'Saving…' : 'Save changes'}
          onPress={handleSave}
          loading={loading || uploading}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EAEAE6',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 38,
    color: '#2A1503',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cameraIcon: {
    fontSize: 13,
  },
  changePhotoText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.accentDark,
    marginTop: 4,
  },
  btn: { marginTop: Spacing.md },
});
