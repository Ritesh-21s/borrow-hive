import { Platform } from 'react-native';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../constants/config';

/**
 * Upload an image from a local URI to Cloudinary.
 *
 * On Android, the image picker may return a `content://` URI which cannot be
 * serialised directly as a FormData part by React Native's fetch polyfill
 * (causes "Unsupported FormDataPart implementation").
 *
 * Fix: always read the URI into a real Blob via `fetch(uri).blob()` first,
 * then attach the blob. This works for file://, content://, and http:// URIs
 * on both Android and iOS.
 */
export const uploadImageToCloudinary = async (uri) => {
  try {
    // Read the picked URI into a Blob — works for content://, file://, and http://
    const fetchResp = await fetch(uri);
    if (!fetchResp.ok && Platform.OS !== 'android') {
      // content:// fetch always succeeds on Android even without an HTTP status
      throw new Error(`Could not read image (status ${fetchResp.status})`);
    }
    const blob = await fetchResp.blob();

    // Derive a filename + MIME type from the blob or URI
    const ext = (blob.type && blob.type !== 'application/octet-stream')
      ? blob.type.split('/')[1]?.split(';')[0] || 'jpg'
      : uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext) ? ext : 'jpg';
    const mimeType = safeExt === 'jpg' || safeExt === 'jpeg' ? 'image/jpeg' : `image/${safeExt}`;
    const filename = `upload_${Date.now()}.${safeExt}`;

    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData },
    );

    const data = await res.json();
    if (!data.secure_url) {
      const msg = data.error?.message || 'Upload failed';
      console.error('[imageUpload] Cloudinary error:', msg, data);
      throw new Error(msg);
    }

    return { url: data.secure_url, publicId: data.public_id };
  } catch (err) {
    console.error('[imageUpload] Upload error:', err);
    // Re-throw a friendly message; callers should display this to the user.
    const friendlyError = new Error("Couldn't upload your photo. Please try again.");
    friendlyError.originalError = err;
    throw friendlyError;
  }
};
