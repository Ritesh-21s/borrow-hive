import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

/**
 * Shared Avatar component used everywhere in the app.
 * Props:
 *   uri    – image URL (optional)
 *   name   – user's display name, used for initial fallback
 *   size   – diameter in pixels (default 40)
 *   style  – extra style overrides for the outer container
 */
const Avatar = ({ uri, name, size = 40, style }) => {
  const [imgError, setImgError] = useState(false);
  const r = size / 2;
  const fontSize = size * 0.38;

  const showImage = uri && !imgError;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: r },
        !showImage && styles.fallback,
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={[styles.img, { width: size, height: size, borderRadius: r }]}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[styles.initial, { fontSize }]}>
          {name ? name.charAt(0).toUpperCase() : '?'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAEAE6',
  },
  fallback: {
    backgroundColor: Colors.accent,
  },
  img: {
    resizeMode: 'cover',
  },
  initial: {
    fontFamily: 'Inter_700Bold',
    color: '#2A1503',
  },
});

export default Avatar;
