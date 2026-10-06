import { Platform } from 'react-native';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../constants/config';

/**
 * Upload an image from a local URI to Cloudinary
 * Supports both React Native (iOS/Android) and Web environments.
 */
export const uploadImageToCloudinary = async (uri) => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, fetch image URI as blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const filename = `avatar_${Date.now()}.${ext}`;
    formData.append('file', blob, filename);
  } else {
    // On native iOS / Android
    const filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase();
    const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    formData.append('file', { uri, name: filename, type });
  }

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message || 'Upload failed');
  }

  return { url: data.secure_url, publicId: data.public_id };
};
