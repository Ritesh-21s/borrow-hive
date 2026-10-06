import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

/**
 * BorrowHive logo mark — three hexagon cells from borrowhive-logo.html
 * variant: 'light' | 'dark' | 'tint'
 */
export const LogoMark = ({ size = 44, variant = 'light' }) => {
  const topFill = variant === 'dark' ? '#F0A93A' : '#F0A93A';
  const midFill = variant === 'dark' ? '#F0A93A' : '#B4460D';
  const midOpacity = variant === 'dark' ? 0.55 : 1;
  const botFill = variant === 'dark' ? '#F0A93A' : '#16181D';
  const botOpacity = variant === 'dark' ? 0.3 : 1;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M32 22 L50 12 L68 22 L68 42 L50 52 L32 42 Z" fill={topFill} />
      <Path d="M14 52 L32 42 L50 52 L50 72 L32 82 L14 72 Z" fill={midFill} fillOpacity={midOpacity} />
      <Path d="M50 52 L68 42 L86 52 L86 72 L68 82 L50 72 Z" fill={botFill} fillOpacity={botOpacity} />
    </Svg>
  );
};

/**
 * Full horizontal lockup: mark + wordmark
 */
export const LogoLockup = ({ size = 36, variant = 'light', style }) => {
  const textColor = variant === 'dark' ? '#FBFAF7' : Colors.ink;
  return (
    <View style={[styles.lockup, style]}>
      <LogoMark size={size} variant={variant} />
      <Text style={[styles.wordmark, { color: textColor, fontSize: size * 0.75 }]}>BorrowHive</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontFamily: 'Fraunces_600SemiBold',
    letterSpacing: -0.3,
  },
});
